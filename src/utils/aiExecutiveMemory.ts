import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/eventLogger';

export interface AIMemoryRecord {
  id?: string;
  user_id?: string;
  user_query: string;
  intent_type: string;
  entities?: Record<string, unknown>;
  findings_json?: Record<string, unknown>;
  analysis_summary: string;
  recommendations?: string[];
  created_at?: string;
}

const inMemoryDecisionLogs: AIMemoryRecord[] = [];

function parseMemoryRecord(value: unknown): AIMemoryRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.user_query !== 'string'
    || typeof record.intent_type !== 'string'
    || typeof record.analysis_summary !== 'string'
  ) {
    return null;
  }

  const recommendations = Array.isArray(record.recommendations)
    ? record.recommendations.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    user_id: typeof record.user_id === 'string' ? record.user_id : undefined,
    user_query: record.user_query,
    intent_type: record.intent_type,
    entities: record.entities && typeof record.entities === 'object' && !Array.isArray(record.entities)
      ? record.entities as Record<string, unknown>
      : {},
    findings_json: record.findings_json && typeof record.findings_json === 'object' && !Array.isArray(record.findings_json)
      ? record.findings_json as Record<string, unknown>
      : {},
    analysis_summary: record.analysis_summary,
    recommendations,
    created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
  };
}

/**
 * Persists an AI executive decision, analytical insight & recommendation into Supabase ai_memory
 */
export async function saveAIDecisionMemory(
  record: AIMemoryRecord,
  client?: SupabaseClient,
): Promise<void> {
  const entry: AIMemoryRecord = {
    ...record,
    user_id: record.user_id || 'admin',
    created_at: record.created_at || new Date().toISOString()
  };

  inMemoryDecisionLogs.unshift(entry);
  if (inMemoryDecisionLogs.length > 50) {
    inMemoryDecisionLogs.pop();
  }

  if (client) {
    try {
      const { error } = await client.from('ai_memory').insert([{
        user_id: entry.user_id,
        user_query: record.user_query,
        intent_type: record.intent_type,
        entities: record.entities || {},
        findings_json: record.findings_json || {},
        analysis_summary: record.analysis_summary,
        recommendations: record.recommendations || [],
        created_at: entry.created_at
      }]);
      if (error) logError('ai.memory.save', error, { intent: record.intent_type });
    } catch (error) {
      logError('ai.memory.save', error, { intent: record.intent_type });
    }
  }
}

/**
 * Retrieves past AI executive recommendations and decisions
 */
export async function queryAIDecisionMemory(
  limit = 10,
  client?: SupabaseClient,
  userId?: string,
): Promise<AIMemoryRecord[]> {
  const safeLimit = Number.isSafeInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 10;
  if (client) {
    try {
      let query = client
        .from('ai_memory')
        .select('id, user_id, user_query, intent_type, entities, findings_json, analysis_summary, recommendations, created_at')
        .order('created_at', { ascending: false })
        .limit(safeLimit);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) {
        logError('ai.memory.read', error, { userId });
      } else if (Array.isArray(data)) {
        return data
          .map(parseMemoryRecord)
          .filter((record): record is AIMemoryRecord => record !== null);
      }
    } catch (error) {
      logError('ai.memory.read', error, { userId });
    }
  }

  return inMemoryDecisionLogs
    .filter(record => !userId || record.user_id === userId)
    .slice(0, safeLimit);
}
