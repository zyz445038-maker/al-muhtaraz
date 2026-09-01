import OpenAI from 'openai';

// GitHub Models – free, fast, supports Function Calling
// Endpoint: https://models.inference.ai.azure.com
const client = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.GITHUB_TOKEN || '',
});

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
  if (!process.env.GITHUB_TOKEN) {
    console.warn('⚠️ GITHUB_TOKEN is not set. Falling back to local routing.');
    return null;
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
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
      temperature: 0.1,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (toolCall) {
      let args = {};
      try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch { args = {}; }
      return {
        toolName: toolCall.function.name,
        args
      };
    }

    return null;
  } catch (error: any) {
    console.error('❌ GitHub Models API Error:', error?.message || error);
    return null;
  }
}
