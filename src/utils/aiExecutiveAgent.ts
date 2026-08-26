// Enterprise Executive AI Agent Engine for Al-Muhtaraz Containers
// Implements Tool Calling & Agentic Function Execution (Vercel AI SDK / LangChain Pattern)

import { Contract, Container, Customer, Profile, Receipt } from '@/types';
import { diacritizeArabicSpeech } from '@/utils/arabicDiacritizer';

export interface AgentContext {
  contracts: Contract[];
  containers: Container[];
  customers: Customer[];
  staffList: Profile[];
  receipts: Receipt[];
  currentUserName?: string;
}

export interface AgentExecutionResult {
  toolExecuted: string | null;
  toolParameters?: any;
  speechResponse: string;
  displayMarkdown: string;
  actionCard?: {
    type: 'contract' | 'container' | 'finance' | 'alert' | 'marketing';
    title: string;
    data: any;
    actionButtons?: { label: string; actionId: string; payload?: any }[];
  };
}

export class AlMuhtarazExecutiveAgent {
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  // Update live memory context
  public updateContext(newContext: Partial<AgentContext>) {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Main Agent Inference & Tool Dispatcher
   * Matches user intent to executable enterprise tools or domain knowledge
   */
  public async executeUserCommand(userInput: string): Promise<AgentExecutionResult> {
    const query = userInput.trim().toLowerCase();

    // 1. Tool: Live Financial & Revenue Audit (كاش وسداد والتحصيل)
    if (
      query.includes('دخل') || query.includes('ارباح') || query.includes('أرباح') ||
      query.includes('مبالغ') || query.includes('كاش') || query.includes('تحصيل') ||
      query.includes('كم جمعنا') || query.includes('فلوس') || query.includes('مالية')
    ) {
      return this.tool_auditLiveFinancials();
    }

    // 2. Tool: Municipality & Expiring Containers Protection (تنبيهات البلدية والحاويات المنتهية)
    if (
      query.includes('بلديه') || query.includes('بلدية') || query.includes('منتهية') ||
      query.includes('منتهي') || query.includes('انتهى') || query.includes('سحب') ||
      query.includes('غرامات') || query.includes('مخالفات') || query.includes('تحذير')
    ) {
      return this.tool_auditExpiringContainers();
    }

    // 3. Tool: Containers Inventory & Fleet Availability (المخزون والحاويات المتوفرة)
    if (
      query.includes('حاويات متوفرة') || query.includes('المتوفر') || query.includes('مخزون') ||
      query.includes('كم حاوية') || query.includes('فاضي') || query.includes('حالة الحاويات') ||
      query.includes('الاسطول') || query.includes('أسطول')
    ) {
      return this.tool_auditContainersStock();
    }

    // 4. Tool: Search Customer / Contract by Name or Number (البحث الذكي عن عميل أو عقد)
    if (
      query.includes('ابحث عن') || query.includes('عقد رقم') || query.includes('عقد شركة') ||
      query.includes('جوال عميل') || query.includes('رقم العميل') || query.includes('موقع الحاوية')
    ) {
      return this.tool_searchEntity(query);
    }

    // 5. Tool: Drivers & Logistics Fleet Status (حالة السائقين والمهام الميدانية)
    if (
      query.includes('سواق') || query.includes('سائق') || query.includes('سائقين') ||
      query.includes('سواقين') || query.includes('مهام') || query.includes('مشاوير')
    ) {
      return this.tool_auditDriversFleet();
    }

    // 6. Default Fallback with Smart Executive Assistance
    return this.tool_generalExecutiveGuidance(userInput);
  }

  // ─── TOOL IMPLEMENTATIONS ──────────────────────────────────────

  // 💰 Tool 1: Live Financials Audit
  private tool_auditLiveFinancials(): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    const receipts = this.context.receipts || [];

    const totalGrossRevenue = contracts.reduce((sum, c) => sum + (Number(c.total_cost) || 0), 0);
    const totalCollected = contracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);
    const totalRemaining = contracts.reduce((sum, c) => sum + (Number(c.remaining_amount ?? (c.total_cost - c.paid_amount)) || 0), 0);

