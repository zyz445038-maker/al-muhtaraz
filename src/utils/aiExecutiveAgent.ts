// Enterprise Executive AI Agent Engine for Al-Muhtaraz Containers
// Features: Full Multi-Turn Conversational Memory + Deep-Reasoning Knowledge Engine + Dynamic Context
// Direct, factual, clean speech without repetitive generic greetings, emojis, or punctuation artifacts

import { Contract, Container, Customer, Profile, Receipt, RecipientRole } from '@/types/database';
import { cleanSpeechText } from '@/utils/speechSanitizer';
import { processDeepAssistantQuery } from '@/utils/aiCopilotBrain';
import { querySystemKnowledge } from '@/utils/aiCopilotKnowledge';
import { formatDailyExecutiveReport } from '@/utils/voucherFormatter';
import { formatCleanArabicDate } from '@/utils/dateFormatter';
import { determineIntentWithGemini } from '@/utils/geminiToolEngine';

export interface AgentContext {
  contracts: Contract[];
  containers: Container[];
  customers: Customer[];
  staffList: Profile[];
  receipts: Receipt[];
  currentUserName?: string;
  memory?: AgentMemoryState;
}

export interface AgentMemoryState {
  lastFocusedContract?: Contract | null;
  lastFocusedCustomer?: Customer | null;
  lastFocusedContainer?: Container | null;
  lastFocusedTopic?: 'contract' | 'finance' | 'container' | 'driver' | 'search' | 'knowledge' | null;
  lastQuery?: string;
  lastResponse?: string;
  conversationTurns?: { query: string; response: string; timestamp: number }[];
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
  updatedMemory?: AgentMemoryState;
}

export class AlMuhtarazExecutiveAgent {
  private context: AgentContext;
  private memory: AgentMemoryState;

  constructor(context: AgentContext, initialMemory?: AgentMemoryState) {
    this.context = context;
    this.memory = initialMemory || context.memory || {
      lastFocusedContract: null,
      lastFocusedCustomer: null,
      lastFocusedContainer: null,
      lastFocusedTopic: null,
      conversationTurns: []
    };
  }

  public getMemory(): AgentMemoryState {
    return this.memory;
  }

  public setMemory(memory: AgentMemoryState) {
    this.memory = memory;
  }

