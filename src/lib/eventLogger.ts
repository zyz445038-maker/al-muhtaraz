export type EventLevel = 'info' | 'warn' | 'error';

export function logEvent(
  name: string,
  metadata: Record<string, unknown> = {},
  level: EventLevel = 'info'
) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: name,
    ...metadata
  };

  const message = `[event:${name}] ${JSON.stringify(entry)}`;
  console[level](message);
  return entry;
}

export function logError(
  context: string,
  error: unknown,
  metadata: Record<string, unknown> = {}
) {
  let message = error instanceof Error ? error.message : String(error);
  if (error && typeof error === 'object' && !(error instanceof Error)) {
    const structuredMessage = (error as { message?: unknown }).message;
    if (typeof structuredMessage === 'string' && structuredMessage) {
      message = structuredMessage;
    } else {
      try {
        message = JSON.stringify(error);
      } catch {
        message = 'Unknown structured error';
      }
    }
  }
  return logEvent('error', { context, message, ...metadata }, 'error');
}
