'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Share2, 
  Send, 
  Copy, 
  Download, 
  ImageIcon, 
  RefreshCw, 
  CheckCircle2, 
  Bot, 
  Sliders, 
  Clock, 
  TrendingUp, 
  Zap, 
  Globe, 
  Eye, 
  ExternalLink,
  Smartphone,
  Hash,
  Layers,
  Heart,
  MessageCircle,
  Repeat,
  Bookmark,
  Check,
  Building2,
  Phone,
  Flame,
  Award,
  Calendar,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type SocialPlatform = 'twitter' | 'instagram' | 'tiktok' | 'snapchat' | 'whatsapp' | 'linkedin' | 'google' | 'facebook';

export type MarketingTone = 'saudi_friendly' | 'b2b_formal' | 'promo_urgent' | 'creative_catchy';

export type CampaignTheme = 'quick_delivery' | 'building_permits' | 'weekend_sale' | 'contractors_bulk' | 'free_quotes' | 'custom';

interface SocialPreset {
  id: CampaignTheme;
  title: string;
  badge: string;
  icon: string;
  defaultPrompt: string;
}

const CAMPAIGN_PRESETS: SocialPreset[] = [
  {
    id: 'quick_delivery',
    title: 'توصيل فوري خلال ساعتين بالرياض ⚡',
    badge: 'الأكثر طلباً',
    icon: '⚡',
    defaultPrompt: 'أقوى خدمة تأجير حاويات أنقاض ومخلفات في الرياض — توصيل خلال ساعتين وخدمة سحب فورية بأسعار تنافسية.'
  },
  {
    id: 'building_permits',
    title: 'عقود معتمدة لرخص البناء والبلديات 🏛️',
    badge: 'رسمي',
    icon: '🏛️',
    defaultPrompt: 'عقود تأجير حاويات رفع أنقاض إلكترونية موثقة ومعتمدة لجميع البلديات ورخص البناء والترميم الفورية.'
  },
  {
    id: 'weekend_sale',
    title: 'عروض وخصومات نهاية الأسبوع 🏷️',
    badge: 'تخفيضات',
    icon: '🏷️',
    defaultPrompt: 'عرض خاص لنهاية الأسبوع! استأجر حاوية 20 ياردة واحصل على خصم فوري وخدمة سريعة للموقع.'
  },
  {
    id: 'contractors_bulk',
    title: 'باقات مخصصة للمقاولين والشركات 🏗️',
    badge: 'B2B',
    icon: '🏗️',
    defaultPrompt: 'حلول متكاملة للمقاولين والمطورين العقاريين — توريد أسطول حاويات يومي وشهري مع فواتير ضريبية وسندات قبض معتمدة.'
  },
  {
    id: 'free_quotes',
    title: 'معاينة واستشارة مجانية فورية 🎁',
    badge: 'إهداء',
    icon: '🎁',
    defaultPrompt: 'تواصل معنا الآن عبر الواتساب واحصل على استشارة فورية لتحديد حجم الحاوية المناسب لمشروعك وموقعك مجاناً.'
  }
];

