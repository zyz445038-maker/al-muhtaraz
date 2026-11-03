import OpenAI from 'openai';

const AI_PROVIDER_TIMEOUT_MS = 7000;

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  { type: 'function', function: { name: 'fetchLatestContract', description: 'يجلب أحدث عقد تم تسجيله في النظام.' } },
  { type: 'function', function: { name: 'fetchPreviousContract', description: 'يجلب العقد الذي يسبق العقد الأخير.' } },
  { type: 'function', function: { name: 'auditLiveFinancials', description: 'يحسب الإيرادات والمدفوعات والكاش والمبالغ المتبقية والتحصيلات.' } },
  { type: 'function', function: { name: 'auditExpiringContainers', description: 'يفحص الحاويات التي ستنتهي قريباً لتفادي المخالفات البلدية.' } },
  { type: 'function', function: { name: 'auditContainersStock', description: 'تقرير عن مخزون الحاويات المتوفرة والمؤجرة وتحت الصيانة.' } },
  {
    type: 'function',
    function: {
      name: 'searchEntity',
      description: 'يبحث عن عقد أو عميل برقم الجوال أو الاسم أو رقم العقد.',
      parameters: {
        type: 'object',
        properties: {
          searchQuery: { type: 'string', description: 'الكلمة المفتاحية للبحث' }
        },
        required: ['searchQuery']
      }
    }
  },
  { type: 'function', function: { name: 'auditDriversFleet', description: 'يستعرض حالة السائقين وفريق العمل الميداني.' } },
  { type: 'function', function: { name: 'generateWhatsAppReport', description: 'يجهز التقرير التنفيذي اليومي ويرسله للإدارة.' } },
  { type: 'function', function: { name: 'auditDebtsAndReceivables', description: 'يستعرض الديون والمستحقات التي لم يتم سدادها.' } },
  { type: 'function', function: { name: 'fetchTopCustomers', description: 'يجلب قائمة بأهم كبار العملاء والأكثر تعاملاً.' } },
  { type: 'function', function: { name: 'fetchTodayOperations', description: 'يستعرض عقود اليوم وعمليات التشغيل اللحظية.' } },
  { type: 'function', function: { name: 'executiveReasoning', description: 'يحلل أسباب انخفاض العقود أو الإيرادات، وتقديم توصيات واستنتاجات إدارية وتخزينها في ذاكرة القرار.' } },
  { type: 'function', function: { name: 'memoryRecall', description: 'يسترجع التوصيات والقرارات الإدارية السابقة المخزنة في النظام.' } },
  {
    type: 'function',
    function: {
      name: 'fetchContractVoucherOrImage',
      description: 'يجلب صورة العقد أو الفاتورة أو يطبع الوثيقة.',
      parameters: {
        type: 'object',
        properties: {
          searchQuery: { type: 'string', description: 'كلمات البحث المرافقة لطلب الطباعة' }
        },
        required: ['searchQuery']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generalConversation',
      description: 'يستخدم في حال التحية أو السؤال العام الذي لا يتطلب استدعاء دوال.',
      parameters: {
        type: 'object',
        properties: {
          reply: { type: 'string', description: 'الرد المناسب بلهجة سعودية احترافية' }
        },
        required: ['reply']
      }
    }
  }
];

async function callProvider(
  providerName: string,
  request: () => Promise<{ toolName: string; args: any } | null>,
): Promise<{ toolName: string; args: any } | null> {
  try {
    return await request();
  } catch (error) {
    const details = error instanceof Error
      ? error as Error & { status?: number; code?: string }
      : undefined;
    console.warn(`AI provider ${providerName} failed.`, {
      status: details?.status,
      code: details?.code,
      errorName: details?.name || typeof error,
    });
    return null;
  }
}

