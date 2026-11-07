import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { logError, logEvent } from '@/lib/eventLogger';
import { processPendingNotifications } from '@/lib/processPendingNotifications';
import { normalizeWhatsAppPhone, sendWhatsAppText } from '@/lib/whatsappTextSender';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type ContractReminder = {
  id: string;
  contract_number: string;
  end_date: string;
  location_address: string | null;
  created_by_employee: {
    id: string;
    full_name: string;
    phone: string | null;
    role: string;
  } | null;
  assigned_employee: {
    id: string;
    full_name: string;
    phone: string | null;
    role: string;
  } | null;
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  container: {
    container_number: string;
  } | null;
};

function isAuthorized(request: Request, secret: string): boolean {
  const authorization = request.headers.get('authorization') || '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  return handleProcess(request);
}

export async function POST(request: Request) {
  return handleProcess(request);
}

async function handleProcess(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET is not configured.' },
      { status: 503 }
    );
  }
  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const adminSupabase = getSupabaseAdminClient();
    const settingsResult = await adminSupabase
      .from('whatsapp_settings')
      .select('auto_send_enabled, notify_driver_on_alerts')
      .limit(1)
      .maybeSingle();

    if (settingsResult.error) throw settingsResult.error;

    const settings = settingsResult.data;
    const autoSendEnabled = settings?.auto_send_enabled === true;
    const adminProfileResult = await adminSupabase
      .from('profiles')
      .select('phone')
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (adminProfileResult.error) throw adminProfileResult.error;
    const adminPhone = adminProfileResult.data?.phone?.trim() || '';
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const warnings: string[] = [];

    const contractsResult = await adminSupabase
      .from('contracts')
      .select('id, contract_number, end_date, location_address, customer:customers(id, name, phone), container:containers(container_number), created_by_employee:profiles!contracts_created_by_employee_id_fkey(id, full_name, phone, role), assigned_employee:profiles!contracts_assigned_employee_id_fkey(id, full_name, phone, role)')
      .in('status', ['active', 'extended'])
      .lte('end_date', tomorrow.toISOString())
      .gte('end_date', now.toISOString());

    if (contractsResult.error) throw contractsResult.error;

    const contracts = (contractsResult.data || []) as unknown as ContractReminder[];
    let queuedCount = 0;

    if (contracts.length > 0) {
      const contractIds = contracts.map(contract => contract.id);
      const existingResult = await adminSupabase
        .from('notification_logs')
        .select('contract_id, recipient_role, recipient_phone, message_body')
        .in('contract_id', contractIds)
        .eq('notification_type', 'custom_alert')
        .gte('created_at', todayStart.toISOString());

      if (existingResult.error) throw existingResult.error;

      const existingReminders = existingResult.data || [];
      const remindersToQueue = [];
      const normalizedAdminPhone = adminPhone ? normalizeWhatsAppPhone(adminPhone) : '';
      const canNotifyAdmin = normalizedAdminPhone.length >= 8 && normalizedAdminPhone.length <= 15;

      for (const contract of contracts) {
        const customer = contract.customer;
        const customerPhone = customer?.phone || '';
        const creator = contract.created_by_employee?.role === 'employee'
          ? contract.created_by_employee
          : null;
        const driver = settings?.notify_driver_on_alerts === true
          ? contract.assigned_employee
          : null;
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(contract.end_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        );
        const containerNumber = contract.container?.container_number || '-';
        const customerName = customer?.name || 'عزيزنا العميل';
        const customerMessage = `تذكير آلي بانتهاء عقد الحاوية\nمرحباً ${customerName} 👋\nعقد الحاوية رقم (${contract.contract_number}) سينتهي خلال ${daysLeft} يوم. الحاوية: (${containerNumber}). يرجى التواصل معنا لتجديد العقد أو جدولة سحب الحاوية.\n\nالمحترز للحاويات 🏗️`;

        if (customer?.id && customerPhone && normalizeWhatsAppPhone(customerPhone).length >= 8) {
          const alreadyQueued = existingReminders.some(record =>
            record.contract_id === contract.id
            && record.recipient_role === 'customer'
            && record.message_body.startsWith('تذكير آلي بانتهاء عقد الحاوية')
          );
          if (!alreadyQueued) {
            remindersToQueue.push({
              contract_id: contract.id,
              customer_id: customer.id,
              recipient_role: 'customer' as const,
              recipient_phone: customerPhone,
              recipient_name: customerName,
              notification_type: 'custom_alert' as const,
              message_body: customerMessage,
              scheduled_for: now.toISOString(),
              status: 'pending' as const
            });
          }
        } else {
          warnings.push(`العقد ${contract.contract_number}: رقم جوال العميل غير صالح، لم يُنشأ تذكير له.`);
        }

        if (creator?.phone && normalizeWhatsAppPhone(creator.phone).length >= 8) {
          const alreadyQueued = existingReminders.some(record =>
            record.contract_id === contract.id
            && record.recipient_role === 'employee'
            && record.message_body.startsWith('تذكير لموظف منشئ العقد')
          );
          if (!alreadyQueued) {
            remindersToQueue.push({
              contract_id: contract.id,
              customer_id: customer?.id || null,
              recipient_role: 'employee' as const,
              recipient_phone: creator.phone,
              recipient_name: creator.full_name,
              notification_type: 'custom_alert' as const,
              message_body: `تذكير لموظف منشئ العقد: العقد (${contract.contract_number}) للعميل (${customer?.name || 'غير معروف'}) ينتهي خلال ${daysLeft} يوم. الحاوية: (${containerNumber}).`,
              scheduled_for: now.toISOString(),
              status: 'pending' as const
            });
          }
        } else if (contract.created_by_employee?.role === 'employee') {
          warnings.push(`العقد ${contract.contract_number}: رقم جوال الموظف منشئ العقد غير صالح، لم يُنشأ تذكير له.`);
        }

        if (driver?.phone && normalizeWhatsAppPhone(driver.phone).length >= 8) {
          const alreadyQueued = existingReminders.some(record =>
            record.contract_id === contract.id
            && record.recipient_role === 'employee'
            && record.message_body.startsWith('تنبيه للسائق المعيّن: عقد الحاوية')
          );
          if (!alreadyQueued) {
            remindersToQueue.push({
              contract_id: contract.id,
              customer_id: customer?.id || null,
              recipient_role: 'employee' as const,
              recipient_phone: driver.phone,
              recipient_name: driver.full_name,
              notification_type: 'custom_alert' as const,
              message_body: `تنبيه للسائق المعيّن: عقد الحاوية (${containerNumber}) رقم (${contract.contract_number}) للعميل (${customer?.name || 'غير معروف'}) ينتهي خلال ${daysLeft} يوم. موقع الحاوية: ${contract.location_address || 'غير محدد'}.`,
              scheduled_for: now.toISOString(),
              status: 'pending' as const
            });
          }
        } else if (settings?.notify_driver_on_alerts === true && contract.assigned_employee) {
          warnings.push(`العقد ${contract.contract_number}: رقم جوال السائق المعيّن غير صالح، لم يُنشأ تذكير له.`);
        }

        if (canNotifyAdmin) {
          const alreadyQueued = existingReminders.some(record =>
            record.contract_id === contract.id
            && record.recipient_role === 'admin'
            && record.message_body.startsWith('تنبيه إداري: عقد الحاوية')
          );
          if (!alreadyQueued) {
            remindersToQueue.push({
              contract_id: contract.id,
              customer_id: customer?.id || null,
              recipient_role: 'admin' as const,
              recipient_phone: adminPhone,
              recipient_name: 'الإدارة',
              notification_type: 'custom_alert' as const,
              message_body: `تنبيه إداري: عقد الحاوية (${containerNumber}) رقم (${contract.contract_number}) للعميل (${customerName}) ينتهي خلال ${daysLeft} يوم. موقع الحاوية: ${contract.location_address || 'غير محدد'}.`,
              scheduled_for: now.toISOString(),
              status: 'pending' as const
            });
          }
        } else {
          warnings.push('رقم جوال الإدارة غير مضبوط؛ لم تُنشأ تنبيهات إدارية.');
        }
      }

      if (remindersToQueue.length > 0) {
        const insertResult = await adminSupabase
          .from('notification_logs')
          .insert(remindersToQueue)
          .select('id');
        if (insertResult.error) throw insertResult.error;
        queuedCount = insertResult.data?.length || 0;
        if (queuedCount !== remindersToQueue.length) {
          throw new Error('لم تؤكد قاعدة البيانات إدراج جميع إشعارات انتهاء العقود.');
        }
      }
    }

    const pendingResult = await adminSupabase
      .from('notification_logs')
      .select('id, recipient_phone, recipient_name, recipient_role, contract_id, message_body')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(25);

    if (pendingResult.error) throw pendingResult.error;

    const batch = await processPendingNotifications(
      pendingResult.data || [],
      autoSendEnabled,
      async notification => sendWhatsAppText(
        notification.recipient_phone,
        notification.message_body,
        `notification:${notification.id}`
      ),
      async (id, values) => {
        const { data, error } = await adminSupabase
          .from('notification_logs')
          .update(values)
          .eq('id', id)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();

        if (error) return { error: error.message };
        if (!data) return { error: 'سجل الإشعار لم يعد pending أو لم يُعثر عليه.' };
        return {};
      }
    );

    if (batch.errors.length > 0) {
      for (const message of batch.errors) {
        logError('cron.notification.delivery', new Error(message));
      }
    }

    logEvent('cron.notifications.processed', {
      queuedCount,
      sentCount: batch.sent_count,
      failedCount: batch.failed_count,
      pendingCount: batch.pending_count,
      skippedCount: batch.skipped_count,
      autoSendEnabled
    });

    return NextResponse.json({
      success: batch.errors.length === 0,
      auto_send_enabled: autoSendEnabled,
      queued_count: queuedCount,
      due_count: pendingResult.data?.length || 0,
      sent_count: batch.sent_count,
      failed_count: batch.failed_count,
      pending_count: batch.pending_count,
      skipped_count: batch.skipped_count,
      warnings,
      errors: batch.errors,
      timestamp: new Date().toISOString()
    }, { status: batch.errors.length > 0 ? 500 : 200 });
  } catch (error) {
    logError('cron.process-notifications', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cron job failed'
    }, { status: 500 });
  }
}
