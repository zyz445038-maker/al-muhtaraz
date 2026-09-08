import OpenAI from 'openai';

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
  {
    type: 'function',
    function: {
      name: 'fetchContractVoucherOrImage',
      description: 'يجلب صورة العقد أو سند القبض أو يطبع الوثيقة.',
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

export async function determineIntentWithGemini(userQuery: string): Promise<{ toolName: string; args: any } | null> {
  // Guard: only run on server — prevents client-side OpenAI crash
  if (typeof window !== 'undefined') return null;

  const geminiKey = process.env.GEMINI_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;

  const systemPrompt = `أنت مساعد عمل ومستشار إداري ذكي وودود جداً لشركة "المحترز للحاويات" في السعودية.
تتحدث بشكل طبيعي وتلقائي 100% متكيف كلياً مع طبيعة سؤال المستخدم، دون أي ترحيب طويل أو قوالب رسمية مكررة.
- إذا كان السؤال استفساراً رقمياً أو تشغيلياً: أجب مباشرة ودون مقدمات.
- إذا كان السؤال نقاشاً أو فكاهة: تفاعل بذكاء، ود وحس دعابة خفيف ولطيف.
- يُمنع منعاً باتاً استخدام مقدمات رسمية مكررة مثل (أهلاً بك بصفتي رفيقك وسندك). ادخل في الرد مباشرة وبأسلوب طبيعي ومرح.`;

  // Detect quick operational vs deep strategic query for Smart Model Routing
  const isQuickOperational = /حاوية|عقد|سائق|مبلغ|سند|رقم|بحث|منتهي|صيانة|كم|أين|مين/i.test(userQuery) && userQuery.length < 50;

  // HELPER: Query Gemini 3.6 Flash
  const callGemini = async () => {
    if (!geminiKey) return null;
    const client = new OpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: geminiKey
    });
    const response = await client.chat.completions.create({
      model: 'gemini-3.6-flash',
      messages: [
        { role: 'system', content: systemPrompt },
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
      apiKey: groqKey
    });
    const response = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
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
      apiKey: githubToken
    });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
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
  try {
    if (isQuickOperational) {
      const groqRes = await callGroq();
      if (groqRes) return groqRes;
      const geminiRes = await callGemini();
      if (geminiRes) return geminiRes;
    } else {
      const geminiRes = await callGemini();
      if (geminiRes) return geminiRes;
      const groqRes = await callGroq();
      if (groqRes) return groqRes;
    }

    const githubRes = await callGitHub();
    if (githubRes) return githubRes;

  } catch (err: any) {
    console.warn('⚠️ Multi-Model Routing error:', err?.message || err);
  }

  return null;
}
