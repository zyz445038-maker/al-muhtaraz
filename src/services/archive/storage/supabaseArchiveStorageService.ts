import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const STORAGE_BUCKET = 'documents';

export class SupabaseArchiveStorageService {
  constructor(private readonly client: SupabaseClient) {}

  ensureDirectories(): Promise<void> {
    return Promise.resolve();
  }

  async exists(relativePath: string): Promise<boolean> {
    const separator = relativePath.lastIndexOf('/');
    const folder = separator === -1 ? '' : relativePath.slice(0, separator);
    const filename = separator === -1 ? relativePath : relativePath.slice(separator + 1);
    const { data, error } = await this.client.storage.from(STORAGE_BUCKET).list(folder, {
      search: filename,
      limit: 1
    });
    if (error) throw error;
    return (data || []).some((file: { name: string }) => file.name === filename);
  }

  async read(relativePath: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(STORAGE_BUCKET).download(relativePath);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  async writeAtomically(relativePath: string, content: string | Uint8Array): Promise<void> {
    const { error } = await this.client.storage.from(STORAGE_BUCKET).upload(relativePath, content, {
      contentType: relativePath.endsWith('.json') ? 'application/json' : 'application/pdf',
      upsert: true
    });
    if (error) throw error;
  }

  async sha256(relativePath: string): Promise<string> {
    return createHash('sha256').update(await this.read(relativePath)).digest('hex');
  }

  async removeTemporary(relativePath: string): Promise<void> {
    const { error } = await this.client.storage.from(STORAGE_BUCKET).remove([relativePath]);
    if (error) throw error;
  }
}