  // Update live context
  public updateContext(newContext: Partial<AgentContext>) {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Main Agent Inference & Multi-turn Tool Dispatcher (Powered by Gemini API)
   */
  public async executeUserCommand(userInput: string): Promise<AgentExecutionResult> {
    const rawQuery = userInput.trim();
    const query = this.normalizeQuery(rawQuery);

    if (!query) {
      return this.generateSmartGreeting();
    }

    // ─── 0. System & Dynamic Knowledge Base Query (الأولوية القصوى للقواعد والأسعار المخصصة) ───
    const knowledgeMatch = querySystemKnowledge(rawQuery);
    if (knowledgeMatch) {
      this.memory.lastFocusedTopic = 'knowledge';
      const speech = cleanSpeechText(knowledgeMatch.speechResponse);
      const res: AgentExecutionResult = {
        toolExecuted: 'systemKnowledge',
        speechResponse: speech,
        displayMarkdown: knowledgeMatch.displayMarkdown,
        updatedMemory: this.memory
      };
      this.recordTurn(rawQuery, speech);
      return res;
    }

    // ─── 1. Contextual Follow-up Evaluation (الأسئلة التتبعية المعتمدة على الذاكرة السابقة) ───
    const followUpResult = this.checkContextualFollowUp(query, rawQuery);
    if (followUpResult) {
      this.recordTurn(rawQuery, followUpResult.speechResponse);
      followUpResult.updatedMemory = this.memory;
      return followUpResult;
    }

    // ─── 2. Gemini API Intent Detection (Function Calling) ───
    const intent = await determineIntentWithGemini(rawQuery);
    
    let res: AgentExecutionResult;

    if (intent) {
      // Execute local tool based on Gemini's function call decision
      switch (intent.toolName) {
        case 'fetchLatestContract':
          res = this.tool_fetchLatestContract();
          break;
        case 'fetchPreviousContract':
          res = this.tool_fetchPreviousContract();
          break;
        case 'auditLiveFinancials':
          res = this.tool_auditLiveFinancials();
          break;
        case 'auditExpiringContainers':
          res = this.tool_auditExpiringContainers();
          break;
        case 'auditContainersStock':
          res = this.tool_auditContainersStock();
          break;
        case 'searchEntity':
          res = this.tool_searchEntity((intent.args as any)?.searchQuery || rawQuery);
          break;
        case 'auditDriversFleet':
          res = this.tool_auditDriversFleet();
          break;
        case 'generateWhatsAppReport':
          res = this.tool_generateWhatsAppReport();
          break;
        case 'auditDebtsAndReceivables':
          res = this.tool_auditDebtsAndReceivables();
          break;
        case 'fetchTopCustomers':
          res = this.tool_fetchTopCustomers();
          break;
        case 'fetchTodayOperations':
          res = this.tool_fetchTodayOperations();
          break;
        case 'fetchContractVoucherOrImage':
          res = this.tool_fetchContractVoucherOrImage((intent.args as any)?.searchQuery || rawQuery);
          break;
        case 'generalConversation':
          res = {
            toolExecuted: 'generalConversation',
            speechResponse: cleanSpeechText((intent.args as any)?.reply || 'مرحباً بك، كيف يمكنني مساعدتك اليوم؟'),
            displayMarkdown: (intent.args as any)?.reply || 'مرحباً بك، كيف يمكنني مساعدتك اليوم؟',
            updatedMemory: this.memory
          };
          break;
        default:
          res = this.generateSmartGreeting();
      }
    } else {
      // ─── 3. Deep Reasoning Engine Fallback (If API fails or key is missing) ───
      const deepResult = processDeepAssistantQuery(rawQuery, {
        contracts: this.context.contracts || [],
        containers: this.context.containers || [],
        customers: this.context.customers || [],
        staffList: this.context.staffList || [],
        receipts: this.context.receipts || []
      });

      if (deepResult && deepResult.displayText) {
        const speech = cleanSpeechText(deepResult.speechText || deepResult.displayText.slice(0, 180));
        res = {
          toolExecuted: 'deepReasoningQuery',
          speechResponse: speech,
          displayMarkdown: deepResult.displayText,
          updatedMemory: this.memory
        };
      } else {
        res = this.generateSmartGreeting();
      }
    }

    this.recordTurn(rawQuery, res.speechResponse);
    res.updatedMemory = this.memory;
    return res;
  }

  // ─── CONTEXTUAL MULTI-TURN REASONING ─────────────────────────────────

  private checkContextualFollowUp(query: string, rawQuery: string): AgentExecutionResult | null {
    const focusedContract = this.memory.lastFocusedContract;
    const lastTopic = this.memory.lastFocusedTopic;

    // 1. Follow-up on Focused Contract
    if (focusedContract) {
      // A. Follow-up on Contract Amount / Price / Paid / Remaining
      const isPriceQuery = 
        query.includes('كم المبلغ') || query.includes('كم مبلغه') || query.includes('كم سعره') ||
        query.includes('كم قيمته') || query.includes('كم كلف') || query.includes('كم دفع') ||
        query.includes('كم المدفوع') || query.includes('كم باقي') || query.includes('كم المتبقي') ||
        query.includes('كيف سدد') || query.includes('طريقة السداد') || query.includes('كاش ولا شبكة') ||
        query.includes('سدد كاش') || query.includes('فلوس هذا العقد') || query.includes('مبلغ') ||
        query.includes('سعر') || query.includes('حساب') || query.includes('قيمة');

      if (isPriceQuery) {
        const total = Number(focusedContract.total_cost) || 0;
        const paid = Number(focusedContract.paid_amount) || 0;
        const remaining = Number(focusedContract.remaining_amount ?? (total - paid)) || 0;
        const method = focusedContract.payment_method === 'cash' ? 'نقداً بالموقع' : 
                       focusedContract.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'سداد إلكتروني';

        const speech = cleanSpeechText(
          `المبلغ الإجمالي لهذا العقد ${total} ريال ، المدفوع منه ${paid} ريال ${method} ، والمتبقي للتحصيل ${remaining} ريال.`
        );

        const md = `### 💵 تفاصيل المبلغ للعقد (${focusedContract.contract_number}) 📋\n\n` +
          `* **المبلغ الإجمالي:** \`${total.toLocaleString()} ر.س\`\n` +
          `* **المبلغ المدفوع:** \`${paid.toLocaleString()} ر.س\` (${method})\n` +
          `* **المبلغ المتبقي:** \`${remaining.toLocaleString()} ر.س\` ${remaining === 0 ? '🟢 (مسدد بالكامل)' : '⚠️ (ذمة مدينة)'}`;

        return {
          toolExecuted: 'contractAmountFollowUp',
          speechResponse: speech,
          displayMarkdown: md,
          actionCard: {
            type: 'contract',
            title: `مبلغ العقد ${focusedContract.contract_number}`,
            data: focusedContract
          }
        };
      }

      // B. Follow-up on Customer Name / Phone
      const isCustomerQuery =
        query.includes('من هو العميل') || query.includes('من العميل') || query.includes('مين راعي العقد') ||
        query.includes('مين المستاجر') || query.includes('مين المستأجر') || query.includes('اسم العميل') ||
        query.includes('رقم جواله') || query.includes('جواله') || query.includes('رقم العميل') ||
        query.includes('كيف اتواصل معه') || query.includes('بيانات العميل') || query.includes('عميل') ||
        query.includes('هاتف') || query.includes('جوال');

      if (isCustomerQuery) {
        const name = focusedContract.customer?.name || 'العميل';
        const phone = focusedContract.customer?.phone || 'غير مسجل';

        const speech = cleanSpeechText(`العميل في هذا العقد هو ${name} ، ورقم جواله ${phone}.`);
        const md = `### 👤 بيانات العميل للعقد (${focusedContract.contract_number})\n\n` +
          `* **اسم العميل:** **${name}**\n` +
          `* **رقم الجوال:** \`${phone}\`\n` +
          `* **رقم العقد:** \`${focusedContract.contract_number}\``;

        return {
          toolExecuted: 'contractCustomerFollowUp',
          speechResponse: speech,
          displayMarkdown: md,
          actionCard: {
            type: 'contract',
            title: `العميل ${name}`,
            data: focusedContract
          }
        };
      }

      // C. Follow-up on Container details / Size / Type
      const isContainerQuery =
        query.includes('اي حاويه') || query.includes('أي حاوية') || query.includes('رقم الحاويه') ||
        query.includes('رقم الحاوية') || query.includes('وين الحاويه') || query.includes('مقاس') ||
        query.includes('كم مقاسها') || query.includes('نوع العقد') || query.includes('الحاوية اللي فيه') ||
        query.includes('حاوية') || query.includes('حاويه');

      if (isContainerQuery) {
        const cNum = focusedContract.container?.container_number || '-';
        const cType = focusedContract.contract_type || 'أنقاض';

        const speech = cleanSpeechText(`الحاوية المخصصة لهذا العقد هي رقم ${cNum} ، ونوع العقد ${cType}.`);
        const md = `### 📦 بيانات الحاوية للعقد (${focusedContract.contract_number})\n\n` +
          `* **رقم الحاوية:** \`${cNum}\`\n` +
          `* **نوع الإيجار:** ${cType}\n` +
          `* **العنوان:** ${focusedContract.location_address || 'حي بالرياض'}`;

        return {
          toolExecuted: 'contractContainerFollowUp',
          speechResponse: speech,
          displayMarkdown: md
        };
      }

      // D. Follow-up on Expiration / Dates / Duration
      const isDateQuery =
        query.includes('متى ينتهي') || query.includes('تاريخ الانتهاء') || query.includes('متى يخلص') ||
        query.includes('متى ينسحب') || query.includes('كم مدته') || query.includes('كم يوم') ||
        query.includes('تاريخ البدايه') || query.includes('تاريخ البداية') || query.includes('متى نزل') ||
        query.includes('تاريخ') || query.includes('مدة') || query.includes('ينتهي');

      if (isDateQuery) {
        const start = focusedContract.start_date || '-';
        const end = focusedContract.end_date || '-';
        const days = focusedContract.duration_days || 7;

        const speech = cleanSpeechText(
          `يبدأ العقد بتاريخ ${start} وينتهي بتاريخ ${end} ، ومدته الإجمالية ${days} أيام.`
        );
        const md = `### 📅 فترة وتاريخ العقد (${focusedContract.contract_number})\n\n` +
          `* **تاريخ البدء والتنزيل:** \`${start}\`\n` +
          `* **تاريخ الانتهاء والسحب:** \`${end}\`\n` +
          `* **مدة الإيجار:** **${days} أيام**`;

        return {
          toolExecuted: 'contractDatesFollowUp',
          speechResponse: speech,
          displayMarkdown: md
        };
      }

      // E. Follow-up on Location / Address
      const isLocationQuery =
        query.includes('وين موقعه') || query.includes('وين موقعها') || query.includes('اي حي') ||
        query.includes('أي حي') || query.includes('وين منزله') || query.includes('الموقع') ||
        query.includes('العنوان') || query.includes('موقع التنزيل') || query.includes('وين') ||
        query.includes('موقع') || query.includes('لوكيشن');

      if (isLocationQuery) {
        const location = focusedContract.location_address || 'حي بالرياض';
        const speech = cleanSpeechText(`موقع تنزيل الحاوية لهذا العقد هو ${location}.`);
        const md = `### 📍 موقع التنزيل للعقد (${focusedContract.contract_number})\n\n` +
          `* **العنوان والحي:** ${location}\n` +
          `* **العميل:** ${focusedContract.customer?.name || 'العميل'}`;

        return {
          toolExecuted: 'contractLocationFollowUp',
          speechResponse: speech,
          displayMarkdown: md
        };
      }

      // F. Follow-up on Contract Status
      const isStatusQuery =
        query.includes('وش وضعه') || query.includes('حالة العقد') || query.includes('هل هو ساري') ||
        query.includes('هل انتهى') || query.includes('ساري ولا منتهي') || query.includes('وضع العقد');

      if (isStatusQuery) {
        const statusMap: Record<string, string> = {
          active: 'ساري ونشط بالميدان',
          completed: 'مكتمل وتم سحب الحاوية',
          cancelled: 'ملغي'
        };
        const statusText = statusMap[focusedContract.status] || 'ساري';
        const speech = cleanSpeechText(`حالة العقد حالياً ${statusText}.`);
        const md = `### 📋 حالة العقد (${focusedContract.contract_number})\n\n` +
          `* **الحالة:** **${statusText}**\n` +
          `* **تاريخ الانتهاء:** ${focusedContract.end_date}`;

        return {
          toolExecuted: 'contractStatusFollowUp',
          speechResponse: speech,
          displayMarkdown: md
        };
      }
    }

    // 2. Follow-up on Financial Topic (إذا كان السؤال السابق عن المالية)
    if (lastTopic === 'finance') {
      const contracts = this.context.contracts || [];
      if (query.includes('كم كاش') || query.includes('كم الكاش') || query.includes('الكاش منها') || query.includes('كاش')) {
        const cashContracts = contracts.filter(c => c.payment_method === 'cash');
        const cashCollected = cashContracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);
        const speech = cleanSpeechText(`إجمالي مبالغ الكاش المحصلة نقداً ${cashCollected} ريال.`);
        return {
          toolExecuted: 'financeCashFollowUp',
          speechResponse: speech,
          displayMarkdown: `💵 **مقبوضات الكاش:** \`${cashCollected.toLocaleString()} ر.س\` (${cashContracts.length} عقود)`
        };
      }

      if (query.includes('كم سداد') || query.includes('كم الكتروني') || query.includes('كم شبكه') || query.includes('كم تحويل') || query.includes('شبكة')) {
        const electronicContracts = contracts.filter(c => c.payment_method === 'online' || c.payment_method === 'bank_transfer' || c.payment_method === 'apple_pay' || c.payment_method === 'mada' || c.payment_method === 'credit_card');
        const electronicCollected = electronicContracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);
        const speech = cleanSpeechText(`إجمالي السداد الإلكتروني والتحويل البنكي ${electronicCollected} ريال.`);
        return {
          toolExecuted: 'financeElectronicFollowUp',
          speechResponse: speech,
          displayMarkdown: `💳 **السداد الإلكتروني والتحويلات:** \`${electronicCollected.toLocaleString()} ر.س\` (${electronicContracts.length} عقود)`
        };
      }

      if (query.includes('كم باقي') || query.includes('كم المتبقي') || query.includes('الذمم') || query.includes('متبقي')) {
        const totalRemaining = contracts.reduce((sum, c) => sum + (Number(c.remaining_amount ?? (c.total_cost - c.paid_amount)) || 0), 0);
        const speech = cleanSpeechText(`المبالغ المتبقية للتحصيل كذمم مدينة ${totalRemaining} ريال.`);
        return {
          toolExecuted: 'financeRemainingFollowUp',
          speechResponse: speech,
          displayMarkdown: `⏳ **المبالغ المتبقية للتحصيل (ذمم مدينة):** \`${totalRemaining.toLocaleString()} ر.س\``
        };
      }
    }

