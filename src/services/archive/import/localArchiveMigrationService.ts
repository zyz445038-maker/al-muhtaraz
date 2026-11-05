import { createHash } from 'node:crypto';
import { ArchiveDocument, ArchiveDocumentVersion, ArchiveIndexData } from '@/services/archive/types';
import { getLocalArchiveDatabase } from '@/services/archive/storage/localArchiveDatabase';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { buildArchiveDocumentPath } from '@/services/archive/storage/storagePath';
import { BasicPdfTextExtractor } from '@/services/archive/indexing/textExtractor';
import { ArchiveDocumentIndexer } from '@/services/archive/indexing/documentIndexer';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

type CloudArchiveClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

interface MigrationBatchResult {
  processedDocuments: number;
  processedVersions: number;
  indexedVersions: number;
  totalDocuments: number;
  nextOffset: number;
  hasMore: boolean;
}

interface IndexedVersion {
  versionId: string;
  index: ArchiveIndexData;
}

const STORAGE_BUCKET = 'documents';
const MAX_MIGRATION_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const VERSION_PAGE_SIZE = 500;
const DOCUMENT_TYPES = new Set(['contract', 'receipt', 'attachment', 'customer_document']);
const DOCUMENT_STATUSES = new Set(['active', 'archived', 'legal_hold', 'quarantined', 'failed']);
const SOURCE_TYPES = new Set(['upload', 'zip_import', 'legacy_import', 'generated']);
const CONTENT_TYPES = new Set(['pdf_text', 'pdf_scan', 'image']);
const EXTRACTION_STATUSES = new Set(['pending', 'completed', 'failed']);
const OCR_STATUSES = new Set(['not_required', 'pending', 'completed', 'failed']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCloudDocument(value: unknown): ArchiveDocument {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.document_type !== 'string'
    || !DOCUMENT_TYPES.has(value.document_type)
    || typeof value.status !== 'string'
    || !DOCUMENT_STATUSES.has(value.status)
    || typeof value.source_type !== 'string'
    || !SOURCE_TYPES.has(value.source_type)
    || typeof value.created_at !== 'string'
    || typeof value.updated_at !== 'string') {
    throw new Error('Supabase returned an invalid archive document record.');
  }
  return {
    id: value.id,
    document_type: value.document_type as ArchiveDocument['document_type'],
    customer_id: typeof value.customer_id === 'string' ? value.customer_id : null,
    contract_id: typeof value.contract_id === 'string' ? value.contract_id : null,
    current_version_id: typeof value.current_version_id === 'string' ? value.current_version_id : null,
    status: value.status as ArchiveDocument['status'],
    source_type: value.source_type as ArchiveDocument['source_type'],
    original_filename: typeof value.original_filename === 'string' ? value.original_filename : null,
    created_by: typeof value.created_by === 'string' ? value.created_by : null,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

function parseCloudVersion(value: unknown): ArchiveDocumentVersion {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.document_id !== 'string'
    || !Number.isSafeInteger(value.version_number)
    || Number(value.version_number) < 1
    || typeof value.file_path !== 'string'
    || typeof value.json_path !== 'string'
    || typeof value.mime_type !== 'string'
    || !Number.isSafeInteger(value.file_size)
    || typeof value.sha256 !== 'string'
    || typeof value.content_type !== 'string'
    || !CONTENT_TYPES.has(value.content_type)
    || typeof value.extraction_status !== 'string'
    || !EXTRACTION_STATUSES.has(value.extraction_status)
    || typeof value.ocr_status !== 'string'
    || !OCR_STATUSES.has(value.ocr_status)
    || typeof value.created_at !== 'string') {
    throw new Error('Supabase returned an invalid archive document version.');
  }
  return {
    id: value.id,
    document_id: value.document_id,
    version_number: Number(value.version_number),
    file_path: value.file_path,
    json_path: value.json_path,
    original_filename: typeof value.original_filename === 'string' ? value.original_filename : null,
    mime_type: value.mime_type,
    file_size: Number(value.file_size),
    sha256: value.sha256,
    content_type: value.content_type as ArchiveDocumentVersion['content_type'],
    extraction_status: value.extraction_status as ArchiveDocumentVersion['extraction_status'],
    ocr_status: value.ocr_status as ArchiveDocumentVersion['ocr_status'],
    extraction_error: typeof value.extraction_error === 'string' ? value.extraction_error : null,
    created_at: value.created_at,
  };
}

function isIndexData(value: unknown, documentId: string): value is ArchiveIndexData {
  return isRecord(value)
    && value.document_id === documentId
    && (value.document_number === null || typeof value.document_number === 'string')
    && (value.customer_name === null || typeof value.customer_name === 'string')
    && (value.customer_phone === null || typeof value.customer_phone === 'string')
    && (value.contract_number === null || typeof value.contract_number === 'string')
    && (value.container_number === null || typeof value.container_number === 'string')
    && typeof value.extracted_text === 'string'
    && isRecord(value.metadata)
    && typeof value.indexed_at === 'string';
}

function isMissingStorageObject(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return String(error.statusCode || error.status || '') === '404'
    || /object not found/i.test(String(error.message || ''));
}

async function downloadObject(
  client: CloudArchiveClient,
  objectPath: string,
  optional = false,
): Promise<Buffer | null> {
  const { data, error } = await client.storage.from(STORAGE_BUCKET).download(objectPath);
  if (error) {
    if (optional && isMissingStorageObject(error)) return null;
    throw new Error(`Could not download archive object "${objectPath}": ${error.message}`);
  }
  if (!data) {
    if (optional) return null;
    throw new Error(`Supabase returned no data for archive object "${objectPath}".`);
  }
  if (data.size > MAX_MIGRATION_FILE_SIZE_BYTES) {
    throw new Error(`Archive object "${objectPath}" exceeds the 100 MB local migration limit.`);
  }
  return Buffer.from(await data.arrayBuffer());
}

async function readLocalIndex(
  storage: LocalArchiveStorageService,
  jsonPath: string,
  documentId: string,
): Promise<ArchiveIndexData | null> {
  if (!await storage.exists(jsonPath)) return null;
  const contents = await storage.read(jsonPath);
  try {
    const parsed: unknown = JSON.parse(contents.toString('utf8'));
    return isIndexData(parsed, documentId) ? parsed : null;
  } catch {
    return null;
  }
}

async function mirrorVersion(
  client: CloudArchiveClient,
  document: ArchiveDocument,
  cloudVersion: ArchiveDocumentVersion,
  storage: LocalArchiveStorageService,
): Promise<{ version: ArchiveDocumentVersion; index: ArchiveIndexData | null }> {
  const type = document.document_type === 'customer_document' ? 'customer' : document.document_type;
  const isPdf = cloudVersion.mime_type.toLowerCase() === 'application/pdf'
    || cloudVersion.content_type === 'pdf_text'
    || cloudVersion.content_type === 'pdf_scan';
  const extension = isPdf ? 'pdf' : 'bin';
  const filePath = buildArchiveDocumentPath(type, document.id, `v${cloudVersion.version_number}`, extension);
  const jsonPath = buildArchiveDocumentPath(type, document.id, `v${cloudVersion.version_number}`, 'json');
  const version: ArchiveDocumentVersion = { ...cloudVersion, file_path: filePath, json_path: jsonPath };
  const existing = getLocalArchiveDatabase().getVersion(version.id);
  if (!existing.ok) throw new Error(existing.error || 'Could not check the local archive version.');

  let file: Buffer;
  const localFileIsCurrent = existing.data?.sha256 === version.sha256 && await storage.exists(filePath);
  if (localFileIsCurrent) {
    const localHash = await storage.sha256(filePath);
    if (localHash === version.sha256) {
      file = await storage.read(filePath);
    } else {
      file = (await downloadObject(client, cloudVersion.file_path))!;
      await verifyAndWriteFile(storage, filePath, file, version);
    }
  } else {
    file = (await downloadObject(client, cloudVersion.file_path))!;
    await verifyAndWriteFile(storage, filePath, file, version);
  }

  let index = await readLocalIndex(storage, jsonPath, document.id);
  if (!index && cloudVersion.json_path) {
    const cloudIndex = await downloadObject(client, cloudVersion.json_path, true);
    if (cloudIndex) {
      try {
        const parsed: unknown = JSON.parse(cloudIndex.toString('utf8'));
        if (isIndexData(parsed, document.id)) index = parsed;
      } catch {
        index = null;
      }
    }
  }

  if (!index && isPdf) {
    const extracted = await new BasicPdfTextExtractor().extractPdf(file);
    version.extraction_status = extracted.extraction_status;
    version.ocr_status = extracted.ocr_status;
    version.extraction_error = extracted.error || null;
    if (extracted.extraction_status === 'completed') {
      index = await new ArchiveDocumentIndexer(storage).writeIndex({
        document,
        version,
        extractedText: extracted.text,
      });
    }
  } else if (index) {
    await storage.writeAtomically(jsonPath, JSON.stringify(index, null, 2));
  }

  return { version, index };
}

async function verifyAndWriteFile(
  storage: LocalArchiveStorageService,
  filePath: string,
  file: Buffer,
  version: ArchiveDocumentVersion,
): Promise<void> {
  if (file.length !== version.file_size) {
    throw new Error(`Downloaded archive version "${version.id}" has an unexpected file size.`);
  }
  const hash = createHash('sha256').update(file).digest('hex');
  if (hash.toLowerCase() !== version.sha256.toLowerCase()) {
    throw new Error(`Downloaded archive version "${version.id}" failed its SHA-256 integrity check.`);
  }
  await storage.writeAtomically(filePath, file);
}

export async function migrateCloudArchiveBatch(
  client: CloudArchiveClient,
  offset: number,
  batchSize: number,
): Promise<MigrationBatchResult> {
  const { data: rawDocuments, count, error: documentError } = await client
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + batchSize - 1);
  if (documentError) throw new Error(`Could not list cloud archive documents: ${documentError.message}`);

  const documents = (rawDocuments || []).map(parseCloudDocument);
  const ids = documents.map(document => document.id);
  const versions: ArchiveDocumentVersion[] = [];
  if (ids.length) {
    let versionOffset = 0;
    while (true) {
      const { data: rawVersions, error: versionError } = await client
        .from('document_versions')
        .select('*')
        .in('document_id', ids)
        .order('document_id', { ascending: true })
        .order('version_number', { ascending: true })
        .range(versionOffset, versionOffset + VERSION_PAGE_SIZE - 1);
      if (versionError) throw new Error(`Could not list cloud archive versions: ${versionError.message}`);
      const page = (rawVersions || []).map(parseCloudVersion);
      versions.push(...page);
      if (page.length < VERSION_PAGE_SIZE) break;
      versionOffset += VERSION_PAGE_SIZE;
    }
  }

  const versionsByDocument = new Map<string, ArchiveDocumentVersion[]>();
  for (const version of versions) {
    const group = versionsByDocument.get(version.document_id) || [];
    group.push(version);
    versionsByDocument.set(version.document_id, group);
  }

  let processedVersions = 0;
  let indexedVersions = 0;
  const database = getLocalArchiveDatabase();
  const storage = new LocalArchiveStorageService();
  await storage.ensureDirectories();

  for (const document of documents) {
    const mirroredVersions: ArchiveDocumentVersion[] = [];
    const indexes: IndexedVersion[] = [];
    for (const version of versionsByDocument.get(document.id) || []) {
      const mirrored = await mirrorVersion(client, document, version, storage);
      mirroredVersions.push(mirrored.version);
      if (mirrored.index) indexes.push({ versionId: mirrored.version.id, index: mirrored.index });
    }

    const mirroredDocument = database.mirrorCloudDocument(document, mirroredVersions);
    if (!mirroredDocument.ok) {
      throw new Error(mirroredDocument.error || `Could not save local document ${document.id}.`);
    }
    for (const item of indexes) {
      const result = database.writeSearchIndex(item.index, item.versionId);
      if (!result.ok) {
        throw new Error(result.error || `Could not index local document ${document.id}.`);
      }
      indexedVersions += 1;
    }
    processedVersions += mirroredVersions.length;
  }

  const nextOffset = offset + documents.length;
  const totalDocuments = count ?? nextOffset;
  return {
    processedDocuments: documents.length,
    processedVersions,
    indexedVersions,
    totalDocuments,
    nextOffset,
    hasMore: nextOffset < totalDocuments,
  };
}
