import { Contract, Container, Customer, Profile, Receipt, TransportVehicle } from '@/types/database';
import { querySystemKnowledge } from './aiCopilotKnowledge';

export interface AssistantData {
  contracts: Contract[];
  containers: Container[];
  customers: Customer[];
  staffList: Profile[];
  receipts: Receipt[];
  vehicles: TransportVehicle[];
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

  const needsMaintenanceVehicles = data.vehicles?.filter(v => v.status === 'needs_maintenance' || (v.current_km >= v.next_oil_change_km && v.next_oil_change_km > 0)) || [];

  if (normQuery.includes('سيارات') || normQuery.includes('صيانة') || normQuery.includes('زيت')) {
    if (needsMaintenanceVehicles.length > 0) {
      const vDetails = needsMaintenanceVehicles.map(v => `- ${v.plate_number} (${v.brand_model})`).join('\n');
      return {
        displayText: `🚛 **تنبيه سيارات النقل:**\n\nيوجد (${needsMaintenanceVehicles.length}) سيارات تحتاج إلى صيانة أو تغيير زيت:\n${vDetails}\n\nيمكنك إرسال تنبيه واتساب للسائقين من قسم "سيارات النقل".`,
        speechText: `هناك ${needsMaintenanceVehicles.length} سيارات نقل بحاجة إلى صيانة أو تغيير زيت. يرجى مراجعة قسم سيارات النقل.`,
        category: 'fleet'
      };
    } else {
      return {
        displayText: `🚛 **حالة سيارات النقل:**\n\nجميع السيارات المسجلة (${data.vehicles?.length || 0} سيارات) في حالة ممتازة ولا توجد سيارات تحتاج لصيانة حالياً.`,
        speechText: `أسطول السيارات في حالة ممتازة ولا توجد مركبات تحتاج إلى صيانة.`,
        category: 'fleet'
      };
    }
  }

  return {
    displayText: `💡 **مرحباً بك! أنا مساعد الذكاء الاصطناعي.**\n\n` +
      `سؤالك: *"${query}"*\n\n` +
      `📊 **إحصائيات سريعة:**\n` +
      `🔹 **العقود النشطة:** (${activeCount}) عقد\n` +
      `🔹 **الحاويات الشاغرة المتاحة:** (${availCount}) حاوية\n` +
      `🔹 **سيارات بحاجة لصيانة:** (${needsMaintenanceVehicles.length}) سيارات\n` +
      `🔹 **إيرادات اليوم المبدئية:** ${todayTotal.toLocaleString('ar-SA')} ر.س\n\n` +
      `أنا أعمل الآن عبر المحرك الاحتياطي المحلي (Offline Mode)، يمكنك سؤالي عن العقود، الحاويات أو صيانة السيارات.`,
    speechText: `مرحباً بك. العقود النشطة حالياً ${activeCount}، والحاويات الشاغرة ${availCount}. إيرادات اليوم ${todayTotal} ريال. ويوجد ${needsMaintenanceVehicles.length} سيارات تحتاج صيانة.`,
    category: 'general'
  };
}