    return null;
  }

  // ─── TOOL IMPLEMENTATIONS ──────────────────────────────────────

  // 📋 Tool: Fetch Latest / Most Recent Contract
  private tool_fetchLatestContract(): AgentExecutionResult {
    const contracts = [...(this.context.contracts || [])];
    if (contracts.length === 0) {
      return {
        toolExecuted: 'fetchLatestContract',
        speechResponse: cleanSpeechText('لا توجد أي عقود مسجلة في النظام حتى الآن.'),
        displayMarkdown: `📋 **العقود:** لا توجد أي عقود مسجلة حالياً.`
      };
    }

    // Sort by created_at or start_date descending
    contracts.sort((a, b) => {
      const tA = new Date(a.created_at || a.start_date || 0).getTime();
      const tB = new Date(b.created_at || b.start_date || 0).getTime();
      return tB - tA;
    });

    const latest = contracts[0];

    // Save to memory
    this.memory.lastFocusedContract = latest;
    this.memory.lastFocusedCustomer = latest.customer || null;
    this.memory.lastFocusedContainer = latest.container || null;
    this.memory.lastFocusedTopic = 'contract';

    const custName = latest.customer?.name || 'العميل';
    const cNum = latest.container?.container_number || '-';
    const total = Number(latest.total_cost) || 0;
    const paid = Number(latest.paid_amount) || 0;
    const rem = Number(latest.remaining_amount ?? (total - paid)) || 0;

    const speech = cleanSpeechText(
      `آخر عقد هو العقد رقم ${latest.contract_number} باسم ${custName} ، بقيمة ${total} ريال ، الحاوية رقم ${cNum} ، وموعد التنزيل ${latest.start_date}.`
    );

    const md = `### 📋 تفاصيل آخر عقد مسجل (${latest.contract_number}) ✨\n\n` +
      `* **العميل:** **${custName}** (${latest.customer?.phone || 'غير مسجل'})\n` +
      `* **الحاوية:** **رقم ${cNum}** (${latest.contract_type || 'أنقاض'})\n` +
      `* **المبلغ الإجمالي:** \`${total.toLocaleString()} ر.س\` | **المدفوع:** \`${paid.toLocaleString()} ر.س\`\n` +
      `* **الفترة:** من \`${latest.start_date}\` إلى \`${latest.end_date}\` (${latest.duration_days || 7} أيام)\n` +
      `* **موقع التنزيل:** ${latest.location_address || 'حي بالرياض'}\n` +
      `* **طريقة السداد:** ${latest.payment_method === 'cash' ? 'نقداً (كاش)' : 'سداد إلكتروني / تحويل'}`;

    return {
      toolExecuted: 'fetchLatestContract',
      toolParameters: { contractId: latest.id, contractNumber: latest.contract_number },
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'contract',
        title: `العقد ${latest.contract_number}`,
        data: latest
      }
    };
  }

  // 📋 Tool: Fetch Previous Contract (العقد السابق)
  private tool_fetchPreviousContract(): AgentExecutionResult {
    const contracts = [...(this.context.contracts || [])];
    if (contracts.length <= 1) {
      return {
        toolExecuted: 'fetchPreviousContract',
        speechResponse: cleanSpeechText('لا يوجد عقد سابق مسجل قبل هذا العقد.'),
        displayMarkdown: `📋 لا يوجد عقد سابق مسجل.`
      };
    }

    contracts.sort((a, b) => {
      const tA = new Date(a.created_at || a.start_date || 0).getTime();
      const tB = new Date(b.created_at || b.start_date || 0).getTime();
      return tB - tA;
    });

    const currentId = this.memory.lastFocusedContract?.id;
    let prevIndex = 1;
    if (currentId) {
      const currIdx = contracts.findIndex(c => c.id === currentId);
      if (currIdx >= 0 && currIdx + 1 < contracts.length) {
        prevIndex = currIdx + 1;
      }
    }

    const prevContract = contracts[prevIndex];
    this.memory.lastFocusedContract = prevContract;
    this.memory.lastFocusedCustomer = prevContract.customer || null;
    this.memory.lastFocusedContainer = prevContract.container || null;
    this.memory.lastFocusedTopic = 'contract';

    const custName = prevContract.customer?.name || 'العميل';
    const cNum = prevContract.container?.container_number || '-';
    const total = Number(prevContract.total_cost) || 0;

    const speech = cleanSpeechText(
      `العقد السابق هو رقم ${prevContract.contract_number} باسم ${custName} ، الحاوية ${cNum} ، والمبلغ ${total} ريال.`
    );

    const md = `### 📋 تفاصيل العقد السابق (${prevContract.contract_number})\n\n` +
      `* **العميل:** **${custName}** (${prevContract.customer?.phone || '-'})\n` +
      `* **الحاوية:** **رقم ${cNum}**\n` +
      `* **المبلغ:** \`${total.toLocaleString()} ر.س\`\n` +
      `* **التاريخ:** من \`${prevContract.start_date}\` إلى \`${prevContract.end_date}\``;

    return {
      toolExecuted: 'fetchPreviousContract',
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'contract',
        title: `العقد ${prevContract.contract_number}`,
        data: prevContract
      }
    };
  }

  // 💰 Tool 1: Live Financials Audit
  private tool_auditLiveFinancials(): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    this.memory.lastFocusedTopic = 'finance';

    const totalGrossRevenue = contracts.reduce((sum, c) => sum + (Number(c.total_cost) || 0), 0);
    const totalCollected = contracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);
    const totalRemaining = contracts.reduce((sum, c) => sum + (Number(c.remaining_amount ?? (c.total_cost - c.paid_amount)) || 0), 0);

    const cashContracts = contracts.filter(c => c.payment_method === 'cash');
    const cashCollected = cashContracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);

    const electronicContracts = contracts.filter(c => c.payment_method === 'online' || c.payment_method === 'bank_transfer' || c.payment_method === 'apple_pay' || c.payment_method === 'mada' || c.payment_method === 'credit_card');
    const electronicCollected = electronicContracts.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);

    const speech = cleanSpeechText(
      `إجمالي المبالغ المحصلة ${totalCollected} ريال ، منها ${cashCollected} ريال كاش ، والمتبقي للتحصيل ${totalRemaining} ريال.`
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
    this.memory.lastFocusedTopic = 'container';
    const now = new Date().getTime();

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
    this.memory.lastFocusedTopic = 'container';

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
  private tool_searchEntity(rawQuery: string): AgentExecutionResult {
    const cleanQuery = rawQuery
      .replace(/ابحث عن/g, '')
      .replace(/بحث عن/g, '')
      .replace(/عقد رقم/g, '')
      .replace(/حاوية رقم/g, '')
      .replace(/رقم/g, '')
      .replace(/عقد/g, '')
      .trim()
      .toLowerCase();

    const contracts = this.context.contracts || [];

    const foundContract = contracts.find(c => 
      c.contract_number.toLowerCase().includes(cleanQuery) ||
      (c.customer?.name && c.customer.name.toLowerCase().includes(cleanQuery)) ||
      (c.customer?.phone && c.customer.phone.includes(cleanQuery)) ||
      (c.container?.container_number && c.container.container_number.includes(cleanQuery))
    );

    if (foundContract) {
      this.memory.lastFocusedContract = foundContract;
      this.memory.lastFocusedCustomer = foundContract.customer || null;
      this.memory.lastFocusedContainer = foundContract.container || null;
      this.memory.lastFocusedTopic = 'contract';

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
      speechResponse: cleanSpeechText('لم يتم العثور على سجل مطابق لرقم العقد أو اسم العميل.'),
      displayMarkdown: `🔍 لم يتم العثور على سجل مطابق للبحث: **"${cleanQuery}"**.`
    };
  }

  // 🚛 Tool 5: Drivers Fleet Status
  private tool_auditDriversFleet(): AgentExecutionResult {
    const staffList = this.context.staffList || [];
    const contracts = this.context.contracts || [];
    const drivers = staffList.filter(s => s.role === 'employee');
    this.memory.lastFocusedTopic = 'driver';

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

  // 📱 Tool 6: WhatsApp Daily Executive Report
  private tool_generateWhatsAppReport(): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    const containers = this.context.containers || [];
    const receipts = this.context.receipts || [];
    this.memory.lastFocusedTopic = 'finance';

    const todayStr = new Date().toISOString().split('T')[0];
    const todayReceipts = receipts.filter(r => (r.issued_at || r.created_at || '').startsWith(todayStr));
    const cashToday = todayReceipts.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const electronicToday = todayReceipts.filter(r => r.payment_method !== 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalIncomeToday = cashToday + electronicToday;
    const newContractsCount = contracts.filter(c => (c.created_at || '').startsWith(todayStr) || (c.start_date || '') === todayStr).length;
    const activeContractsCount = contracts.filter(c => c.status === 'active').length;
    const availableContainersCount = containers.filter(c => c.status === 'available').length;
    const rentedContainersCount = containers.filter(c => c.status === 'rented').length;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiringTomorrowCount = contracts.filter(c => c.status === 'active' && (c.end_date || '').startsWith(tomorrow)).length;

    const reportMsg = formatDailyExecutiveReport({
      date: formatCleanArabicDate(new Date(), true),
      totalIncomeToday,
      cashToday,
      electronicToday,
      newContractsCount,
      activeContractsCount,
      availableContainersCount,
      rentedContainersCount,
      expiringTomorrowCount
    });

    const speech = cleanSpeechText(
      `تم تجهيز التقرير التنفيذي اليومي يا أبو ماجد. إجمالي الدخل اليوم ${totalIncomeToday} ريال ، منها ${cashToday} ريال كاش ، و ${newContractsCount} عقود جديدة.`
    );

    const md = `### 📱 التقرير التنفيذي اليومي للواتساب 📊\n\n` +
      `\`\`\`text\n${reportMsg}\n\`\`\`\n\n` +
      `🚀 **جاهز للمشاركة:** تم إعداد التقرير التلخيصي الفوري لنسخه أو إرساله بنقرة زر لواتساب الإدارة.`;

    return {
      toolExecuted: 'generateWhatsAppReport',
      toolParameters: { totalIncomeToday, newContractsCount, activeContractsCount },
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'marketing',
        title: 'تقرير الواتساب اليومي',
        data: { reportMsg }
      }
    };
  }

  // 💰 Tool 7: Audit Debts & Receivables
  private tool_auditDebtsAndReceivables(): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    const customers = this.context.customers || [];
    this.memory.lastFocusedTopic = 'finance';

    const unpaidContracts = contracts.filter(c => Number(c.remaining_amount) > 0 && c.status === 'active');
    const totalRemaining = unpaidContracts.reduce((sum, c) => sum + (Number(c.remaining_amount) || 0), 0);

    if (unpaidContracts.length === 0) {
      const speech = cleanSpeechText('كافة العقود النشطة مسددة بالكامل ولا توجد أي ديون أو مبالغ معلقة في السوق.');
      return {
        toolExecuted: 'auditDebtsAndReceivables',
        speechResponse: speech,
        displayMarkdown: `### 🟢 الذمم والتحصيلات المعلقة\n\n✅ **لا توجد أي مبالغ معلقة:** كافة العقود النشطة مسددة بنسبة 100% 🎉.`
      };
    }

    const debtorList = unpaidContracts.slice(0, 5).map((c, i) => {
      const cust = c.customer?.name || customers.find(cust => cust.id === c.customer_id)?.name || 'عميل';
      return `${i + 1}. **${cust}**: متبقي عليه \`${Number(c.remaining_amount).toLocaleString('ar-SA')} ر.س\` (عقد #${c.contract_number})`;
    }).join('\n');

    const speech = cleanSpeechText(
      `إجمالي المبالغ المعلقة في السوق ${totalRemaining} ريال موزعة على ${unpaidContracts.length} عقود غير مكتملة السداد.`
    );

    const md = `### 💰 تقرير الديون والمبالغ المعلقة في السوق ⚠️\n\n` +
      `* **إجمالي المبالغ غير المحصلة:** \`${totalRemaining.toLocaleString('ar-SA')} ر.س\`\n` +
      `* **عدد العقود المعلقة:** \`(${unpaidContracts.length})\` عقد نشط\n\n` +
      `📋 **أبرز العقود التي عليها متبقي:**\n${debtorList}` +
      (unpaidContracts.length > 5 ? `\n\n*...ويوجد ${unpaidContracts.length - 5} عقود أخرى بها متبقي.*` : '');

    return {
      toolExecuted: 'auditDebtsAndReceivables',
      toolParameters: { totalRemaining, unpaidCount: unpaidContracts.length },
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'finance',
        title: 'الديون والمبالغ المعلقة',
        data: unpaidContracts
      }
    };
  }

  // 👑 Tool 8: Top VIP Customers
  private tool_fetchTopCustomers(): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    const customers = this.context.customers || [];
    this.memory.lastFocusedTopic = 'search';

    if (customers.length === 0) {
      return {
        toolExecuted: 'fetchTopCustomers',
        speechResponse: cleanSpeechText('لا يوجد عملاء مسجلين حالياً في النظام.'),
        displayMarkdown: `👥 لا يوجد عملاء مسجلين حالياً.`
      };
    }

    const spendingMap = new Map<string, { name: string; count: number; total: number }>();
    for (const c of contracts) {
      const custName = c.customer?.name || customers.find(cust => cust.id === c.customer_id)?.name || 'عميل';
      const existing = spendingMap.get(custName) || { name: custName, count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(c.total_cost) || 0;
      spendingMap.set(custName, existing);
    }

    const topList = Array.from(spendingMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

    if (topList.length === 0) {
      return {
        toolExecuted: 'fetchTopCustomers',
        speechResponse: cleanSpeechText('لا توجد تعاملات كافية بعد لتحديد كبار العملاء.'),
        displayMarkdown: `🏆 لا توجد تعاملات كافية لحساب كبار العملاء بعد.`
      };
    }

    const topOne = topList[0];
    const speech = cleanSpeechText(
      `أكبر عميل لدينا هو ${topOne.name} بإجمالي تعاملات ${topOne.total} ريال عبر ${topOne.count} عقود.`
    );

    const formattedList = topList.map((item, idx) => 
      `${idx + 1}. 👑 **${item.name}**: إجمالي تعاملاته \`${item.total.toLocaleString('ar-SA')} ر.س\` (${item.count} عقد)`
    ).join('\n');

    const md = `### 🏆 قائمة كبار العملاء الأكثر تعاملاً ودخلاً 👑\n\n` +
      `${formattedList}\n\n` +
      `💡 *نوصي بتقديم عروض وخصومات تشجيعية لهم لتعزيز ولائهم واستمرار عقودهم.*`;

    return {
      toolExecuted: 'fetchTopCustomers',
      toolParameters: { topCustomer: topOne },
      speechResponse: speech,
      displayMarkdown: md
    };
  }

  // 📅 Tool 9: Today's Real-time Operations
  private tool_fetchTodayOperations(): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    const customers = this.context.customers || [];
    this.memory.lastFocusedTopic = 'contract';

    const todayStr = new Date().toISOString().split('T')[0];
    const todayContracts = contracts.filter(c => (c.created_at || '').startsWith(todayStr) || (c.start_date || '') === todayStr);

    if (todayContracts.length === 0) {
      const speech = cleanSpeechText('لم يتم تسجيل عقود جديدة اليوم حتى الآن. الحاويات الشاغرة جاهزة للتأجير.');
      return {
        toolExecuted: 'fetchTodayOperations',
        speechResponse: speech,
        displayMarkdown: `### 📅 تقرير عقود اليوم\n\nلم يتم إبرام عقود جديدة حتى هذه اللحظة اليوم. جميع الحاويات الشاغرة بالمستودع جاهزة للتأجير 🟢.`
      };
    }

    const totalTodayRevenue = todayContracts.reduce((sum, c) => sum + (Number(c.total_cost) || 0), 0);
    const speech = cleanSpeechText(
      `تم إبرام ${todayContracts.length} عقود جديدة اليوم بإجمالي قيمة ${totalTodayRevenue} ريال يا أبو ماجد.`
    );

    const list = todayContracts.map((c, i) => {
      const cust = c.customer?.name || customers.find(cust => cust.id === c.customer_id)?.name || 'عميل';
      const cont = c.container?.container_number || '-';
      return `${i + 1}. **${cust}** | حاوية \`#${cont}\` | المبلغ: \`${Number(c.total_cost).toLocaleString('ar-SA')} ر.س\``;
    }).join('\n');

    const md = `### 📋 العقود المبرمة اليوم (${todayContracts.length} عقد) ✨\n\n` +
      `* **إجمالي قيمة عقود اليوم:** \`${totalTodayRevenue.toLocaleString('ar-SA')} ر.س\`\n\n` +
      `${list}\n\n` +
      `عساها مداخيل الخير والبركة يا رب 🌸!`;

    return {
      toolExecuted: 'fetchTodayOperations',
      toolParameters: { count: todayContracts.length, totalRevenue: totalTodayRevenue },
      speechResponse: speech,
      displayMarkdown: md
    };
  }

  // 📄 Tool 10: Contract Voucher, Image & Official Receipt
  private tool_fetchContractVoucherOrImage(rawQuery: string): AgentExecutionResult {
    const contracts = this.context.contracts || [];
    const customers = this.context.customers || [];
    const containers = this.context.containers || [];
    this.memory.lastFocusedTopic = 'contract';

    if (contracts.length === 0) {
      return {
        toolExecuted: 'fetchContractVoucher',
        speechResponse: cleanSpeechText('لا توجد عقود مسجلة في النظام لعرض سندها أو طباعتها.'),
        displayMarkdown: `⚠️ لا توجد عقود مسجلة حالياً.`
      };
    }

    const numMatch = rawQuery.match(/[0-9]+/);
    let targetContract = contracts[0];

    if (numMatch) {
      const found = contracts.find(c => c.contract_number.includes(numMatch[0]) || (c.container?.container_number || '').includes(numMatch[0]));
      if (found) targetContract = found;
    } else if (this.memory.lastFocusedContract) {
      targetContract = this.memory.lastFocusedContract;
    } else {
      const sorted = [...contracts].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      targetContract = sorted[0];
    }

    const custName = targetContract.customer?.name || customers.find(c => c.id === targetContract.customer_id)?.name || 'عميل نقدي';
    const contNum = targetContract.container?.container_number || containers.find(c => c.id === targetContract.container_id)?.container_number || '-';
    const receiptNum = targetContract.receipt_number || `RCP-${targetContract.contract_number}`;
    const totalCost = Number(targetContract.total_cost || 0);
    const receiptUrl = `/receipt/${receiptNum}`;

    const speech = cleanSpeechText(
      `تم إحضار وثيقة وسند العقد رقم ${targetContract.contract_number} للعميل ${custName} بقيمة ${totalCost} ريال.`
    );

    const md = `### 📄 وثيقة وسند العقد الرسمي المعتمد ✨\n\n` +
      `* **رقم العقد:** \`${targetContract.contract_number}\` | **رقم السند:** \`${receiptNum}\`\n` +
      `* **العميل:** **${custName}** (📞 ${targetContract.customer?.phone || '-'})\n` +
      `* **الحاوية:** \`#${contNum}\` (${targetContract.contract_type === 'commercial' ? 'تجاري' : 'أنقاض'})\n` +
      `* **المبلغ:** \`${totalCost.toLocaleString('ar-SA')} ر.س\` | **المدفوع:** \`${Number(targetContract.paid_amount || 0).toLocaleString('ar-SA')} ر.س\`\n\n` +
      `🔗 **[اضغط هنا لفتح وطباعة وثيقة العقد الأصلية مع الـ QR باركود](${receiptUrl})**`;

    return {
      toolExecuted: 'fetchContractVoucher',
      toolParameters: { contractId: targetContract.id, receiptUrl },
      speechResponse: speech,
      displayMarkdown: md,
      actionCard: {
        type: 'contract',
        title: `سند العقد ${targetContract.contract_number}`,
        data: targetContract
      }
    };
  }

  // 💡 Smart Dynamic Greeting
  private generateSmartGreeting(): AgentExecutionResult {
    const containers = this.context.containers || [];
    const contracts = this.context.contracts || [];
    const available = containers.filter(c => c.status === 'available').length;
    const activeContracts = contracts.filter(c => c.status === 'active').length;

    const speech = cleanSpeechText(
      `أهلاً يا أبو ماجد.. يتوفر حالياً ${available} حاوية شاغرة في المخزون ، و ${activeContracts} عقود سارية بالميدان. كيف أقدر أخدمك؟`
    );

    const md = `### ✨ أهلاً وسهلاً يا أبو ماجد 🌟\n\n` +
      `* **الحاويات الشاغرة بالمخزون:** \`${available}\` حاوية جاهزة للتنزيل 🚛\n` +
      `* **العقود السارية بالميدان:** \`${activeContracts}\` عقود نشطة 📋\n\n` +
      `💡 **يمكنك أن تسألني عن:**\n` +
      `• *«وش آخر عقد مسجل؟»* ثم *«كم مبلغه؟»* أو *«من هو العميل؟»*\n` +
      `• *«كم الدخل المالي اليوم؟»* أو *«كم الحاويات المتوفرة؟»*\n` +
      `• *«هل توجد حاويات تنتهي قريباً لتفادي مخالفات البلدية؟»*`;

    return {
      toolExecuted: null,
      speechResponse: speech,
      displayMarkdown: md,
      updatedMemory: this.memory
    };
  }

  // ─── UTILITIES ───────────────────────────────────────────────

  private normalizeQuery(text: string): string {
    return text
      .replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/[إأآا]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي')
      .toLowerCase()
      .trim();
  }

  private recordTurn(query: string, response: string) {
    this.memory.lastQuery = query;
    this.memory.lastResponse = response;
    if (!this.memory.conversationTurns) {
      this.memory.conversationTurns = [];
    }
    this.memory.conversationTurns.push({
      query,
      response,
      timestamp: Date.now()
    });
    if (this.memory.conversationTurns.length > 20) {
      this.memory.conversationTurns.shift();
    }
  }
}
