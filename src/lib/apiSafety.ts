export type SafetyResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function validateRequiredFields(payload: Record<string, any>, required: string[]) {
  const missing = required.filter((field) => {
    const value = payload?.[field];
    return value === undefined || value === null || value === '';
  });

  return {
    ok: missing.length === 0,
    missing,
  };
}

export async function withDbSafety<T>(
  label: string,
  operation: () => Promise<T>,
  fallback?: T
): Promise<SafetyResult<T>> {
  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error: any) {
    const message = error?.message || 'Database operation failed';
    console.error(`[${label}] Database failure:`, message);
    return {
      ok: false,
      data: fallback,
      error: message,
    };
  }
}

export function normalizeErrorMessage(error: unknown, fallback = 'Request failed') {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  return fallback;
}
