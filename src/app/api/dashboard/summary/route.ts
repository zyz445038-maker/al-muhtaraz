// src/app/api/dashboard/summary/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runDbQuery } from '@/lib/db';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { apiErrorResponse } from '@/lib/apiSafety';

/**
 * Helper to get a count of rows for a table.
 * Uses Supabase `select('*', { count: 'exact', head: true })` to avoid fetching data.
 */
async function getCount(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

/**
 * GET /api/dashboard/summary
 * Returns a read‑only summary for the dashboard.
 * The endpoint respects Supabase RLS – it does not add any custom auth checks.
 */
export async function GET() {
  try {
    // Parallel queries for efficiency
    const [totalDocuments, totalVersions, jobsResult, latestDocsResult] = await Promise.all([
      // Total documents
      getCount('documents'),
      // Total document versions
      getCount('document_versions'),
      // Import jobs (fetch status of each job)
      runDbQuery<any[]>('archive.import-jobs.list-all', () =>
        supabase.from('document_import_jobs').select('status')
      ),
      // Latest documents (most recent 5)
      runDbQuery<any[]>('archive.documents.latest', () =>
        supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
      ),
    ]);

    // Aggregate job counts by status
    const jobCounts: Record<string, number> = {};
    if (jobsResult.ok && jobsResult.data) {
      for (const job of jobsResult.data) {
        const status = job.status as string;
        jobCounts[status] = (jobCounts[status] ?? 0) + 1;
      }
    }

    // Determine processing health and stale jobs
    const repo = new DocumentRepository();
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
    const staleResult = await repo.listStaleProcessingJobs(staleBefore);
    const staleJobs = staleResult.ok && staleResult.data ? staleResult.data : [];
    const processingHealth = {
      total_processing: jobCounts['processing'] ?? 0,
      stale_processing: staleJobs.length,
      healthy: (jobCounts['processing'] ?? 0) - staleJobs.length,
    };

    const response = {
      success: true,
      total_documents: totalDocuments,
      total_versions: totalVersions,
      import_jobs: {
        queued: jobCounts['queued'] ?? 0,
        processing: jobCounts['processing'] ?? 0,
        failed: jobCounts['failed'] ?? 0,
        indexed: jobCounts['indexed'] ?? 0,
        needs_ocr: jobCounts['needs_ocr'] ?? 0,
        cancelled: jobCounts['cancelled'] ?? 0,
      },
      processingHealth,
      staleProcessingJobs: staleJobs,
      latest_documents: latestDocsResult.ok && latestDocsResult.data ? latestDocsResult.data : [],
    };

    return NextResponse.json(response);
  } catch (error) {
    const resp = apiErrorResponse('dashboard.summary', error);
    return NextResponse.json({ ...(await resp.json()), success: false }, { status: resp.status });
  }
}