export const SocialMediaAIHub: React.FC = () => {
  // State
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('twitter');
  const [selectedTheme, setSelectedTheme] = useState<CampaignTheme>('quick_delivery');
  const [marketingTone, setMarketingTone] = useState<MarketingTone>('saudi_friendly');
  const [promoTitle, setPromoTitle] = useState('المحترز للحاويات — بالرياض وين ما كنت!');
  const [promoBody, setPromoBody] = useState('شغالين في ترميم أو بناء؟ 🏗️\nلا تشيل هم الأنقاض! نوفر لك حاويات 20 ياردة نظيفة وبأسرع وقت خلال ساعتين مع عقود بلدية رسمية موثقة.\n\n📞 احجز حاويتك الآن بضغطة زر عبر الواتساب: 0554450385');
  const [phoneContact, setPhoneContact] = useState('0554450385');
  const [hashtags, setHashtags] = useState('#حاويات_الرياض #تأجير_حاويات #أنقاض_بناء #مقاولات_الرياض #المحترز_للحاويات #بلدية_الرياض');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [canvasImageUrl, setCanvasImageUrl] = useState<string | null>(null);
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const flyerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate 4K Canvas Promotional Flyer
  const generateFlyerCanvas = () => {
    const canvas = flyerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient (Luxury Dark Blue & Amber Glow)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#172554');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Glowing Accent Circles
    const glow = ctx.createRadialGradient(900, 180, 50, 900, 180, 450);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const glowBottom = ctx.createRadialGradient(180, 900, 50, 180, 900, 450);
    glowBottom.addColorStop(0, 'rgba(14, 165, 233, 0.20)');
    glowBottom.addColorStop(1, 'rgba(14, 165, 233, 0)');
    ctx.fillStyle = glowBottom;
    ctx.fillRect(0, 0, width, height);

    // 3. Golden Border Frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, width - 84, height - 84);

    // 4. Header Badge
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 280, 70, 560, 60, 30);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 24px "Cairo", sans-serif';
    ctx.fillText('⭐ مؤسسة المحترز لتأجير الحاويات وعقود الأنقاض ⭐', width / 2, 108);

    // 5. Main Title (3D Gold Gradient)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Cairo", sans-serif';
    ctx.fillText(promoTitle.slice(0, 32), width / 2, 220);

    // 6. Central Visual Graphic Box (Container 3D Card)
    const boxX = 100;
    const boxY = 270;
    const boxW = width - 200;
    const boxH = 460;

    const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    boxGrad.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
    boxGrad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
    ctx.fillStyle = boxGrad;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Graphic Icon Inside Box
    ctx.font = '100px sans-serif';
    ctx.fillText('🏗️', width / 2, boxY + 130);

    // Highlights list
    ctx.textAlign = 'right';
    ctx.font = 'bold 30px "Cairo", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('✓ توصيل فوري وسريع لجميع أحياء الرياض', boxX + boxW - 50, boxY + 220);
    ctx.fillText('✓ عقود رسمية موثقة ومعتمدة للبلديات ورخص البناء', boxX + boxW - 50, boxY + 280);
    ctx.fillText('✓ حاويات 20 ياردة نظيفة ومجهزة لرفع الأنقاض', boxX + boxW - 50, boxY + 340);
    ctx.fillText('✓ أفضل الأسعار مع خيارات دفع كاش ومدى وسداد', boxX + boxW - 50, boxY + 400);

    // 7. Call To Action Footer Bar
    const ctaY = 770;
    const ctaGrad = ctx.createLinearGradient(100, ctaY, width - 100, ctaY + 120);
    ctaGrad.addColorStop(0, '#f59e0b');
    ctaGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = ctaGrad;
    ctx.beginPath();
    ctx.roundRect(100, ctaY, width - 200, 120, 20);
    ctx.fill();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
    ctx.shadowBlur = 30;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#050811';
    ctx.font = '900 38px "Cairo", sans-serif';
    ctx.fillText(`📞 للطلب والحجز المباشر: ${phoneContact}`, width / 2, ctaY + 75);
    ctx.shadowBlur = 0;

    // 8. Footer Social Branding
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px "Cairo", sans-serif';
    ctx.fillText('الرياض — المملكة العربية السعودية | خدمة سريعة على مدار 24 ساعة', width / 2, 940);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('almuhtaraz.com | #المحترز_للحاويات', width / 2, 980);

    setCanvasImageUrl(canvas.toDataURL('image/png'));
  };

  // Generate Flyer Canvas on change
  useEffect(() => {
    generateFlyerCanvas();
  }, [promoTitle, promoBody, phoneContact, selectedTheme]);

  // AI Content Generator Simulation
  const handleGenerateAIContent = async (themeOverride?: CampaignTheme) => {
    const theme = themeOverride || selectedTheme;
    setIsGeneratingAI(true);

    await new Promise(r => setTimeout(r, 650));

    let title = '';
    let body = '';
    let tags = '';

    if (theme === 'quick_delivery') {
      if (marketingTone === 'saudi_friendly') {
        title = '⚡ تبي حاوية الحين؟ حنا أسرع من البرق في الرياض!';
        body = 'عندك ترميم أو هدم ومستعجل على الحاوية؟ 🏗️\nسائقين المحترز جاهزين يوصلون لك في أقل من ساعتين لأي حي بالرياض.\n\n✨ حاويات نظيفة 20 ياردة\n✨ عقود رسمية موثقة\n✨ سداد كاش أو مدى فوري\n\n📲 كلمنا واتساب وفالك طيب: ' + phoneContact;
        tags = '#حاويات_الرياض #توصيل_سريع #ترميم_منازل #أنقاض_الرياض #المحترز_للحاويات';
      } else if (marketingTone === 'b2b_formal') {
        title = 'خدمات التوريد الفوري لحاويات الأنقاض بالرياض';
        body = 'تعلن شركة المحترز للحاويات عن جاهزية أسطولها لتوريد حاويات مخلفات البناء والترميم لجميع المواقع والمشاريع خلال ساعتين، مع إصدار عقود إلكترونية موثقة وسندات مالية رسمية.\n\nللحجز والتنسيق المباشر: ' + phoneContact;
        tags = '#مقاولات #مشاريع_الرياض #حاويات_أنقاض #بناء_وتشييد #المحترز';
      } else {
        title = '⚡ حاويتك واصلة لموقعك بأقل من ساعتين!';
        body = 'سرعة لا تضاهى في نقل ورفع مخلفات البناء والترميم بكافة أحياء الرياض. اطلب الآن واكسب الوقت!\n\nللتواصل الفوري: ' + phoneContact;
        tags = '#عروض_الرياض #حاويات_فورية #بناء #ترميم #المحترز';
      }
    } else if (theme === 'building_permits') {
      title = '🏛️ عقد رفع أنقاض إلكتروني موثق ومعتمد للبلدية';
      body = 'تبي تطلع رخصة بناء أو ترميم وتحتاج عقد حاوية معتمد؟ 📄\nنوفر لك عقد إلكتروني موثق مطابق لاشتراطات البلديات والأمانة مع كيوار تحقق رسمي وخدمة سريعة.\n\n📞 اطلب عقدك المعتمد فوراً: ' + phoneContact;
      tags = '#رخص_بناء #بلدية_الرياض #عقود_أنقاض #توثيق_إلكتروني #المحترز_للحاويات';
    } else if (theme === 'weekend_sale') {
      title = '🏷️ خصومات نهاية الأسبوع على حاويات الأنقاض!';
      body = 'عرض خاص بمناسبة الويكند! 🔥\nاستأجر حاوية 20 ياردة واستفد من أفضل سعر بالرياض مع التوصيل والسحب في الوقت المحدد.\n\nلا تفوت العرض وتواصل معنا الآن: ' + phoneContact;
      tags = '#عروض_الويكند #خصومات_الرياض #حاويات_أنقاض #تخفيضات #المحترز';
    } else if (theme === 'contractors_bulk') {
      title = '🏗️ شراكات استراتيجية وعقود سنوية لشركات المقاولات';
      body = 'نقدم لشركات المقاولات والتطوير العقاري حلولاً متكاملة لإدارة مخلفات البناء وتوفير أسطول حاويات بأسعار تفضيلية وعقود مرنة ودعم لوجستي على مدار الساعة.\n\nقسم الشركات والتعاقدات: ' + phoneContact;
      tags = '#شركات_المقاولات #مشاريع_السعودية #تطوير_عقاري #بنية_تحتية #المحترز_للحاويات';
    } else {
      title = '✨ المحترز للحاويات — خيارك الأول والموثوق بالرياض';
      body = 'خدمات تأجير ونقل حاويات الأنقاض والمخلفات بأعلى معايير الجودة والسرعة، وبأفضل الأسعار المنافسة.\n\nتواصل معنا: ' + phoneContact;
      tags = '#حاويات_الرياض #المحترز #نقل_أنقاض';
    }

    setPromoTitle(title);
    setPromoBody(body);
    setHashtags(tags);
    setIsGeneratingAI(false);

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  // One-Click Share Handlers
  const handleCopyText = () => {
    const fullContent = `${promoTitle}\n\n${promoBody}\n\n${hashtags}`;
    navigator.clipboard.writeText(fullContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  const handleDownloadFlyer = () => {
    if (!canvasImageUrl) return;
    const a = document.createElement('a');
    a.href = canvasImageUrl;
    a.download = `al-muhtaraz-promo-${Date.now()}.png`;
    a.click();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  const handleNativeShare = async () => {
    const fullContent = `${promoTitle}\n\n${promoBody}\n\n${hashtags}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: promoTitle,
          text: fullContent,
          url: 'https://almuhtaraz.com'
        });
      } catch (e) {}
    } else {
      handleCopyText();
    }
  };

  const handleOpenPlatformDirect = (platform: SocialPlatform) => {
    const fullContent = encodeURIComponent(`${promoTitle}\n\n${promoBody}\n\n${hashtags}`);
    let url = '';

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${fullContent}`;
        break;
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${fullContent}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://almuhtaraz.com')}&summary=${fullContent}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://almuhtaraz.com')}&quote=${fullContent}`;
        break;
      default:
        handleCopyText();
        alert(`تم نسخ نص الحملة بنجاح! يمكنك الآن لصقه ونشره في تطبيق ${platform}`);
        return;
    }

    if (url) {
      window.open(url, '_blank');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
  };

  // Webhook Simulator / Dispatcher
  const handleTestWebhookDispatch = async () => {
    if (!webhookUrl.trim()) {
      alert('يرجى كتابة رابط الـ Webhook الخاص بك (مثل Zapier أو Make أو Discord أو Buffer)');
      return;
    }

    setIsDispatchingWebhook(true);
    setWebhookStatus(null);

    try {
      const payload = {
        event: 'social_campaign_publish',
        platform: selectedPlatform,
        theme: selectedTheme,
        tone: marketingTone,
        title: promoTitle,
        content: promoBody,
        hashtags: hashtags.split(' '),
        contact: phoneContact,
        scheduled_for: scheduledTime,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setWebhookStatus({ ok: true, msg: '✓ تم إرسال حمولة المنشور إلى مسار الـ Webhook بنجاح!' });
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } else {
        setWebhookStatus({ ok: false, msg: `خطأ من خادم الـ Webhook (كود ${res.status})` });
      }
    } catch (err: any) {
      setWebhookStatus({ ok: false, msg: `تعذر الاتصال بالرابط: ${err.message || 'خطأ غير متوقع'}` });
    } finally {
      setIsDispatchingWebhook(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── 1. HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(168, 85, 247, 0.15) 50%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(236, 72, 153, 0.35)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 18px rgba(236, 72, 153, 0.45)'
            }}>
              <Share2 size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  منظومة الترويج والنشر على السوشيال ميديا 📢
                </h2>
                <span style={{
                  background: 'linear-gradient(135deg, #ec4899, #d946ef)',
                  color: '#ffffff',
                  borderRadius: '20px',
                  padding: '2px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}>
                  R&D AI Hub
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#cbd5e1', margin: '4px 0 0 0' }}>
                توليد منشورات تسويقية ذكية باللهجة السعودية، تصميم وتصدير بروشورات 4K، والنشر الفوري على كافة المنصات بضغطة زر واحدة.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleGenerateAIContent()}
              disabled={isGeneratingAI}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(236, 72, 153, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <Sparkles size={18} />
              <span>{isGeneratingAI ? 'جارٍ توليد الحملة...' : 'توليد حملة ذكية جديدة 🪄'}</span>
            </button>
          </div>
        </div>

        {/* Campaign Preset Chips */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
            <Flame size={15} color="#ec4899" />
            <span>نماذج الحملات الجاهزة:</span>
          </span>
          {CAMPAIGN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedTheme(preset.id);
                handleGenerateAIContent(preset.id);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                border: selectedTheme === preset.id ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedTheme === preset.id ? 'rgba(236, 72, 153, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                color: selectedTheme === preset.id ? '#f472b6' : '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. MAIN 2-COLUMN WORKSPACE (Editor & Live Previews) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* LEFT COLUMN: Content Editor & AI Tone Controls */}
        <div className="glass-panel" style={{
          padding: '22px',
          borderRadius: '18px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f472b6', fontWeight: 800, fontSize: '0.95rem' }}>
              <Bot size={20} />
              <span>محرر المحتوى التسويقي الذكي</span>
            </div>
            
            {/* Tone Selector */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'saudi_friendly', label: '🇸🇦 سعودي ودود' },
                { id: 'b2b_formal', label: '🏛️ شركات ورسمي' },
                { id: 'promo_urgent', label: '⚡ عروض سريعة' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setMarketingTone(t.id as MarketingTone);
                    handleGenerateAIContent();
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: marketingTone === t.id ? '#ec4899' : 'rgba(255, 255, 255, 0.08)',
                    color: marketingTone === t.id ? '#ffffff' : '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
              عنوان الحملة الرئيسي:
            </label>
            <input
              type="text"
              className="form-input"
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value)}
              placeholder="اكتب عنوان الحملة..."
              style={{ fontSize: '0.9rem', fontWeight: 700, borderColor: 'rgba(236, 72, 153, 0.3)' }}
            />
          </div>

          {/* Body Content */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
              نص المنشور والإعلان:
            </label>
            <textarea
              className="form-input"
              rows={6}
              value={promoBody}
              onChange={(e) => setPromoBody(e.target.value)}
              style={{ fontSize: '0.88rem', lineHeight: 1.6, resize: 'vertical' }}
            />
          </div>

          {/* Contact Phone & Hashtags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                رقم التواصل:
              </label>
              <input
                type="text"
                className="form-input"
                value={phoneContact}
                onChange={(e) => setPhoneContact(e.target.value)}
                style={{ fontSize: '0.85rem', direction: 'ltr', textAlign: 'right' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                الهاشتاقات المقترحة (#):
              </label>
              <input
                type="text"
                className="form-input"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                style={{ fontSize: '0.82rem', color: '#38bdf8' }}
              />
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={handleCopyText}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: copiedText ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                color: copiedText ? '#34d399' : '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {copiedText ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedText ? 'تم النسخ للحافظة ✓' : 'نسخ النص الكامل'}</span>
            </button>

            <button
              onClick={handleNativeShare}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)'
              }}
            >
              <Smartphone size={16} />
              <span>مشاركة سريعة عبر الجوال 📲</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Multi-Platform Visual Mockups */}
        <div className="glass-panel" style={{
          padding: '22px',
          borderRadius: '18px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          
          {/* Platform Tab Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
              معاينة حية للمنصة:
            </div>
            
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '300px' }}>
              {[
                { id: 'twitter', label: '𝕏 تويتر' },
                { id: 'whatsapp', label: '💬 واتساب' },
                { id: 'instagram', label: '📸 انستغرام' },
                { id: 'linkedin', label: '💼 لينكد إن' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id as SocialPlatform)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedPlatform === p.id ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 📱 Mockup Card Container */}
          <div style={{
            background: selectedPlatform === 'twitter' ? '#000000' : selectedPlatform === 'whatsapp' ? '#0b141a' : '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '16px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
          }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: selectedPlatform === 'twitter' ? '50%' : '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  color: '#050811'
                }}>
                  🏗️
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>المحترز للحاويات</span>
                    <span style={{ color: '#38bdf8', fontSize: '0.8rem' }}>✓</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    @almuhtaraz_sa • الآن
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenPlatformDirect(selectedPlatform)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ec4899',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>نشر مباشر</span>
                <ExternalLink size={12} />
              </button>
            </div>

            {/* Post Content */}
            <div style={{ fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#f1f5f9' }}>
              <div style={{ fontWeight: 800, color: '#fbbf24', marginBottom: '6px' }}>{promoTitle}</div>
              <div>{promoBody}</div>
              <div style={{ color: '#38bdf8', marginTop: '8px', fontSize: '0.8rem' }}>{hashtags}</div>
            </div>

            {/* Engagement Simulation Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageCircle size={15} /> <span>38</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Repeat size={15} /> <span>124</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f43f5e' }}><Heart size={15} /> <span>482</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bookmark size={15} /> <span>89</span></div>
            </div>

          </div>

          {/* 🖼️ AI Canvas 4K Flyer Section */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #f59e0b',
                background: '#0a0f1d'
              }}>
                {canvasImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={canvasImageUrl} alt="Promo Flyer Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                  بروشور إعلاني 4K مخصص للمنشور
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  تم إنشاؤه تلقائياً بجودة عالية جاهز للتحميل والإرفاق
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadFlyer}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#050811',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Download size={14} />
              <span>تحميل الصورة PNG</span>
            </button>
          </div>

        </div>

      </div>

      {/* ── 3. AUTOMATION & WEBHOOK DISPATCH PIPELINE (R&D TEST SUITE) ── */}
      <div className="glass-panel" style={{
        padding: '22px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(14, 165, 233, 0.2)',
              border: '1px solid rgba(14, 165, 233, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                مسار النشر الآلي عبر الـ Webhook (Zapier / Make / Buffer)
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                اختبر إرسال حمولة الحملة التسويقية لخدمات الجدولة والنشر الآلي السحابي
              </p>
            </div>
          </div>

          {/* Schedule Time Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>أفضل وقت للنشر:</span>
            <input
              type="time"
              className="form-input"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{ width: '110px', height: '34px', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="url"
            className="form-input"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/... أو رابط Webhook مخصص"
            style={{ fontSize: '0.85rem', direction: 'ltr', textAlign: 'left' }}
          />

          <button
            onClick={handleTestWebhookDispatch}
            disabled={isDispatchingWebhook}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
            }}
          >
            <Send size={15} />
            <span>{isDispatchingWebhook ? 'جارٍ الإرسال...' : 'اختبار الإرسال للـ Webhook'}</span>
          </button>
        </div>

        {webhookStatus && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: webhookStatus.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${webhookStatus.ok ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: webhookStatus.ok ? '#34d399' : '#f87171',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            {webhookStatus.msg}
          </div>
        )}
      </div>

      {/* Hidden Render Canvas for Flyer */}
      <canvas ref={flyerCanvasRef} style={{ display: 'none' }} />

    </div>
  );
};
