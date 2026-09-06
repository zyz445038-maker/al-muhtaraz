import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ==========================================
// 1. تعريف واجهات فحص سلامة الروابط والخدمات
// ==========================================
interface ServiceStatus {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  latencyMs?: number;
  details?: string;
  isRequired: boolean;
}

interface SystemHealthReport {
  timestamp: string;
  overallStatus: 'ALL_SYSTEMS_GO' | 'SYSTEM_DEGRADED' | 'CRITICAL_FAILURE';
  services: ServiceStatus[];
}

// ==========================================
// 2. وظائف الفحص للخدمات الأساسية (Health Checks)
// ==========================================

// فحص قاعدة البيانات Supabase
async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      name: 'Supabase Database',
      status: 'FAILED',
      details: 'Missing environment variables (SUPABASE_URL / KEY)',
      isRequired: true,
    };
  }

  try {
    const supabase = createClient(url, key);
    const { error } = await supabase.from('_health_check_dummy').select('id').limit(1);
    const latency = Date.now() - start;

    // حتى لو لم يوجد الجدول، مجرد استجابة السيرفر تعني أن الرابط سليم
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      return {
        name: 'Supabase Database',
        status: 'DEGRADED',
        latencyMs: latency,
        details: `Connection OK but query returned: ${error.message}`,
        isRequired: true,
      };
    }

    return {
      name: 'Supabase Database',
      status: 'HEALTHY',
      latencyMs: latency,
      details: 'Database connection established successfully.',
      isRequired: true,
    };
  } catch (err: any) {
    return {
      name: 'Supabase Database',
      status: 'FAILED',
      details: `Critical Connection Error: ${err.message}`,
      isRequired: true,
    };
  }
}

// فحص خادم الواتساب المحتوي على server.ts
async function checkWhatsAppServer(): Promise<ServiceStatus> {
  const start = Date.now();
  const waUrl = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001/health';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // مهلة 3 ثوانٍ

    const res = await fetch(waUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    const latency = Date.now() - start;

    if (res.ok) {
      return {
        name: 'WhatsApp Server',
        status: 'HEALTHY',
        latencyMs: latency,
        details: 'WhatsApp server is active and responding.',
        isRequired: false, // خدمة فرعية لا توقف المشروع
      };
    } else {
      return {
        name: 'WhatsApp Server',
        status: 'DEGRADED',
        latencyMs: latency,
        details: `Server responded with status HTTP ${res.status}`,
        isRequired: false,
      };
    }
  } catch (err: any) {
    return {
      name: 'WhatsApp Server',
      status: 'FAILED',
      details: 'WhatsApp Server unreachable. Fallback mode recommended.',
      isRequired: false,
    };
  }
}

// فحص مفاتيح محرك الذكاء الاصطناعي (Gemini / GitHub Models)
async function checkAIEngine(): Promise<ServiceStatus> {
  const hasGithubToken = !!process.env.GITHUB_TOKEN;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;

  if (hasGithubToken || hasGeminiKey) {
    return {
      name: 'AI Engine (Gemini / GitHub)',
      status: 'HEALTHY',
      details: `API Keys configured (${hasGithubToken ? 'GitHub Models' : 'Gemini Key'}).`,
      isRequired: false,
    };
  }

  return {
    name: 'AI Engine (Gemini / GitHub)',
    status: 'FAILED',
    details: 'No API Keys found for AI processing. AI features will be disabled.',
    isRequired: false,
  };
}

// فحص وجود الملفات الحساسة والروابط في مشروع Next.js
function checkProjectFiles(): ServiceStatus {
  const criticalFiles = [
    'src/app/page.tsx',
    'package.json',
    '.env.local',
  ];

  const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(process.cwd(), file)));

  if (missingFiles.length === 0) {
    return {
      name: 'Project Structure',
      status: 'HEALTHY',
      details: 'All critical core files are present.',
      isRequired: true,
    };
  }

  return {
    name: 'Project Structure',
    status: 'FAILED',
    details: `Missing critical files: ${missingFiles.join(', ')}`,
    isRequired: true,
  };
}

// ==========================================
// 3. المحرك الرئيسي لتشغيل الفحص وتوليد التقرير
// ==========================================
async function runHealthCheck() {
  console.log('\n🔍 Running Link & Dependency Safety Check...\n');

  const services: ServiceStatus[] = [
    checkProjectFiles(),
    await checkSupabase(),
    await checkWhatsAppServer(),
    await checkAIEngine(),
  ];

  const hasCriticalFailure = services.some(s => s.isRequired && s.status === 'FAILED');
  const hasAnyFailure = services.some(s => s.status !== 'HEALTHY');

  let overallStatus: SystemHealthReport['overallStatus'] = 'ALL_SYSTEMS_GO';
  if (hasCriticalFailure) overallStatus = 'CRITICAL_FAILURE';
  else if (hasAnyFailure) overallStatus = 'SYSTEM_DEGRADED';

  const report: SystemHealthReport = {
    timestamp: new Date().toISOString(),
    overallStatus,
    services,
  };

  // طباعة النتيجة بشكل منسق في Terminal
  console.log('==================================================');
  console.log(`STATUS: [ ${report.overallStatus} ]`);
  console.log('==================================================');

  services.forEach(s => {
    const icon = s.status === 'HEALTHY' ? '✅' : s.status === 'DEGRADED' ? '⚠️' : '❌';
    console.log(`${icon} ${s.name}: ${s.status}`);
    if (s.latencyMs) console.log(`   Latency: ${s.latencyMs}ms`);
    console.log(`   Details: ${s.details}`);
    console.log('--------------------------------------------------');
  });

  // حفظ التقرير في ملف JSON ليستطيع المساعد الذكي قراءته ومراجعته
  fs.writeFileSync(
    path.join(process.cwd(), 'HEALTH_REPORT.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Report saved to HEALTH_REPORT.json for AI Agent review.\n');
}

runHealthCheck();
