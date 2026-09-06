# Dependency Map / System Contract

## الهدف
هذا الملف يحدد الروابط الأساسية للنظام، ما الذي يعتمد على ماذا، وماذا يحدث إذا تعطل أي جزء. الهدف هو تقليل المخاطر قبل أي توسيع للذكاء أو الخدمات الإضافية.

---

## 1) مخطط النظام الأساسي

### 1.1 Frontend / App Layer
- المشروع الأساسي: Next.js
- نقطة الدخول: [src/app/page.tsx](src/app/page.tsx)
- إعدادات التطبيق: [src/app/layout.tsx](src/app/layout.tsx)
- واجهة المكونات: [src/components](src/components)

### 1.2 Data Layer
- قاعدة البيانات الأساسية: Supabase
- ملف الاتصال: [src/lib/supabase.ts](src/lib/supabase.ts)
- مخطط الجداول: [schema.sql](schema.sql)
- البيئة: [.env.local](.env.local)

### 1.3 WhatsApp Service Layer
- خادم واتساب منفصل: [whatsapp-addon-server/src/server.ts](whatsapp-addon-server/src/server.ts)
- جلسات واتساب: [whatsapp-addon-server/src/engine/sessionManager.ts](whatsapp-addon-server/src/engine/sessionManager.ts)
- إرسال الرسائل: [whatsapp-addon-server/src/routes/messageRoutes.ts](whatsapp-addon-server/src/routes/messageRoutes.ts)

### 1.4 AI Layer
- مستكشف النية / الذكاء: [src/utils/geminiToolEngine.ts](src/utils/geminiToolEngine.ts)
- الوكيل التنفيذي: [src/utils/aiExecutiveAgent.ts](src/utils/aiExecutiveAgent.ts)
- قاعدة المعرفة: [src/utils/aiCopilotKnowledge.ts](src/utils/aiCopilotKnowledge.ts)

### 1.5 API Layer
- API الرئيسية: [src/app/api](src/app/api)
- أمثلة:
  - [src/app/api/whatsapp/send/route.ts](src/app/api/whatsapp/send/route.ts)
  - [src/app/api/whatsapp/status/route.ts](src/app/api/whatsapp/status/route.ts)
  - [src/app/api/payment/webhook/route.ts](src/app/api/payment/webhook/route.ts)
  - [src/app/api/cron/process-notifications/route.ts](src/app/api/cron/process-notifications/route.ts)

---

## 2) الروابط الحرجة (Critical Dependencies)

| الخدمة | النوع | ضرورية؟ | الملف / المصدر | التأثير عند التعطل | بديل / fallback |
|---|---|---:|---|---|---|
| Supabase | قاعدة بيانات | نعم | [src/lib/supabase.ts](src/lib/supabase.ts) | توقف معظم البيانات والعمليات | عرض خطأ آمن + حفظ محلي مؤقت |
| Next.js App | واجهة + API | نعم | [src/app](src/app) | توقف التطبيق بالكامل | لا يوجد بديل مباشر |
| WhatsApp Addon Server | خدمة داعمة | لا | [whatsapp-addon-server/src/server.ts](whatsapp-addon-server/src/server.ts) | توقف الرسائل/الإشعارات | عرض حالة غير متصل + سجل خطأ |
| AI Engine | خدمة داعمة | لا | [src/utils/geminiToolEngine.ts](src/utils/geminiToolEngine.ts) | توقف الاستفسارات الذكية | تشغيل النظام الأساسي بدون AI |
| Env Variables | إعدادات التشغيل | نعم | [.env.local](.env.local), [.env.example](.env.example) | تشغيل غير صحيح أو خدمات معطلة | فحص محلي قبل التنفيذ |
| Vercel Deployment Config | النشر | يعتمد على البيئة | [vercel.json](vercel.json) | عدم تناسق النشر | نشر محلي / بيئة منفصلة |

---

## 3) الروابط الخارجية الحالية

### 3.1 Supabase
- URL و anon key موجودان في [.env.local](.env.local)
- المصدر في [src/lib/supabase.ts](src/lib/supabase.ts)
- الأثر: جميع البيانات الأساسية (حاويات، عقود، عملاء، مدفوعات) تعتمد عليه في معظم السيناريوهات.
- المعيار: إذا تعطل Supabase، يتوقف النظام الأساسي تقريبًا.

