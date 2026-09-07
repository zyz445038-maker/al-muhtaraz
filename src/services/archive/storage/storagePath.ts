import path from 'path';

const STORAGE_DIRECTORIES = [
  'contracts/pdf',
  'contracts/json',
  'receipts/pdf',
  'receipts/json',
  'customers',
  'attachments',
  'imports/incoming',
  'imports/processing',
  'imports/completed',
  'imports/failed',
  'backups/manifests',
  'backups/snapshots',
  'quarantine'
] as const;

export function getArchiveStorageRoot(): string {
  const configuredRoot = process.env.ARCHIVE_STORAGE_ROOT;
  if (!configuredRoot) {
    throw new Error('ARCHIVE_STORAGE_ROOT is required for local archive storage');
  }

  return path.resolve(configuredRoot);
}

export function getArchiveDirectories(): readonly string[] {
  return STORAGE_DIRECTORIES;
}

export function assertSafeArchiveSegment(value: string, label = 'path segment'): string {
  if (!value || value === '.' || value === '..' || path.isAbsolute(value)) {
    throw new Error(`Unsafe archive ${label}`);
  }

  if (value.includes('/') || value.includes('\\') || value.includes('\0')) {
    throw new Error(`Unsafe archive ${label}`);
  }

  return value;
}

export function resolveArchivePath(relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('Unsafe archive path');
  }

  const root = getArchiveStorageRoot();
  const resolved = path.resolve(root, relativePath);
  const relativeToRoot = path.relative(root, resolved);

  if (!relativeToRoot || relativeToRoot === '..' || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) {
    throw new Error('Archive path escapes storage root');
  }

  return resolved;
}

export function buildArchiveDocumentPath(
  type: 'contract' | 'receipt' | 'attachment' | 'customer',
  documentId: string,
  versionId: string,
  extension: 'pdf' | 'json' | 'bin' = 'pdf'
): string {
  assertSafeArchiveSegment(documentId, 'document id');
  assertSafeArchiveSegment(versionId, 'version id');

  const folder = type === 'contract'
    ? extension === 'json' ? 'contracts/json' : 'contracts/pdf'
    : type === 'receipt'
      ? extension === 'json' ? 'receipts/json' : 'receipts/pdf'
      : type === 'customer' ? 'customers' : 'attachments';

  return path.posix.join(folder, documentId, `${versionId}.${extension}`);
}
