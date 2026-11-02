import { supabase } from '@/lib/supabase';
import { runDbQuery } from '@/lib/db';
import { ArchiveDocumentVersion, CreateDocumentVersionInput } from '@/services/archive/types';
import { getLocalArchiveDatabase, isLocalArchiveEnabled } from '@/services/archive/storage/localArchiveDatabase';

export class DocumentVersionRepository {
  private readonly local = isLocalArchiveEnabled() ? getLocalArchiveDatabase() : null;

  constructor(private readonly client: any = supabase) {}

  async create(input: CreateDocumentVersionInput) {
    if (this.local) return this.local.createVersion(input);
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
    if (this.local) return this.local.getVersion(id);
    return runDbQuery<ArchiveDocumentVersion>('archive.document-versions.get', () => this.client
      .from('document_versions')
      .select('*')
      .eq('id', id)
      .maybeSingle());
  }

  async listByDocument(documentId: string) {
    if (this.local) return this.local.listVersions(documentId);
    return runDbQuery<ArchiveDocumentVersion[]>('archive.document-versions.list', () => this.client
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false }));
  }

  async update(id: string, updates: Partial<Pick<ArchiveDocumentVersion, 'json_path' | 'extraction_status' | 'ocr_status' | 'extraction_error'>>) {
    if (this.local) return this.local.updateVersion(id, updates);
    return runDbQuery<ArchiveDocumentVersion>('archive.document-versions.update', () => this.client
      .from('document_versions')
      .update(updates)
      .eq('id', id)
      .select()
      .single());
  }

  async getLatestByDocument(documentId: string) {
    if (this.local) return this.local.getLatestVersion(documentId);
    return runDbQuery<ArchiveDocumentVersion>('archive.document-versions.latest', () => this.client
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle());
  }
}