### 3.2 WhatsApp
- الروابط موجودة في:
  - [src/app/api/whatsapp/send/route.ts](src/app/api/whatsapp/send/route.ts)
  - [src/app/api/whatsapp/status/route.ts](src/app/api/whatsapp/status/route.ts)
  - [whatsapp-addon-server/src/server.ts](whatsapp-addon-server/src/server.ts)
- الأثر: خدمة مساعدة، ولكنها تؤثر على الاتصال والتذكير والرسائل.
- المعيار: لا ينبغي أن تعطل النظام الأساسي، بل يجب أن تظهر حالة ممتازة/غير متصل.

### 3.3 AI Services
- الروابط الحالية في:
  - [src/utils/geminiToolEngine.ts](src/utils/geminiToolEngine.ts)
  - [src/utils/aiExecutiveAgent.ts](src/utils/aiExecutiveAgent.ts)
- الأثر: وظائف الذكاء والأوامر التنفيذية، لكنها لا ينبغي أن تكون شرطًا حاسمًا لعمل النظام الأساسي.
- المعيار: إذا تعطل AI، لا يتوقف التطبيق، فقط تضعف بعض المزايا.

---

## 4) نقاط الفشل المحتملة

### 4.1 فشل قاعدة البيانات
- الحالة: حرجة
- التأثير: لا يمكن عرض أو تحديث العقود، الحاويات، العملاء، الفواتير
- الإجراء: إظهار رسالة احترافية + سجل خطأ + إمكانية حفظ محلي مؤقت

### 4.2 فشل خادم الواتساب
- الحالة: متوسطة/خفيفة
- التأثير: رسائل واتساب لا ترسل
- الإجراء: إظهار حالة غير متصل + Retry + عدم توقف الواجهة

### 4.3 فشل AI
- الحالة: خفيفة
- التأثير: لا توجد استجابة ذكية أو تحليل عميق
- الإجراء: تشغيل الوضع اليدوي + رسالة: “الخدمة الذكية غير متاحة暂时ًا”

### 4.4 فشل متغيرات البيئة
- الحالة: حرجة
- التأثير: خرائط API أو خدمة معينة لا تعمل
- الإجراء: فحص ENV قبل بدء التطبيق + رسائل واضحة في التمهيد

---

## 5) الواجبات المطلوبة قبل أي توسع

### مطلوب قبل إضافة ميزات جديدة
1. توثيق كل خدمة جديدة في هذا الملف
2. تصنيفها إلى: أساسية / داعمة / اختيارية
3. تحديد ما إذا كانت الفشل فيها يوقف النظام أو لا
4. تحديد fallback لكل خدمة
5. التأكد من أنه لا توجد خدمة أساسية تعتمد بشكل مباشر على خدمة اختيارية

### مطلوب قبل التوسع في الذكاء
- التأكد من أن AI مجرد طبقة داعمة وليس نقطة حرجة
- فصل الأوامر التنفيذية عن المنطق الأساسي
- جعل كل استدعاء AI له timeout و fallback
- تسجيل الأخطاء

---

## 6) معيار التصميم المراد تحقيقه

### طبقة أساسية (must work)
- إدارة الحاويات
- إدارة العقود
- إدارة العملاء
- الفواتير
- التعرف على الموظفين

### طبقة داعمة (should work, but degrade gracefully)
- واتساب
- AI executive assistant
- Voice/TTS
- تقارير متقدمة

### قاعدة تصميمية أساسية
- لا تعطل الطبقة الأساسية عند تعطل الطبقة الداعمة
- لا تجعل خدمة اختيارية شرطًا أساسيًا لتشغيل النظام

---

## 7) التوصية النهائية
هذه الخريطة هي أول خطوة في عملية الترميم، وهي ضرورية قبل أي تغيير في الذكاء أو أي توسع. إذا تم احترام هذا الملف والالتزام به، فإن المشروع يظل متماسكًا حتى لو تعطل أحد الخدمات.

ملاحظة: كل خدمة جديدة يجب إضافتها إلى هذا الملف فورًا، وإيصالها إلى هذا الهيكل.
