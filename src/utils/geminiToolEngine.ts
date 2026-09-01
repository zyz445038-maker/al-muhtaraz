import { GoogleGenAI, Type } from '@google/genai';

// Initialize the Gemini Client
// It expects GEMINI_API_KEY in the environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const toolsDeclarations: any = [{
  functionDeclarations: [
    {
      name: "fetchLatestContract",
      description: "يجلب أحدث عقد تم تسجيله في النظام.",
    },
    {
      name: "fetchPreviousContract",
      description: "يجلب العقد الذي يسبق العقد الأخير.",
    },
    {
      name: "auditLiveFinancials",
      description: "يحسب الإيرادات، المدفوعات، الكاش، المبالغ المتبقية والتحصيلات.",
    },
    {
      name: "auditExpiringContainers",
      description: "يفحص الحاويات التي ستنتهي قريباً لتفادي المخالفات البلدية.",
    },
    {
      name: "auditContainersStock",
      description: "يعطي تقرير عن مخزون الحاويات المتوفرة، المؤجرة، وتحت الصيانة.",
    },
    {
      name: "searchEntity",
      description: "يبحث عن عقد أو عميل معين برقم الجوال أو اسم العميل أو رقم العقد.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          searchQuery: {
            type: Type.STRING,
            description: "الكلمة المفتاحية للبحث (رقم الجوال، اسم العميل، إلخ)"
          }
        },
        required: ["searchQuery"]
      }
    },
    {
      name: "auditDriversFleet",
      description: "يستعرض حالة السائقين وفريق العمل الميداني.",
    },
    {
      name: "generateWhatsAppReport",
      description: "يقوم بتجهيز التقرير التنفيذي اليومي وإرساله للإدارة.",
    },
    {
      name: "auditDebtsAndReceivables",
      description: "يستعرض الديون والمستحقات المتبقية في السوق ولم يتم سدادها.",
    },
    {
      name: "fetchTopCustomers",
      description: "يجلب قائمة بأهم كبار العملاء والأكثر تعاملاً.",
    },
    {
      name: "fetchTodayOperations",
      description: "يستعرض عقود اليوم وعمليات التشغيل اللحظية.",
    },
    {
      name: "fetchContractVoucherOrImage",
      description: "يجلب صورة العقد أو سند القبض أو يطبع الوثيقة.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          searchQuery: {
            type: Type.STRING,
            description: "كلمات البحث المرافقة لطلب طباعة أو صورة العقد"
          }
        },
        required: ["searchQuery"]
      }
    },
    {
      name: "generalConversation",
      description: "يستخدم في حال كان كلام المستخدم مجرد تحية أو سؤال عام لا يتطلب استدعاء دوال.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "الرد المناسب للعميل بلهجة سعودية احترافية"
          }
        },
        required: ["reply"]
      }
    }
  ]
}];

export async function determineIntentWithGemini(userQuery: string) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is not set. Falling back to local routing.");
    return null; // Fallback to local logic if no API key
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `المستخدم يسأل: "${userQuery}"\nاختر الأداة المناسبة لتنفيذ طلب المستخدم بأكبر دقة ممكنة.`,
      config: {
        tools: toolsDeclarations,
        temperature: 0.1,
      }
    });

    const functionCall = response.functionCalls?.[0];
    
    if (functionCall) {
      return {
        toolName: functionCall.name,
        args: functionCall.args
      };
    }
    
    return null;
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    return null;
  }
}
