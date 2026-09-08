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

  const systemPrompt = `أنت رفيق عمل ومساعد إداري ومالي ذكي وودود جداً لشركة "المحترز للحاويات" في السعودية.
تتميز بالذكاء العالي، التفكير الإيجابي، سرعة البديهة، والقدرة على النقاش الحر، ومناقشة الحلول، وتأدية العمل بمهنية مع حس دعابة خفيف ومرح وودود.
اختر الأداة المناسبة بدقة لتنفيذ طلب المستخدم، أو ناقشه بحرية وبطريقة ذكية ولطيفة دون قوالب مكررة.`;

  // 1. TRY GOOGLE GEMINI (PRIMARY FREE MODEL)
  if (geminiKey) {
    try {
      const geminiClient = new OpenAI({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: geminiKey
      });

      const response = await geminiClient.chat.completions.create({
        model: 'gemini-2.0-flash',
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
    } catch (err: any) {
      console.warn('⚠️ Gemini Primary AI failover to GitHub Models:', err?.message || err);
    }
  }

  // 2. TRY GITHUB MODELS API (BACKUP FREE MODEL)
  if (githubToken) {
    try {
      const githubClient = new OpenAI({
        baseURL: 'https://models.inference.ai.azure.com',
        apiKey: githubToken
      });

      const response = await githubClient.chat.completions.create({
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
    } catch (err: any) {
      console.warn('⚠️ GitHub Models Backup failover to Groq/Local:', err?.message || err);
    }
  }

  // 3. TRY GROQ API (FALLBACK MODEL)
  if (groqKey) {
    try {
      const groqClient = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqKey
      });

      const response = await groqClient.chat.completions.create({
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
    } catch (err: any) {
      console.warn('⚠️ Groq API Error:', err?.message || err);
    }
  }

  return null;
}
