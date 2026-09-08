import type { SupabaseClient } from '@supabase/supabase-js';

export interface AIMemoryRecord {
  id?: string;
  user_id?: string;
  query: string;
  intent: string;
  entities?: Record<string, any>;
  analysis_summary: string;
  recommendation?: string;
  created_at?: string;
}

let inMemoryDecisionLogs: AIMemoryRecord[] = [];

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(url, key);
  } catch (e) {
    return null;
  }
}

/**
 * Persists an AI executive decision, analytical insight & recommendation into Supabase ai_memory
 */
export async function saveAIDecisionMemory(record: AIMemoryRecord): Promise<void> {
  const entry: AIMemoryRecord = {
    ...record,
    created_at: record.created_at || new Date().toISOString()
  };

  inMemoryDecisionLogs.unshift(entry);
  if (inMemoryDecisionLogs.length > 50) {
    inMemoryDecisionLogs.pop();
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('ai_memory').insert([{
        user_id: record.user_id || 'admin',
        query: record.query,
        intent: record.intent,
        entities: record.entities || {},
        analysis_summary: record.analysis_summary,
        recommendation: record.recommendation || '',
        created_at: entry.created_at
      }]);
    } catch (err) {
      // Failover silently to in-memory decision logs if table doesn't exist yet
    }
  }
}

/**
 * Retrieves past AI executive recommendations and decisions
 */
export async function queryAIDecisionMemory(searchQuery: string = ''): Promise<AIMemoryRecord[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('ai_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {}
  }

  return inMemoryDecisionLogs;
}
