import { Contract } from '@/types/database';

export type DriverTaskType = 'delivery' | 'pickup';

export interface DriverDispatchData {
  contract: Contract;
  taskType: DriverTaskType;
  customNotes?: string;
}

export function formatDriverWhatsAppMessage(data: DriverDispatchData): string {
  const { contract, taskType, customNotes } = data;
  const isDelivery = taskType === 'delivery';
  const customerName = contract.customer?.name || 'العميل';
  const customerPhone = contract.customer?.phone || '-';
  const taskUnits = contract.container_units?.filter(unit => isDelivery || unit.status === 'active') || [];
  const containerNumbers = taskUnits.map(unit => unit.container_number_snapshot).join('، ')
    || contract.containers?.map(container => container.container_number).join('، ')
    || contract.container?.container_number
    || '-';
  const containerTypeName = contract.contract_type === 'commercial' ? 'حاوية تجارية للمنشآت 🏢' : 'حاوية أنقاض ومخلفات 🏗️';
  
  const remainingAmount = Math.max(0, (contract.total_cost || 0) - (contract.paid_amount || 0));
  const isPaid = remainingAmount <= 0 || contract.payment_status === 'paid';

  const address = contract.location_address || 'حي الملقا - الرياض';
  const mapsUrl = contract.google_maps_url || (contract.location_latitude && contract.location_longitude ? `https://maps.google.com/?q=${contract.location_latitude},${contract.location_longitude}` : 'https://maps.google.com/?q=24.7136,46.6753');

  const taskTitle = isDelivery ? '📥 إنزال وتثبيت حاوية جديدة (توصيل)' : '📤 سحب وتحميل الحاوية (استرجاع للمخزون)';
  const pickupDate = taskUnits.length
    ? Math.min(...taskUnits.map(unit => new Date(unit.end_date).getTime()))
    : new Date(contract.expected_pickup_time || contract.end_date).getTime();
  const dateStr = isDelivery
    ? (contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-SA') : 'اليوم')
    : new Date(pickupDate).toLocaleDateString('ar-SA');

  let text = `🚚 *المحترز للحاويات | أمر مهمة تشغيلية ميدانية*
━━━━━━━━━━━━━━━━━━
📋 *نوع المهمة:* ${taskTitle}
📄 *رقم العقد:* ${contract.contract_number}
📦 *أرقام الحاويات:* ${containerNumbers} (${containerTypeName})
━━━━━━━━━━━━━━━━━━
👤 *بيانات العميل:*
• الاسم: *${customerName}*
• جوال العميل (للاتصال): *${customerPhone}*
📍 *موقع العمل:* ${address}
🗺️ *رابط خرائط Google للموقع:*
${mapsUrl}
━━━━━━━━━━━━━━━━━━
💰 *التحصيل المالي الميداني:*
${isPaid ? '✅ *العقد مدفوع مسبقاً بالكامل* (لا يلزم تحصيل أي مبالغ من العميل).' : `💵 *المطلوب تحصيله نقداً من العميل:* *${remainingAmount} ر.س*`}
━━━━━━━━━━━━━━━━━━
⏰ *موعد التنفيذ:* ${dateStr}`;

  if (customNotes) {
    text += `\n📝 *ملاحظات خاصة:* ${customNotes}`;
  }

  text += `\n\nنرجو تأكيد إتمام المهمة بعد التنفيذ. بالتوفيق!`;

  return text;
}
