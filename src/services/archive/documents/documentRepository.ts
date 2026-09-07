import { supabase } from '@/lib/supabase';
import { runDbQuery } from '@/lib/db';
import { ArchiveDocument, CreateDocumentInput, CreateImportJobInput, DocumentImportJob } from '@/services/archive/types';

export class DocumentRepository {
  constructor(private readonly client: any = supabase) {}

  async create(input: CreateDocumentInput) {
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
    return runDbQuery<ArchiveDocument>('archive.documents.get', () => this.client
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle());
  }

  async list(filters: { customerId?: string; contractId?: string; status?: string } = {}) {
    let query = this.client.from('documents').select('*').order('created_at', { ascending: false });
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.contractId) query = query.eq('contract_id', filters.contractId);
    if (filters.status) query = query.eq('status', filters.status);
    return runDbQuery<ArchiveDocument[]>('archive.documents.list', () => query);
  }

  async updateStatus(id: string, status: ArchiveDocument['status']) {
    return runDbQuery<ArchiveDocument>('archive.documents.update-status', () => this.client
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single());
  }

  async setCurrentVersion(id: string, currentVersionId: string) {
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
    return runDbQuery<DocumentImportJob>('archive.import-jobs.get', () => this.client
      .from('document_import_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle());
  }

  async updateImportJob(id: string, updates: Partial<Pick<DocumentImportJob, 'status' | 'attempts' | 'last_error' | 'locked_at' | 'worker_id' | 'started_at' | 'completed_at'>>) {
    return runDbQuery<DocumentImportJob>('archive.import-jobs.update', () => this.client
      .from('document_import_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single());
  }

  async findNextQueuedJob() {
    return runDbQuery<DocumentImportJob>('archive.import-jobs.find-next', () => this.client
      .from('document_import_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle());
  }

  async claimImportJob(id: string, workerId: string) {
    return runDbQuery<DocumentImportJob>('archive.import-jobs.claim', () => this.client
      .from('document_import_jobs')
      .update({
        status: 'processing',
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

  async listStaleProcessingJobs(staleBefore: string) {
    return runDbQuery<DocumentImportJob[]>('archive.import-jobs.list-stale', () => this.client
      .from('document_import_jobs')
      .select('*')
      .eq('status', 'processing')
      .lt('locked_at', staleBefore));
  }

  async findVersionBySha256(sha256: string) {
    return runDbQuery<{ id: string; document_id: string }>('archive.document-versions.find-sha256', () => this.client
      .from('document_versions')
      .select('id, document_id')
      .eq('sha256', sha256)
      .limit(1)
      .maybeSingle());
  }
}
