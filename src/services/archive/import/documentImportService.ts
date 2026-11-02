import { createHash } from 'crypto';
import { logError, logEvent } from '@/lib/eventLogger';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { ArchiveDocumentIndexer, DocumentIndexer } from '@/services/archive/indexing/documentIndexer';
import { BasicPdfTextExtractor, TextExtractor } from '@/services/archive/indexing/textExtractor';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { ArchiveStorageService } from '@/services/archive/storage/archiveStorageService';
import { buildArchiveDocumentPath } from '@/services/archive/storage/storagePath';
import { getLocalArchiveDatabase, isLocalArchiveEnabled } from '@/services/archive/storage/localArchiveDatabase';
import {
  ArchiveDocumentType,
  ArchiveDocumentVersion,
  ArchiveIndexData,
  DocumentImportJob,
  ImportDocumentInput
} from '@/services/archive/types';

export interface DocumentImportResult {
  duplicate: boolean;
  documentId: string;
  versionId?: string;
  jobId?: string;
  sha256: string;
}

type ImportDocumentRepository = Pick<DocumentRepository, 'create' | 'setCurrentVersion' | 'registerImportJob' | 'findVersionBySha256' | 'getById' | 'getImportJob' | 'updateStatus' | 'updateImportJob' | 'updateClaimedImportJob'>;
type ImportVersionRepository = Pick<DocumentVersionRepository, 'create' | 'getLatestByDocument' | 'update'>;

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

export class DocumentImportService {
  constructor(
    private readonly documents = new DocumentRepository(),
    private readonly versions = new DocumentVersionRepository(),
    private readonly storage: ArchiveStorageService = new LocalArchiveStorageService(),
    private readonly extractor: TextExtractor = new BasicPdfTextExtractor(),
    private readonly indexer: DocumentIndexer = new ArchiveDocumentIndexer(storage)
  ) {}

