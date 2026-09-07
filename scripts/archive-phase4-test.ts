import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DocumentImportService } from '@/services/archive/import/documentImportService';
import { LocalDocumentIndexer } from '@/services/archive/indexing/documentIndexer';
import { BasicPdfTextExtractor } from '@/services/archive/indexing/textExtractor';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { ArchiveDocument, ArchiveDocumentVersion, DocumentImportJob } from '@/services/archive/types';

const textPdf = Buffer.from('%PDF-1.4\nBT\n(CTR-1001) Tj\n(Hello archive) Tj\nET\n%%EOF');
const emptyPdf = Buffer.from('%PDF-1.4\n%%EOF');

class FakeArchiveRepositories {
  documents = new Map<string, ArchiveDocument>();
  versions = new Map<string, ArchiveDocumentVersion>();
  jobs = new Map<string, DocumentImportJob>();
  duplicateVersion: { id: string; document_id: string } | null = null;
  nextId = 0;

  private id(prefix: string) { this.nextId += 1; return `${prefix}-${this.nextId}`; }

  async create(input: any) {
    const now = new Date().toISOString();
    const document = { id: this.id('doc'), current_version_id: null, created_at: now, updated_at: now, customer_id: null, contract_id: null, created_by: null, status: 'active', ...input } as ArchiveDocument;
    this.documents.set(document.id, document);
    return { ok: true, data: document };
  }

  async setCurrentVersion(id: string, currentVersionId: string) {
    const document = this.documents.get(id)!;
    document.current_version_id = currentVersionId;
    return { ok: true, data: document };
  }

  async registerImportJob(input: any) {
    const now = new Date().toISOString();
    const job = { id: this.id('job'), status: 'queued', attempts: 0, max_attempts: 3, last_error: null, locked_at: null, worker_id: null, started_at: null, completed_at: null, created_at: now, updated_at: now, priority: 0, metadata: {}, ...input } as DocumentImportJob;
    this.jobs.set(job.id, job);
    return { ok: true, data: job };
  }

  async findVersionBySha256(_sha256: string) {
    return { ok: true, data: this.duplicateVersion };
  }

  async getById(id: string) { return { ok: true, data: this.documents.get(id) || null }; }
  async getImportJob(id: string) { return { ok: true, data: this.jobs.get(id) || null }; }
  async updateStatus(id: string, status: any) { const document = this.documents.get(id)!; document.status = status; return { ok: true, data: document }; }
  async updateImportJob(id: string, updates: any) { const job = this.jobs.get(id)!; Object.assign(job, updates); return { ok: true, data: job }; }

  async createVersion(input: any) {
    const version = { id: this.id('version'), created_at: new Date().toISOString(), original_filename: null, extraction_status: 'pending', ocr_status: 'not_required', extraction_error: null, ...input } as ArchiveDocumentVersion;
    this.versions.set(version.id, version);
    return { ok: true, data: version };
  }

  async getLatestByDocument(documentId: string) {
    const version = [...this.versions.values()].find(item => item.document_id === documentId) || null;
    return { ok: true, data: version };
  }

  async updateVersion(id: string, updates: any) { const version = this.versions.get(id)!; Object.assign(version, updates); return { ok: true, data: version }; }
}

async function main() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'muhtaraz-phase4-'));
  process.env.ARCHIVE_STORAGE_ROOT = root;
  const storage = new LocalArchiveStorageService();
  await storage.ensureDirectories();
  const repositories = new FakeArchiveRepositories();
  const extractor = new BasicPdfTextExtractor();
  const indexer = new LocalDocumentIndexer(storage);
  const service = new DocumentImportService(
    repositories as any,
    { create: repositories.createVersion.bind(repositories), getLatestByDocument: repositories.getLatestByDocument.bind(repositories), update: repositories.updateVersion.bind(repositories) } as any,
    storage,
    extractor,
    indexer
  );

  const extracted = await extractor.extractPdf(textPdf);
  assert.equal(extracted.content_type, 'pdf_text');
  assert.match(extracted.text, /CTR-1001/);

  const emptyExtracted = await extractor.extractPdf(emptyPdf);
  assert.equal(emptyExtracted.content_type, 'pdf_scan');
  assert.equal(emptyExtracted.ocr_status, 'pending');

  await assert.rejects(() => service.importPdf({ document_type: 'contract', source_type: 'upload', source_filename: 'note.txt', file: textPdf }), /Only PDF/);
  await assert.rejects(() => service.importPdf({ document_type: 'contract', source_type: 'upload', source_filename: 'broken.pdf', file: Buffer.from('not pdf') }), /Invalid PDF/);
  await assert.rejects(() => service.importPdf({ document_type: 'contract', source_type: 'upload', source_filename: 'empty.pdf', file: Buffer.alloc(0) }), /empty/);

  const imported = await service.importPdf({
    document_type: 'contract',
    source_type: 'upload',
    source_filename: 'CTR-1001.pdf',
    file: textPdf,
    document_number: 'CTR-1001',
    customer_name: 'Test Customer',
    customer_phone: '0500000000',
    contract_number: 'CTR-1001',
    container_number: 'D-201'
  });
  assert.equal(imported.duplicate, false);
  assert.ok(imported.jobId && imported.versionId);

  const processed = await service.processImportJob(imported.jobId!);
  assert.equal(processed.status, 'indexed');
  const indexedVersion = repositories.versions.get(imported.versionId!)!;
  const indexedJson = await readFile(path.join(root, indexedVersion.json_path), 'utf8');
  assert.match(indexedJson, /CTR-1001/);
  assert.match(indexedJson, /Test Customer/);
  assert.equal(repositories.jobs.get(imported.jobId!)?.status, 'indexed');

  repositories.duplicateVersion = { id: imported.versionId!, document_id: imported.documentId };
  const duplicate = await service.importPdf({ document_type: 'contract', source_type: 'upload', source_filename: 'copy.pdf', file: textPdf });
  assert.equal(duplicate.duplicate, true);

  repositories.duplicateVersion = null;
  const emptyImport = await service.importPdf({ document_type: 'contract', source_type: 'upload', source_filename: 'scan.pdf', file: emptyPdf });
  const emptyProcessed = await service.processImportJob(emptyImport.jobId!);
  assert.equal(emptyProcessed.status, 'needs_ocr');

  const brokenJob = await service.importPdf({ document_type: 'contract', source_type: 'upload', source_filename: 'read-failure.pdf', file: textPdf });
  const brokenVersion = repositories.versions.get(brokenJob.versionId!)!;
  brokenVersion.file_path = 'contracts/pdf/missing.pdf';
  await assert.rejects(() => service.processImportJob(brokenJob.jobId!), /ENOENT|no such file/i);
  assert.equal(repositories.jobs.get(brokenJob.jobId!)?.status, 'failed');

  console.log('Archive phase 4 tests passed.');
  await rm(root, { recursive: true, force: true });
}

main().catch(error => {
  console.error('Archive phase 4 tests failed:', error);
  process.exitCode = 1;
});
