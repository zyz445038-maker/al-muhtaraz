import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getLocalArchiveDatabase, isLocalArchiveEnabled } from '@/services/archive/storage/localArchiveDatabase';

type ServerSupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export interface AuthenticatedProfile {
  id: string;
  role: string;
  is_active: boolean;
  permissions: Record<string, boolean> | null;
}

export type AuthorizationResult =
  | {
      ok: true;
      supabase: ServerSupabaseClient;
      user: { id: string };
      profile: AuthenticatedProfile;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    };

export async function getAuthenticatedProfile(accessToken?: string): Promise<AuthorizationResult> {
  const supabase = await getSupabaseServerClient(accessToken);
  let user: { id: string } | null = null;
  let authError: { status?: number; message?: string } | null = null;
  try {
    const result = await supabase.auth.getUser(accessToken);
    user = result.data.user;
    authError = result.error;
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    return getOfflineAuthorization(supabase);
  }
  if (authError || !user) {
    if (authError && isNetworkFailure(authError)) {
      return getOfflineAuthorization(supabase);
    }
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_active, permissions')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    if (isNetworkFailure(profileError)) return getOfflineAuthorization(supabase);
    throw new Error(`Could not load the authenticated user's profile: ${profileError.message}`);
  }
  if (!profile || !profile.is_active) {
    return { ok: false, status: 403, error: 'An active staff profile is required.' };
  }

  if (isLocalArchiveEnabled()) {
    const cached = getLocalArchiveDatabase().cacheProfile(profile as AuthenticatedProfile);
    if (!cached.ok) {
      throw new Error(cached.error || 'Could not cache local archive authorization.');
    }
  }

  return {
    ok: true,
    supabase,
    user: { id: user.id },
    profile: profile as AuthenticatedProfile,
  };
}

function isNetworkFailure(error: unknown): boolean {
  const details = error && typeof error === 'object'
    ? error as { name?: unknown; message?: unknown; status?: unknown; code?: unknown }
    : undefined;
  if (typeof details?.status === 'number' && details.status > 0) return false;
  const description = `${String(details?.name || '')} ${String(details?.message || error)} ${String(details?.code || '')}`;
  return /network|fetch|timeout|offline|ECONN|ENETUNREACH|EAI_AGAIN/i.test(description);
}

async function getOfflineAuthorization(
  supabase: ServerSupabaseClient,
): Promise<AuthorizationResult> {
  if (!isLocalArchiveEnabled()) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  const cached = getLocalArchiveDatabase().getCachedProfile(session.user.id);
  if (!cached.ok) {
    throw new Error(cached.error || 'Could not load cached offline authorization.');
  }
  if (!cached.data || !cached.data.is_active) {
    return { ok: false, status: 401, error: 'Offline archive access is unavailable. Connect to the internet and sign in again.' };
  }

  return {
    ok: true,
    supabase,
    user: { id: session.user.id },
    profile: {
      id: cached.data.id,
      role: cached.data.role,
      is_active: cached.data.is_active,
      permissions: cached.data.permissions,
    },
  };
}

export function hasArchiveAccess(profile: AuthenticatedProfile): boolean {
  return profile.is_active
    && (profile.role === 'admin' || profile.permissions?.can_manage_archive === true);
}

export async function getArchiveAuthorizedProfile(): Promise<AuthorizationResult> {
  const result = await getAuthenticatedProfile();
  if (!result.ok || hasArchiveAccess(result.profile)) {
    return result;
  }
  return { ok: false, status: 403, error: 'Archive permission is required.' };
}

export async function getAdminAuthorizedProfile(accessToken?: string): Promise<AuthorizationResult> {
  const result = await getAuthenticatedProfile(accessToken);
  if (!result.ok || result.profile.role === 'admin') {
    return result;
  }
  return { ok: false, status: 403, error: 'Administrator permission is required.' };
}
