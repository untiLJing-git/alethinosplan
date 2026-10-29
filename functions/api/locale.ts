interface GeoRequest extends Request {
  cf?: { country?: unknown };
}

export function onRequest({ request }: { request: GeoRequest }): Response {
  // Only Cloudflare's trusted IP metadata is used, never a client-supplied header.
  const locale = request.cf?.country === 'CN' ? 'zh-CN' : 'en';
  return Response.json({ locale }, { headers: {
    'Cache-Control': 'private, no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  } });
}
