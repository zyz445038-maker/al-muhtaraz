export interface ArchiveStorageService {
  ensureDirectories(): Promise<void>;
  exists(relativePath: string): Promise<boolean>;
  read(relativePath: string): Promise<Buffer>;
  writeAtomically(relativePath: string, content: string | Uint8Array): Promise<void>;
  sha256(relativePath: string): Promise<string>;
  removeTemporary(relativePath: string): Promise<void>;
}
