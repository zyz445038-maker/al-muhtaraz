import { Contract, Customer, Container, Profile, Receipt } from '@/types/database';

// ─── Arabic Amount Words ──────────────────────────────────────────────────────
export function toArabicWords(amount: number): string {
  const table: Record<number, string> = {
    150: 'مائة وخمسون ريالاً سعودياً فقط لا غير',
    300: 'ثلاثمائة ريال سعودي فقط لا غير',
    400: 'أربعمائة ريال سعودي فقط لا غير',
    450: 'أربعمائة وخمسون ريالاً سعودياً فقط لا غير',
    500: 'خمسمائة ريال سعودي فقط لا غير',
    600: 'ستمائة ريال سعودي فقط لا غير',
    800: 'ثمانمائة ريال سعودي فقط لا غير',
    900: 'تسعمائة ريال سعودي فقط لا غير',
    1000: 'ألف ريال سعودي فقط لا غير',
    1200: 'ألف ومائتان ريال سعودي فقط لا غير',
    1500: 'ألف وخمسمائة ريال سعودي فقط لا غير',
    2000: 'ألفا ريال سعودي فقط لا غير',
    2500: 'ألفان وخمسمائة ريال سعودي فقط لا غير',
    3000: 'ثلاثة آلاف ريال سعودي فقط لا غير',
    3500: 'ثلاثة آلاف وخمسمائة ريال سعودي فقط لا غير',
    4000: 'أربعة آلاف ريال سعودي فقط لا غير',
    5000: 'خمسة آلاف ريال سعودي فقط لا غير',
    6000: 'ستة آلاف ريال سعودي فقط لا غير',
    10000: 'عشرة آلاف ريال سعودي فقط لا غير',
    12000: 'اثنا عشر ألف ريال سعودي فقط لا غير',
    21000: 'واحد وعشرون ألف ريال سعودي فقط لا غير',
  };
  return table[Math.floor(amount)] ?? `${amount.toLocaleString('ar-SA')} ريالاً سعودياً فقط لا غير`;
}

// ─── 1. Format Customer Official Receipt Voucher Text ──────────────────────────
export function formatCustomerVoucherMessage(params: {
  contract: Contract;
  customer: Customer;
  container?: Container;
  receiptNumber: string;
  isCash: boolean;
  paidAmount: number;
  remainingAmount: number;
  totalCost: number;
}): string {
  const { contract, customer, container, receiptNumber, isCash, paidAmount, remainingAmount, totalCost } = params;
  
  const typeLabel = contract.contract_type === 'commercial' ? 'حاوية تجارية' : 'حاوية أنقاض ونفايات بناء';
  const paymentMethodLabel = isCash ? 'نقدي كاش (في الموقع) 💵' : (contract.payment_method === 'apple_pay' ? 'Apple Pay 🍎' : 'بطاقة مدى / سداد إلكتروني 💳');
  const durationText = `${contract.duration_days} ${contract.period_type === 'monthly' ? 'شهر' : 'يوم'}`;
  const amountWords = toArabicWords(paidAmount > 0 ? paidAmount : totalCost);

  return `🏛️ *مؤسسة المحترز لتأجير الحاويات*
━━━━━━━━━━━━━━━━━━
🧾 *سند قبض وتوثيق عقد إلكتروني*
━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${customer.name}
📄 *رقم العقد:* ${contract.contract_number}
🔖 *رقم السند:* ${receiptNumber}
🚚 *الحاوية:* ${container?.container_number || '-'} (${typeLabel})
⏱️ *المدة:* ${durationText}
📅 *تاريخ البدء:* ${new Date(contract.start_date).toLocaleDateString('ar-SA')}
🏁 *تاريخ الانتهاء:* ${new Date(contract.end_date).toLocaleDateString('ar-SA')}
📍 *الموقع:* ${contract.location_address || 'الموقع المحدد بالعقد'}
──────────────────
💰 *إجمالي قيمة العقد:* ${totalCost.toLocaleString('ar-SA')} ر.س
💵 *المبلغ المسدد:* ${paidAmount.toLocaleString('ar-SA')} ر.س
✍️ *المبلغ بالحروف:* ${amountWords}
${remainingAmount > 0 ? `⏳ *المبلغ المتبقي:* ${remainingAmount.toLocaleString('ar-SA')} ر.س\n` : ''}💳 *طريقة السداد:* ${paymentMethodLabel}
━━━━━━━━━━━━━━━━━━
✅ *تم توثيق العقد واستلام الدفعة رسمياً في سجلات المحترز.*
📞 *للتمديد أو الاستفسار:* 0500000001
🙏 *شكراً لثقتكم واختياركم المحترز للحاويات.*`;
}

