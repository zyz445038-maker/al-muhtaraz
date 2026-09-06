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
  const message = error instanceof Error ? error.message : String(error);
  return logEvent('error', { context, message, ...metadata }, 'error');
}
