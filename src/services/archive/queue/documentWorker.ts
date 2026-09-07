import { logError, logEvent } from '@/lib/eventLogger';
import { DocumentJobQueue } from '@/services/archive/queue/documentJobQueue';
import { DocumentImportService } from '@/services/archive/import/documentImportService';
import { DocumentImportJob } from '@/services/archive/types';

export interface WorkerBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  jobs: Array<{ jobId: string; status: DocumentImportJob['status'] | 'failed' }>;
}

export class DocumentWorker {
  constructor(
    private readonly queue = new DocumentJobQueue(),
    private readonly importer = new DocumentImportService()
  ) {}

  async processOne() {
    const job = await this.queue.claimNext();
    if (!job) return null;

    try {
      const result = await this.importer.processImportJob(job.id);
      logEvent('archive.worker.completed', { jobId: job.id, status: result.status, workerId: this.queue.getWorkerId() });
      return { jobId: job.id, status: result.status };
    } catch (error) {
      logError('archive.worker.process', error, { jobId: job.id, workerId: this.queue.getWorkerId() });
      const status = await this.queue.recordFailure(job.id, error);
      return { jobId: job.id, status };
    }
  }

  async processBatch(limit = 10): Promise<WorkerBatchResult> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('Worker batch limit must be an integer between 1 and 100');
    }

    await this.queue.recoverStaleJobs();
    const jobs: WorkerBatchResult['jobs'] = [];
    for (let index = 0; index < limit; index += 1) {
      const result = await this.processOne();
      if (!result) break;
      jobs.push(result);
    }

    return {
      processed: jobs.length,
      succeeded: jobs.filter(job => job.status === 'indexed' || job.status === 'needs_ocr').length,
      failed: jobs.filter(job => job.status === 'failed').length,
      jobs
    };
  }
}