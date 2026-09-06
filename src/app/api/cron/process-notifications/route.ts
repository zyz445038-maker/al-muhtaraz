export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { insertNotificationLog, runDbQuery } from '@/lib/db';
import { logError, logEvent } from '@/lib/eventLogger';

export async function GET() {
  return handleProcess();
}

export async function POST() {
  return handleProcess();
}

async function handleProcess() {
  try {
    // 1. Fetch Gateway Settings
    let adminPhone = '+966500000001';
    let autoSendEnabled = true;

    try {
      const settingsResult = await runDbQuery<any>('cron.whatsapp-settings.read', () => supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1)
        .single());

      if (settingsResult.ok && settingsResult.data) {
        const settings = settingsResult.data;
        adminPhone = settings.admin_phone || adminPhone;
        autoSendEnabled = settings.auto_send_enabled ?? true;
      }
    } catch (err) {
      console.warn('Could not fetch settings for cron, using defaults');
    }

    // 2. Query contracts expiring in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const contractsResult = await runDbQuery<any[]>('cron.expiring-contracts.read', () => supabase
      .from('contracts')
      .select('*, customer:customers(*), container:containers(*)')
      .eq('status', 'active')
      .lte('end_date', tomorrow.toISOString())
      .gte('end_date', now.toISOString()));

    if (!contractsResult.ok) {
      throw new Error(contractsResult.error);
    }

    const processed = [];
    const contracts = contractsResult.data;

    if (contracts && contracts.length > 0) {
      for (const contract of contracts) {
        const customer = contract.customer;
        const daysLeft = Math.max(0, Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        
        // Build Reminder Message
        const customerMsg = `مرحباً ${customer?.name || 'عزيزنا العميل'} 👋\nنود تذكيركم بأن عقد الحاوية رقم (${contract.contract_number}) سينتهي خلال ${daysLeft} يوم.\nيرجى التواصل معنا لتجديد العقد أو جدولة سحب الحاوية.\n\nالمحترز للحاويات 🏗️`;

        // Send via internal WhatsApp route or log
        try {
          const logResult = await insertNotificationLog('cron.expiry-notification.queue', {
            contract_id: contract.id,
            customer_id: customer?.id,
            recipient_phone: customer?.phone || '',
            message_body: customerMsg,
            recipient_role: 'customer',
            notification_type: 'custom_alert',
            status: 'pending'
          });
          if (logResult.ok) {
            processed.push(contract.contract_number);
            logEvent('cron.expiry-notification.queued', { contractNumber: contract.contract_number });
          }
        } catch (error) {
          logError('cron.expiry-notification.queue', error, { contractNumber: contract.contract_number });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed_count: processed.length,
      contracts: processed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('cron.process-notifications', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Cron job failed' }, { status: 500 });
  }
}
