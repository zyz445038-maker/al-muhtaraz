import assert from 'node:assert/strict';
import { DocumentJobQueue } from '@/services/archive/queue/documentJobQueue';
import { DocumentWorker } from '@/services/archive/queue/documentWorker';
import { DocumentImportJob } from '@/services/archive/types';
import { canTransitionImportJob } from '@/services/archive/types';

function makeJob(id: string, status: DocumentImportJob['status'] = 'queued', attempts = 0, maxAttempts = 3): DocumentImportJob {
  const now = new Date().toISOString();
  return {
    id,
    document_id: `doc-${id}`,
    source_type: 'upload',
    source_path: `contracts/pdf/${id}/v1.pdf`,
    metadata: {},
    status,
    priority: 0,
    attempts,
    max_attempts: maxAttempts,
    next_attempt_at: null,
    last_error: null,
    locked_at: status === 'processing' ? new Date(Date.now() - 60_000).toISOString() : null,
    worker_id: status === 'processing' ? 'old-worker' : null,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now
  };
}

class FakeQueueRepository {
  jobs = new Map<string, DocumentImportJob>();
  claimCount = 0;

  constructor(jobs: DocumentImportJob[], private readonly exposeStaleJobs = false) {
    jobs.forEach(job => this.jobs.set(job.id, job));
  }

  async findNextQueuedJob() {
    const job = [...this.jobs.values()].find(item => item.status === 'queued' && (!item.next_attempt_at || new Date(item.next_attempt_at).getTime() <= Date.now())) || null;
    return { ok: true, data: job };
  }

  async claimImportJob(id: string, workerId: string, attempt: number) {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'queued') return { ok: true, data: null };
    job.status = 'processing';
    job.worker_id = workerId;
    job.locked_at = new Date().toISOString();
    job.attempts = attempt;
    job.next_attempt_at = null;
    this.claimCount += 1;
    return { ok: true, data: job };
  }

  async listStaleProcessingJobs() {
    return { ok: true, data: this.exposeStaleJobs ? [...this.jobs.values()].filter(job => job.status === 'processing') : [] };
  }

  async updateImportJob(id: string, updates: Partial<DocumentImportJob>) {
    const job = this.jobs.get(id)!;
    Object.assign(job, updates);
    return { ok: true, data: job };
  }

  async updateClaimedImportJob(id: string, workerId: string, updates: Partial<DocumentImportJob>) {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'processing' || job.worker_id !== workerId) return { ok: true, data: null };
    Object.assign(job, updates);
    return { ok: true, data: job };
  }

  async recoverStaleImportJob(job: DocumentImportJob, updates: Partial<DocumentImportJob>) {
    const current = this.jobs.get(job.id);
    if (!current || current.status !== 'processing' || current.worker_id !== job.worker_id) return { ok: true, data: null };
    Object.assign(current, updates);
    return { ok: true, data: current };
  }

  async getImportJob(id: string) {
    return { ok: true, data: this.jobs.get(id) || null };
  }

  async updateStatus(id: string, status: 'failed') {
    return { ok: true, data: { id, status } };
  }
}

class FakeImporter {
  processed: string[] = [];
  failures = new Set<string>();

  async processImportJob(jobId: string) {
    this.processed.push(jobId);
    if (this.failures.has(jobId)) throw new Error('simulated import failure');
    return { status: 'indexed' as const };
  }
}

async function main() {
  assert.equal(canTransitionImportJob('queued', 'processing'), true);
  assert.equal(canTransitionImportJob('processing', 'indexed'), true);
  assert.equal(canTransitionImportJob('processing', 'queued'), true);
  assert.equal(canTransitionImportJob('processing', 'failed'), true);
  assert.equal(canTransitionImportJob('indexed', 'processing'), false);
  assert.equal(canTransitionImportJob('failed', 'indexed'), false);

  const queuedJobs = [makeJob('one'), makeJob('two'), makeJob('three')];
  const repository = new FakeQueueRepository(queuedJobs);
  const queue = new DocumentJobQueue(repository as any, { workerId: 'test-worker', staleAfterMs: 15 * 60 * 1000 });

  const firstClaim = await queue.claimNext();
  assert.equal(firstClaim?.id, 'one');
  const secondClaim = await queue.claimNext();
  assert.equal(secondClaim?.id, 'two');
  assert.equal(repository.claimCount, 2);

  const concurrentRepository = new FakeQueueRepository([makeJob('a'), makeJob('b')]);
  const concurrentQueues = [
    new DocumentJobQueue(concurrentRepository as any, { workerId: 'worker-a' }),
    new DocumentJobQueue(concurrentRepository as any, { workerId: 'worker-b' })
  ];
  const concurrentClaims = await Promise.all(concurrentQueues.map(item => item.claimNext()));
  assert.ok(concurrentClaims[0] && concurrentClaims[1]);
  assert.notEqual(concurrentClaims[0]?.id, concurrentClaims[1]?.id);

  const importer = new FakeImporter();
  importer.failures.add('three');
  const worker = new DocumentWorker(queue, importer as any);
  const batch = await worker.processBatch(1);
  assert.equal(batch.processed, 1);
  assert.equal(batch.succeeded, 0);
  assert.equal(batch.failed, 0);
  assert.deepEqual(importer.processed, ['three']);
  assert.equal(repository.jobs.get('three')?.status, 'queued');
  assert.ok(new Date(repository.jobs.get('three')!.next_attempt_at!).getTime() > Date.now());
  assert.equal(await queue.claimNext(), null);

  repository.jobs.get('three')!.attempts = 2;
  repository.jobs.get('three')!.next_attempt_at = null;
  const deadBatch = await worker.processBatch(1);
  assert.equal(deadBatch.failed, 1);
  assert.equal(repository.jobs.get('three')?.status, 'failed');

  const staleRepository = new FakeQueueRepository([
    makeJob('retryable', 'processing', 1, 3),
    makeJob('dead', 'processing', 3, 3)
  ], true);
  const staleQueue = new DocumentJobQueue(staleRepository as any, { workerId: 'recovery-worker', staleAfterMs: 1 });
  const recovered = await staleQueue.recoverStaleJobs();
  assert.equal(recovered, 2);
  assert.equal(staleRepository.jobs.get('retryable')?.status, 'queued');
  assert.ok(staleRepository.jobs.get('retryable')?.next_attempt_at);
  assert.equal(staleRepository.jobs.get('dead')?.status, 'failed');

  await assert.rejects(() => worker.processBatch(0), /between 1 and 100/);
  await assert.rejects(() => worker.processBatch(101), /between 1 and 100/);

  console.log('Archive phase 5 tests passed.');
}

main().catch(error => {
  console.error('Archive phase 5 tests failed:', error);
  process.exitCode = 1;
});
