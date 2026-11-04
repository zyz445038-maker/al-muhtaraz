import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/archiveAuthorization';

type Authorization = Awaited<ReturnType<typeof getAuthenticatedProfile>>;
type AuthorizedProfile = Extract<Authorization, { ok: true }>;

export async function authorizeWhatsAppRequest(
  request: Request,
  requireAdmin = false
): Promise<AuthorizedProfile | NextResponse> {
  const authorizationHeader = request.headers.get('authorization') || '';
  const accessToken = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice(7).trim()
    : undefined;
  const result = await getAuthenticatedProfile(accessToken);

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }
  if (requireAdmin && result.profile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administrator permission is required.' }, { status: 403 });
  }

  return result;
}

export function isWhatsAppAuthorizationError(
  result: AuthorizedProfile | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
