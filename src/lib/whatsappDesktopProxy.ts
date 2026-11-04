import { NextResponse } from 'next/server';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

export async function proxyWhatsAppDesktopRequest(
  request: Request,
  apiPath: string
): Promise<NextResponse | null> {
  const requestUrl = new URL(request.url);
  if (!LOOPBACK_HOSTS.has(requestUrl.hostname)) return null;

  const configuredBaseUrl = process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return null;
  }

  let destination: URL;
  try {
    destination = new URL(apiPath, `${configuredBaseUrl.replace(/\/+$/, '')}/`);
  } catch {
    return NextResponse.json(
      { success: false, error: 'عنوان خادم التطبيق المنشور غير صالح.' },
      { status: 503 }
    );
  }
  if (destination.protocol !== 'https:') {
    return NextResponse.json(
      { success: false, error: 'يجب أن يستخدم خادم التطبيق المنشور اتصال HTTPS.' },
      { status: 503 }
    );
  }

  destination.search = requestUrl.search;
  const headers = new Headers({ Accept: 'application/json' });
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('Authorization', authorization);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);

  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  if (hasBody) headers.set('Content-Type', request.headers.get('content-type') || 'application/json');

  try {
    const response = await fetch(destination, {
      method,
      headers,
      ...(hasBody ? { body: await request.arrayBuffer() } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000)
    });
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8'
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Desktop WhatsApp API proxy failed:', error);
    return NextResponse.json(
      { success: false, error: 'تعذر الاتصال بخلفية التطبيق المنشورة. تحقق من اتصال الإنترنت وحاول مجدداً.' },
      { status: 502 }
    );
  }
}
