import { randomUUID } from 'crypto';
import { readFile, mkdir, rename, writeFile } from 'fs/promises';
import path from 'path';

export const MAX_SEND_ATTEMPTS = 3;

export interface StoredSendResult {
  statusCode: number;
  body: Record<string, unknown>;
}

type IdempotencyEntry =
  | { fingerprint: string; createdAt: string; state: 'pending' }
  | { fingerprint: string; createdAt: string; state: 'sending'; attempts: number }
  | ({ fingerprint: string; createdAt: string; state: 'retryable' | 'unknown'; attempts: number } & StoredSendResult)
  | ({ fingerprint: string; createdAt: string; state: 'completed' } & StoredSendResult);

export type Reservation =
  | { state: 'reserved'; attempts: number }
  | { state: 'pending' }
  | { state: 'conflict' }
  | ({ state: 'completed' } & StoredSendResult);

export type RetryableResult =
  | { state: 'retryable' }
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
        if (current.state === 'pending' || current.state === 'sending' || current.state === 'unknown') {
          return { state: 'pending' };
        }
        if (current.state === 'completed') {
          return {
            state: 'completed',
            statusCode: current.statusCode,
            body: current.body
          };
        }

        if (current.attempts >= MAX_SEND_ATTEMPTS) {
          const completed: IdempotencyEntry = {
            ...current,
            state: 'completed',
            statusCode: current.statusCode,
            body: {
              ...current.body,
              outcome: 'failed',
              code: 'IDEMPOTENCY_RETRY_EXHAUSTED',
              error: 'The maximum number of confirmed-not-sent attempts has been reached.'
            }
          };
          this.entries[key] = completed;
          try {
            await this.persist();
          } catch (error) {
            this.entries[key] = current;
            throw error;
          }
          return { state: 'completed', statusCode: completed.statusCode, body: completed.body };
        }

        const next: IdempotencyEntry = {
          fingerprint,
          createdAt: current.createdAt,
          state: 'sending',
          attempts: current.attempts + 1
        };
        this.entries[key] = next;
        try {
          await this.persist();
        } catch (error) {
          this.entries[key] = current;
          throw error;
        }
        return { state: 'reserved', attempts: next.attempts };
      }

      const entry: IdempotencyEntry = {
        fingerprint,
        createdAt: new Date().toISOString(),
        state: 'sending',
        attempts: 1
      };
      this.entries[key] = entry;
      try {
        await this.persist();
      } catch (error) {
        delete this.entries[key];
        throw error;
      }
      return { state: 'reserved', attempts: entry.attempts };
    });
  }

  public markRetryable(
    key: string,
    fingerprint: string,
    result: StoredSendResult
  ): Promise<RetryableResult> {
    return this.withLock(async () => {
      await this.load();
      const current = this.entries[key];
      if (!current || current.fingerprint !== fingerprint || current.state !== 'sending') {
        throw new Error('Cannot retry an unstarted WhatsApp idempotency key.');
      }

      if (current.attempts >= MAX_SEND_ATTEMPTS) {
        const completed: IdempotencyEntry = {
          ...current,
          state: 'completed',
          statusCode: result.statusCode,
          body: {
            ...result.body,
            outcome: 'failed',
            code: 'IDEMPOTENCY_RETRY_EXHAUSTED',
            error: 'The maximum number of confirmed-not-sent attempts has been reached.'
          }
        };
        this.entries[key] = completed;
        try {
          await this.persist();
        } catch (error) {
          this.entries[key] = current;
          throw error;
        }
        return { state: 'completed', statusCode: completed.statusCode, body: completed.body };
      }

      const retryable: IdempotencyEntry = {
        ...current,
        state: 'retryable',
        statusCode: result.statusCode,
        body: result.body
      };
      this.entries[key] = retryable;
      try {
        await this.persist();
      } catch (error) {
        this.entries[key] = current;
        throw error;
      }
      return { state: 'retryable' };
    });
  }

  public markUnknown(key: string, fingerprint: string, result: StoredSendResult): Promise<void> {
    return this.withLock(async () => {
      await this.load();
      const current = this.entries[key];
      if (!current || current.fingerprint !== fingerprint || current.state !== 'sending') {
        throw new Error('Cannot mark an unstarted WhatsApp idempotency key as unknown.');
      }

      const unknown: IdempotencyEntry = {
        ...current,
        state: 'unknown',
        statusCode: result.statusCode,
        body: result.body
      };
      this.entries[key] = unknown;
      try {
        await this.persist();
      } catch (error) {
        this.entries[key] = current;
        throw error;
      }
    });
  }

  public complete(key: string, fingerprint: string, result: StoredSendResult): Promise<void> {
    return this.withLock(async () => {
      await this.load();
      const current = this.entries[key];
      if (!current || current.fingerprint !== fingerprint || current.state !== 'sending') {
        throw new Error('Cannot complete an unstarted WhatsApp idempotency key.');
      }

      const completed: IdempotencyEntry = {
        ...current,
        state: 'completed',
        statusCode: result.statusCode,
        body: result.body
      };
      this.entries[key] = completed;
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
        const validBase = /^[A-Za-z0-9._:-]{1,128}$/.test(key)
          && !!value && typeof value === 'object'
          && 'fingerprint' in value && typeof value.fingerprint === 'string'
          && 'createdAt' in value && typeof value.createdAt === 'string'
          && 'state' in value;
        if (!validBase) throw new Error(`Invalid WhatsApp idempotency record for key "${key}".`);

        if (value.state === 'pending') continue;
        if (value.state === 'sending') {
          if (!('attempts' in value) || !Number.isInteger(value.attempts) || value.attempts < 1) {
            throw new Error(`Invalid WhatsApp idempotency record for key "${key}".`);
          }
          continue;
        }
        if (value.state === 'retryable' || value.state === 'unknown' || value.state === 'completed') {
          if (!('statusCode' in value) || typeof value.statusCode !== 'number'
            || !('body' in value) || !value.body || typeof value.body !== 'object') {
            throw new Error(`Invalid WhatsApp idempotency record for key "${key}".`);
          }
          if (value.state !== 'completed'
            && (!('attempts' in value) || !Number.isInteger(value.attempts) || value.attempts < 1)) {
            throw new Error(`Invalid WhatsApp idempotency record for key "${key}".`);
          }
          continue;
        }
        throw new Error(`Invalid WhatsApp idempotency record for key "${key}".`);
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
