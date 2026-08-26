// Comprehensive System Knowledge Base & Dynamic Conversational Learning Engine for AI Assistant
// Contains static domain knowledge + Dynamic Self-Learning Memory Bank + In-Conversation Auto-Learning Parser

export interface KnowledgeItem {
  id?: string;
  category: 'creator' | 'contracts' | 'finance' | 'whatsapp' | 'containers' | 'drivers' | 'system' | 'policy' | 'pricing' | 'custom_rule';
  title?: string;
  triggers: string[];
  speechResponse: string;
  displayMarkdown: string;
  is_dynamic?: boolean;
  taught_by?: string;
  created_at?: string;
}

export const SYSTEM_KNOWLEDGE_BASE: KnowledgeItem[] = [
  // 👑 1. Secret Creator Signature
  {
    id: 'static-creator',
    category: 'creator',
    title: 'صانع ومطور المنظومة',
    triggers: [
      'من صنع', 'من برمج', 'من طور', 'من صمم', 'من بنى', 'مين سواك', 'مين برمجك', 
      'مين صنعك', 'مين طورك', 'صاحب النظام', 'مطور التطبيق', 'صانع التطبيق', 
      'زياد', 'ابو طلعت', 'ابوطلعت', 'المهندس زياد', 'مين مهندس النظام', 'حقوق التطوير'
    ],
    speechResponse: 'تَمَّ تَطْوِيرُ وَهَنْدَسَةُ هَذَا النِّظَامِ بِالْكَامِلِ بِوَاسِطَةِ الأُسْتَاذِ وَالْمُبْدِعِ زِيَادْ أَبُو طَلْعَتْ..',
    displayMarkdown: `👑 **بصمة الإبداع والتطوير:** ✨\n\nتم تصميم وتطوير وهندسة هذا النظام بالكامل وبكل فخر واعتزاز بواسطة:\n### 🌟 **الأستاذ والمبدع / زياد أبو طلعت** 💎\n\nصُممت هذه المنظومة خصيصاً لمؤسسة **المحترز للحاويات** لتكون أذكى وأقوى منصة إدارة لوجستية ومالية وميدانية متكاملة بأحدث تقنيات الذكاء الاصطناعي.`
  },

  // 📋 2. How to Create & Manage Contracts
  {
    id: 'static-contracts',
    category: 'contracts',
    title: 'إدارة وتوثيق العقود',
    triggers: [
      'كيف اضيف عقد', 'طريقة انشاء عقد', 'كيف اسوي عقد', 'اضافة عقد جديد', 
      'شرح العقود', 'عقد جديد', 'توثيق العقد', 'شروط العقد', 'مدة العقد'
    ],
    speechResponse: 'أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. لِإِنْشَاءِ عَقْدٍ جَدِيدٍ، ادْخُلْ عَلَى صَفْحَةِ الْعُقُودِ وَاضْغَطْ إِضَافَةَ عَقْدٍ، وَيَتِمُّ التَّوْثِيقُ وَإِرْسَالُ الْوَاتْسَابِ فَوْراً..',
    displayMarkdown: `📋 **دليل إنشاء وتوثيق العقود في النظام:**\n\n1. **اختيار العميل والحاوية:** حدد اسم العميل من القائمة أو أضف عميلاً جديداً برقم جواله، ثم اختر الحاوية المتوفرة وموقع التنزيل.\n2. **تحديد الفترة والمبالغ:** اختر تاريخ البداية والنهاية ومبلغ الإيجار وطريقة السداد (نقدي / شبكة / تحويل).\n3. **التوثيق الآلي:** بضغطة زر واحدة، يتم توليد سند القبض الرسمي، وإرسال بيانات المهمة للسائق، وتنبيه الإدارة فوراً عبر الواتساب.`
  },

  // 💰 3. Financial System & Receipts
  {
    id: 'static-finance',
    category: 'finance',
    title: 'السندات والتحصيل المالي',
    triggers: [
      'كيف احسب الدخل', 'سند القبض', 'الفواتير', 'التحصيل', 'سداد الكتروني', 
      'نقدي وشبكة', 'تصفية الحسابات', 'التقرير المالي', 'كيف اطبع سند'
    ],
    speechResponse: 'أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. كُلُّ عَمَلِيَّةِ دَفْعٍ تَتَوَثَّقُ فَوْراً بِسَنَدِ قَبْضٍ رَسْمِيٍّ مُفَقَّطٍ مَعَ فَصْلٍ دَقِيقٍ بَيْنَ الْكَاشِ وَالسَّدَادِ الإِلِكْتُرُونِيِّ..',
    displayMarkdown: `💰 **المنظومة المالية وإصدار السندات:**\n\n• **السندات الرسمية:** يتم إصدار سند قبض رسمي معتمد برقم تسلسلي، وتفقيط المبلغ كاملاً بالريال السعودي كتابةً ورقماً لمنع أي لبس.\n• **الفصل المحاسبي:** فرز آلي ودقيق لمداخيل الكاش المستلمة يدوياً ومبالغ السداد الإلكتروني لسهولة المطابقة اليومية.\n• **الطباعة والمشاركة:** إمكانية طباعة السند مباشرة كملف PDF معتمد أو إرساله بنقرة واحدة عبر الواتساب للعميل.`
  },

  // ⚠️ 4. Municipality Fines & Expiration Alerts
  {
    id: 'static-municipality',
    category: 'containers',
    title: 'حماية مخالفات البلدية والأمانة',
    triggers: [
      'البلديه', 'البلديات', 'الامانه', 'غرامات', 'مخالفات', 'سحب الحاويه', 
      'انتهاء العقد', 'تمديد العقد', 'تنبيه انتهاء', 'انذار البلدية'
    ],
    speechResponse: 'أَبْشِرْ.. النِّظَامُ يُرَاقِبُ كُلَّ حَاوِيَةٍ فِي الْمَيْدَانِ، وَيُنَبِّهُ قَبْلَ الانْتِهَاءِ بِيَوْمٍ لِسَحْبِهَا وَتَفَادِي غَرَامَاتِ الأَمَانَةِ..',
    displayMarkdown: `⚠️ **نظام الحماية من غرامات البلدية والأمانة:**\n\n• **المراقبة الذكية:** تتبع زمني دقيق لكل حاوية تم تنزيلها في الميدان.\n• **التنبيه المبكر (قبل 24 ساعة):** يظهر تنبيه أصفر للفت انتباه الإدارة، ورسالة للسائق بالتوجه لسحب الحاوية أو التواصل مع العميل للتمديد.\n• **تفادي الغرامات:** منع تجاوز المدة المسموح بها في الطرق العامة وتجنب مخالفات الأمانة بشكل قطعي.`
  },

  // 📲 5. Granular WhatsApp Routing Matrix
  {
    id: 'static-whatsapp',
    category: 'whatsapp',
    title: 'خصوصية ومسارات الواتساب',
    triggers: [
      'كيف يشتغل الواتساب', 'رسائل الواتساب', 'توجيه الواتساب', 'رسالة السائق', 
      'رسالة العميل', 'خصوصية الاسعار', 'ربط الواتس', 'واتساب ويب'
    ],
    speechResponse: 'أَبْشِرْ.. رَسَائِلُ الْوَاتْسَابِ مُقَسَّمَةٌ بِأَمَانٍ: سَنَدٌ لِلْعَمِيلِ، مَوْقِعٌ فَقَطْ لِلسَّائِقِ بِدُونِ إِظْهَارِ الأَسْعَارِ، وَإِشْعَارٌ إِدَارِيٌّ فَوْرِيٌّ..',
    displayMarkdown: `📲 **مصفوفة توجيه رسائل الواتساب الذكية (3 مسارات آمنة):**\n\n1. **مسار العميل 👤:** يستلم نص السند المعتمد كاملاً، رقم الحاوية، والمبلغ بالريال دون روابط مشبوهة.\n2. **مسار السائق 🚛 (أعلى درجات الخصوصية):** يصله رابط الموقع (Google Maps)، اسم وجوال العميل، وموعد التنزيل **(محجوب عنه الأسعار والأرباح كلياً لحماية خصوصية العمل)**.\n3. **مسار المدير 👑:** إشعار فوري للإدارة بكل عقد يتم إبرامه ومبلغ الدفعة وطريقة السداد.`
  },

  // 📢 6. Social Media & Marketing Publishing Engine (Snapchat, TikTok, X, WhatsApp)
  {
    id: 'static-marketing',
    category: 'custom_rule',
    title: 'خطة التسويق والنشر على السوشيال ميديا',
    triggers: [
      'تسويق', 'ترويج', 'سوشيال ميديا', 'نشر اعلان', 'اعلان حاويات', 'سناب شات', 
      'تيك توك', 'تويتر', 'حملة اعلانية', 'كيف نسوق', 'افضل وقت للنشر', 'نشر بوست'
    ],
    speechResponse: 'أَبْشِرْ يَا أَبُو مَاجِدْ.. أَنَا مُدَرَّبٌ عَلَى كِتَابَةِ أَقْوَى الإِعْلاَنَاتِ لِسْنَـابْ شَاتْ وَتِيكْ تُوكْ وَتُوِيتَرْ بِاللَّهْجَةِ السُّعُودِيَّةِ وَتَوْلِيدِ بُرُوشُورَاتٍ فَوْرِيَّةٍ..',
    displayMarkdown: `📢 **دليل استراتيجية التسويق والنشر الذكي (سناب شات & تيك توك & تويتر):**\n\n• **الخطاف الإعلاني (Hook):** التركيز على السرعة (حاويتك واصلة خلال ساعتين) وتوثيق عقود الأمانة الفورية لرخص البناء.\n• **الجمهور المستهدف بالرياض:** أصحاب الفلل والترميم، شركات المقاولات، وأصحاب المحلات التجارية.\n• **أفضل أوقات النشر بالسعودية:** الفترة المسائية (بين 5:00 عصراً إلى 10:00 مساءً) وفي عطلة نهاية الأسبوع (الخميس والجمعة).\n• **أدوات النشر:** يمكنك استخدام محرر السوشيال ميديا في مختبر التطوير (Dev-Lab) لتوليد النصوص وتصميم بروشور 4K والنشر المباشر.`
  }
];