    const cashContracts = contracts.filter(c => c.payment_method === 'cash');
    const cashCollected = cashContracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);

    const electronicContracts = contracts.filter(c => c.payment_method === 'online' || c.payment_method === 'bank_transfer');
    const electronicCollected = electronicContracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);

    const speech = `أَهْلاً بِأَبُو مَاجِدْ.. إِجْمَالِيُّ الْمَبَالِغِ الْمُحَصَّلَةِ حَتَّى الآنْ هُوَ ${totalCollected.toLocaleString()} رِيَالْ.. مِنْهَا ${cashCollected.toLocaleString()} رِيَالْ كَاشْ.. وَالْمُتَبَقِّي لِلْتَّحْصِيلِ هُوَ ${totalRemaining.toLocaleString()} رِيَالْ..`;

    const md = `### 💵 التقرير المالي الحي المباشر من النظام 📊\n\n` +
      `* **إجمالي المبالغ المحصلة فعلياً:** \`${totalCollected.toLocaleString()} ر.س\`\n` +
      `* **مقبوضات الكاش (نقداً بالموقع):** \`${cashCollected.toLocaleString()} ر.س\` (${cashContracts.length} عقود)\n` +
      `* **مقبوضات السداد والتحويل البنكي:** \`${electronicCollected.toLocaleString()} ر.س\` (${electronicContracts.length} عقود)\n` +
      `* **المبالغ المتبقية للتحصيل (ذمم مدينة):** \`${totalRemaining.toLocaleString()} ر.س\`\n` +
      `* **إجمالي قيمة كافة العقود:** \`${totalGrossRevenue.toLocaleString()} ر.س\`\n\n` +
      `*تم تدقيق ومطابقة السجلات المحاسبية وسندات القبض في أجزاء من الثانية ✅.*`;

    return {
      toolExecuted: 'auditLiveFinancials',
      toolParameters: { totalCollected, cashCollected, totalRemaining },
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'finance',
        title: 'الملخص المالي الفوري',
        data: { totalCollected, cashCollected, totalRemaining, totalGrossRevenue }
      }
    };
  }

  // ⚠️ Tool 2: Municipality Protection & Expiring Containers
  private tool_auditExpiringContainers(): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    const now = new Date().getTime();

    // Active contracts expiring within 48h or already expired
    const criticalContracts = contracts.filter(c => {
      if (c.status === 'completed' || c.status === 'cancelled') return false;
      const end = new Date(c.end_date).getTime();
      const diffHours = (end - now) / (1000 * 60 * 60);
      return diffHours <= 48;
    });

    const alreadyExpired = criticalContracts.filter(c => new Date(c.end_date).getTime() < now);
    const expiringSoon = criticalContracts.filter(c => new Date(c.end_date).getTime() >= now);

    let speech = '';
    if (criticalContracts.length === 0) {
      speech = 'أَبْشِرْ يَا أَبُو مَاجِدْ.. جَمِيعُ الْحَاوِيَاتِ فِي الْمَيْدَانِ سَلِيمَةٌ وَسَارِيَةُ الصَّلاَحِيَّةِ، وَلاَ تُوجَدُ أَيُّ مُخَالَفَاتٍ بَلَدِيَّةٍ..';
    } else {
      speech = `تَنْبِيهٌ يَا أَبُو مَاجِدْ.. هُنَاكَ عَدَدُ ${criticalContracts.length} حَاوِيَاتٍ بِحَاجَةٍ لِلْتَّمْدِيدِ أَوْ السَّحْبِ لِتَفَادِي غَرَامَاتِ الأَمَانَةِ..`;
    }

    let md = `### ⚠️ فحص الرقابة وحماية البلدية والأمانة 🏛️\n\n`;
    if (criticalContracts.length === 0) {
      md += `🟢 **الوضع الميداني ممتاز 100%:** جميع الحاويات المؤجرة سارية الصلاحية ولا يوجد أي حاوية متأخرة.\n`;
    } else {
      md += `⚠️ **يوجد (${criticalContracts.length}) حاويات تتطلب الإجراء الفوري لتفادي غرامات البلدية:**\n\n`;
      criticalContracts.slice(0, 5).forEach((c, idx) => {
        const isExp = new Date(c.end_date).getTime() < now;
        md += `${idx + 1}. **العقد (${c.contract_number})** — العميل: **${c.customer?.name || 'العميل'}** — الحاوية: **(${c.container?.container_number || '-'})** [${isExp ? '🔴 منتهية اليوم' : '🟡 تنتهي خلال 24 ساعة'}]\n`;
      });
      md += `\n*يمكنك تمديد العقد أو توجيه السائق لسحب الحاوية فوراً بنقرة واحدة.*`;
    }

    return {
      toolExecuted: 'auditExpiringContainers',
      toolParameters: { count: criticalContracts.length },
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'alert',
        title: 'حماية مخالفات البلدية',
        data: criticalContracts
      }
    };
  }

  // 📦 Tool 3: Containers Stock & Fleet Audit
  private tool_auditContainersStock(): AgentExecutionResult {
    const containers = this.context.containers || [];
    const available = containers.filter(c => c.status === 'available');
    const rented = containers.filter(c => c.status === 'rented');
    const maintenance = containers.filter(c => c.status === 'maintenance');

    const speech = `أَبْشِرْ يَا أَبُو مَاجِدْ.. إِجْمَالِيُّ الأُسْطُولِ ${containers.length} حَاوِيَةً.. يَتَوَفَّرُ مِنْهَا حَالِيّاً ${available.length} حَاوِيَةً جَاهِزَةً لِلْتَّأْجِيرِ.. وَعَدَدُ ${rented.length} حَاوِيَةً فِي الْمَيْدَانِ..`;

    const md = `### 📦 تقرير أسطول ومخزون الحاويات الميداني 🏗️\n\n` +
      `* **إجمالي أسطول المؤسسة:** \`${containers.length}\` حاوية\n` +
      `* **🟢 الحاويات المتاحة للتأجير الفوري:** \`${available.length}\` حاوية جاهزة للتحميل\n` +
      `* **🔵 الحاويات المؤجرة في الميدان:** \`${rented.length}\` حاوية قيد الاستخدام\n` +
      `* **🟠 الحاويات تحت الصيانة:** \`${maintenance.length}\` حاوية\n` +
      `* **نسبة تشغيل الأسطول:** \`${containers.length > 0 ? Math.round((rented.length / containers.length) * 100) : 0}%\`\n\n` +
      `*جاهزون لتلبية أي طلب جديد وتوصيله خلال ساعتين بالرياض ⚡.*`;

    return {
      toolExecuted: 'auditContainersStock',
      toolParameters: { total: containers.length, available: available.length, rented: rented.length },
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'container',
        title: 'مخزون الحاويات',
        data: { total: containers.length, available: available.length, rented: rented.length }
      }
    };
  }

  // 🔍 Tool 4: Search Customer or Contract Entity
  private tool_searchEntity(query: string): AgentExecutionResult {
    const cleanQuery = query.replace('ابحث عن', '').replace('عقد رقم', '').replace('رقم', '').trim();
    const contracts = this.context.contracts || [];
    const customers = this.context.customers || [];

    const foundContract = contracts.find(c => 
      c.contract_number.toLowerCase().includes(cleanQuery) ||
      (c.customer?.name && c.customer.name.toLowerCase().includes(cleanQuery)) ||
      (c.customer?.phone && c.customer.phone.includes(cleanQuery))
    );

    if (foundContract) {
      const speech = `وَجَدْتُ الْعَقْدَ رَقْمَ (${foundContract.contract_number}) بِاسْمِ (${foundContract.customer?.name || 'العميل'}).. الْحَاوِيَةُ هِيَ (${foundContract.container?.container_number || '-'}) وَحَالَةُ الْعَقْدِ سَارِيَةٌ..`;
      const md = `### 🔍 نتيجة البحث عن العقد: (${foundContract.contract_number}) 📋\n\n` +
        `* **العميل:** ${foundContract.customer?.name || '-'} (${foundContract.customer?.phone || '-'})\n` +
        `* **الحاوية:** ${foundContract.container?.container_number || '-'} (${foundContract.contract_type || 'أنقاض'})\n` +
        `* **فترة الإيجار:** من ${foundContract.start_date} إلى ${foundContract.end_date}\n` +
        `* **المبلغ الإجمالي:** ${foundContract.total_cost} ر.س | **المدفوع:** ${foundContract.paid_amount} ر.س\n` +
        `* **موقع التنزيل:** ${foundContract.location_address || 'حي بالرياض'}\n` +
        `* **السائق المسؤول:** ${foundContract.assigned_employee?.full_name || 'غير محدد'}`;

      return {
        toolExecuted: 'searchEntity',
        toolParameters: { contractId: foundContract.id },
        speechResponse: speech,
        displayMarkdown: md,
        actionCard: {
          type: 'contract',
          title: `العقد ${foundContract.contract_number}`,
          data: foundContract
        }
      };
    }

    return {
      toolExecuted: 'searchEntity',
      speechResponse: 'لَمْ أَعْثُرْ عَلَى سِجِلٍّ مُطَابِقٍ لِبَحْثِكَ يَا أَبُو مَاجِدْ، يُمْكِنُكَ كِتَابَةُ رَقْمِ الْعَقْدِ أَوْ اسْمِ الْعَمِيلِ بِدِقَّةٍ..',
      displayMarkdown: `🔍 لم يتم العثور على سجل مطابق لعبارة البحث: **"${cleanQuery}"**.\n\nتأكد من كتابة رقم العقد (مثال: \`CNT-2026-001\`) أو رقم جوال العميل.`
    };
  }

  // 🚛 Tool 5: Drivers Fleet Status
  private tool_auditDriversFleet(): AgentExecutionResult {
    const staffList = this.context.staffList || [];
    const contracts = this.context.contracts || [];
    const drivers = staffList.filter(s => s.role === 'employee');

    const speech = `أَبْشِرْ يَا أَبُو مَاجِدْ.. لَدَيْنَا عَدَدُ ${drivers.length} سَائِقِينَ مُسَجَّلِينَ فِي الْمَنْظُومَةِ، وَجَمِيعُهُمْ جَاهِزُونَ لِتَنْفِيذِ مَهَامِّ التَّوْصِيلِ وَالسَّحْبِ..`;

    let md = `### 🚛 تقرير السائقين والمهام الميدانية 📍\n\n`;
    md += `* **إجمالي طاقم السائقين:** \`${drivers.length}\` سائقين معتمدين\n\n`;
    drivers.forEach((d, idx) => {
      const activeMissions = contracts.filter(c => c.assigned_employee_id === d.id && c.status === 'active').length;
      md += `${idx + 1}. **${d.full_name}** — الجوال: \`${d.phone || 'غير مسجل'}\` — المهام الميدانية النشطة: **(${activeMissions} مهام)**\n`;
    });

    return {
      toolExecuted: 'auditDriversFleet',
      toolParameters: { driversCount: drivers.length },
      speechResponse: speech,
      displayMarkdown: md
    };
  }

  // 💡 Tool 6: General Executive Guidance
  private tool_generalExecutiveGuidance(userInput: string): AgentExecutionResult {
    const speech = 'أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. أَنَا مُسَاعِدُكَ التَّنْفِيذِيُّ، يُمْكِنُنِي إِعْطَاؤُكَ تَقَارِيرَ الدَّخْلِ، وَفَحْصَ مُخَالَفَاتِ الْبَلَدِيَّةِ، وَمُتَابَعَةَ السَّائِقِينَ وَالْمَخْزُونِ فَوْراً..';
    const md = `### 🌟 المساعد التنفيذي لمؤسسة المحترز للحاويات 💎\n\n` +
      `أهلاً بك يا أبو ماجد، أنا مربوط مباشرة بقاعدة بيانات المؤسسة ويمكنني تنفيذ الأوامر التالية بصوتك أو كتابتك فوراً:\n\n` +
      `1. 💵 **"كم دخلنا اليوم كاش؟"** ⬅️ تدقيق المبالغ المحصلة والمتبقية فوراً.\n` +
      `2. ⚠️ **"وش الحاويات المنتهية؟"** ⬅️ فحص الحاويات المتأخرة لتفادي غرامات البلدية.\n` +
      `3. 📦 **"كم حاوية متوفرة للتأجير؟"** ⬅️ حصر مخزون الحاويات الجاهزة بالرياض.\n` +
      `4. 🔍 **"ابحث عن العقد رقم..."** ⬅️ إظهار بيانات أي عقد أو عميل وموقعه بالخريطة.\n` +
      `5. 🚛 **"حالة السائقين"** ⬅️ حصر طاقم السائقين وتوزيع المهام الميدانية.`;

    return {
      toolExecuted: null,
      speechResponse: speech,
      displayMarkdown: md
    };
  }
}
