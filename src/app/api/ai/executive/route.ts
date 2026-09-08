import { NextRequest, NextResponse } from 'next/server';
import { HumanoidAgent } from '@/services/ai/humanoidAgent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, context, memory, userId, sessionId, correlationId } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const safeContext = context || {
      contracts: [],
      containers: [],
      customers: [],
      staffList: [],
      receipts: [],
      vehicles: []
    };

    if (memory) {
      safeContext.memory = memory;
    }

    const agent = new HumanoidAgent();
    const response = await agent.handle({
      query: prompt,
      context: safeContext,
      userId: userId || 'admin',
      sessionId: sessionId || 'session_executive',
      correlationId: correlationId
    });

    return NextResponse.json({
      success: true,
      result: response.result,
      correlationId: response.correlationId,
      fallback: response.fallback
    });


  } catch (error: unknown) {
    console.error('❌ AI Executive Agent execution error:', error);

    // Graceful degradation: do not fail the whole backend when AI is unavailable.
    return NextResponse.json({
      success: false,
      error: 'AI service is temporarily unavailable. The system will continue in local fallback mode.',
      fallback: true
    }, { status: 200 });
  }
}
