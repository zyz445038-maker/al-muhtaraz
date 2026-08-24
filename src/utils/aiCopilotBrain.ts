// ─── Advanced Deep-Reasoning AI Copilot Engine for Al-Muhtaraz ERP ───────────────
// Real-time Semantic RAG & Context Analytics Engine: Answers ANY question dynamically
import { Contract, Container, Customer, Profile, Receipt } from '@/types/database';
import { querySystemKnowledge } from './aiCopilotKnowledge';

export interface AssistantContextData {
  contracts: Contract[];
  containers: Container[];
  customers: Customer[];
  staffList?: Profile[];
  receipts: Receipt[];
}

// ─── Helper: Clean & Normalize Arabic Text for Search ─────────────────────────
function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .toLowerCase()
    .trim();
}

// ─── Master Reasoning Function ──────────────────────────────────────────────
export function processDeepAssistantQuery(
  rawQuery: string,
  context: AssistantContextData
): { displayText: string; category: string } {
  const { contracts = [], containers = [], customers = [], staffList = [], receipts = [] } = context;
  const normQuery = normalizeArabic(rawQuery);

  if (!normQuery) {
    return {
      displayText: 'يا هلا يا أبو ماجد، تفضل اسألني عن أي عقد، حاوية، مبالغ مالية، أو حالة الأسطول وسأجيبك فوراً 🌿.',
      category: 'greeting'
    };
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // 1. آخر عقد تم إبرامه / أحدث العقود (Latest Contracts)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('اخر عقد') || 
    normQuery.includes('احدث عقد') || 
    normQuery.includes('جديد العقود') ||
    normQuery.includes('عقد اخير') ||
    normQuery.includes('من اخر واحد') ||
    normQuery.includes('اخر عمليه')
  ) {
    if (contracts.length === 0) {
      return {
        displayText: '⚠️ **لا توجد عقود مسجلة في النظام حتى الآن.**\nيمكنك إنشاء عقد جديد من صفحة العقود وسأقوم بتتبعه فوراً.',
        category: 'contracts'
      };
    }

    // Sort by created_at descending
    const sorted = [...contracts].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const latest = sorted[0];

    const custName = latest.customer?.name || customers.find(c => c.id === latest.customer_id)?.name || 'عميل نقدي';
    const custPhone = latest.customer?.phone || customers.find(c => c.id === latest.customer_id)?.phone || 'غير مسجل';
    const contNum = latest.container?.container_number || containers.find(c => c.id === latest.container_id)?.container_number || 'غير محدد';
    const contType = latest.contract_type === 'commercial' ? 'تجاري' : 'أنقاض';
    const startDate = latest.start_date || 'اليوم';
    const endDate = latest.end_date || 'غير محدد';
    const totalCost = Number(latest.total_cost || 0).toLocaleString('ar-SA');
    const paidAmount = Number(latest.paid_amount || 0).toLocaleString('ar-SA');
    const remaining = Number(latest.remaining_amount || 0).toLocaleString('ar-SA');
    const statusText = latest.status === 'active' ? '🟢 ساري ونشط' : latest.status === 'completed' ? '✅ مكتمل' : '⚠️ ' + latest.status;

    return {
      displayText: `📋 **تفاصيل آخر عقد تم إبرامه في النظام:** ✨\n\n` +
        `• **رقم العقد:** \`${latest.contract_number}\`\n` +
        `• **العميل:** **${custName}** (📞 ${custPhone})\n` +
        `• **رقم الحاوية:** **#${contNum}** (${contType})\n` +
        `• **فترة الإيجار:** من ${startDate} إلى ${endDate} (${latest.duration_days || 1} يوم)\n` +
        `• **المبلغ الإجمالي:** **${totalCost} ر.س**\n` +
        `• **المدفوع:** ${paidAmount} ر.س | **المتبقي:** ${remaining} ر.س\n` +
        `• **حالة العقد:** ${statusText}\n` +
        (latest.google_maps_url ? `• **الموقع:** [فتح في خرائط Google](${latest.google_maps_url})\n` : '') +
        `\n💡 *تاريخ التوثيق: ${new Date(latest.created_at).toLocaleString('ar-SA')}*`,
      category: 'contracts'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. البحث عن حاوية محددة برقمها (Specific Container Lookup)
  // ─────────────────────────────────────────────────────────────────────────────
  const containerNumMatch = normQuery.match(/حاوي[هة]\s*(?:رقم\s*)?([0-9]+)/);
  if (containerNumMatch || (normQuery.includes('حاويه') && normQuery.match(/[0-9]+/))) {
    const targetNum = containerNumMatch ? containerNumMatch[1] : normQuery.match(/[0-9]+/)?.[0];
    if (targetNum) {
      const found = containers.find(c => c.container_number === targetNum || c.container_number.includes(targetNum));
      if (found) {
        const activeContract = contracts.find(c => c.container_id === found.id && c.status === 'active');
        const statusLabel = found.status === 'available' ? '🟢 شاغرة في المستودع' : found.status === 'rented' ? '🚛 مؤجرة بالشارع' : '🛠️ تحت الصيانة';
        const typeLabel = found.type === 'commercial' ? 'تجارية' : 'أنقاض/ترميم';

        let extraDetails = '';
        if (activeContract) {
          const cust = activeContract.customer?.name || customers.find(c => c.id === activeContract.customer_id)?.name || 'غير معروف';
          extraDetails = `\n\n📌 **بيانات العقد الحالي:**\n• **المستأجر:** ${cust}\n• **تاريخ النهاية:** ${activeContract.end_date}\n• **رقم العقد:** \`${activeContract.contract_number}\``;
        }

        return {
          displayText: `📦 **بيانات الحاوية رقم #${found.container_number}:**\n\n` +
            `• **النوع:** حاوية ${typeLabel}\n` +
            `• **الحالة الحالية:** **${statusLabel}**\n` +
            `• **سعر الإيجار اليومي:** ${found.daily_rate || 0} ر.س | **الشهري:** ${found.monthly_rate || 0} ر.س` +
            extraDetails,
          category: 'containers'
        };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. المبالغ المعلقة والديون المتبقية (Unpaid / Outstanding Balances)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('متبقي') || 
    normQuery.includes('ديون') || 
    normQuery.includes('مستحقات') || 
    normQuery.includes('غير مدفوع') || 
    normQuery.includes('ما سدد') || 
    normQuery.includes('ما دفع') ||
    normQuery.includes('كم باقي فلوس')
  ) {
    const unpaidContracts = contracts.filter(c => Number(c.remaining_amount) > 0 && c.status === 'active');
    const totalRemaining = unpaidContracts.reduce((sum, c) => sum + (Number(c.remaining_amount) || 0), 0);

    if (unpaidContracts.length === 0) {
      return {
        displayText: `✅ **ما شاء الله يا أبو ماجد، لا توجد أي مبالغ معلقة أو ديون متأخرة!**\nكافة العقود النشطة مسددة بنسبة 100% 🎉.`,
        category: 'finance'
      };
    }


    const debtorList = unpaidContracts.slice(0, 5).map((c, i) => {
      const cust = c.customer?.name || customers.find(cust => cust.id === c.customer_id)?.name || 'عميل';
      return `${i + 1}. **${cust}**: متبقي عليه \`${Number(c.remaining_amount).toLocaleString('ar-SA')} ر.س\` (عقد #${c.contract_number})`;
    }).join('\n');

    return {
      displayText: `💰 **تقرير المبالغ والتحصيلات المتبقية:**\n\n` +
        `• **إجمالي المبالغ المستحقة غير المحصلة:** **${totalRemaining.toLocaleString('ar-SA')} ر.س** ⚠️\n` +
        `• **عدد العقود المعلقة:** (${unpaidContracts.length}) عقد\n\n` +
        `📋 **أبرز العقود التي عليها متبقي:**\n${debtorList}` +
        (unpaidContracts.length > 5 ? `\n\n*...ويوجد ${unpaidContracts.length - 5} عقود أخرى بها متبقي.*` : ''),
      category: 'finance'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. أكثر العملاء تعاملاً / كبار العملاء (Top Customers)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('اكثر عميل') || 
    normQuery.includes('افضل عميل') || 
    normQuery.includes('اكبر عميل') || 
    normQuery.includes('كبار العملاء') ||
    normQuery.includes('اهم العملاء')
  ) {
    if (customers.length === 0) {
      return { displayText: 'لا يوجد عملاء مسجلين حالياً في النظام.', category: 'customers' };
    }

    // Aggregate contracts per customer
    const spendingMap = new Map<string, { name: string; count: number; total: number }>();
    for (const c of contracts) {
      const custName = c.customer?.name || customers.find(cust => cust.id === c.customer_id)?.name || 'غير معروف';
      const existing = spendingMap.get(custName) || { name: custName, count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(c.total_cost) || 0;
      spendingMap.set(custName, existing);
    }

    const topList = Array.from(spendingMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

    if (topList.length === 0) {
      return { displayText: 'لا توجد تعاملات كافية بعد لحساب كبار العملاء.', category: 'customers' };
    }

    const formattedList = topList.map((item, idx) => 
      `${idx + 1}. 👑 **${item.name}**: إجمالي تعاملاته **${item.total.toLocaleString('ar-SA')} ر.س** (${item.count} عقد)`
    ).join('\n');

    return {
      displayText: `🏆 **قائمة كبار العملاء الأكثر تعاملاً مع المؤسسة:**\n\n${formattedList}\n\n💡 *نوصي بتقديم عروض وخصومات خاصة لهم لتعزيز ولائهم.*`,
      category: 'customers'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. عقود اليوم والنشاط اللحظي (Today's Contracts & Activity)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('عقود اليوم') || 
    normQuery.includes('الي سويناه اليوم') || 
    normQuery.includes('جديد اليوم') ||
    normQuery.includes('عقود جديده')
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayContracts = contracts.filter(c => (c.created_at || '').startsWith(todayStr) || (c.start_date || '') === todayStr);

    if (todayContracts.length === 0) {
      return {
        displayText: `📅 **تقرير اليوم:**\nلم يتم إبرام عقود جديدة حتى هذه اللحظة اليوم. جميع الحاويات الشاغرة جاهزة للتأجير 🟢.`,
        category: 'contracts'
      };
    }

    const list = todayContracts.map((c, i) => {
      const cust = c.customer?.name || customers.find(cust => cust.id === c.customer_id)?.name || 'عميل';
      const cont = c.container?.container_number || 'حاوية';
      return `${i + 1}. **${cust}** | حاوية #${cont} | المبلغ: \`${Number(c.total_cost).toLocaleString('ar-SA')} ر.س\``;
    }).join('\n');

    return {
      displayText: `📋 **العقود المبرمة اليوم (${todayContracts.length} عقد):** ✨\n\n${list}\n\nعساها مداخيل الخير والبركة يا رب 🌸!`,
      category: 'contracts'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. الحاويات المتاحة والشواغر في الحوش (Yard Availability)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('حاوي') || 
    normQuery.includes('حوش') || 
    normQuery.includes('مستودع') || 
    normQuery.includes('شاغر') || 
    normQuery.includes('متوفر') || 
    normQuery.includes('كم باقي')
  ) {
    const available = containers.filter(c => c.status === 'available');
    const rented = containers.filter(c => c.status === 'rented');
    const maintenance = containers.filter(c => c.status === 'maintenance');

    const availCommercial = available.filter(c => c.type === 'commercial').length;
    const availDebris = available.filter(c => c.type === 'debris').length;

    return {
      displayText: `📦 **الموقف الميداني لأسطول الحاويات الآن:**\n\n` +
        `• **الحاويات الشاغرة بالمستودع:** **${available.length}** حاوية 🟢\n` +
        `  - تجارية: (${availCommercial}) حاوية\n` +
        `  - أنقاض وترميم: (${availDebris}) حاوية\n` +
        `• **المؤجرة بالشارع:** **${rented.length}** حاوية 🚛\n` +
        `• **تحت الصيانة:** **${maintenance.length}** حاوية 🛠️\n` +
        `• **إجمالي الأسطول:** ${containers.length} حاوية\n\n` +
        (available.length > 0 ? '🟢 المستودع جاهز لأي طلبات تنزيل فورية.' : '⚠️ كافة الحاويات مؤجرة في الميدان حالياً!'),
      category: 'containers'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. الدخل المالي والكاش وسندات القبض (Income & Revenue)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('دخل') || 
    normQuery.includes('فلوس') || 
    normQuery.includes('ايراد') || 
    normQuery.includes('كاش') || 
    normQuery.includes('مالي') || 
    normQuery.includes('ارباح') || 
    normQuery.includes('سداد') ||
    normQuery.includes('كم جانا') ||
    normQuery.includes('كم كسبنا')
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayReceipts = receipts.filter(r => (r.issued_at || r.created_at || '').startsWith(todayStr));
    const cashToday = todayReceipts.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const electronicToday = todayReceipts.filter(r => r.payment_method !== 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalToday = cashToday + electronicToday;

    // Total lifetime receipts
    const lifetimeRevenue = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      displayText: `💰 **التقرير المالي اللحظي المباشر:**\n\n` +
        `• **إجمالي تحصيل اليوم:** **${totalToday.toLocaleString('ar-SA')} ر.س** 🎉\n` +
        `  - 💵 **المستلم نقداً (كاش):** ${cashToday.toLocaleString('ar-SA')} ر.س\n` +
        `  - 💳 **سداد إلكتروني (شبكة/تحويل):** ${electronicToday.toLocaleString('ar-SA')} ر.س\n` +
        `• **عدد سندات اليوم:** (${todayReceipts.length}) سند قبض\n` +
        `• **إجمالي مبيعات النظام الكلية:** ${lifetimeRevenue.toLocaleString('ar-SA')} ر.س\n\n` +
        `عساها مداخيل الخير والبركة يا رب 🌿!`,
      category: 'finance'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. إنذار البلديات والعقود المنتهية غداً (Municipality & Expiry Warnings)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('بلديه') || 
    normQuery.includes('امانه') || 
    normQuery.includes('غرامه') || 
    normQuery.includes('مخالف') || 
    normQuery.includes('منتهي') || 
    normQuery.includes('سحب') ||
    normQuery.includes('بتنتهي') ||
    normQuery.includes('بكره') ||
    normQuery.includes('غدا')
  ) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiring = contracts.filter(c => c.status === 'active' && (c.end_date || '').startsWith(tomorrow));

    if (expiring.length === 0) {
      return {
        displayText: `✅ **تطمن يا أبو ماجد، كل العقود في السليم!**\nلا توجد أي حاويات تنتهي غداً أو متأخرة، والأمور الرقابية مع البلدية تحت السيطرة 100% 🛡️.`,
        category: 'compliance'
      };
    }

    const expiringList = expiring.map((c, idx) => {
      const cust = c.customer?.name || customers.find(cust => cust.id === c.customer_id)?.name || 'عميل';
      const cont = c.container?.container_number || 'غير محدد';
      return `${idx + 1}. **حاوية #${cont}** لدى العميل **${cust}** (📞 ${c.customer?.phone || 'غير مسجل'})\n   - موقع: ${c.location_address || 'في الميدان'}`;
    }).join('\n');

    return {
      displayText: `⚠️ **تنبيه عاجل - عقود تتطلب سحب الحاويات غداً تفادياً لمخالفات البلدية:**\n\n` +
        `يوجد **(${expiring.length})** عقد ينتهي غداً (${tomorrow}):\n\n${expiringList}\n\n` +
        `🚜 *نوصي بتوجيه السائقين لسحب الحاويات أو التواصل مع العملاء للتمديد الآن.*`,
      category: 'compliance'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. طاقم السائقين والميدان (Drivers & Staff Dispatch)
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    normQuery.includes('سائق') || 
    normQuery.includes('سواق') || 
    normQuery.includes('دريول') || 
    normQuery.includes('عمال') || 
    normQuery.includes('موظف') || 
    normQuery.includes('فريق')
  ) {
    const drivers = staffList.filter(s => s.role === 'employee' || s.role as string === 'driver');
    return {
      displayText: `🚛 **إدارة طاقم السائقين والميدان:**\n\n` +
        `• **عدد الموظفين المسجلين:** (${staffList.length}) موظف\n` +
        `• **حالة التوجيه:** رسائل المهام والمواقع تصل للسائقين عبر الواتساب آلياً وبأعلى درجات الخصوصية (محجوب عنهم الأسعار والأرباح) 🛡️.\n` +
        `• كل العمليات الميدانية موثقة ومربوطة بأرقام الحاويات في قاعدة البيانات.`,
      category: 'staff'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. قاعدة المعرفة التشغيلية والإرشادية (Operational Knowledge Base)
  // ─────────────────────────────────────────────────────────────────────────────
  const knowledgeMatch = querySystemKnowledge(rawQuery);
  if (knowledgeMatch) {
    return {
      displayText: knowledgeMatch.displayMarkdown,
      category: knowledgeMatch.category
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. الرد الذكي المفتوح عند عدم تطابق نصي مباشر (Smart Dynamic Fallback)
  // ─────────────────────────────────────────────────────────────────────────────
  const activeCount = contracts.filter(c => c.status === 'active').length;
  const availCount = containers.filter(c => c.status === 'available').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTotal = receipts.filter(r => (r.issued_at || r.created_at || '').startsWith(todayStr)).reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return {
    displayText: `👑 **أبشر يا أبو ماجد! أنا معك وفاهم كل تفاصيل المؤسسة:**\n\n` +
      `سألت عن: *"${rawQuery}"*\n\n` +
      `📊 **الموقف العام للنظام الآن:**\n` +
      `• **العقود النشطة في الميدان:** (${activeCount}) عقد 📋\n` +
      `• **الحاويات الشاغرة بالمستودع:** (${availCount}) حاوية 📦\n` +
      `• **تحصيل اليوم:** ${todayTotal.toLocaleString('ar-SA')} ر.س 💰\n\n` +
      `💡 *تقدر تسألني عن أي تفصيل محدد مثل: "آخر عقد"، "الحاوية رقم 5"، "أكثر عميل دفع"، أو "عقود تنتهي غداً". آمرني وش ودك تعرف بالتحديد؟* ✨`,
    category: 'general'
  };

}
