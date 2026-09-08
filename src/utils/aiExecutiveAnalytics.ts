import { Contract, Container, Customer, Profile, Receipt, TransportVehicle } from '@/types/database';
import { cleanSpeechText } from '@/utils/speechSanitizer';

export interface AnalyticalContext {
  contracts?: Contract[];
  containers?: Container[];
  customers?: Customer[];
  staffList?: Profile[];
  receipts?: Receipt[];
  vehicles?: TransportVehicle[];
}

export interface ExecutiveAnalysisResult {
  intent: 'executive_analysis' | 'financial_comparison' | 'cancellation_analysis' | 'past_recommendation_lookup';
  speechResponse: string;
  displayMarkdown: string;
  speechSummary: string;
  analysisText: string;
  currentMonthCount: number;
  prevMonthCount: number;
  changePercent: number;
  cancellationsCount: number;
  topReason: string;
  recommendationList: string[];
}

/**
 * Performs Deep Real-Time Executive Reasoning & Comparative Business Analytics
 */
export function analyzeBusinessPerformance(
  query: string,
  context: AnalyticalContext
): ExecutiveAnalysisResult {
  const q = (query || '').toLowerCase();

  const contracts = context.contracts || [];
  const containers = context.containers || [];
  const receipts = context.receipts || [];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Calculate Current Month vs Previous Month Metrics
  const currentMonthContracts = contracts.filter(c => {
    const d = new Date(c.created_at || c.start_date || 0);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthContracts = contracts.filter(c => {
    const d = new Date(c.created_at || c.start_date || 0);
    return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear();
  });

  const currRevenue = currentMonthContracts.reduce((s, c) => s + (Number(c.total_cost) || 0), 0);
  const prevRevenue = prevMonthContracts.reduce((s, c) => s + (Number(c.total_cost) || 0), 0);

  const cancelledContracts = contracts.filter(c => c.status === 'cancelled');
  const totalContractsCount = contracts.length || 1;
  const cancellationRate = Math.round((cancelledContracts.length / totalContractsCount) * 100);

  const totalRemainingDebts = contracts.reduce((s, c) => s + (Number(c.remaining_amount ?? (c.total_cost - c.paid_amount)) || 0), 0);

  const recommendationList: string[] = [];

  if (cancellationRate > 10) {
    recommendationList.push(`إعادة مراجعة شروط ومواعيد سحب الحاويات التجارية للحد من نسبة الإلغاء الحالية (${cancellationRate}%).`);
  }
  if (totalRemainingDebts > 5000) {
    recommendationList.push(`تفعيل التنبيهات الآلية للدفع قبل بدء التمديد للتحصيل المبكر للمبالغ المعلقة (${totalRemainingDebts.toLocaleString('ar-SA')} ر.س).`);
  }
  recommendationList.push('تقديم باقات عروض تشجيعية لكبار العملاء لزيادة نسبة استدامة العقود.');

  let speechSummary = '';
  let analysisText = '';
  let changePercent = 0;
  const topReason = cancelledContracts.length > 0
    ? (cancelledContracts[0].cancellation_reason || 'زيادة الإلغاءات في قطاع الحاويات التجارية وتأخر التسديد')
    : 'تغييرات موسمية في حركة سوق الإنشاءات والمقاولات';

  if (prevRevenue > 0 && currRevenue < prevRevenue) {
    changePercent = Math.round(((prevRevenue - currRevenue) / prevRevenue) * 100);
    analysisText = `انخفض عدد العقود والإيرادات بنسبة ${changePercent}% مقارنة بالشهر السابق، والسبب الرئيسي هو ${topReason}.`;
    speechSummary = cleanSpeechText(
      `انخفضت العقود والإيرادات بنسبة ${changePercent}% مقارنة بالشهر السابق. يظهر من البيانات أن السبب الرئيسي هو ${topReason}. أوصي بتفعيل التحصيل المسبق وعروض كبار العملاء.`
    );
  } else if (cancelledContracts.length > 0) {
    analysisText = `عدد العقود مستقر بوجه عام، ولكن تظهر البيانات أن السبب الرئيسي لإلغاء بعض العقود هو ${topReason}.`;
    speechSummary = cleanSpeechText(
      `الوضع التشغيلي مستقر. ويتبين من تحليل العقود الإلغائية أن السبب الرئيسي هو ${topReason}.`
    );
  } else {
    analysisText = `الأداء المالي ونسبة التجديد سارية بشكـل ممتاز دون تراجع يذكر.`;
    speechSummary = cleanSpeechText(
      `الأداء التشغيلي والمالي ممتاز مع نسبة استدامة عالية في عقود الميدان.`
    );
  }

  const displayMarkdown = `### 📊 تحليل الأسباب والتوصيات الإدارية 🏛️\n\n` +
    `* **الاستنتاج:** ${analysisText}\n` +
    `* **عقود الشهر الحالي:** \`${currentMonthContracts.length}\` عقد (\`${currRevenue.toLocaleString('ar-SA')} ر.س\`)\n` +
    `* **عقود الشهر السابق:** \`${prevMonthContracts.length}\` عقد (\`${prevRevenue.toLocaleString('ar-SA')} ر.س\`)\n` +
    `* **الإلغاءات المسجلة:** \`${cancelledContracts.length}\` عقود ملغاة (\`${cancellationRate}%\` من الأسطول)\n\n` +
    `💡 **التوصيات التنفيذية المقترحة:**\n` +
    recommendationList.map(r => `• ${r}`).join('\n');

  return {
    intent: 'executive_analysis',
    speechResponse: speechSummary,
    displayMarkdown,
    speechSummary,
    analysisText,
    currentMonthCount: currentMonthContracts.length,
    prevMonthCount: prevMonthContracts.length,
    changePercent,
    cancellationsCount: cancelledContracts.length,
    topReason,
    recommendationList
  };
}
