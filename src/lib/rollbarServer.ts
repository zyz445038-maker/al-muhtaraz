import 'server-only';

import Rollbar from 'rollbar';

let rollbar: Rollbar | null = null;

export function getRollbarServer(): Rollbar | null {
  const accessToken = process.env.ROLLBAR_AL_MUHTARAZ_SERVER_TOKEN_1793805692;
  if (!accessToken) return null;

  rollbar ??= new Rollbar({
    accessToken,
    captureUncaught: false,
    captureUnhandledRejections: false,
    captureIp: false,
    captureEmail: false,
    captureUsername: false,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    scrubFields: ['password', 'token', 'authorization', 'api_key', 'apikey', 'secret'],
    scrubHeaders: ['Authorization', 'Cookie', 'Set-Cookie'],
    scrubRequestBody: true,
    scrubTelemetryInputs: true,
  });

  return rollbar;
}
