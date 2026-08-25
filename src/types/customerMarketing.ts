export type CustomerCategory = 'company' | 'individual' | 'government' | 'contractor' | 'vip';

export interface MarketingCustomer {
  id: string;
  name: string;
  phone: string;
  alt_phone?: string;
  category: CustomerCategory;
  city?: string;
  address?: string;
  total_contracts: number;
  last_deal_date?: string;
  marketing_opt_in: boolean; // مشترك في الرسائل التسويقية
  tags: string[];            // وسوم e.g. ["مقاول", "حاويات شهرية", "رخصة ترميم"]
  notes?: string;
  source: 'contract' | 'official_contract' | 'manual' | 'import';
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  message_template: string;
  target_category: 'all' | CustomerCategory;
  recipient_ids: string[];
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: 'draft' | 'sending' | 'completed' | 'paused';
  created_at: string;
  completed_at?: string;
}

export interface CampaignTemplate {
  id: string;
  title: string;
  category: string;
  message: string;
}

export const DEFAULT_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'tpl-1',
    title: '🔥 عروض تأجير الحاويات السنوية والشهرية',
    category: 'عروض أسعار',
    message: `مرحباً عزيزنا {الاسم} 🌟\n\nيسر شركة المحترز للحاويات أن تقدم لكم أقوى عروض تأجير الحاويات (اليومية، الشهرية، والسنوية) بأفضل الأسعار وأسرع خدمة رفع وتفريغ في المنطقة 🏗️✨.\n\n📞 للحجز والاستفسار الفوري:\n0532643000\nنسعد دائماً بخدمتكم!`
  },
  {
    id: 'tpl-2',
    title: '📜 توثيق عقود رفع أنقاض البناء والترميم (بلدي)',
    category: 'خدمات التوثيق',
    message: `السلام عليكم ورحمة الله {الاسم} 🤝\n\nتعلن شركة المحترز للحاويات عن توفير خدمة إصدار وتوثيق عقود رفع الأنقاض المعتمدة لبلدي ورخص البناء والترميم فورياً وبشكل إلكتروني موثق 📋✅.\n\n📍 متواجدون لخدمتكم:\n0532643000\nشركة المحترز — شريكك الموثوق للإعمار.`
  },
  {
    id: 'tpl-3',
    title: '🎉 خصم خاص للعملاء الدائمين والمقاولين',
    category: 'خصومات خاصة',
    message: `عزيزنا العميل {الاسم} 💐\n\nتقديراً لتعاملكم المستمر مع شركة المحترز، يسعدنا تقديم خصم خاص بنسبة 15% على تأجير الحاويات الجديد عند حجزكم هذا الأسبوع 🚛💥.\n\n📲 تواصل معنا الآن للاستفادة من العرض:\n0532643000`
  },
  {
    id: 'tpl-4',
    title: '🌙 تهنئة موسمية وتذكير بالخدمات',
    category: 'تهاني ومواسم',
    message: `الأخ الفاضل / {الاسم} 🌸\n\nشركة المحترز للمقاولات وتأجير الحاويات تهنئكم بالموسم الجديد، ويسعدنا دائماً تلبية كافة احتياجاتكم في توريد ورفع الحاويات على مدار الساعة وبأعلى معايير الجودة 🚜.\n\n0532643000`
  }
];
