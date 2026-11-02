import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiSafety';
import { getArchiveAuthorizedProfile } from '@/lib/archiveAuthorization';
import { isLocalArchiveEnabled } from '@/services/archive/storage/localArchiveDatabase';
import { migrateCloudArchiveBatch } from '@/services/archive/import/localArchiveMigrationService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 10;

export async function POST(request: Request) {
  try {
    if (!isLocalArchiveEnabled()) {
      return NextResponse.json(
        { success: false, error: 'Cloud archive download is available only in the Windows app.' },
        { status: 409 },
      );
    }

    const authorization = await getArchiveAuthorizedProfile();
    if (!authorization.ok) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'A JSON request body is required.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'A JSON request body is required.' }, { status: 400 });
    }

    const { offset, batchSize } = body as { offset?: unknown; batchSize?: unknown };
    const safeOffset = offset === undefined ? 0 : offset;
    const safeBatchSize = batchSize === undefined ? DEFAULT_BATCH_SIZE : batchSize;
    if (!Number.isSafeInteger(safeOffset) || Number(safeOffset) < 0) {
      return NextResponse.json({ success: false, error: 'Offset must be a non-negative integer.' }, { status: 400 });
    }
    if (!Number.isSafeInteger(safeBatchSize) || Number(safeBatchSize) < 1 || Number(safeBatchSize) > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { success: false, error: `Batch size must be between 1 and ${MAX_BATCH_SIZE}.` },
        { status: 400 },
      );
    }

    const result = await migrateCloudArchiveBatch(
      authorization.supabase,
      Number(safeOffset),
      Number(safeBatchSize),
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const response = apiErrorResponse('archive.local-migration', error);
    return NextResponse.json({ ...(await response.json()), success: false }, { status: response.status });
  }
}