export async function determineIntentWithGemini(
  userQuery: string,
  conversationTurns?: { query: string; response: string }[]
): Promise<{ toolName: string; args: any } | null> {
  // Guard: only run on server — prevents client-side OpenAI crash
  if (typeof window !== 'undefined') return null;

  const geminiKey = process.env.GEMINI_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;

  const systemPrompt = `أنت مساعد عمل ومستشار إداري ذكي وودود جداً لشركة "المحترز للحاويات" في السعودية.
تتحدث بشكل طبيعي وتلقائي 100% متكيف كلياً مع طبيعة سؤال المستخدم، دون أي ترحيب طويل أو قوالب رسمية مكررة.
- إذا كان السؤال استفساراً رقمياً أو تشغيلياً: أجب مباشرة ودون مقدمات.
- إذا كان السؤال متابعة لسؤال سابق (مثل: "كم مبلغه؟" أو "مين العميل؟"): أجب مباشرة بالتفصيلة المطلوبة فقط دون إعادة سرد كافة بيانات الكيان.
- يُمنع منعاً باتاً استخدام مقدمات رسمية مكررة مثل (أهلاً بك بصفتي رفيقك وسندك). ادخل في الرد مباشرة وبأسلوب طبيعي ومرح.`;

  // Build multi-turn context
  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (conversationTurns && conversationTurns.length > 0) {
    conversationTurns.slice(-3).forEach(t => {
      if (t.query) historyMessages.push({ role: 'user', content: t.query });
      if (t.response) historyMessages.push({ role: 'assistant', content: t.response });
    });
  }

  // Detect quick operational vs deep strategic query for Smart Model Routing
  const isQuickOperational = /حاوية|عقد|سائق|مبلغ|سند|رقم|بحث|منتهي|صيانة|كم|أين|مين/i.test(userQuery) && userQuery.length < 50;

  // HELPER: Query Gemini 3.6 Flash
  const callGemini = async () => {
    if (!geminiKey) return null;
    const client = new OpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: geminiKey,
      timeout: AI_PROVIDER_TIMEOUT_MS
    });
    const response = await client.chat.completions.create({
      model: 'gemini-3.6-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userQuery }
      ],
      tools,
      tool_choice: 'auto'
    });

    const message = response.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0] as any;
    if (toolCall) {
      let args = {};
      try { args = JSON.parse(toolCall.function?.arguments || '{}'); } catch { args = {}; }
      return { toolName: toolCall.function?.name as string, args };
    }
    if (message?.content) {
      return { toolName: 'generalConversation', args: { reply: message.content } };
    }
    return null;
  };

  // HELPER: Query Groq LPU Engine (Fastest Latency)
  const callGroq = async () => {
    if (!groqKey) return null;
    const client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      timeout: AI_PROVIDER_TIMEOUT_MS
    });
    const response = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userQuery }
      ],
      tools,
      tool_choice: 'auto'
    });
    const message = response.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0] as any;
    if (toolCall) {
      let args = {};
      try { args = JSON.parse(toolCall.function?.arguments || '{}'); } catch { args = {}; }
      return { toolName: toolCall.function?.name as string, args };
    }
    if (message?.content) {
      return { toolName: 'generalConversation', args: { reply: message.content } };
    }
    return null;
  };

  // HELPER: Query GitHub Models API (Backup Model)
  const callGitHub = async () => {
    if (!githubToken) return null;
    const client = new OpenAI({
      baseURL: 'https://models.inference.ai.azure.com',
      apiKey: githubToken,
      timeout: AI_PROVIDER_TIMEOUT_MS
    });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userQuery }
      ],
      tools,
      tool_choice: 'auto'
    });

    const message = response.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0] as any;
    if (toolCall) {
      let args = {};
      try { args = JSON.parse(toolCall.function?.arguments || '{}'); } catch { args = {}; }
      return { toolName: toolCall.function?.name as string, args };
    }
    if (message?.content) {
      return { toolName: 'generalConversation', args: { reply: message.content } };
    }
    return null;
  };

  // 🚀 DYNAMIC SMART ROUTING:
  // For Quick Operational queries -> Groq LPU (Fastest 1.5s) -> Gemini -> GitHub
  // For Deep Strategy / Casual Chat -> Gemini 3.6 Flash (Rich Arabic) -> Groq -> GitHub
  if (isQuickOperational) {
    const groqRes = await callProvider('Groq', callGroq);
    if (groqRes) return groqRes;
    const geminiRes = await callProvider('Gemini', callGemini);
    if (geminiRes) return geminiRes;
  } else {
    const geminiRes = await callProvider('Gemini', callGemini);
    if (geminiRes) return geminiRes;
    const groqRes = await callProvider('Groq', callGroq);
    if (groqRes) return groqRes;
  }

  const githubRes = await callProvider('GitHub Models', callGitHub);
  if (githubRes) return githubRes;

  return null;
}
