import { AgentMemoryState } from '@/utils/aiExecutiveAgent';
import { MemoryFact, MemoryProvider, MemorySnapshot } from '@/services/ai/types';

export class NoopMemoryProvider implements MemoryProvider {
  async load(): Promise<MemorySnapshot> {
    return { facts: [] };
  }

  async save(_input: {
    userId?: string;
    sessionId?: string;
    facts: MemoryFact[];
    state: AgentMemoryState;
    correlationId: string;
  }): Promise<void> {
    return;
  }
}
