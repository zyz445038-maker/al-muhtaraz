import { NextResponse } from 'next/server';
import { getAdminAuthorizedProfile } from '@/lib/archiveAuthorization';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { StaffPermissions } from '@/types/database';

interface CreateStaffRequest {
  full_name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  notes?: unknown;
  permissions?: unknown;
}

const requiredPermissionKeys: (keyof StaffPermissions)[] = [
  'can_view_all_contracts',
  'can_view_financials',
  'can_create_contracts',
  'can_extend_contracts',
  'can_collect_payments',
  'can_send_payment_links',
  'can_manage_inventory',
  'can_send_whatsapp'
];

function parseStaffPermissions(value: unknown): StaffPermissions | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const permissions = value as Record<string, unknown>;
  if (!requiredPermissionKeys.every(key => typeof permissions[key] === 'boolean')) return null;
  if (
    (permissions.can_manage_archive !== undefined && typeof permissions.can_manage_archive !== 'boolean')
    || (permissions.can_create_free_contracts !== undefined && typeof permissions.can_create_free_contracts !== 'boolean')
  ) {
    return null;
  }

  return {
    can_view_all_contracts: permissions.can_view_all_contracts === true,
    can_view_financials: permissions.can_view_financials === true,
    can_create_contracts: permissions.can_create_contracts === true,
    can_extend_contracts: permissions.can_extend_contracts === true,
    can_collect_payments: permissions.can_collect_payments === true,
    can_send_payment_links: permissions.can_send_payment_links === true,
    can_manage_inventory: permissions.can_manage_inventory === true,
    can_send_whatsapp: permissions.can_send_whatsapp === true,
    can_manage_archive: permissions.can_manage_archive === true,
    can_create_free_contracts: permissions.can_create_free_contracts === true
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store'
};

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

async function rollbackCreatedUser(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string
) {
  try {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error('Could not roll back an Auth user after profile creation failed:', error);
  } catch (error) {
    console.error('Could not roll back an Auth user after profile creation failed:', error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const authorizationHeader = request.headers.get('authorization');
  const accessToken = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  let authorization: Awaited<ReturnType<typeof getAdminAuthorizedProfile>>;
  try {
    authorization = await getAdminAuthorizedProfile(accessToken);
  } catch (error) {
    console.error('Could not verify administrator session for staff creation:', error);
    return jsonResponse({ error: 'Could not verify the administrator session.' }, 500);
  }
  if (!authorization.ok) {
    return jsonResponse({ error: authorization.error }, authorization.status);
  }

  let body: CreateStaffRequest;
  try {
    body = await request.json() as CreateStaffRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null;
  const permissions = parseStaffPermissions(body.permissions);

  if (
    !fullName || fullName.length > 120
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
    || password.length < 8 || password.length > 256 || phone.length > 32
  ) {
    return jsonResponse(
      { error: 'Enter a valid name, email, phone, and password with at least 8 characters.' },
      400
    );
  }
  if (!permissions) {
    return jsonResponse({ error: 'Invalid staff permissions.' }, 400);
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (error) {
    console.error('Staff account creation is not configured:', error);
    return jsonResponse({ error: 'Staff account creation is not configured on the server.' }, 500);
  }

  let createResult: Awaited<ReturnType<typeof admin.auth.admin.createUser>>;
  try {
    createResult = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role: 'employee' }
    });
  } catch (error) {
    console.error('Supabase Auth request failed while creating a staff user:', error);
    return jsonResponse({ error: 'Could not create the staff account right now.' }, 502);
  }
  const { data: createdUser, error: createUserError } = createResult;
  if (createUserError || !createdUser.user) {
    if (createUserError) console.error('Could not create the Supabase Auth user:', createUserError);
    const isDuplicate = createUserError?.message.toLowerCase().includes('already');
    return jsonResponse(
      { error: isDuplicate ? 'يوجد حساب مسجل بهذا البريد الإلكتروني.' : 'تعذر إنشاء حساب الموظف.' },
      isDuplicate ? 409 : 400
    );
  }

  const profile = {
    id: createdUser.user.id,
    full_name: fullName,
    email,
    phone,
    role: 'employee',
    is_active: true,
    can_view_all_records: permissions.can_view_all_contracts === true,
    permissions,
    notes
  };
  try {
    const { data: savedProfile, error: profileError } = await admin
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select('id, full_name, email, phone, role, is_active, can_view_all_records, permissions, notes, created_at, updated_at')
      .single();
    if (profileError) {
      await rollbackCreatedUser(admin, createdUser.user.id);
      console.error('Could not create the staff profile:', profileError);
      return jsonResponse(
        { error: 'The account was created but its staff profile could not be saved.' },
        500
      );
    }

    return jsonResponse({ profile: savedProfile }, 201);
  } catch (error) {
    await rollbackCreatedUser(admin, createdUser.user.id);
    console.error('Could not create the staff profile:', error);
    return jsonResponse(
      { error: 'The account was created but its staff profile could not be saved.' },
      500
    );
  }
}
