// src/app/api/search/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { apiErrorResponse } from '@/lib/apiSafety';

// GET /api/search?q=term&page=1&limit=10
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Simple read‑only search over archive documents.
 * Supports pagination via `page` (1‑based) and `limit` (max 50).
 * Queries the `documents` table – currently we only search the
 * `original_filename` column using a case‑insensitive LIKE.
 * Additional searchable columns can be added later without
 * affecting the read‑only contract.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') ?? '10', 10), 1),
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

    // Build the query – searching by filename for now.
    const { data, count, error } = await supabase
      .from('documents')
      .select('id, original_filename, document_type, created_at', { count: 'exact' })
      .ilike('original_filename', `%${q}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const results = (data ?? []).map((doc: any) => ({
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