// ─── 2. Format Driver Mission (Zero financial prices to protect privacy) ──────
export function formatDriverMissionMessage(params: {
  contract: Contract;
  customer: Customer;
  container?: Container;
  mapsUrl: string;
  expectedTime?: string;
}): string {
  const { contract, customer, container, mapsUrl, expectedTime } = params;
  const typeLabel = contract.contract_type === 'commercial' ? 'حاوية تجارية' : 'حاوية أنقاض';

  return `🚛 *مهمة توصيل وتنزيل حاوية جديدة*
━━━━━━━━━━━━━━━━━━
📄 *رقم العقد:* ${contract.contract_number}
🚚 *رقم الحاوية:* ${container?.container_number || '-'} (${typeLabel})
👤 *العميل:* ${customer.name}
📞 *جوال العميل:* ${customer.phone}
📍 *الموقع على الخريطة:*
${mapsUrl}
📌 *العنوان الوصفي:* ${contract.location_address || 'حسب الرابط أعلاه'}
⏱️ *موعد التنزيل المطلوب:* ${expectedTime ? new Date(expectedTime).toLocaleString('ar-SA') : 'فوري خلال اليوم'}
━━━━━━━━━━━━━━━━━━
⚠️ *يرجى التأكد من وقوف الحاوية في مكان آمن وعدم إعاقة حركة السير.*`;
}

// ─── 3. Format Executive Admin Instant Alert ──────────────────────────────────
export function formatAdminAlertMessage(params: {
  contract: Contract;
  customer: Customer;
  container?: Container;
  staffName?: string;
  paidAmount: number;
  isCash: boolean;
}): string {
  const { contract, customer, container, staffName, paidAmount, isCash } = params;

  return `👑 *إشعار إداري: توثيق عقد جديد*
━━━━━━━━━━━━━━━━━━
📄 *العقد:* ${contract.contract_number}
👤 *العميل:* ${customer.name}
🚚 *الحاوية:* ${container?.container_number || '-'} (${contract.contract_type === 'commercial' ? 'تجاري' : 'أنقاض'})
💰 *المبلغ المحصل:* ${paidAmount.toLocaleString('ar-SA')} ر.س (${isCash ? 'كاش 💵' : 'إلكتروني 💳'})
👷 *الموظف المسجل:* ${staffName || 'المدير العام'}
⏱️ *الوقت:* ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
━━━━━━━━━━━━━━━━━━`;
}

// ─── 4. Format Executive Daily Briefing Report ────────────────────────────────
export function formatDailyExecutiveReport(params: {
  date: string;
  totalIncomeToday: number;
  cashToday: number;
  electronicToday: number;
  newContractsCount: number;
  activeContractsCount: number;
  availableContainersCount: number;
  rentedContainersCount: number;
  expiringTomorrowCount: number;
}): string {
  const {
    date,
    totalIncomeToday,
    cashToday,
    electronicToday,
    newContractsCount,
    activeContractsCount,
    availableContainersCount,
    rentedContainersCount,
    expiringTomorrowCount
  } = params;

  return `📊 *التقرير التنفيذي اليومي - المحترز للحاويات* 🏛️
📅 *تاريخ اليوم:* ${date}
━━━━━━━━━━━━━━━━━━
💰 *الملخص المالي لليوم:*
• إجمالي الدخل اليومي: *${totalIncomeToday.toLocaleString('ar-SA')} ر.س*
• المحصل نقداً (كاش): *${cashToday.toLocaleString('ar-SA')} ر.س*
• المحصل عبر سداد/مدى: *${electronicToday.toLocaleString('ar-SA')} ر.س*
──────────────────
📦 *حركة الأسطول والعقود:*
• العقود الجديدة اليوم: *${newContractsCount} عقد*
• العقود النشطة حالياً في الميدان: *${activeContractsCount} عقد*
• الحاويات المؤجرة: *${rentedContainersCount} حاوية*
• الحاويات المتاحة في المخزون: *${availableContainersCount} حاوية 🟢*
──────────────────
⚠️ *تنبيهات الغد والرافعات:*
• عقود تنتهي غداً تتطلب سحب/تجديد: *${expiringTomorrowCount} حاوية*
━━━━━━━━━━━━━━━━━━
✨ *تقرير آلي صادر من مساعد المحترز الذكي*`;
}
