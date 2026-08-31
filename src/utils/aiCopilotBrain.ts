import { Contract, Container, Customer, Profile, Receipt } from '@/types/database';
import { querySystemKnowledge } from './aiCopilotKnowledge';

export interface AssistantData {
  contracts: Contract[];
  containers: Container[];
  customers: Customer[];
  staffList: Profile[];
  receipts: Receipt[];
}

export function processDeepAssistantQuery(query: string, data: AssistantData) {
  const normQuery = query.toLowerCase();

  // Knowledge base check
  const knowledgeMatch = querySystemKnowledge(normQuery);
  if (knowledgeMatch) {
    return {
      displayText: knowledgeMatch.displayMarkdown,
      speechText: knowledgeMatch.speechResponse,
      category: knowledgeMatch.category
    };
  }

  const activeCount = data.contracts.filter((c: Contract) => c.status === 'active').length;
  const availCount = data.containers.filter((c: Container) => c.status === 'available').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTotal = data.receipts
    .filter((r: Receipt) => (r.issued_at || r.created_at || '').startsWith(todayStr))
    .reduce((s: number, r: Receipt) => s + (Number(r.amount) || 0), 0);

  return {
    displayText: `💡 **مرحباً بك! أنا مساعد الذكاء الاصطناعي.**\n\n` +
      `سؤالك: *"${query}"*\n\n` +
      `📊 **إحصائيات سريعة:**\n` +
      `🔹 **العقود النشطة:** (${activeCount}) عقد\n` +
      `🔹 **الحاويات الشاغرة المتاحة:** (${availCount}) حاوية\n` +
      `🔹 **إيرادات اليوم المبدئية:** ${todayTotal.toLocaleString('ar-SA')} ر.س\n\n` +
      `أنا أعمل الآن عبر المحرك الاحتياطي المحلي (Offline Mode)، يمكنك سؤالي عن العقود أو الإيرادات ويفضل استخدام المحرك الذكي.`,
    speechText: `مرحباً بك. العقود النشطة حالياً ${activeCount}، والحاويات الشاغرة ${availCount}. إيرادات اليوم ${todayTotal} ريال.`,
    category: 'general'
  };
}