// Local Storage Key for Learned Knowledge Memory
const LEARNED_KNOWLEDGE_KEY = 'almuhtaraz_ai_learned_memory_v1';

// Get all learned memory items
export function getLearnedKnowledge(): KnowledgeItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEARNED_KNOWLEDGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Teach Assistant a New Custom Rule / Business Policy
export function teachAssistantRule(item: Omit<KnowledgeItem, 'id' | 'is_dynamic' | 'created_at'>): KnowledgeItem {
  const current = getLearnedKnowledge();
  const newItem: KnowledgeItem = {
    ...item,
    id: 'dynamic-' + Date.now(),
    is_dynamic: true,
    created_at: new Date().toISOString()
  };

  const updated = [newItem, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(LEARNED_KNOWLEDGE_KEY, JSON.stringify(updated));
  }
  return newItem;
}

// Delete Learned Rule
export function deleteLearnedRule(id: string): void {
  const current = getLearnedKnowledge();
  const filtered = current.filter(k => k.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LEARNED_KNOWLEDGE_KEY, JSON.stringify(filtered));
  }
}

// 🧠 Conversational Auto-Learning Parser: detects when user is actively teaching the assistant in chat!
export function parseConversationalTeaching(userMessage: string): { isTeaching: boolean; item?: KnowledgeItem; responseMessage?: string; speechResponse?: string } {
  const clean = userMessage.trim();
  
  // Patterns like:
  // 1. "قل مستقبلا: [العبارة]" or "قل مستقبلاً [العبارة]"
  // 2. "احفظ عندك إذا سألتك عن [كذا] قل: [كذا]"
  // 3. "إذا سألتك عن [كذا] قل: [كذا]"
  // 4. "تعلم: [كذا]"
  
  const futureSayRegex = /^(?:قل\s+(?:مستقبلا|مستقبلاً|دايما|دائما|في\s+المستقبل)\s*[:،,-]?\s*)(.+)$/i;
  const ifAskSayRegex = /^(?:اذا\s+سألتك\s+عن|إذا\s+سألتك\s+عن|لو\s+سألتك\s+عن|لو\s+قلت\s+لك|احفظ\s+عندك\s+إذا\s+سألتك\s+عن)\s*(.+?)\s*(?:قل|جاوب|رد)\s*[:،,-]?\s*(.+)$/i;
  const learnRegex = /^(?:تعلم\s*[:،,-]?\s*|احفظ\s+عندك\s*[:،,-]?\s*)(.+)$/i;

  // Match Pattern 1: "قل مستقبلا: ..."
  const match1 = clean.match(futureSayRegex);
  if (match1 && match1[1]) {
    const phrase = match1[1].trim();
    const triggers = [phrase.slice(0, 20), 'مرحبا', 'السلام عليكم', 'يا مساعد', 'يا هلا'];
    const saved = teachAssistantRule({
      category: 'custom_rule',
      title: `عبارة ملقنة: ${phrase.slice(0, 30)}...`,
      triggers: triggers,
      speechResponse: phrase,
      displayMarkdown: `🧠 **تم التعلم والحفظ في الذاكرة:**\n\n«${phrase}»`,
      taught_by: 'المحادثة الحية مع أبو ماجد'
    });

    return {
      isTeaching: true,
      item: saved,
      responseMessage: `أبشر يا أبو ماجد.. تم حفظ هذه العبارة في ذاكرتي وسأقولها دائماً عند الترحيب وسؤالك! 🧠✨`,
      speechResponse: `أَبْشِرْ يَا أَبُو مَاجِدْ.. تَمَّ حِفْظُ هَذِهِ الْعِبَارَةِ وَتَعَلُّمُهَا بِنَجَاحْ..`
    };
  }

  // Match Pattern 2: "إذا سألتك عن [سعر النرجس] قل: [السعر 600 ريال]"
  const match2 = clean.match(ifAskSayRegex);
  if (match2 && match2[1] && match2[2]) {
    const topic = match2[1].trim();
    const answer = match2[2].trim();
    const triggers = [topic, topic.replace(/\s+/g, ''), ...topic.split(' ')].filter(t => t.length > 2);
    
    const saved = teachAssistantRule({
      category: 'policy',
      title: `قاعدة: ${topic}`,
      triggers: triggers,
      speechResponse: answer,
      displayMarkdown: `🧠 **تم التعلم والحفظ في الذاكرة:**\n\n• **الموضوع:** ${topic}\n• **الإجابة المعتمدة:** ${answer}`,
      taught_by: 'المحادثة الحية مع أبو ماجد'
    });

    return {
      isTeaching: true,
      item: saved,
      responseMessage: `أبشر يا أبو ماجد.. تم استيعاب وحفظ قاعدة «${topic}» بنجاح! سأجيب بها فوراً عند السؤال. 🧠💡`,
      speechResponse: `أَبْشِرْ يَا أَبُو مَاجِدْ.. تَمَّ حِفْظُ قَاعِدَةِ ${topic} فِي الذَّاكِرَةِ بِنَجَاحْ..`
    };
  }

  // Match Pattern 3: "تعلم: ..."
  const match3 = clean.match(learnRegex);
  if (match3 && match3[1]) {
    const phrase = match3[1].trim();
    const words = phrase.split(' ').filter(w => w.length > 2);
    const saved = teachAssistantRule({
      category: 'custom_rule',
      title: `معلومة محفوظة: ${phrase.slice(0, 25)}...`,
      triggers: words.slice(0, 4),
      speechResponse: phrase,
      displayMarkdown: `🧠 **تم حفظ المعلومة في الذاكرة:**\n\n«${phrase}»`,
      taught_by: 'المحادثة الحية مع أبو ماجد'
    });

    return {
      isTeaching: true,
      item: saved,
      responseMessage: `أبشر.. تم تسجيل المعلومة وحفظها في الذاكرة المكتسبة بنجاح! 💾✨`,
      speechResponse: `أَبْشِرْ.. تَمَّ حِفْظُ هَذِهِ الْمَعْلُومَةِ فِي ذَاكِرَتِي..`
    };
  }

  return { isTeaching: false };
}

// Search and answer from both System and Dynamic Knowledge Base
export function querySystemKnowledge(userQuery: string): KnowledgeItem | null {
  const normalized = userQuery
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .toLowerCase()
    .trim();

  // Combine dynamic learned items (Priority 1) + static items (Priority 2)
  const learnedItems = getLearnedKnowledge();
  const allItems = [...learnedItems, ...SYSTEM_KNOWLEDGE_BASE];

  for (const item of allItems) {
    for (const trigger of item.triggers) {
      const normTrigger = trigger
        .replace(/[ًٌٍَُِّْ]/g, '')
        .replace(/[إأآا]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .toLowerCase()
        .trim();
      
      if (normalized.includes(normTrigger) || normTrigger.includes(normalized)) {
        return item;
      }
    }
  }

  return null;
}
