import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { runDbQuery } from '@/lib/db';
import { ArchiveDocument, canTransitionImportJob, CreateDocumentInput, CreateImportJobInput, DocumentImportJob, ImportJobStatus } from '@/services/archive/types';
import { getLocalArchiveDatabase, isLocalArchiveEnabled } from '@/services/archive/storage/localArchiveDatabase';

export class DocumentRepository {
  private readonly local = isLocalArchiveEnabled() ? getLocalArchiveDatabase() : null;

  constructor(private readonly client: SupabaseClient = supabase) {}

  async create(input: CreateDocumentInput) {
    if (this.local) return this.local.createDocument(input);
    return runDbQuery<ArchiveDocument>('archive.documents.create', () => this.client
      .from('documents')
      .insert([{
        document_type: input.document_type,
        customer_id: input.customer_id || null,
        contract_id: input.contract_id || null,
        source_type: input.source_type,
        original_filename: input.original_filename || null,
        created_by: input.created_by || null,
        status: input.status || 'active'
      }])
      .select()
      .single());
  }

  async getById(id: string) {
    if (this.local) return this.local.getDocument(id);
    return runDbQuery<ArchiveDocument>('archive.documents.get', () => this.client
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle());
  }

  async list(filters: { customerId?: string; contractId?: string; status?: string } = {}) {
    if (this.local) return this.local.listDocuments(filters);
    let query = this.client.from('documents').select('*').order('created_at', { ascending: false });
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.contractId) query = query.eq('contract_id', filters.contractId);
    if (filters.status) query = query.eq('status', filters.status);
    return runDbQuery<ArchiveDocument[]>('archive.documents.list', () => query);
  }

  async updateStatus(id: string, status: ArchiveDocument['status']) {
    if (this.local) return this.local.updateDocumentStatus(id, status);
    return runDbQuery<ArchiveDocument>('archive.documents.update-status', () => this.client
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single());
  }

  async setCurrentVersion(id: string, currentVersionId: string) {
    if (this.local) return this.local.setCurrentVersion(id, currentVersionId);
    return runDbQuery<ArchiveDocument>('archive.documents.set-current-version', () => this.client
      .from('documents')
      .update({ current_version_id: currentVersionId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single());
  }

  async softDelete(id: string) {
    return this.updateStatus(id, 'archived');
  }

  async registerImportJob(input: CreateImportJobInput) {
    if (this.local) return this.local.createImportJob(input);
    return runDbQuery<DocumentImportJob>('archive.import-jobs.create', () => this.client
      .from('document_import_jobs')
      .insert([{
        document_id: input.document_id,
        source_type: input.source_type,
        source_path: input.source_path,
        metadata: input.metadata || {},
        priority: input.priority || 0,
        max_attempts: input.max_attempts || 3,
        status: 'queued'
      }])
      .select()
      .single());
  }

  async getImportJob(id: string) {
    if (this.local) return this.local.getImportJob(id);
    return runDbQuery<DocumentImportJob>('archive.import-jobs.get', () => this.client
      .from('document_import_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle());
  }

  async updateImportJob(id: string, updates: Partial<Pick<DocumentImportJob, 'status' | 'attempts' | 'last_error' | 'locked_at' | 'worker_id' | 'started_at' | 'completed_at' | 'next_attempt_at'>>) {
    if (this.local) {
      const current = updates.status ? await this.getImportJob(id) : null;
      if (current && (!current.ok || !current.data)) return current;
      if (updates.status && current?.data && !canTransitionImportJob(current.data.status, updates.status as ImportJobStatus)) {
        return {
          ok: false as const,
          data: null,
          error: `Invalid import job transition: ${current.data.status} -> ${updates.status}`
        };
      }
      return this.local.updateImportJob(id, updates);
    }
    if (updates.status) {
      const current = await this.getImportJob(id);
      if (!current.ok || !current.data) return current;
      if (!canTransitionImportJob(current.data.status, updates.status as ImportJobStatus)) {
        return {
          ok: false as const,
          data: null,
          error: `Invalid import job transition: ${current.data.status} -> ${updates.status}`
        };
      }
    }

    return runDbQuery<DocumentImportJob>('archive.import-jobs.update', () => this.client
      .from('document_import_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single());
  }

  async updateClaimedImportJob(
    id: string,
    workerId: string,
    updates: Partial<Pick<DocumentImportJob, 'status' | 'last_error' | 'locked_at' | 'worker_id' | 'started_at' | 'completed_at' | 'next_attempt_at'>>
  ) {
    if (this.local) return this.local.updateClaimedImportJob(id, workerId, updates);
    return runDbQuery<DocumentImportJob>('archive.import-jobs.update-claimed', () => this.client
      .from('document_import_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'processing')
      .eq('worker_id', workerId)
      .select()
      .maybeSingle());
  }

  async findNextQueuedJob(storageBackend?: 'local' | 'supabase') {
    if (this.local) return this.local.findNextQueuedJob();
    let query = this.client
      .from('document_import_jobs')
      .select('*')
      .eq('status', 'queued')
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    if (storageBackend) {
      query = query.contains('metadata', { storage_backend: storageBackend });
    }
    return runDbQuery<DocumentImportJob>('archive.import-jobs.find-next', () => query.limit(1).maybeSingle());
  }

  async claimImportJob(id: string, workerId: string, attempt: number) {
    if (this.local) return this.local.claimImportJob(id, workerId, attempt);
    return runDbQuery<DocumentImportJob>('archive.import-jobs.claim', () => this.client
      .from('document_import_jobs')
      .update({
        status: 'processing',
        attempts: attempt,
        next_attempt_at: null,
        worker_id: workerId,
        locked_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'queued')
      .select()
      .maybeSingle());
  }

  async listStaleProcessingJobs(staleBefore: string, storageBackend?: 'local' | 'supabase') {
    if (this.local) return this.local.listStaleProcessingJobs(staleBefore);
    let query = this.client
      .from('document_import_jobs')
      .select('*')
      .eq('status', 'processing')
      .lt('locked_at', staleBefore);
    if (storageBackend) {
      query = query.contains('metadata', { storage_backend: storageBackend });
    }
    return runDbQuery<DocumentImportJob[]>('archive.import-jobs.list-stale', () => query);
  }

  async recoverStaleImportJob(
    job: DocumentImportJob,
    updates: Pick<DocumentImportJob, 'status' | 'last_error' | 'locked_at' | 'worker_id' | 'completed_at' | 'next_attempt_at'>
  ) {
    if (this.local) return this.local.recoverStaleImportJob(job, updates);
    return runDbQuery<DocumentImportJob>('archive.import-jobs.recover-stale', () => this.client
      .from('document_import_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'processing')
      .eq('worker_id', job.worker_id)
      .eq('locked_at', job.locked_at)
      .select()
      .maybeSingle());
  }

  async findVersionBySha256(sha256: string) {
    if (this.local) return this.local.findVersionBySha256(sha256);
    return runDbQuery<{ id: string; document_id: string }>('archive.document-versions.find-sha256', () => this.client
      .from('document_versions')
      .select('id, document_id, documents!inner(status)')
      .eq('sha256', sha256)
      .eq('documents.status', 'active')
      .limit(1)
      .maybeSingle());
  }

  async listImportJobs() {
    if (this.local) return this.local.listImportJobs();
    return runDbQuery<DocumentImportJob[]>('archive.import-jobs.list', () => this.client
      .from('document_import_jobs')
      .select('*')
      .order('created_at', { ascending: false }));
  }
}
