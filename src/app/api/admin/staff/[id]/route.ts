import { NextResponse } from 'next/server';
import { getAdminAuthorizedProfile } from '@/lib/archiveAuthorization';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store'
};

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorizationHeader = request.headers.get('authorization');
  const accessToken = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  let authorization: Awaited<ReturnType<typeof getAdminAuthorizedProfile>>;
  try {
    authorization = await getAdminAuthorizedProfile(accessToken);
  } catch (error) {
    console.error('Could not verify administrator session for password update:', error);
    return jsonResponse({ error: 'Could not verify the administrator session.' }, 500);
  }
  if (!authorization.ok) {
    return jsonResponse({ error: authorization.error }, authorization.status);
  }

  let body: { password?: unknown };
  try {
    body = await request.json() as { password?: unknown };
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 256) {
    return jsonResponse({ error: 'Password must contain between 8 and 256 characters.' }, 400);
  }

  const { id } = await params;
  let supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabaseAdmin = getSupabaseAdminClient();
  } catch (error) {
    console.error('Staff password management is not configured:', error);
    return jsonResponse({ error: 'Staff password management is not configured on the server.' }, 500);
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', id)
    .maybeSingle();
  if (profileError) {
    console.error('Could not load the target staff profile:', profileError);
    return jsonResponse({ error: 'Could not verify the target staff account.' }, 500);
  }
  if (!profile || profile.role === 'admin') {
    return jsonResponse({ error: 'Only existing employee accounts can be updated here.' }, 404);
  }

  try {
    const result = await supabaseAdmin.auth.admin.updateUserById(id, { password: body.password });
    if (result.error) {
      console.error('Could not update the staff password:', result.error);
      return jsonResponse({ error: 'Could not update the staff password.' }, 400);
    }
  } catch (error) {
    console.error('Supabase Auth request failed while updating a staff password:', error);
    return jsonResponse({ error: 'Could not update the staff password right now.' }, 502);
  }

  return jsonResponse({ success: true }, 200);
}
