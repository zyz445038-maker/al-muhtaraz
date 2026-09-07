import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { DocumentVersionRepository } from '@/services/archive/documents/documentVersionRepository';
import { LocalArchiveStorageService } from '@/services/archive/storage/localStorageService';
import { buildArchiveDocumentPath, resolveArchivePath } from '@/services/archive/storage/storagePath';

class FakeQuery implements PromiseLike<{ data: unknown; error: unknown }> {
  constructor(
    private readonly result: { data: unknown; error: unknown },
    private readonly calls: Array<Record<string, unknown>>,
    private readonly table: string
  ) {}

  insert(value: unknown) { this.calls.push({ operation: 'insert', table: this.table, value }); return this; }
  update(value: unknown) { this.calls.push({ operation: 'update', table: this.table, value }); return this; }
  select(value = '*') { this.calls.push({ operation: 'select', table: this.table, value }); return this; }
  eq(field: string, value: unknown) { this.calls.push({ operation: 'eq', table: this.table, field, value }); return this; }
  order(field: string, options: unknown) { this.calls.push({ operation: 'order', table: this.table, field, options }); return this; }
  single() { return this; }
  maybeSingle() { return this; }
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

class FakeClient {
  public calls: Array<Record<string, unknown>> = [];

  constructor(private readonly error: unknown = null) {}

  from(table: string) {
    const data = table === 'documents'
      ? { id: 'doc-1', document_type: 'contract', status: 'active' }
      : table === 'document_versions'
        ? { id: 'version-1', document_id: 'doc-1', version_number: 1, sha256: 'a'.repeat(64) }
        : { id: 'job-1', document_id: 'doc-1', status: 'queued' };
    return new FakeQuery({ data, error: this.error }, this.calls, table);
  }
}

async function testStorage() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'muhtaraz-archive-'));
  process.env.ARCHIVE_STORAGE_ROOT = root;
  const storage = new LocalArchiveStorageService();

  await storage.ensureDirectories();
  const relativePath = buildArchiveDocumentPath('contract', 'doc-1', 'version-1', 'pdf');
  await storage.writeAtomically(relativePath, Buffer.from('archive-test'));

  assert.equal(await storage.exists(relativePath), true);
  assert.equal(await storage.sha256(relativePath), '9c5daddae0b6cd88371fd9253fcc4adc1d75ae54313a35eb5d7509a4849d070d');

  await assert.rejects(() => storage.read('contracts/pdf/missing/version-1.pdf'));
}

async function testStorageSecurity() {
  process.env.ARCHIVE_STORAGE_ROOT = path.join(os.tmpdir(), 'muhtaraz-archive-security');
  assert.throws(() => resolveArchivePath('../outside'), /Unsafe archive path|escapes storage root/);
  assert.throws(() => buildArchiveDocumentPath('contract', '../document', 'version-1'), /Unsafe archive document id/);
  assert.throws(() => buildArchiveDocumentPath('contract', 'doc-1', 'version/1'), /Unsafe archive version id/);
}

async function testRepositories() {
  const client = new FakeClient();
  const documents = new DocumentRepository(client);
  const versions = new DocumentVersionRepository(client);

  const document = await documents.create({ document_type: 'contract', source_type: 'upload', original_filename: 'contract.pdf' });
  assert.equal(document.ok, true);
  assert.equal((document.data as { id: string }).id, 'doc-1');

  const version = await versions.create({
    document_id: 'doc-1',
    version_number: 1,
    file_path: 'contracts/pdf/doc-1/version-1.pdf',
    json_path: 'contracts/json/doc-1/version-1.json',
    mime_type: 'application/pdf',
    file_size: 12,
    sha256: 'a'.repeat(64),
    content_type: 'pdf_text'
  });
  assert.equal(version.ok, true);
  assert.equal((version.data as { document_id: string }).document_id, 'doc-1');

  const job = await documents.registerImportJob({
    document_id: 'doc-1',
    source_type: 'upload',
    source_path: 'imports/incoming/contract.pdf'
  });
  assert.equal(job.ok, true);
  assert.equal((job.data as { document_id: string }).document_id, 'doc-1');
  assert.ok(client.calls.some(call => call.table === 'document_import_jobs' && call.operation === 'insert'));
}

async function testDatabaseFailure() {
  const repository = new DocumentRepository(new FakeClient({ code: 'DB_DOWN', message: 'database unavailable' }));
  const result = await repository.getById('doc-1');
  assert.equal(result.ok, false);
  assert.match(result.error || '', /database unavailable/);
}

async function testMigrationDefinition() {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '001_create_archive_documents.sql');
  const migration = await readFile(migrationPath, 'utf8');
  for (const table of ['documents', 'document_versions', 'customer_archive_snapshot', 'document_import_jobs']) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  }
  assert.match(migration, /document_versions_document_sha_unique/);
  assert.match(migration, /idx_document_import_jobs_queue/);
  assert.match(migration, /ON DELETE RESTRICT/);
}

async function main() {
  await testStorage();
  await testStorageSecurity();
  await testRepositories();
  await testDatabaseFailure();
  await testMigrationDefinition();
  console.log('Archive phase 3 tests passed.');
}

main()
  .finally(async () => {
    if (process.env.ARCHIVE_STORAGE_ROOT?.includes('muhtaraz-archive-')) {
      await rm(process.env.ARCHIVE_STORAGE_ROOT, { recursive: true, force: true });
    }
  })
  .catch(error => {
    console.error('Archive phase 3 tests failed:', error);
    process.exitCode = 1;
  });
