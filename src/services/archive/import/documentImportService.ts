import { randomUUID } from 'crypto';
import { logError, logEvent } from '@/lib/eventLogger';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { DocumentIndexer, LocalDocumentIndexer } from '@/services/archive/indexing/documentIndexer';
import { BasicPdfTextExtractor, TextExtractor } from '@/services/archive/indexing/textExtractor';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { buildArchiveDocumentPath } from '@/services/archive/storage/storagePath';
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

type ImportDocumentRepository = Pick<DocumentRepository, 'create' | 'setCurrentVersion' | 'registerImportJob' | 'findVersionBySha256' | 'getById' | 'getImportJob' | 'updateStatus' | 'updateImportJob'>;
type ImportVersionRepository = Pick<DocumentVersionRepository, 'create' | 'getLatestByDocument' | 'update'>;

export class DocumentImportService {
  constructor(
    private readonly documents = new DocumentRepository(),
    private readonly versions = new DocumentVersionRepository(),
    private readonly storage = new LocalArchiveStorageService(),
    private readonly extractor: TextExtractor = new BasicPdfTextExtractor(),
    private readonly indexer: DocumentIndexer = new LocalDocumentIndexer(storage)
  ) {}

  async importPdf(input: ImportDocumentInput): Promise<DocumentImportResult> {
    this.validatePdfInput(input);
    await this.storage.ensureDirectories();
    const temporaryPath = `imports/processing/${randomUUID()}.pdf`;
    await this.storage.writeAtomically(temporaryPath, input.file);
    const sha256 = await this.storage.sha256(temporaryPath);

    const duplicate = await this.documents.findVersionBySha256(sha256);
    if (!duplicate.ok) {
      await this.storage.removeTemporary(temporaryPath);
      throw new Error(duplicate.error || 'Could not check archive duplicate');
    }

    if (duplicate.data) {
      await this.storage.removeTemporary(temporaryPath);
      logEvent('archive.import.duplicate', { documentId: duplicate.data.document_id, sha256 });
      return { duplicate: true, documentId: duplicate.data.document_id, sha256 };
    }

    let documentId: string | undefined;
    let finalPath: string | undefined;
    try {
      const documentResult = await this.documents.create(input);
      if (!documentResult.ok || !documentResult.data) throw new Error(documentResult.error || 'Could not create archive document');
      documentId = documentResult.data.id;

      const versionNumber = 1;
      const versionPathKey = `v${versionNumber}`;
      finalPath = buildArchiveDocumentPath(this.archiveType(input.document_type), documentId, versionPathKey, 'pdf');
      const jsonPath = buildArchiveDocumentPath(this.archiveType(input.document_type), documentId, versionPathKey, 'json');
      await this.storage.writeAtomically(finalPath, input.file);
      await this.storage.removeTemporary(temporaryPath);

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
          ...(input.metadata || {})
        }
      });
      if (!jobResult.ok || !jobResult.data) throw new Error(jobResult.error || 'Could not create import job');

      logEvent('archive.import.accepted', { documentId, versionId: versionResult.data.id, jobId: jobResult.data.id, sha256 });
      return { duplicate: false, documentId, versionId: versionResult.data.id, jobId: jobResult.data.id, sha256 };
    } catch (error) {
      logError('archive.import', error, { documentId, finalPath, sha256 });
      if (finalPath && await this.storage.exists(finalPath)) await this.storage.logicallyArchive(finalPath);
      if (await this.storage.exists(temporaryPath)) await this.storage.removeTemporary(temporaryPath);
      if (documentId) await this.documents.updateStatus(documentId, 'failed');
      throw error;
    }
  }

  async processImportJob(jobId: string): Promise<{ status: DocumentImportJob['status']; index?: ArchiveIndexData }> {
    const jobResult = await this.documents.getImportJob(jobId);
    if (!jobResult.ok || !jobResult.data) throw new Error(jobResult.error || 'Import job not found');
    const job = jobResult.data;
    await this.documents.updateImportJob(jobId, { status: 'processing', attempts: job.attempts + 1, started_at: new Date().toISOString() });

    try {
      const documentResult = await this.documents.getById(job.document_id);
      const versionResult = await this.versions.getLatestByDocument(job.document_id);
      if (!documentResult.ok || !documentResult.data) throw new Error(documentResult.error || 'Archive document not found');
      if (!versionResult.ok || !versionResult.data) throw new Error(versionResult.error || 'Archive document version not found');

      const version = versionResult.data;
      const file = await this.storage.read(version.file_path);
      const extracted = await this.extractor.extractPdf(file);
      if (extracted.extraction_status === 'failed') {
        await this.versions.update(version.id, { extraction_status: 'failed', extraction_error: extracted.error || 'PDF extraction failed' });
        await this.documents.updateImportJob(jobId, { status: 'failed', last_error: extracted.error || 'PDF extraction failed', completed_at: new Date().toISOString() });
        await this.documents.updateStatus(job.document_id, 'failed');
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
      await this.versions.update(version.id, { json_path: version.json_path, extraction_status: extracted.extraction_status, ocr_status: extracted.ocr_status });
      const status = extracted.ocr_status === 'pending' ? 'needs_ocr' : 'indexed';
      await this.documents.updateImportJob(jobId, { status, completed_at: new Date().toISOString(), last_error: null });
      await this.documents.updateStatus(job.document_id, 'active');
      logEvent('archive.import.processed', { jobId, documentId: job.document_id, status });
      return { status, index };
    } catch (error) {
      logError('archive.import.process', error, { jobId, documentId: job.document_id });
      await this.documents.updateImportJob(jobId, { status: 'failed', last_error: error instanceof Error ? error.message : 'Import processing failed', completed_at: new Date().toISOString() });
      await this.documents.updateStatus(job.document_id, 'failed');
      throw error;
    }
  }

  private validatePdfInput(input: ImportDocumentInput): void {
    if (!input.file || input.file.byteLength === 0) throw new Error('PDF file is empty');
    if (!input.source_filename.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files are supported');
    if (input.mime_type && input.mime_type !== 'application/pdf') throw new Error('Unsupported document MIME type');
    if (Buffer.from(input.file.subarray(0, 5)).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF signature');
  }

  private archiveType(type: ArchiveDocumentType): 'contract' | 'receipt' | 'attachment' | 'customer' {
    return type === 'customer_document' ? 'customer' : type;
  }
}