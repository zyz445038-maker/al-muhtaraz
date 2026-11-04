'use client';

import Rollbar from 'rollbar';

const accessToken = process.env.NEXT_PUBLIC_ROLLBAR_AL_MUHTARAZ_CLIENT_TOKEN_1793805692;
let rollbar: Rollbar | null = null;

function getRollbarClient(): Rollbar | null {
  if (!accessToken) return null;

  rollbar ??= new Rollbar({
    accessToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
    captureDeviceInfo: false,
    captureEmail: false,
    captureIp: false,
    captureUsername: false,
    environment: process.env.NODE_ENV,
    scrubFields: ['password', 'token', 'authorization', 'api_key', 'apikey', 'secret'],
    scrubHeaders: ['Authorization', 'Cookie', 'Set-Cookie'],
    scrubRequestBody: true,
    scrubTelemetryInputs: true,
  });

  return rollbar;
}

export function initializeClientErrorMonitoring(): void {
  getRollbarClient();
}

export function reportClientError(error: Error): void {
  const client = getRollbarClient();
  if (!client) {
    console.error('Rollbar client token is not configured; browser error was not forwarded.', error);
    return;
  }

  client.error(error);
}
