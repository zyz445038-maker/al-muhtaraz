import { AgentContext, AgentExecutionResult, AgentMemoryState } from '@/utils/aiExecutiveAgent';

export type AgentRisk = 'read' | 'notify' | 'financial' | 'destructive';

export interface AgentRequest {
  query: string;
  context: AgentContext;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface AgentResponse {
  correlationId: string;
  result: AgentExecutionResult;
  fallback: boolean;
}

export interface MemoryFact {
  key: string;
  value: unknown;
  confidence?: number;
}

export interface MemorySnapshot {
  state?: AgentMemoryState;
  facts: MemoryFact[];
}

export interface MemoryProvider {
  load(input: {
    userId?: string;
    sessionId?: string;
    query: string;
    correlationId: string;
  }): Promise<MemorySnapshot>;
  save(input: {
    userId?: string;
    sessionId?: string;
    facts: MemoryFact[];
    state: AgentMemoryState;
    correlationId: string;
  }): Promise<void>;
}

export interface ResponseStreamer {
  stream(chunks: AsyncIterable<string>): Response;
}

export interface ToolDefinition {
  name: string;
  risk: AgentRisk;
  execute(args: unknown): Promise<unknown>;
}
