// Enterprise Executive AI Agent Engine for Al-Muhtaraz Containers
// Direct, factual, clean speech without repeated greetings, emojis, or markdown asterisks

import { Contract, Container, Customer, Profile, Receipt } from '@/types';
import { cleanSpeechText } from '@/utils/speechSanitizer';

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

    // 6. Default Direct Guidance
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

    // Direct, factual, clean speech without greetings, without emojis, without asterisks
    const speech = cleanSpeechText(
      `إجمالي المبالغ المحصلة ${totalCollected.toLocaleString()} ريال ، منها ${cashCollected.toLocaleString()} ريال كاش ، والمتبقي للتحصيل ${totalRemaining.toLocaleString()} ريال.`
    );

    const md = `### 💵 التقرير المالي المباشر 📊\n\n` +
      `* **إجمالي المبالغ المحصلة فعلياً:** \`${totalCollected.toLocaleString()} ر.س\`\n` +
      `* **مقبوضات الكاش (نقداً بالموقع):** \`${cashCollected.toLocaleString()} ر.س\` (${cashContracts.length} عقود)\n` +
      `* **مقبوضات السداد والتحويل البنكي:** \`${electronicCollected.toLocaleString()} ر.س\` (${electronicContracts.length} عقود)\n` +
      `* **المبالغ المتبقية للتحصيل (ذمم مدينة):** \`${totalRemaining.toLocaleString()} ر.س\`\n` +
      `* **إجمالي قيمة كافة العقود:** \`${totalGrossRevenue.toLocaleString()} ر.س\``;

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

    const speech = cleanSpeechText(
      criticalContracts.length === 0
        ? 'جميع الحاويات في الميدان سارية الصلاحية ولا توجد أي مخالفات بلدية.'
        : `يوجد عدد ${criticalContracts.length} حاويات بحاجة للتمديد أو السحب لتفادي مخالفات الأمانة.`
    );

    let md = `### ⚠️ فحص الرقابة والبلدية 🏛️\n\n`;
    if (criticalContracts.length === 0) {
      md += `🟢 **الوضع الميداني سليم:** جميع الحاويات المؤجرة سارية الصلاحية ولا توجد حاويات متأخرة.\n`;
    } else {
      md += `⚠️ **يوجد (${criticalContracts.length}) حاويات تتطلب الإجراء الفوري:**\n\n`;
      criticalContracts.slice(0, 5).forEach((c, idx) => {
        const isExp = new Date(c.end_date).getTime() < now;
        md += `${idx + 1}. **العقد (${c.contract_number})** — العميل: **${c.customer?.name || 'العميل'}** — الحاوية: **(${c.container?.container_number || '-'})** [${isExp ? 'منتهية' : 'تنتهي قريباً'}]\n`;
      });
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

    const speech = cleanSpeechText(
      `إجمالي الأسطول ${containers.length} حاوية ، يتوفر منها ${available.length} حاوية شاغرة جاهزة للتأجير ، و ${rented.length} حاوية مؤجرة في الميدان.`
    );

    const md = `### 📦 تقرير أسطول ومخزون الحاويات 🏗️\n\n` +
      `* **إجمالي أسطول المؤسسة:** \`${containers.length}\` حاوية\n` +
      `* **الحاويات المتاحة للتأجير:** \`${available.length}\` حاوية\n` +
      `* **الحاويات المؤجرة في الميدان:** \`${rented.length}\` حاوية\n` +
      `* **الحاويات تحت الصيانة:** \`${maintenance.length}\` حاوية\n` +
      `* **نسبة تشغيل الأسطول:** \`${containers.length > 0 ? Math.round((rented.length / containers.length) * 100) : 0}%\``;

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

    const foundContract = contracts.find(c => 
      c.contract_number.toLowerCase().includes(cleanQuery) ||
      (c.customer?.name && c.customer.name.toLowerCase().includes(cleanQuery)) ||
      (c.customer?.phone && c.customer.phone.includes(cleanQuery))
    );

    if (foundContract) {
      const speech = cleanSpeechText(
        `العقد رقم ${foundContract.contract_number} باسم ${foundContract.customer?.name || 'العميل'} ، الحاوية ${foundContract.container?.container_number || '-'} ، والمبلغ الإجمالي ${foundContract.total_cost} ريال.`
      );

      const md = `### 🔍 نتيجة البحث: (${foundContract.contract_number}) 📋\n\n` +
        `* **العميل:** ${foundContract.customer?.name || '-'} (${foundContract.customer?.phone || '-'})\n` +
        `* **الحاوية:** ${foundContract.container?.container_number || '-'} (${foundContract.contract_type || 'أنقاض'})\n` +
        `* **فترة الإيجار:** من ${foundContract.start_date} إلى ${foundContract.end_date}\n` +
        `* **المبلغ الإجمالي:** ${foundContract.total_cost} ر.س | **المدفوع:** ${foundContract.paid_amount} ر.س\n` +
        `* **موقع التنزيل:** ${foundContract.location_address || 'حي بالرياض'}`;

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
      speechResponse: 'لم يتم العثور على سجل مطابق لرقم العقد أو اسم العميل.',
      displayMarkdown: `🔍 لم يتم العثور على سجل مطابق للبحث: **"${cleanQuery}"**.`
    };
  }

  // 🚛 Tool 5: Drivers Fleet Status
  private tool_auditDriversFleet(): AgentExecutionResult {
    const staffList = this.context.staffList || [];
    const contracts = this.context.contracts || [];
    const drivers = staffList.filter(s => s.role === 'employee');

    const speech = cleanSpeechText(
      `عدد السائقين المسجلين ${drivers.length} سائقين ، وجميعهم متاحون للمهام الميدانية.`
    );

    let md = `### 🚛 تقرير السائقين والمهام الميدانية 📍\n\n`;
    md += `* **إجمالي طاقم السائقين:** \`${drivers.length}\` سائقين معتمدين\n\n`;
    drivers.forEach((d, idx) => {
      const activeMissions = contracts.filter(c => c.assigned_employee_id === d.id && c.status === 'active').length;
      md += `${idx + 1}. **${d.full_name}** — الجوال: \`${d.phone || 'غير مسجل'}\` — المهام النشطة: **(${activeMissions})**\n`;
    });

    return {
      toolExecuted: 'auditDriversFleet',
      toolParameters: { driversCount: drivers.length },
      speechResponse: speech,
      displayMarkdown: md
    };
  }

  // 💡 Tool 6: General Executive Guidance (Strictly: هلا أبو ماجد أنا تحت أمرك)
  private tool_generalExecutiveGuidance(userInput: string): AgentExecutionResult {
    const speech = 'هلا أبو ماجد أنا تحت أمرك.';
    const md = `هلا أبو ماجد أنا تحت أمرك.`;

    return {
      toolExecuted: null,
      speechResponse: speech,
      displayMarkdown: md
    };
  }
}
