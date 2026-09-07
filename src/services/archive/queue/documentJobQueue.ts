import { randomUUID } from 'crypto';
import { logError, logEvent } from '@/lib/eventLogger';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentImportJob } from '@/services/archive/types';

export interface JobQueueOptions {
  staleAfterMs?: number;
  workerId?: string;
}

export class DocumentJobQueue {
  private readonly staleAfterMs: number;
  private readonly workerId: string;

  constructor(
    private readonly documents = new DocumentRepository(),
    options: JobQueueOptions = {}
  ) {
    this.staleAfterMs = options.staleAfterMs || 15 * 60 * 1000;
    this.workerId = options.workerId || `archive-worker-${randomUUID()}`;
  }

  async claimNext(): Promise<DocumentImportJob | null> {
    const next = await this.documents.findNextQueuedJob();
    if (!next.ok) throw new Error(next.error || 'Could not read archive queue');
    if (!next.data) return null;

    const claimed = await this.documents.claimImportJob(next.data.id, this.workerId);
    if (!claimed.ok) throw new Error(claimed.error || 'Could not claim archive job');
    if (!claimed.data) {
      logEvent('archive.queue.claim.skipped', { jobId: next.data.id, workerId: this.workerId }, 'warn');
      return null;
    }

    logEvent('archive.queue.claimed', { jobId: claimed.data.id, workerId: this.workerId });
    return claimed.data;
  }

  async recoverStaleJobs(): Promise<number> {
    const staleBefore = new Date(Date.now() - this.staleAfterMs).toISOString();
    const stale = await this.documents.listStaleProcessingJobs(staleBefore);
    if (!stale.ok) throw new Error(stale.error || 'Could not read stale archive jobs');

    let recovered = 0;
    for (const job of stale.data || []) {
      try {
        const exhausted = job.attempts >= job.max_attempts;
        await this.documents.updateImportJob(job.id, {
          status: exhausted ? 'failed' : 'queued',
          last_error: exhausted ? 'Maximum retry attempts exceeded' : 'Recovered stale processing job',
          locked_at: null,
          worker_id: null
        });
        recovered += 1;
        logEvent('archive.queue.stale.recovered', { jobId: job.id, exhausted });
      } catch (error) {
        logError('archive.queue.stale.recover', error, { jobId: job.id });
      }
    }
    return recovered;
  }

  async recordFailure(jobId: string, error: unknown): Promise<'queued' | 'failed'> {
    const current = await this.documents.getImportJob(jobId);
    if (!current.ok || !current.data) throw new Error(current.error || 'Could not read failed archive job');

    const job = current.data;
    const exhausted = job.attempts >= job.max_attempts;
    const status = exhausted ? 'failed' : 'queued';
    const message = error instanceof Error ? error.message : String(error);
    await this.documents.updateImportJob(jobId, {
      status,
      last_error: message,
      locked_at: null,
      worker_id: null,
      completed_at: exhausted ? new Date().toISOString() : null
    });
    logEvent('archive.queue.failure.recorded', { jobId, status, exhausted });
    return status;
  }

  getWorkerId() {
    return this.workerId;
  }
}