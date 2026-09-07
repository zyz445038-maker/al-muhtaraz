import { supabase } from '@/lib/supabase';
import { runDbQuery } from '@/lib/db';
import { ArchiveDocumentVersion, CreateDocumentVersionInput } from '@/services/archive/types';

export class DocumentVersionRepository {
  constructor(private readonly client: any = supabase) {}

  async create(input: CreateDocumentVersionInput) {
    return runDbQuery<ArchiveDocumentVersion>('archive.document-versions.create', () => this.client
      .from('document_versions')
      .insert([{
        document_id: input.document_id,
        version_number: input.version_number,
        file_path: input.file_path,
        json_path: input.json_path,
        original_filename: input.original_filename || null,
        mime_type: input.mime_type,
        file_size: input.file_size,
        sha256: input.sha256,
        content_type: input.content_type,
        extraction_status: input.extraction_status || 'pending',
        ocr_status: input.ocr_status || 'not_required',
        extraction_error: input.extraction_error || null
      }])
      .select()
      .single());
  }

  async getById(id: string) {
    return runDbQuery<ArchiveDocumentVersion>('archive.document-versions.get', () => this.client
      .from('document_versions')
      .select('*')
      .eq('id', id)
      .maybeSingle());
  }

  async listByDocument(documentId: string) {
    return runDbQuery<ArchiveDocumentVersion[]>('archive.document-versions.list', () => this.client
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false }));
  }

  async update(id: string, updates: Partial<Pick<ArchiveDocumentVersion, 'json_path' | 'extraction_status' | 'ocr_status' | 'extraction_error'>>) {
    return runDbQuery<ArchiveDocumentVersion>('archive.document-versions.update', () => this.client
      .from('document_versions')
      .update(updates)
      .eq('id', id)
      .select()
      .single());
  }
}
