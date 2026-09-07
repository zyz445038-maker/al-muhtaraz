export type ArchiveDocumentType = 'contract' | 'receipt' | 'attachment' | 'customer_document';
export type ArchiveDocumentStatus = 'active' | 'archived' | 'legal_hold' | 'quarantined' | 'failed';
export type ArchiveSourceType = 'upload' | 'zip_import' | 'legacy_import' | 'generated';
export type ArchiveContentType = 'pdf_text' | 'pdf_scan' | 'image';
export type ExtractionStatus = 'pending' | 'completed' | 'failed';
export type OcrStatus = 'not_required' | 'pending' | 'completed' | 'failed';
export type ImportJobStatus = 'queued' | 'processing' | 'indexed' | 'failed' | 'needs_ocr' | 'cancelled';

export interface ArchiveDocument {
  id: string;
  document_type: ArchiveDocumentType;
  customer_id: string | null;
  contract_id: string | null;
  current_version_id: string | null;
  status: ArchiveDocumentStatus;
  source_type: ArchiveSourceType;
  original_filename: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchiveDocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  json_path: string;
  original_filename: string | null;
  mime_type: string;
  file_size: number;
  sha256: string;
  content_type: ArchiveContentType;
  extraction_status: ExtractionStatus;
  ocr_status: OcrStatus;
  extraction_error: string | null;
  created_at: string;
}

export interface CustomerArchiveSnapshot {
  id: string;
  customer_id: string | null;
  document_id: string;
  name: string;
  phone: string;
  alt_phone: string | null;
  customer_type: string | null;
  address: string | null;
  notes: string | null;
  captured_at: string;
}

export interface DocumentImportJob {
  id: string;
  document_id: string;
  source_type: ArchiveSourceType;
  source_path: string;
  status: ImportJobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  locked_at: string | null;
  worker_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  document_type: ArchiveDocumentType;
  customer_id?: string | null;
  contract_id?: string | null;
  source_type: ArchiveSourceType;
  original_filename?: string | null;
  created_by?: string | null;
  status?: ArchiveDocumentStatus;
}

export interface CreateDocumentVersionInput {
  document_id: string;
  version_number: number;
  file_path: string;
  json_path: string;
  original_filename?: string | null;
  mime_type: string;
  file_size: number;
  sha256: string;
  content_type: ArchiveContentType;
  extraction_status?: ExtractionStatus;
  ocr_status?: OcrStatus;
  extraction_error?: string | null;
}

export interface CreateImportJobInput {
  document_id: string;
  source_type: ArchiveSourceType;
  source_path: string;
  priority?: number;
  max_attempts?: number;
}
