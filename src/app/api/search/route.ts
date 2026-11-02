// src/app/api/search/route.ts

import { NextResponse } from 'next/server';
import { getArchiveAuthorizedProfile } from '@/lib/archiveAuthorization';
import { apiErrorResponse } from '@/lib/apiSafety';
import { getLocalArchiveDatabase, isLocalArchiveEnabled } from '@/services/archive/storage/localArchiveDatabase';

// GET /api/search?q=term&page=1&limit=10
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Read-only archive search.
 * Supports pagination via `page` (1‑based) and `limit` (max 50).
 * The local archive searches extracted PDF text; the web archive searches
 * filenames to preserve its existing Supabase-backed behavior.
 */
export async function GET(request: Request) {
  try {
    const authorization = await getArchiveAuthorizedProfile();
    if (!authorization.ok) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
    const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '10', 10);
    const limit = Math.min(
      Number.isSafeInteger(parsedLimit) ? Math.max(parsedLimit, 1) : 10,
      50
    );

    // Empty query returns empty result set (no full table scan)
    if (!q) {
      return NextResponse.json({
        success: true,
        results: [],
        page,
        limit,
        total: 0,
      });
    }

    const offset = (page - 1) * limit;

    if (isLocalArchiveEnabled()) {
      const database = getLocalArchiveDatabase();
      const localResult = database.searchIndexedDocuments(q, limit, offset);
      const countResult = database.countIndexedDocuments(q);
      if (!localResult.ok) throw new Error(localResult.error || 'Could not search the local archive index.');
      if (!countResult.ok) throw new Error(countResult.error || 'Could not count local archive search results.');
      const results = (localResult.data || []).map(({ document }) => ({
        id: document.id,
        title: document.original_filename ?? '(بدون عنوان)',
        type: document.document_type,
        created_at: document.created_at,
      }));
      return NextResponse.json({
        success: true,
        results,
        page,
        limit,
        total: countResult.data ?? 0,
      });
    }

    const { data, count, error } = await authorization.supabase
      .from('documents')
      .select('id, original_filename, document_type, created_at', { count: 'exact' })
      .ilike('original_filename', `%${q}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const results = (data ?? []).map(doc => ({
      id: doc.id,
      title: doc.original_filename ?? '(بدون عنوان)',
      type: doc.document_type,
      created_at: doc.created_at,
    }));

    return NextResponse.json({
      success: true,
      results,
      page,
      limit,
      total: count ?? results.length,
    });
  } catch (error) {
    const resp = apiErrorResponse('search.read', error);
    return NextResponse.json({ ...(await resp.json()), success: false }, { status: resp.status });
  }
}
