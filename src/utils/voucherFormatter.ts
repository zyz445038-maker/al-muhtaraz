import { Contract, Customer, Container, Profile, Receipt, PaymentMethod } from '@/types/database';
import { getDebrisContractTypeLabel } from './rentalPricing';
import { 
  formatCleanArabicDate, 
  formatCleanArabicDateTime, 
  formatCleanArabicTime,
  formatContractPeriod 
} from './dateFormatter';

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
  paidAmount: number;
  remainingAmount: number;
  totalCost: number;
}): string {
  const { contract, customer, container, receiptNumber, paidAmount, remainingAmount, totalCost } = params;
  
  const typeLabel = contract.contract_type === 'commercial'
    ? 'حاوية تجارية'
    : getDebrisContractTypeLabel(contract.period_type, contract.duration_days);
  const paymentMethodLabel = contract.payment_method === 'cash' ? 'نقدي كاش 💵'
    : contract.payment_method === 'pos' ? 'نقطة بيع (POS) 💳'
      : contract.payment_method === 'bank_transfer' ? 'تحويل بنكي 🏦'
        : contract.payment_method === 'apple_pay' ? 'Apple Pay 🍎'
          : contract.payment_method === 'mada' ? 'بطاقة مدى 💳'
            : contract.payment_method === 'credit_card' ? 'بطاقة ائتمانية 💳'
              : 'آجل / بانتظار السداد ⏳';
  const durationText = contract.period_type === 'monthly' && contract.duration_days >= 30
    ? `${Math.round(contract.duration_days / 30)} شهر (${contract.duration_days} يومًا)`
    : contract.duration_days === 15
      ? 'نصف شهر (15 يومًا)'
      : contract.duration_days === 7
        ? '7 أيام'
        : `${contract.duration_days} يوم`;
  const amountWords = toArabicWords(paidAmount > 0 ? paidAmount : totalCost);
  const startDateClean = formatCleanArabicDate(contract.start_date);
  const endDateClean = formatCleanArabicDate(contract.end_date);

  if (contract.is_free) {
    return `🏛️ *مؤسسة المحترز لتأجير الحاويات*
━━━━━━━━━━━━━━━━━━
🧾 *فاتورة وعقد تأجير إلكتروني*
━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${customer.name}
📄 *رقم العقد:* ${contract.contract_number}
🔖 *رقم الفاتورة:* ${receiptNumber}
🚚 *الحاوية:* ${container?.container_number || '-'} (${typeLabel})
⏱️ *المدة:* ${durationText}
📅 *تاريخ البدء:* ${startDateClean}
🏁 *تاريخ الانتهاء:* ${endDateClean}
📍 *الموقع:* ${contract.location_address || 'الموقع المحدد بالعقد'}
━━━━━━━━━━━━━━━━━━
✅ *تم توثيق واعتماد العقد رسمياً في سجلات المحترز.*
📞 *للتمديد أو الاستفسار:* 0500000001
🙏 *شكراً لثقتكم واختياركم المحترز للحاويات.*`;
  }

  return `🏛️ *مؤسسة المحترز لتأجير الحاويات*
━━━━━━━━━━━━━━━━━━
${paidAmount > 0 ? '🧾 *سند قبض وتوثيق عقد إلكتروني*' : '📄 *توثيق عقد إلكتروني*'}
━━━━━━━━━━━━━━━━━━
👤 *العميل:* ${customer.name}
📄 *رقم العقد:* ${contract.contract_number}
${paidAmount > 0 ? `🔖 *رقم سند القبض:* ${receiptNumber}\n` : ''}🚚 *الحاوية:* ${container?.container_number || '-'} (${typeLabel})
⏱️ *المدة:* ${durationText}
📅 *تاريخ البدء:* ${startDateClean}
🏁 *تاريخ الانتهاء:* ${endDateClean}
📍 *الموقع:* ${contract.location_address || 'الموقع المحدد بالعقد'}
──────────────────
💰 *إجمالي قيمة العقد:* ${totalCost.toLocaleString('ar-SA')} ر.س
💵 *المبلغ المسدد:* ${paidAmount.toLocaleString('ar-SA')} ر.س
✍️ *المبلغ بالحروف:* ${amountWords}
${remainingAmount > 0 ? `⏳ *المبلغ المتبقي:* ${remainingAmount.toLocaleString('ar-SA')} ر.س\n` : ''}💳 *طريقة السداد:* ${paymentMethodLabel}
━━━━━━━━━━━━━━━━━━
${paidAmount > 0 ? '✅ *تم توثيق العقد واستلام الدفعة رسمياً في سجلات المحترز.*' : '✅ *تم توثيق العقد رسمياً، والمبلغ بانتظار السداد.*'}
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
  const deliveryTimeClean = expectedTime ? formatCleanArabicDateTime(expectedTime) : 'فوري خلال اليوم';

  return `🚛 *مهمة توصيل وتنزيل حاوية جديدة*
━━━━━━━━━━━━━━━━━━
📄 *رقم العقد:* ${contract.contract_number}
🚚 *رقم الحاوية:* ${container?.container_number || '-'} (${typeLabel})
👤 *العميل:* ${customer.name}
📞 *جوال العميل:* ${customer.phone}
📍 *الموقع على الخريطة:*
${mapsUrl}
📌 *العنوان الوصفي:* ${contract.location_address || 'حسب الرابط أعلاه'}
⏱️ *موعد التنزيل المطلوب:* ${deliveryTimeClean}
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
  remainingAmount: number;
  paymentMethod?: PaymentMethod;
}): string {
  const { contract, customer, container, staffName, paidAmount, remainingAmount, paymentMethod } = params;
  const paymentMethodLabel = paymentMethod === 'cash' ? 'كاش 💵'
    : paymentMethod === 'pos' ? 'نقطة بيع 💳'
      : paymentMethod === 'bank_transfer' ? 'تحويل بنكي 🏦'
        : paymentMethod === 'mada' ? 'مدى / سداد إلكتروني 💳'
          : paymentMethod === 'apple_pay' ? 'Apple Pay 🍎'
            : paymentMethod === 'credit_card' ? 'بطاقة ائتمانية 💳'
              : contract.is_free ? 'مجاني 🎁' : 'آجل ⏳';

  return `👑 *إشعار إداري: توثيق عقد جديد*
━━━━━━━━━━━━━━━━━━
📄 *العقد:* ${contract.contract_number}
👤 *العميل:* ${customer.name}
🚚 *الحاوية:* ${container?.container_number || '-'} (${contract.contract_type === 'commercial' ? 'تجاري' : 'أنقاض'})
💰 *المبلغ المحصل:* ${paidAmount.toLocaleString('ar-SA')} ر.س
${remainingAmount > 0 ? `⏳ *المتبقي:* ${remainingAmount.toLocaleString('ar-SA')} ر.س\n` : ''}💳 *طريقة السداد:* ${paymentMethodLabel}
👷 *الموظف المسجل:* ${staffName || 'المدير العام'}
⏱️ *الوقت:* ${formatCleanArabicTime(new Date())}
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
