import { getDbErrorMessage } from '@/lib/db';
import { logError } from '@/lib/eventLogger';
import { NextResponse } from 'next/server';

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
  } catch (error) {
    const message = getDbErrorMessage(error);
    logError(label, error, { category: 'database' });
    return {
      ok: false,
      data: fallback,
      error: message,
    };
  }
}

export function normalizeErrorMessage(error: unknown, fallback = 'Request failed') {
  return getDbErrorMessage(error, fallback);
}

export function apiErrorResponse(
  context: string,
  error: unknown,
  fallback = 'Request failed',
  status = 500
) {
  logError(context, error);
  return NextResponse.json({
    success: false,
    error: normalizeErrorMessage(error, fallback)
  }, { status });
}
