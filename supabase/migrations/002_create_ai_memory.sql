-- Migration: 002_create_ai_memory.sql
-- Description: Create ai_memory table for persisting AI Executive Advisor decisions, analytical insights & recommendations.

CREATE TABLE IF NOT EXISTS public.ai_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT DEFAULT 'admin',
    user_query TEXT NOT NULL,
    intent_type TEXT NOT NULL,
    entities JSONB DEFAULT '{}'::jsonb,
    findings_json JSONB DEFAULT '{}'::jsonb,
    analysis_summary TEXT NOT NULL,
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast chronological recall
CREATE INDEX IF NOT EXISTS idx_ai_memory_created_at ON public.ai_memory (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_memory_intent_type ON public.ai_memory (intent_type);

-- Row Level Security (RLS) Policy
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated and service_role full access to ai_memory"
ON public.ai_memory
FOR ALL
USING (true)
WITH CHECK (true);
