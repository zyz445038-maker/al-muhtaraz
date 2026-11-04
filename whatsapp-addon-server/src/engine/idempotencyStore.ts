import { randomUUID } from 'crypto';
import { readFile, mkdir, rename, writeFile } from 'fs/promises';
import path from 'path';

export interface StoredSendResult {
  statusCode: number;
  body: Record<string, unknown>;
}

type IdempotencyEntry =
  | { fingerprint: string; createdAt: string; state: 'pending' }
  | ({ fingerprint: string; createdAt: string; state: 'completed' } & StoredSendResult);

export type Reservation =
  | { state: 'reserved' }
  | { state: 'pending' }
  | { state: 'conflict' }
  | ({ state: 'completed' } & StoredSendResult);

export class IdempotencyStore {
  private readonly filePath: string;
  private entries: Record<string, IdempotencyEntry> = {};
  private initialized = false;
  private lock: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  public reserve(key: string, fingerprint: string): Promise<Reservation> {
    return this.withLock(async () => {
      await this.load();
      const current = this.entries[key];
      if (current) {
        if (current.fingerprint !== fingerprint) return { state: 'conflict' };
        if (current.state === 'pending') return { state: 'pending' };
        return {
          state: 'completed',
          statusCode: current.statusCode,
          body: current.body
        };
      }

      this.entries[key] = {
        fingerprint,
        createdAt: new Date().toISOString(),
        state: 'pending'
      };
      await this.persist();
      return { state: 'reserved' };
    });
  }

  public complete(key: string, fingerprint: string, result: StoredSendResult): Promise<void> {
    return this.withLock(async () => {
      await this.load();
      const current = this.entries[key];
      if (!current || current.fingerprint !== fingerprint || current.state !== 'pending') {
        throw new Error('Cannot complete an unreserved WhatsApp idempotency key.');
      }

      this.entries[key] = {
        ...current,
        state: 'completed',
        statusCode: result.statusCode,
        body: result.body
      };
      try {
        await this.persist();
      } catch (error) {
        this.entries[key] = current;
        throw error;
      }
    });
  }

  private async load(): Promise<void> {
    if (this.initialized) return;

    try {
      const contents = await readFile(this.filePath, 'utf8');
      const parsed: unknown = JSON.parse(contents);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('WhatsApp idempotency store must contain a JSON object.');
      }
      for (const [key, value] of Object.entries(parsed)) {
        if (!/^[A-Za-z0-9._:-]{1,128}$/.test(key)
          || !value || typeof value !== 'object'
          || !('fingerprint' in value) || typeof value.fingerprint !== 'string'
          || !('createdAt' in value) || typeof value.createdAt !== 'string'
          || !('state' in value) || (value.state !== 'pending' && value.state !== 'completed')
          || (value.state === 'completed'
            && (!('statusCode' in value) || typeof value.statusCode !== 'number'
              || !('body' in value) || !value.body || typeof value.body !== 'object'))) {
          throw new Error(`Invalid WhatsApp idempotency record for key "${key}".`);
        }
      }
      this.entries = parsed as Record<string, IdempotencyEntry>;
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }

    this.initialized = true;
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(this.entries), { encoding: 'utf8', mode: 0o600 });
    await rename(temporaryPath, this.filePath);
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.lock.then(operation);
    this.lock = result.then(() => undefined, () => undefined);
    return result;
  }
}

const sessionBaseDir = process.env.SESSION_DIR?.trim() || './sessions';
export const whatsappIdempotencyStore = new IdempotencyStore(
  path.resolve(sessionBaseDir, 'whatsapp-idempotency.json')
);
