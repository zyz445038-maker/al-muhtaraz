import type { Instrumentation } from 'next';
import { getRollbarServer } from '@/lib/rollbarServer';

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const rollbar = getRollbarServer();
  if (!rollbar) {
    console.error('Rollbar server token is not configured; request error was not forwarded.', error);
    return;
  }

  const reportedError = error instanceof Error ? error : new Error(String(error));
  rollbar.error(reportedError, {
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    method: request.method,
    path: request.path.split('?')[0],
  });
};
