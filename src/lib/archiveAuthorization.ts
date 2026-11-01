import { getSupabaseServerClient } from '@/lib/supabaseServer';

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
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_active, permissions')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error(`Could not load the authenticated user's profile: ${profileError.message}`);
  }
  if (!profile || !profile.is_active) {
    return { ok: false, status: 403, error: 'An active staff profile is required.' };
  }

  return {
    ok: true,
    supabase,
    user: { id: user.id },
    profile: profile as AuthenticatedProfile,
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
