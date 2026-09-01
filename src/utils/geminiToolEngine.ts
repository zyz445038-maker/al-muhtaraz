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

  const token = process.env.GROQ_API_KEY;
  if (!token) {
    throw new Error('[Server Env] GROQ_API_KEY is not set on the server.');
  }

  // Lazy init — client created only when called server-side
  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: token,
  });

  try {
    const response = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: 'أنت مساعد ذكي متخصص في إدارة شركات تأجير الحاويات في السعودية. اختر الأداة المناسبة بدقة لتنفيذ طلب المستخدم.'
        },
        {
          role: 'user',
          content: userQuery
        }
      ],
      tools,
      tool_choice: 'auto',
    });

    const message = response.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0] as any;

    if (toolCall) {
      let args = {};
      try { args = JSON.parse(toolCall.function?.arguments || '{}'); } catch { args = {}; }
      return {
        toolName: toolCall.function?.name as string,
        args
      };
    }

    if (message?.content) {
      return {
        toolName: 'generalConversation',
        args: { reply: message.content }
      };
    }

    throw new Error('[Server -> LLM] No tool call or content returned from LLM');
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('❌ Groq API Error:', errMsg);
    throw new Error(`[Server -> LLM Error] ${errMsg}`);
  }
}
