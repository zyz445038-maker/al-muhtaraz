import { NextRequest, NextResponse } from 'next/server';
import { AlMuhtarazExecutiveAgent, AgentContext } from '@/utils/aiExecutiveAgent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Initialize Autonomous Executive Agent
    const agent = new AlMuhtarazExecutiveAgent(context || {
      contracts: [],
      containers: [],
      customers: [],
      staffList: [],
      receipts: []
    });

    // Execute User Intent via Agentic Function Calling
    const result = await agent.executeUserCommand(prompt);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error: any) {
    console.error('❌ AI Executive Agent execution error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal AI Agent Error'
    }, { status: 500 });
  }
}
