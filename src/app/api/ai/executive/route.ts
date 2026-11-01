import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/archiveAuthorization';
import { apiErrorResponse } from '@/lib/apiSafety';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { HumanoidAgent } from '@/services/ai/humanoidAgent';
import type { AgentContext, AgentMemoryState } from '@/utils/aiExecutiveAgent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadAssistantContext(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  canViewFinancials: boolean,
): Promise<AgentContext> {
  const [contracts, containers, customers, staffList, vehicles] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, customer:customers(*), container:containers(*), assigned_employee:profiles(id, full_name, phone, role)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('containers').select('*').limit(500),
    supabase.from('customers').select('*').limit(1000),
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, is_active, can_view_all_records, permissions, created_at, updated_at')
      .eq('is_active', true)
      .limit(500),
    supabase.from('vehicles').select('*').limit(500),
  ]);

  for (const [label, result] of [
    ['contracts', contracts],
    ['containers', containers],
    ['customers', customers],
    ['staff profiles', staffList],
    ['vehicles', vehicles],
  ] as const) {
    if (result.error) {
      throw new Error(`Could not load assistant ${label}: ${result.error.message}`);
    }
  }

  const contractIds = (contracts.data || []).map(contract => contract.id);
  let receipts: AgentContext['receipts'] = [];
  if (canViewFinancials && contractIds.length > 0) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .in('contract_id', contractIds)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      throw new Error(`Could not load assistant receipts: ${error.message}`);
    }
    receipts = data || [];
  }

  const safeContracts = (contracts.data || []).map(contract => canViewFinancials
    ? contract
    : {
        ...contract,
        total_cost: 0,
        paid_amount: 0,
        remaining_amount: 0,
        payment_status: 'unpaid' as const,
        payment_method: undefined
      });

  return {
    contracts: safeContracts,
    containers: containers.data || [],
    customers: customers.data || [],
    staffList: staffList.data || [],
    receipts,
    vehicles: vehicles.data || [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await getAuthenticatedProfile();
    if (!authorization.ok) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status },
      );
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'A JSON request body is required.' }, { status: 400 });
    }
    const { prompt, memory, correlationId } = body as {
      prompt?: unknown;
      memory?: unknown;
      correlationId?: unknown;
    };
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'Prompt must contain between 1 and 4000 characters.' },
        { status: 400 },
      );
    }

    const canViewFinancials = authorization.profile.role === 'admin'
      || authorization.profile.permissions?.can_view_financials === true;
    const context = await loadAssistantContext(authorization.supabase, canViewFinancials);
    if (isAgentMemoryState(memory)) {
      context.memory = memory;
    }

    const agent = new HumanoidAgent();
    const response = await agent.handle({
      query: prompt,
      context,
      userId: authorization.user.id,
      sessionId: authorization.user.id,
      correlationId: typeof correlationId === 'string' ? correlationId : undefined,
    });

    return NextResponse.json({
      success: true,
      result: response.result,
      correlationId: response.correlationId,
      fallback: response.fallback,
    });
  } catch (error: unknown) {
    console.error('AI Executive Agent execution error:', error);
    const resp = apiErrorResponse('ai.executive', error);
    return NextResponse.json(
      { ...(await resp.json()), success: false, fallback: true },
      { status: resp.status >= 500 ? resp.status : 500 },
    );
  }

  function isAgentMemoryState(value: unknown): value is AgentMemoryState {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
