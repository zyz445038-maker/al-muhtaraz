import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  ArchiveDocument,
  ArchiveDocumentStatus,
  ArchiveDocumentVersion,
  ArchiveDocumentType,
  ArchiveSourceType,
  ArchiveIndexData,
  DocumentImportJob,
  ImportJobStatus,
  CreateDocumentInput,
  CreateDocumentVersionInput,
  CreateImportJobInput,
} from '@/services/archive/types';
import type { AuthenticatedProfile } from '@/lib/archiveAuthorization';

type LocalQueryResult<T> = {
  ok: boolean;
  data: T | null;
  error?: string;
};

type LocalCachedProfile = {
  id: string;
  role: string;
  is_active: boolean;
  permissions: Record<string, boolean> | null;
  cached_at: string;
  expires_at: string;
};

type LocalArchiveSearchResult = {
  document: ArchiveDocument;
  version: ArchiveDocumentVersion;
  index: ArchiveIndexData;
  score: number;
};

const OFFLINE_PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_INDEX_TEXT_LENGTH = 2_000_000;
const ARCHIVE_SEARCH_STOP_WORDS = new Set([
  'ارشف', 'ارشيف', 'قديم', 'قديمه', 'عقد', 'عقود', 'رقم', 'ابحث',
  'ابغي', 'ابي', 'عن', 'من', 'في', 'على', 'ما', 'هو', 'هي', 'كان',
  'كانت', 'للعقد',
]);

let database: DatabaseSync | undefined;

function getArchiveSearchExpression(queryText: string): string | null {
  const tokens = normalizeArchiveSearchText(queryText).split(/\s+/)
    .filter(token => token.length > 1)
    .slice(0, 12);
  const groups = tokens.flatMap(token => {
    const withoutArticle = token.replace(/^ال/, '');
    if (withoutArticle.length <= 1 || ARCHIVE_SEARCH_STOP_WORDS.has(withoutArticle)) return [];
    const variants = new Set([token, withoutArticle]);
    const expression = [...variants]
      .map(variant => `"${variant.replace(/"/g, '""')}"`)
      .join(' OR ');
    return [variants.size > 1 ? `(${expression})` : expression];
  });
  return groups.length ? groups.join(' AND ') : null;
}

function now(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toSqlValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return JSON.stringify(value);
}

export function normalizeArchiveSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function getDatabasePath(): string {
  const configuredPath = process.env.ARCHIVE_DATABASE_PATH;
  if (!configuredPath) {
    throw new Error('ARCHIVE_DATABASE_PATH is required for the local archive database.');
  }
  return path.resolve(configuredPath);
}

