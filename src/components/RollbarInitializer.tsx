'use client';

import { useEffect } from 'react';
import { initializeClientErrorMonitoring } from '@/lib/rollbarClient';

export default function RollbarInitializer() {
  useEffect(() => {
    initializeClientErrorMonitoring();
  }, []);

  return null;
}
