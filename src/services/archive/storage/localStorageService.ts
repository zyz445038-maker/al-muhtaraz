import { createHash } from 'crypto';
import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { getArchiveDirectories, getArchiveStorageRoot, resolveArchivePath } from '@/services/archive/storage/storagePath';

export class LocalArchiveStorageService {
  async ensureDirectories(): Promise<void> {
    const root = getArchiveStorageRoot();
    await mkdir(root, { recursive: true });

    for (const directory of getArchiveDirectories()) {
      await mkdir(resolveArchivePath(directory), { recursive: true });
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(resolveArchivePath(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async read(relativePath: string): Promise<Buffer> {
    return readFile(resolveArchivePath(relativePath));
  }

  async writeAtomically(relativePath: string, content: string | Uint8Array): Promise<void> {
    const destination = resolveArchivePath(relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, content);
    await rename(temporary, destination);
  }

  async sha256(relativePath: string): Promise<string> {
    const content = await this.read(relativePath);
    return createHash('sha256').update(content).digest('hex');
  }

  async stat(relativePath: string) {
    return stat(resolveArchivePath(relativePath));
  }

  async logicallyArchive(relativePath: string): Promise<void> {
    const source = resolveArchivePath(relativePath);
    const quarantinePath = resolveArchivePath(path.posix.join('quarantine', path.basename(relativePath)));
    await mkdir(path.dirname(quarantinePath), { recursive: true });
    await rename(source, quarantinePath);
  }

  async removeTemporary(relativePath: string): Promise<void> {
    await rm(resolveArchivePath(relativePath), { force: true, recursive: false });
  }
}
