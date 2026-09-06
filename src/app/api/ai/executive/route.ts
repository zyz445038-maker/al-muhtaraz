import { NextRequest, NextResponse } from 'next/server';
import { AlMuhtarazExecutiveAgent, AgentContext } from '@/utils/aiExecutiveAgent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const safeContext = context || {
      contracts: [],
      containers: [],
      customers: [],
      staffList: [],
      receipts: []
    };

    // Initialize Autonomous Executive Agent
    const agent = new AlMuhtarazExecutiveAgent(safeContext);

    // Execute User Intent via Agentic Function Calling.
    // If AI keys are missing or remote service fails, the agent must still
    // fall back to local reasoning instead of crashing the backend.
    const result = await agent.executeUserCommand(prompt);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error: any) {
    console.error('❌ AI Executive Agent execution error:', error);

    // Graceful degradation: do not fail the whole backend when AI is unavailable.
    return NextResponse.json({
      success: false,
      error: 'AI service is temporarily unavailable. The system will continue in local fallback mode.',
      fallback: true
    }, { status: 200 });
  }
}