  async importPdf(input: ImportDocumentInput): Promise<DocumentImportResult> {
    this.validatePdfInput(input);
    await this.storage.ensureDirectories();
    const sha256 = createHash('sha256').update(input.file).digest('hex');
    const duplicate = await this.documents.findVersionBySha256(sha256);
    if (!duplicate.ok) {
      throw new Error(duplicate.error || 'Could not check archive duplicate');
    }

    if (duplicate.data) {
      logEvent('archive.import.duplicate', { documentId: duplicate.data.document_id, sha256 });
      return { duplicate: true, documentId: duplicate.data.document_id, sha256 };
    }

    let documentId: string | undefined;
    let finalPath: string | undefined;
    let versionId: string | undefined;
    let jobId: string | undefined;
    let finalFileWritten = false;
    try {
      const documentResult = await this.documents.create(input);
      if (!documentResult.ok || !documentResult.data) throw new Error(documentResult.error || 'Could not create archive document');
      documentId = documentResult.data.id;

      const versionNumber = 1;
      const versionPathKey = `v${versionNumber}`;
      finalPath = buildArchiveDocumentPath(this.archiveType(input.document_type), documentId, versionPathKey, 'pdf');
      const jsonPath = buildArchiveDocumentPath(this.archiveType(input.document_type), documentId, versionPathKey, 'json');
      await this.storage.writeAtomically(finalPath, input.file);
      finalFileWritten = true;
      const versionResult = await this.versions.create({
        document_id: documentId,
        version_number: versionNumber,
        file_path: finalPath,
        json_path: jsonPath,
        original_filename: input.source_filename,
        mime_type: input.mime_type || 'application/pdf',
        file_size: input.file.byteLength,
        sha256,
        content_type: 'pdf_text'
      });
      if (!versionResult.ok || !versionResult.data) throw new Error(versionResult.error || 'Could not create archive version');
      versionId = versionResult.data.id;

      const currentVersionResult = await this.documents.setCurrentVersion(documentId, versionResult.data.id);
      if (!currentVersionResult.ok) throw new Error(currentVersionResult.error || 'Could not set current archive version');

      const jobResult = await this.documents.registerImportJob({
        document_id: documentId,
        source_type: input.source_type,
        source_path: finalPath,
        metadata: {
          document_number: input.document_number || null,
          customer_name: input.customer_name || null,
          customer_phone: input.customer_phone || null,
          contract_number: input.contract_number || null,
          container_number: input.container_number || null,
          ...(input.metadata || {}),
          storage_backend: process.env.ARCHIVE_STORAGE_ROOT ? 'local' : 'supabase'
        }
      });
      if (!jobResult.ok || !jobResult.data) throw new Error(jobResult.error || 'Could not create import job');
      jobId = jobResult.data.id;

      logEvent('archive.import.accepted', { documentId, versionId: versionResult.data.id, jobId: jobResult.data.id, sha256 });
      return { duplicate: false, documentId, versionId: versionResult.data.id, jobId: jobResult.data.id, sha256 };
    } catch (error) {
      logError('archive.import', error, { documentId, finalPath, sha256 });
      const rollbackErrors: string[] = [];
      if (jobId) {
        const rollback = await this.documents.updateImportJob(jobId, {
          status: 'cancelled',
          last_error: 'Upload registration failed and was rolled back.',
          completed_at: new Date().toISOString()
        });
        if (!rollback.ok) rollbackErrors.push(rollback.error || 'Could not cancel import job');
      }
      if (versionId) {
        const rollback = await this.versions.update(versionId, {
          extraction_status: 'failed',
          extraction_error: 'Upload registration failed and was rolled back.'
        });
        if (!rollback.ok) rollbackErrors.push(rollback.error || 'Could not mark document version as failed');
      }
      if (finalPath) {
        try {
          if (finalFileWritten || await this.storage.exists(finalPath)) {
            await this.storage.removeTemporary(finalPath);
          }
        } catch (cleanupError) {
          rollbackErrors.push(cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
        }
      }
      if (documentId) {
        const rollback = await this.documents.updateStatus(documentId, 'failed');
        if (!rollback.ok) rollbackErrors.push(rollback.error || 'Could not mark document as failed');
      }
      if (rollbackErrors.length) {
        throw new Error(
          `Archive upload failed: ${error instanceof Error ? error.message : String(error)}. `
          + `Rollback also failed: ${rollbackErrors.join('; ')}`
        );
      }
      throw error;
    }
  }

  async processImportJob(jobId: string, workerId: string): Promise<{ status: DocumentImportJob['status']; index?: ArchiveIndexData }> {
    const jobResult = await this.documents.getImportJob(jobId);
    if (!jobResult.ok || !jobResult.data) throw new Error(jobResult.error || 'Import job not found');
    const job = jobResult.data;
    if (job.status !== 'processing' || !job.worker_id || job.worker_id !== workerId) {
      throw new Error('Archive import job is not owned by this worker.');
    }

    try {
      const documentResult = await this.documents.getById(job.document_id);
      const versionResult = await this.versions.getLatestByDocument(job.document_id);
      if (!documentResult.ok || !documentResult.data) throw new Error(documentResult.error || 'Archive document not found');
      if (!versionResult.ok || !versionResult.data) throw new Error(versionResult.error || 'Archive document version not found');

      const version = versionResult.data;
      const file = await this.storage.read(version.file_path);
      const extracted = await this.extractor.extractPdf(file);
      if (extracted.extraction_status === 'failed') {
        const versionUpdate = await this.versions.update(version.id, {
          extraction_status: 'failed',
          extraction_error: extracted.error || 'PDF extraction failed'
        });
        if (!versionUpdate.ok) throw new Error(versionUpdate.error || 'Could not record PDF extraction failure');
        const documentUpdate = await this.documents.updateStatus(job.document_id, 'failed');
        if (!documentUpdate.ok) throw new Error(documentUpdate.error || 'Could not mark failed archive document');
        const jobUpdate = await this.documents.updateClaimedImportJob(jobId, job.worker_id, {
          status: 'failed',
          last_error: extracted.error || 'PDF extraction failed',
          completed_at: new Date().toISOString(),
          locked_at: null,
          worker_id: null
        });
        if (!jobUpdate.ok || !jobUpdate.data) {
          throw new Error(jobUpdate.error || 'Archive import lease was lost before failure could be recorded');
        }
        return { status: 'failed' };
      }

      const metadata = job.metadata || {};
      const index = await this.indexer.writeIndex({
        document: documentResult.data,
        version,
        extractedText: extracted.text,
        documentNumber: typeof metadata.document_number === 'string' ? metadata.document_number : null,
        customerName: typeof metadata.customer_name === 'string' ? metadata.customer_name : null,
        customerPhone: typeof metadata.customer_phone === 'string' ? metadata.customer_phone : null,
        contractNumber: typeof metadata.contract_number === 'string' ? metadata.contract_number : null,
        containerNumber: typeof metadata.container_number === 'string' ? metadata.container_number : null,
        metadata
      });
      if (isLocalArchiveEnabled()) {
        const searchIndex = getLocalArchiveDatabase().writeSearchIndex(index, version.id);
        if (!searchIndex.ok) throw new Error(searchIndex.error || 'Could not write local archive search index');
      }
      const versionUpdate = await this.versions.update(version.id, {
        json_path: version.json_path,
        extraction_status: extracted.extraction_status,
        ocr_status: extracted.ocr_status
      });
      if (!versionUpdate.ok) throw new Error(versionUpdate.error || 'Could not update archive extraction status');
      const status = extracted.ocr_status === 'pending' ? 'needs_ocr' : 'indexed';
      const jobUpdate = await this.documents.updateClaimedImportJob(jobId, job.worker_id, {
        status,
        completed_at: new Date().toISOString(),
        last_error: null,
        locked_at: null,
        worker_id: null
      });
      if (!jobUpdate.ok || !jobUpdate.data) {
        throw new Error(jobUpdate.error || 'Archive import lease was lost before completion');
      }
      const documentUpdate = await this.documents.updateStatus(job.document_id, 'active');
      if (!documentUpdate.ok) throw new Error(documentUpdate.error || 'Could not activate indexed archive document');
      logEvent('archive.import.processed', { jobId, documentId: job.document_id, status });
      return { status, index };
    } catch (error) {
      logError('archive.import.process', error, { jobId, documentId: job.document_id });
      throw error;
    }
  }

  private validatePdfInput(input: ImportDocumentInput): void {
    if (!input.file || input.file.byteLength === 0) throw new Error('PDF file is empty');
    if (input.file.byteLength > MAX_FILE_SIZE_BYTES) throw new Error('PDF file exceeds the 4 MB limit');
    if (!input.source_filename.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files are supported');
    if (input.mime_type && input.mime_type !== 'application/pdf') throw new Error('Unsupported document MIME type');
    if (Buffer.from(input.file.subarray(0, 5)).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF signature');
  }

  private archiveType(type: ArchiveDocumentType): 'contract' | 'receipt' | 'attachment' | 'customer' {
    return type === 'customer_document' ? 'customer' : type;
  }
}