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
        priority: input.priority || 0,
        max_attempts: input.max_attempts || 3,
        status: 'queued'
      }])
      .select()
      .single());
  }
}
