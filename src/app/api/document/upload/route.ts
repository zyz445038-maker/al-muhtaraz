import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { DocumentRepository } from '@/services/archive/documents/documentRepository';
import { apiErrorResponse } from '@/lib/apiSafety';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// تأكد من وجود مجلد الأرشيف المحلي
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'archive_uploads');

async function ensureUploadDirExists() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // التحقق من الصلاحيات
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const hasPermission = profile?.permissions?.can_manage_archive ?? false;
    
    if (!isAdmin && !hasPermission) {
      return NextResponse.json({ success: false, error: 'Forbidden. You do not have permission to manage archive.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string || 'contract';
    const customerId = formData.get('customer_id') as string | null;
    const contractId = formData.get('contract_id') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // حفظ الملف محلياً
    await ensureUploadDirExists();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // توليد اسم فريد لتجنب التكرار
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const originalName = file.name;
    const ext = path.extname(originalName);
    const safeName = path.basename(originalName, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeName}-${uniqueSuffix}${ext}`;
    
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, buffer);

    // تسجيل المستند والوظيفة في قاعدة البيانات
    const repo = new DocumentRepository(supabase);
    
    // 1. إنشاء السجل في جدول documents
    const docResult = await repo.create({
      document_type: documentType,
      customer_id: customerId || undefined,
      contract_id: contractId || undefined,
      source_type: 'manual_upload',
      original_filename: originalName,
      created_by: user.id,
      status: 'active'
    });

    if (!docResult.ok || !docResult.data) {
      throw new Error(`Failed to create document record: ${docResult.error}`);
    }

    const documentId = docResult.data.id;

    // 2. إنشاء وظيفة الاستيراد للمعالجة (الذكاء الاصطناعي/OCR)
    const jobResult = await repo.registerImportJob({
      document_id: documentId,
      source_type: 'local_file',
      source_path: filePath,
      priority: 10 // أولوية متوسطة-عالية للرفع اليدوي
    });

    if (!jobResult.ok) {
      throw new Error(`Failed to create import job: ${jobResult.error}`);
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded and import job registered successfully.',
      document_id: documentId,
      job_id: jobResult.data?.id
    });

  } catch (error) {
    console.error('Upload Error:', error);
    const resp = apiErrorResponse('document.upload', error);
    return NextResponse.json({ ...(await resp.json()), success: false }, { status: resp.status });
  }
}
