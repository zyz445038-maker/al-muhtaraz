import { randomUUID } from 'crypto';
import { logEvent } from '@/lib/eventLogger';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentImportJob, ImportJobStatus } from '@/services/archive/types';

export interface JobQueueOptions {
  staleAfterMs?: number;
  workerId?: string;
  storageBackend?: 'local' | 'supabase';
}

export class DocumentJobQueue {
  private readonly staleAfterMs: number;
  private readonly workerId: string;
  private readonly storageBackend?: 'local' | 'supabase';

  constructor(
    private readonly documents = new DocumentRepository(),
    options: JobQueueOptions = {}
  ) {
    this.staleAfterMs = options.staleAfterMs || 15 * 60 * 1000;
    this.workerId = options.workerId || `archive-worker-${randomUUID()}`;
    this.storageBackend = options.storageBackend;
  }

  async claimNext(): Promise<DocumentImportJob | null> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const next = await this.documents.findNextQueuedJob(this.storageBackend);
      if (!next.ok) throw new Error(next.error || 'Could not read archive queue');
      if (!next.data) return null;

      const claimed = await this.documents.claimImportJob(
        next.data.id,
        this.workerId,
        next.data.attempts + 1
      );
      if (!claimed.ok) throw new Error(claimed.error || 'Could not claim archive job');
      if (claimed.data) {
        logEvent('archive.queue.claimed', { jobId: claimed.data.id, workerId: this.workerId });
        return claimed.data;
      }

      logEvent('archive.queue.claim.skipped', { jobId: next.data.id, workerId: this.workerId }, 'warn');
    }

    return null;
  }

  async recoverStaleJobs(): Promise<number> {
    const staleBefore = new Date(Date.now() - this.staleAfterMs).toISOString();
    const stale = await this.documents.listStaleProcessingJobs(staleBefore, this.storageBackend);
    if (!stale.ok) throw new Error(stale.error || 'Could not read stale archive jobs');

    let recovered = 0;
    for (const job of stale.data || []) {
      const exhausted = job.attempts >= job.max_attempts;
      if (exhausted) {
        const document = await this.documents.updateStatus(job.document_id, 'failed');
        if (!document.ok) throw new Error(document.error || `Could not mark exhausted archive document ${job.document_id} as failed`);
      }
      const result = await this.documents.recoverStaleImportJob(job, {
        status: exhausted ? 'failed' : 'queued',
        last_error: exhausted ? 'Maximum retry attempts exceeded' : 'Recovered stale processing job',
        next_attempt_at: exhausted
          ? null
          : new Date(Date.now() + Math.min(30_000 * (2 ** (job.attempts - 1)), 15 * 60_000)).toISOString(),
        locked_at: null,
        worker_id: null,
        completed_at: exhausted ? new Date().toISOString() : null
      });
      if (!result.ok) throw new Error(result.error || `Could not recover stale archive job ${job.id}`);
      if (!result.data) continue;
      recovered += 1;
      logEvent('archive.queue.stale.recovered', { jobId: job.id, exhausted });
    }
    return recovered;
  }

  async recordFailure(jobId: string, error: unknown): Promise<ImportJobStatus> {
    const current = await this.documents.getImportJob(jobId);
    if (!current.ok || !current.data) throw new Error(current.error || 'Could not read failed archive job');

    const job = current.data;
    if (job.status !== 'processing' || job.worker_id !== this.workerId) {
      logEvent('archive.queue.failure.stale-owner', { jobId, workerId: this.workerId }, 'warn');
      return job.status;
    }
    const exhausted = job.attempts >= job.max_attempts;
    const status = exhausted ? 'failed' : 'queued';
    const message = error instanceof Error ? error.message : String(error);
    if (exhausted) {
      const document = await this.documents.updateStatus(job.document_id, 'failed');
      if (!document.ok) throw new Error(document.error || 'Could not mark exhausted archive document as failed');
    }
    const updated = await this.documents.updateClaimedImportJob(jobId, this.workerId, {
      status,
      last_error: message,
      next_attempt_at: exhausted ? null : new Date(Date.now() + Math.min(30_000 * (2 ** (job.attempts - 1)), 15 * 60_000)).toISOString(),
      locked_at: null,
      worker_id: null,
      completed_at: exhausted ? new Date().toISOString() : null
    });
    if (!updated.ok) throw new Error(updated.error || 'Could not record archive job failure');
    if (!updated.data) {
      logEvent('archive.queue.failure.stale-owner', { jobId, workerId: this.workerId }, 'warn');
      const latest = await this.documents.getImportJob(jobId);
      if (!latest.ok || !latest.data) throw new Error(latest.error || 'Could not verify archive job after lease loss');
      return latest.data.status;
    }
    logEvent('archive.queue.failure.recorded', { jobId, status, exhausted });
    return status;
  }

  getWorkerId() {
    return this.workerId;
  }
}