import { randomUUID } from 'crypto';
import { logError, logEvent } from '@/lib/eventLogger';
import { AlMuhtarazExecutiveAgent } from '@/utils/aiExecutiveAgent';
import { MemoryProvider } from '@/services/ai/memory/memoryProvider';
import { NoopMemoryProvider } from '@/services/ai/memory/noopMemoryProvider';
import { AgentRequest, AgentResponse } from '@/services/ai/types';

const SAFE_FALLBACK_RESPONSE = 'تعذر تنفيذ الطلب الذكي حالياً، لكن النظام الأساسي ما زال يعمل. حاول مرة أخرى بعد قليل.';

export class HumanoidAgent {
  private readonly memoryProvider: MemoryProvider;

  constructor(memoryProvider: MemoryProvider = new NoopMemoryProvider()) {
    this.memoryProvider = memoryProvider;
  }

  async handle(request: AgentRequest): Promise<AgentResponse> {
    const correlationId = request.correlationId || `req_${randomUUID()}`;
    const query = request.query.trim();

    logEvent('ai.agent.request.started', {
      correlationId,
      userId: request.userId,
      sessionId: request.sessionId,
      queryLength: query.length
    });

    let memoryState;
    try {
      const memory = await this.memoryProvider.load({
        userId: request.userId,
        sessionId: request.sessionId,
        query,
        correlationId
      });
      memoryState = memory.state;
    } catch (error) {
      logError('ai.agent.memory.load', error, { correlationId });
    }

    const agent = new AlMuhtarazExecutiveAgent(request.context, memoryState);

    try {
      const result = await agent.executeUserCommand(query);

      try {
        await this.memoryProvider.save({
          userId: request.userId,
          sessionId: request.sessionId,
          facts: [],
          state: agent.getMemory(),
          correlationId
        });
      } catch (error) {
        logError('ai.agent.memory.save', error, { correlationId });
      }

      logEvent('ai.agent.request.completed', {
        correlationId,
        toolExecuted: result.toolExecuted,
        fallback: false
      });

      return { correlationId, result, fallback: false };
    } catch (error) {
      logError('ai.agent.execution', error, { correlationId, classification: 'provider_failure' });
      logEvent('ai.agent.request.fallback', {
        correlationId,
        classification: 'provider_failure'
      }, 'warn');

      return {
        correlationId,
        fallback: true,
        result: {
          toolExecuted: null,
          speechResponse: SAFE_FALLBACK_RESPONSE,
          displayMarkdown: SAFE_FALLBACK_RESPONSE,
          updatedMemory: agent.getMemory()
        }
      };
    }
  }
}