function getDatabase(): DatabaseSync {
  if (database) return database;

  const databasePath = getDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });
  database = new DatabaseSync(databasePath, { timeout: 5000 });
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      document_type TEXT NOT NULL,
      customer_id TEXT,
      contract_id TEXT,
      current_version_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      source_type TEXT NOT NULL,
      original_filename TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
      version_number INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      json_path TEXT NOT NULL,
      original_filename TEXT,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      content_type TEXT NOT NULL,
      extraction_status TEXT NOT NULL DEFAULT 'pending',
      ocr_status TEXT NOT NULL DEFAULT 'not_required',
      extraction_error TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(document_id, version_number),
      UNIQUE(document_id, sha256)
    );

    CREATE TABLE IF NOT EXISTS document_import_jobs (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
      source_type TEXT NOT NULL,
      source_path TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'queued',
      priority INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      next_attempt_at TEXT,
      last_error TEXT,
      locked_at TEXT,
      worker_id TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS archive_search_index (
      rowid INTEGER PRIMARY KEY,
      document_version_id TEXT NOT NULL UNIQUE REFERENCES document_versions(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      normalized_text TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS archive_search_fts USING fts5(
      normalized_text,
      content = 'archive_search_index',
      content_rowid = 'rowid',
      tokenize = 'unicode61'
    );

    CREATE TABLE IF NOT EXISTS archive_offline_profiles (
      user_id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL,
      permissions TEXT,
      cached_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assistant_archive_memory (
      user_id TEXT PRIMARY KEY,
      query_text TEXT NOT NULL,
      query_key TEXT NOT NULL,
      document_ids TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_local_documents_status_created
      ON documents(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_local_versions_document
      ON document_versions(document_id, version_number DESC);
    CREATE INDEX IF NOT EXISTS idx_local_jobs_queue
      ON document_import_jobs(status, priority DESC, created_at);
    CREATE INDEX IF NOT EXISTS idx_local_archive_index_document
      ON archive_search_index(document_id);
  `);
  return database;
}

function query<T>(operation: () => T): LocalQueryResult<T> {
  try {
    return { ok: true, data: operation() };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function mapDocument(row: Record<string, unknown> | undefined): ArchiveDocument | null {
  if (!row) return null;
  return {
    id: String(row.id),
    document_type: String(row.document_type) as ArchiveDocumentType,
    customer_id: row.customer_id === null ? null : String(row.customer_id),
    contract_id: row.contract_id === null ? null : String(row.contract_id),
    current_version_id: row.current_version_id === null ? null : String(row.current_version_id),
    status: String(row.status) as ArchiveDocumentStatus,
    source_type: String(row.source_type) as ArchiveSourceType,
    original_filename: row.original_filename === null ? null : String(row.original_filename),
    created_by: row.created_by === null ? null : String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapVersion(row: Record<string, unknown> | undefined): ArchiveDocumentVersion | null {
  if (!row) return null;
  return {
    id: String(row.id),
    document_id: String(row.document_id),
    version_number: Number(row.version_number),
    file_path: String(row.file_path),
    json_path: String(row.json_path),
    original_filename: row.original_filename === null ? null : String(row.original_filename),
    mime_type: String(row.mime_type),
    file_size: Number(row.file_size),
    sha256: String(row.sha256),
    content_type: String(row.content_type) as ArchiveDocumentVersion['content_type'],
    extraction_status: String(row.extraction_status) as ArchiveDocumentVersion['extraction_status'],
    ocr_status: String(row.ocr_status) as ArchiveDocumentVersion['ocr_status'],
    extraction_error: row.extraction_error === null ? null : String(row.extraction_error),
    created_at: String(row.created_at),
  };
}

function mapJob(row: Record<string, unknown> | undefined): DocumentImportJob | null {
  if (!row) return null;
  return {
    id: String(row.id),
    document_id: String(row.document_id),
    source_type: String(row.source_type) as ArchiveSourceType,
    source_path: String(row.source_path),
    metadata: parseJson<Record<string, unknown>>(row.metadata as string, {}),
    status: String(row.status) as ImportJobStatus,
    priority: Number(row.priority),
    attempts: Number(row.attempts),
    max_attempts: Number(row.max_attempts),
    next_attempt_at: row.next_attempt_at === null ? null : String(row.next_attempt_at),
    last_error: row.last_error === null ? null : String(row.last_error),
    locked_at: row.locked_at === null ? null : String(row.locked_at),
    worker_id: row.worker_id === null ? null : String(row.worker_id),
    started_at: row.started_at === null ? null : String(row.started_at),
    completed_at: row.completed_at === null ? null : String(row.completed_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export class LocalArchiveDatabase {
  mirrorCloudDocument(
    document: ArchiveDocument,
    versions: ArchiveDocumentVersion[],
  ): LocalQueryResult<void> {
    return query(() => {
      if (versions.some(version => version.document_id !== document.id)) {
        throw new Error('A cloud archive version does not belong to the document being mirrored.');
      }

      const db = getDatabase();
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          INSERT INTO documents (
            id, document_type, customer_id, contract_id, current_version_id,
            status, source_type, original_filename, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            document_type = excluded.document_type,
            customer_id = excluded.customer_id,
            contract_id = excluded.contract_id,
            current_version_id = excluded.current_version_id,
            status = excluded.status,
            source_type = excluded.source_type,
            original_filename = excluded.original_filename,
            created_by = excluded.created_by,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `).run(
          document.id,
          document.document_type,
          document.customer_id,
          document.contract_id,
          document.current_version_id,
          document.status,
          document.source_type,
          document.original_filename,
          document.created_by,
          document.created_at,
          document.updated_at,
        );

        const insertVersion = db.prepare(`
          INSERT INTO document_versions (
            id, document_id, version_number, file_path, json_path, original_filename,
            mime_type, file_size, sha256, content_type, extraction_status,
            ocr_status, extraction_error, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            document_id = excluded.document_id,
            version_number = excluded.version_number,
            file_path = excluded.file_path,
            json_path = excluded.json_path,
            original_filename = excluded.original_filename,
            mime_type = excluded.mime_type,
            file_size = excluded.file_size,
            sha256 = excluded.sha256,
            content_type = excluded.content_type,
            extraction_status = excluded.extraction_status,
            ocr_status = excluded.ocr_status,
            extraction_error = excluded.extraction_error,
            created_at = excluded.created_at
        `);
        for (const version of versions) {
          insertVersion.run(
            version.id,
            version.document_id,
            version.version_number,
            version.file_path,
            version.json_path,
            version.original_filename,
            version.mime_type,
            version.file_size,
            version.sha256,
            version.content_type,
            version.extraction_status,
            version.ocr_status,
            version.extraction_error,
            version.created_at,
          );
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    });
  }

  createDocument(input: CreateDocumentInput): LocalQueryResult<ArchiveDocument> {
    return query(() => {
      const timestamp = now();
      const id = randomUUID();
      getDatabase().prepare(`
        INSERT INTO documents (
          id, document_type, customer_id, contract_id, current_version_id,
          status, source_type, original_filename, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.document_type,
        input.customer_id || null,
        input.contract_id || null,
        input.status || 'active',
        input.source_type,
        input.original_filename || null,
        input.created_by || null,
        timestamp,
        timestamp,
      );
      return this.getDocument(id).data!;
    });
  }

  getDocument(id: string): LocalQueryResult<ArchiveDocument | null> {
    return query(() => mapDocument(
      getDatabase().prepare('SELECT * FROM documents WHERE id = ?').get(id) as Record<string, unknown> | undefined,
    ));
  }

  listDocuments(filters: { customerId?: string; contractId?: string; status?: string } = {}): LocalQueryResult<ArchiveDocument[]> {
    return query(() => {
      const clauses: string[] = [];
      const values: string[] = [];
      if (filters.customerId) {
        clauses.push('customer_id = ?');
        values.push(filters.customerId);
      }
      if (filters.contractId) {
        clauses.push('contract_id = ?');
        values.push(filters.contractId);
      }
      if (filters.status) {
        clauses.push('status = ?');
        values.push(filters.status);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return (getDatabase().prepare(`SELECT * FROM documents ${where} ORDER BY created_at DESC`).all(...values) as Record<string, unknown>[])
        .map(row => mapDocument(row)!)
    });
  }

  updateDocumentStatus(id: string, status: ArchiveDocumentStatus): LocalQueryResult<ArchiveDocument | null> {
    return query(() => {
      getDatabase().prepare('UPDATE documents SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
      return this.getDocument(id).data || null;
    });
  }

  setCurrentVersion(id: string, versionId: string): LocalQueryResult<ArchiveDocument | null> {
    return query(() => {
      getDatabase().prepare('UPDATE documents SET current_version_id = ?, updated_at = ? WHERE id = ?').run(versionId, now(), id);
      return this.getDocument(id).data || null;
    });
  }

  createVersion(input: CreateDocumentVersionInput): LocalQueryResult<ArchiveDocumentVersion> {
    return query(() => {
      const id = randomUUID();
      getDatabase().prepare(`
        INSERT INTO document_versions (
          id, document_id, version_number, file_path, json_path, original_filename,
          mime_type, file_size, sha256, content_type, extraction_status,
          ocr_status, extraction_error, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.document_id,
        input.version_number,
        input.file_path,
        input.json_path,
        input.original_filename || null,
        input.mime_type,
        input.file_size,
        input.sha256,
        input.content_type,
        input.extraction_status || 'pending',
        input.ocr_status || 'not_required',
        input.extraction_error || null,
        now(),
      );
      return this.getVersion(id).data!;
    });
  }

  getVersion(id: string): LocalQueryResult<ArchiveDocumentVersion | null> {
    return query(() => mapVersion(
      getDatabase().prepare('SELECT * FROM document_versions WHERE id = ?').get(id) as Record<string, unknown> | undefined,
    ));
  }

  listVersions(documentId: string): LocalQueryResult<ArchiveDocumentVersion[]> {
    return query(() => (getDatabase().prepare(`
      SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC
    `).all(documentId) as Record<string, unknown>[]).map(row => mapVersion(row)!));
  }

  countVersions(): LocalQueryResult<number> {
    return query(() => {
      const row = getDatabase().prepare('SELECT COUNT(*) AS count FROM document_versions').get() as { count: number };
      return Number(row.count);
    });
  }

  getLatestVersion(documentId: string): LocalQueryResult<ArchiveDocumentVersion | null> {
    return query(() => mapVersion(
      getDatabase().prepare(`
        SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC LIMIT 1
      `).get(documentId) as Record<string, unknown> | undefined,
    ));
  }

  updateVersion(
    id: string,
    updates: Partial<Pick<ArchiveDocumentVersion, 'json_path' | 'extraction_status' | 'ocr_status' | 'extraction_error'>>,
  ): LocalQueryResult<ArchiveDocumentVersion | null> {
    return query(() => {
      const fields = Object.keys(updates) as Array<keyof typeof updates>;
      if (fields.length) {
        const assignments = fields.map(field => `${field} = ?`).join(', ');
        getDatabase().prepare(`UPDATE document_versions SET ${assignments} WHERE id = ?`)
          .run(...fields.map(field => updates[field] ?? null), id);
      }
      return this.getVersion(id).data || null;
    });
  }

  createImportJob(input: CreateImportJobInput): LocalQueryResult<DocumentImportJob> {
    return query(() => {
      const timestamp = now();
      const id = crypto.randomUUID();
      getDatabase().prepare(`
        INSERT INTO document_import_jobs (
          id, document_id, source_type, source_path, metadata, priority, max_attempts,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)
      `).run(
        id,
        input.document_id,
        input.source_type,
        input.source_path,
        JSON.stringify(input.metadata || {}),
        input.priority || 0,
        input.max_attempts || 3,
        timestamp,
        timestamp,
      );
      return this.getImportJob(id).data!;
    });
  }

  getImportJob(id: string): LocalQueryResult<DocumentImportJob | null> {
    return query(() => mapJob(
      getDatabase().prepare('SELECT * FROM document_import_jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined,
    ));
  }

  updateImportJob(id: string, updates: Partial<DocumentImportJob>): LocalQueryResult<DocumentImportJob | null> {
    return query(() => {
      const fields = Object.keys(updates) as Array<keyof DocumentImportJob>;
      if (fields.length) {
        const values = fields.map(field => field === 'metadata' ? JSON.stringify(updates[field]) : toSqlValue(updates[field]));
        const assignments = fields.map(field => `${field === 'metadata' ? 'metadata' : field} = ?`).join(', ');
        getDatabase().prepare(`UPDATE document_import_jobs SET ${assignments}, updated_at = ? WHERE id = ?`)
          .run(...values, now(), id);
      }
      return this.getImportJob(id).data || null;
    });
  }

  updateClaimedImportJob(
    id: string,
    workerId: string,
    updates: Partial<DocumentImportJob>,
  ): LocalQueryResult<DocumentImportJob | null> {
    return query(() => {
      const fields = Object.keys(updates) as Array<keyof DocumentImportJob>;
      const values = fields.map(field => field === 'metadata' ? JSON.stringify(updates[field]) : toSqlValue(updates[field]));
      const assignments = fields.map(field => `${field} = ?`).join(', ');
      getDatabase().prepare(`
        UPDATE document_import_jobs SET ${assignments}, updated_at = ?
        WHERE id = ? AND status = 'processing' AND worker_id = ?
      `).run(...values, now(), id, workerId);
      return this.getImportJob(id).data || null;
    });
  }

  findNextQueuedJob(): LocalQueryResult<DocumentImportJob | null> {
    return query(() => mapJob(
      getDatabase().prepare(`
        SELECT * FROM document_import_jobs
        WHERE status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
        ORDER BY priority DESC, created_at ASC LIMIT 1
      `).get(now()) as Record<string, unknown> | undefined,
    ));
  }

  claimImportJob(id: string, workerId: string, attempt: number): LocalQueryResult<DocumentImportJob | null> {
    return query(() => {
      const timestamp = now();
      getDatabase().prepare(`
        UPDATE document_import_jobs SET status = 'processing', attempts = ?, next_attempt_at = NULL,
          worker_id = ?, locked_at = ?, started_at = ?, updated_at = ?
        WHERE id = ? AND status = 'queued'
      `).run(attempt, workerId, timestamp, timestamp, timestamp, id);
      return this.getImportJob(id).data || null;
    });
  }

  listStaleProcessingJobs(staleBefore: string): LocalQueryResult<DocumentImportJob[]> {
    return query(() => (getDatabase().prepare(`
      SELECT * FROM document_import_jobs WHERE status = 'processing' AND locked_at < ?
    `).all(staleBefore) as Record<string, unknown>[]).map(row => mapJob(row)!));
  }

  recoverStaleImportJob(
    job: DocumentImportJob,
    updates: Partial<DocumentImportJob>,
  ): LocalQueryResult<DocumentImportJob | null> {
    return query(() => {
      const fields = Object.keys(updates) as Array<keyof DocumentImportJob>;
      const values = fields.map(field => toSqlValue(updates[field]));
      const assignments = fields.map(field => `${field} = ?`).join(', ');
      getDatabase().prepare(`
        UPDATE document_import_jobs SET ${assignments}, updated_at = ?
        WHERE id = ? AND status = 'processing' AND worker_id = ? AND locked_at = ?
      `).run(...values, now(), job.id, job.worker_id, job.locked_at);
      return this.getImportJob(job.id).data || null;
    });
  }

  findVersionBySha256(sha256: string): LocalQueryResult<{ id: string; document_id: string } | null> {
    return query(() => {
      const row = getDatabase().prepare(`
        SELECT v.id, v.document_id FROM document_versions v
        JOIN documents d ON d.id = v.document_id
        WHERE v.sha256 = ? AND d.status = 'active' LIMIT 1
      `).get(sha256) as { id: string; document_id: string } | undefined;
      return row || null;
    });
  }

  writeSearchIndex(index: ArchiveIndexData, versionId: string): LocalQueryResult<void> {
    return query(() => {
      if (index.extracted_text.length > MAX_INDEX_TEXT_LENGTH) {
        throw new Error('Extracted archive text exceeds the local index size limit.');
      }
      const db = getDatabase();
      const normalizedText = normalizeArchiveSearchText(index.extracted_text);
      db.exec('BEGIN IMMEDIATE');
      try {
        const previous = db.prepare(`
          SELECT rowid, normalized_text FROM archive_search_index WHERE document_version_id = ?
        `).get(versionId) as { rowid: number; normalized_text: string } | undefined;
        if (previous) {
          db.prepare(`
            INSERT INTO archive_search_fts (archive_search_fts, rowid, normalized_text)
            VALUES ('delete', ?, ?)
          `).run(previous.rowid, previous.normalized_text);
        }
        db.prepare(`
          INSERT INTO archive_search_index (
            document_version_id, document_id, normalized_text, indexed_at
          ) VALUES (?, ?, ?, ?)
          ON CONFLICT(document_version_id) DO UPDATE SET
            document_id = excluded.document_id,
            normalized_text = excluded.normalized_text,
            indexed_at = excluded.indexed_at
        `).run(versionId, index.document_id, normalizedText, now());
        const inserted = db.prepare(`
          SELECT rowid FROM archive_search_index WHERE document_version_id = ?
        `).get(versionId) as { rowid: number };
        db.prepare(`
          INSERT INTO archive_search_fts (rowid, normalized_text) VALUES (?, ?)
        `).run(inserted.rowid, normalizedText);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    });
  }

  searchIndexedDocuments(queryText: string, limit = 5, offset = 0): LocalQueryResult<LocalArchiveSearchResult[]> {
    return query(() => {
      const expression = getArchiveSearchExpression(queryText);
      if (!expression) return [];
      const rows = getDatabase().prepare(`
        SELECT d.id AS doc_id, d.document_type, d.customer_id, d.contract_id,
          d.current_version_id, d.status AS document_status, d.source_type,
          d.original_filename AS document_filename, d.created_by,
          d.created_at AS document_created_at, d.updated_at AS document_updated_at,
          v.id AS version_id, v.version_number, v.file_path, v.json_path,
          v.original_filename AS version_filename, v.mime_type, v.file_size,
          v.sha256, v.content_type, v.extraction_status, v.ocr_status,
          v.extraction_error, v.created_at AS version_created_at,
          i.document_id AS index_document_id, i.document_version_id,
          i.indexed_at, bm25(archive_search_fts) AS score
        FROM archive_search_fts
        JOIN archive_search_index i ON i.rowid = archive_search_fts.rowid
        JOIN documents d ON d.id = i.document_id
        JOIN document_versions v ON v.id = i.document_version_id
        WHERE archive_search_fts MATCH ?
          AND d.status = 'active'
          AND d.document_type = 'contract'
          AND d.current_version_id = v.id
          AND v.extraction_status = 'completed'
          AND v.ocr_status IN ('not_required', 'completed')
        ORDER BY score ASC
        LIMIT ? OFFSET ?
      `).all(expression, limit, offset) as Array<Record<string, unknown>>;
      return rows.map(row => {
        const index: ArchiveIndexData = {
          document_id: String(row.index_document_id),
          document_number: null,
          customer_name: null,
          customer_phone: null,
          contract_number: null,
          container_number: null,
          extracted_text: '',
          metadata: {},
          indexed_at: String(row.indexed_at),
        };
        return {
          document: {
            id: String(row.doc_id),
            document_type: String(row.document_type) as ArchiveDocument['document_type'],
            customer_id: row.customer_id as string | null,
            contract_id: row.contract_id as string | null,
            current_version_id: row.current_version_id as string | null,
            status: String(row.document_status) as ArchiveDocument['status'],
            source_type: String(row.source_type) as ArchiveDocument['source_type'],
            original_filename: row.document_filename as string | null,
            created_by: row.created_by as string | null,
            created_at: String(row.document_created_at),
            updated_at: String(row.document_updated_at),
          },
          version: {
            id: String(row.version_id),
            document_id: String(row.doc_id),
            version_number: Number(row.version_number),
            file_path: String(row.file_path),
            json_path: String(row.json_path),
            original_filename: row.version_filename as string | null,
            mime_type: String(row.mime_type),
            file_size: Number(row.file_size),
            sha256: String(row.sha256),
            content_type: String(row.content_type) as ArchiveDocumentVersion['content_type'],
            extraction_status: String(row.extraction_status) as ArchiveDocumentVersion['extraction_status'],
            ocr_status: String(row.ocr_status) as ArchiveDocumentVersion['ocr_status'],
            extraction_error: row.extraction_error as string | null,
            created_at: String(row.version_created_at),
          },
          index,
          score: Number(row.score),
        };
      });
    });
  }

  countIndexedDocuments(queryText: string): LocalQueryResult<number> {
    return query(() => {
      const expression = getArchiveSearchExpression(queryText);
      if (!expression) return 0;
      const row = getDatabase().prepare(`
        SELECT COUNT(*) AS count
        FROM archive_search_fts
        JOIN archive_search_index i ON i.rowid = archive_search_fts.rowid
        JOIN documents d ON d.id = i.document_id
        JOIN document_versions v ON v.id = i.document_version_id
        WHERE archive_search_fts MATCH ?
          AND d.status = 'active'
          AND d.document_type = 'contract'
          AND d.current_version_id = v.id
          AND v.extraction_status = 'completed'
          AND v.ocr_status IN ('not_required', 'completed')
      `).get(expression) as { count: number };
      return Number(row.count);
    });
  }

  getIndexedDocumentsByIds(documentIds: string[], limit = 5): LocalQueryResult<LocalArchiveSearchResult[]> {
    return query(() => {
      const ids = [...new Set(documentIds)].slice(0, limit);
      if (!ids.length) return [];
      const placeholders = ids.map(() => '?').join(', ');
      const rows = getDatabase().prepare(`
        SELECT d.id AS doc_id, d.document_type, d.customer_id, d.contract_id,
          d.current_version_id, d.status AS document_status, d.source_type,
          d.original_filename AS document_filename, d.created_by,
          d.created_at AS document_created_at, d.updated_at AS document_updated_at,
          v.id AS version_id, v.version_number, v.file_path, v.json_path,
          v.original_filename AS version_filename, v.mime_type, v.file_size,
          v.sha256, v.content_type, v.extraction_status, v.ocr_status,
          v.extraction_error, v.created_at AS version_created_at,
          i.document_id AS index_document_id, i.document_version_id,
          i.indexed_at, 0 AS score
        FROM documents d
        JOIN document_versions v ON v.id = d.current_version_id
        JOIN archive_search_index i ON i.document_version_id = v.id
        WHERE d.id IN (${placeholders})
          AND d.status = 'active'
          AND d.document_type = 'contract'
          AND v.extraction_status = 'completed'
          AND v.ocr_status IN ('not_required', 'completed')
      `).all(...ids) as Array<Record<string, unknown>>;
      const results = new Map(rows.map(row => {
        const index: ArchiveIndexData = {
          document_id: String(row.index_document_id),
          document_number: null,
          customer_name: null,
          customer_phone: null,
          contract_number: null,
          container_number: null,
          extracted_text: '',
          metadata: {},
          indexed_at: String(row.indexed_at),
        };
        return [String(row.doc_id), {
          document: {
            id: String(row.doc_id),
            document_type: String(row.document_type) as ArchiveDocument['document_type'],
            customer_id: row.customer_id as string | null,
            contract_id: row.contract_id as string | null,
            current_version_id: row.current_version_id as string | null,
            status: String(row.document_status) as ArchiveDocument['status'],
            source_type: String(row.source_type) as ArchiveDocument['source_type'],
            original_filename: row.document_filename as string | null,
            created_by: row.created_by as string | null,
            created_at: String(row.document_created_at),
            updated_at: String(row.document_updated_at),
          },
          version: {
            id: String(row.version_id),
            document_id: String(row.doc_id),
            version_number: Number(row.version_number),
            file_path: String(row.file_path),
            json_path: String(row.json_path),
            original_filename: row.version_filename as string | null,
            mime_type: String(row.mime_type),
            file_size: Number(row.file_size),
            sha256: String(row.sha256),
            content_type: String(row.content_type) as ArchiveDocumentVersion['content_type'],
            extraction_status: String(row.extraction_status) as ArchiveDocumentVersion['extraction_status'],
            ocr_status: String(row.ocr_status) as ArchiveDocumentVersion['ocr_status'],
            extraction_error: row.extraction_error as string | null,
            created_at: String(row.version_created_at),
          },
          index,
          score: 0,
        } satisfies LocalArchiveSearchResult] as const;
      }));
      return ids.flatMap(id => results.has(id) ? [results.get(id)!] : []);
    });
  }

  saveArchiveMemory(userId: string, queryText: string, queryKey: string, documentIds: string[]): LocalQueryResult<void> {
    return query(() => {
      getDatabase().prepare(`
        INSERT INTO assistant_archive_memory (user_id, query_text, query_key, document_ids, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          query_text = excluded.query_text,
          query_key = excluded.query_key,
          document_ids = excluded.document_ids,
          updated_at = excluded.updated_at
      `).run(userId, queryText, queryKey, JSON.stringify(documentIds.slice(0, 5)), now());
    });
  }

  getArchiveMemory(userId: string): LocalQueryResult<{ query_text: string; query_key: string; document_ids: string[]; updated_at: string } | null> {
    return query(() => {
      const row = getDatabase().prepare(`
        SELECT query_text, query_key, document_ids, updated_at
        FROM assistant_archive_memory WHERE user_id = ?
      `).get(userId) as {
        query_text: string;
        query_key: string;
        document_ids: string;
        updated_at: string;
      } | undefined;
      if (!row) return null;
      return {
        query_text: row.query_text,
        query_key: row.query_key,
        document_ids: parseJson<string[]>(row.document_ids, []),
        updated_at: row.updated_at,
      };
    });
  }

  cacheProfile(profile: AuthenticatedProfile): LocalQueryResult<void> {
    return query(() => {
      const cachedAt = now();
      const expiresAt = new Date(Date.now() + OFFLINE_PROFILE_TTL_MS).toISOString();
      getDatabase().prepare(`
        INSERT INTO archive_offline_profiles (user_id, role, is_active, permissions, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          role = excluded.role,
          is_active = excluded.is_active,
          permissions = excluded.permissions,
          cached_at = excluded.cached_at,
          expires_at = excluded.expires_at
      `).run(
        profile.id,
        profile.role,
        profile.is_active ? 1 : 0,
        JSON.stringify(profile.permissions || {}),
        cachedAt,
        expiresAt,
      );
    });
  }

  getCachedProfile(userId: string): LocalQueryResult<LocalCachedProfile | null> {
    return query(() => {
      const row = getDatabase().prepare(`
        SELECT user_id AS id, role, is_active, permissions, cached_at, expires_at
        FROM archive_offline_profiles WHERE user_id = ? AND expires_at > ?
      `).get(userId, now()) as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        id: String(row.id),
        role: String(row.role),
        is_active: Boolean(row.is_active),
        permissions: parseJson<Record<string, boolean>>(row.permissions as string, {}),
        cached_at: String(row.cached_at),
        expires_at: String(row.expires_at),
      };
    });
  }

  listImportJobs(): LocalQueryResult<DocumentImportJob[]> {
    return query(() => (getDatabase().prepare(`
      SELECT * FROM document_import_jobs ORDER BY created_at DESC
    `).all() as Record<string, unknown>[]).map(row => mapJob(row)!));
  }

  closeForTests(): void {
    database?.close();
    database = undefined;
  }
}

export function isLocalArchiveEnabled(): boolean {
  return Boolean(process.env.ARCHIVE_DATABASE_PATH && process.env.ARCHIVE_STORAGE_ROOT);
}

export function getLocalArchiveDatabase(): LocalArchiveDatabase {
  return new LocalArchiveDatabase();
}
