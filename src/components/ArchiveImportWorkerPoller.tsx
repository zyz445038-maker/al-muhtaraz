'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const WORKER_INTERVAL_MS = 30_000;

export function ArchiveImportWorkerPoller() {
  useEffect(() => {
    if (!navigator.userAgent.toLowerCase().includes('electron/')) return;

    let active = true;
    let running = false;

    const processQueue = async () => {
      if (running) return;
      running = true;
      try {
        const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData.session?.user;
        if (!user) return;

        const { data: profile, error: profileError } = await supabaseBrowser
          .from('profiles')
          .select('role, is_active, permissions')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        const permissions: unknown = profile?.permissions;
        const canManageArchive = typeof permissions === 'object'
          && permissions !== null
          && 'can_manage_archive' in permissions
          && permissions.can_manage_archive === true;
        if (!profile?.is_active || (profile.role !== 'admin' && !canManageArchive)) return;

        const response = await fetch('/api/cron/process-archive-imports', { method: 'POST' });
        if (!response.ok) {
          throw new Error(`Local archive worker returned HTTP ${response.status}.`);
        }
      } catch (error) {
        console.error('Could not poll the local archive import queue:', error);
      } finally {
        running = false;
      }
    };

    void processQueue();
    const interval = window.setInterval(() => {
      if (active) void processQueue();
    }, WORKER_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
