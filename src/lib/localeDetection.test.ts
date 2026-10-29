import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/locale';
import { initializeLocale, LOCALE_KEY, readLocale } from './i18n';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('IP-based default language endpoint', () => {
  it.each(['CN', 'US', 'GB', 'HK', 'MO', 'TW', 'XX', undefined, null, 123])('maps %s without returning IP metadata', async country => {
    const request = Object.assign(new Request('https://example.com/api/locale'), { cf: { country } });
    const response = onRequest({ request });
    expect(await response.json()).toEqual({ locale: country === 'CN' ? 'zh-CN' : 'en' });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('cloudflare-cdn-cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.has('set-cookie')).toBe(false);
  });
  it('ignores client-controlled headers and query strings', async () => {
    const request = new Request('https://example.com/api/locale?country=CN', { headers: { 'CF-IPCountry': 'CN', 'X-Forwarded-For': '1.2.3.4' } });
    expect(await onRequest({ request }).json()).toEqual({ locale: 'en' });
  });
});

describe('initial language selection', () => {
  function storage(saved: string | null = null) {
    const value = { getItem: vi.fn(() => saved), setItem: vi.fn() };
    vi.stubGlobal('localStorage', value);
    return value;
  }
  it.each(['zh-CN', 'en'])('preserves manual %s without requesting location', async saved => {
    storage(saved);
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await initializeLocale()).toBe(saved);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses the region for the current session without persisting it as a manual choice', async () => {
    const preferences = storage('invalid');
    const fetcher = vi.fn().mockResolvedValue(Response.json({ locale: 'zh-CN' }));
    vi.stubGlobal('fetch', fetcher);
    expect(await initializeLocale()).toBe('zh-CN');
    expect(readLocale()).toBe('zh-CN');
    expect(preferences.setItem).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledWith('/api/locale', expect.objectContaining({ credentials: 'omit', cache: 'no-store', mode: 'same-origin', redirect: 'error' }));
  });
  it('still detects the region when browser storage is blocked', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked'); } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ locale: 'zh-CN' })));
    expect(await initializeLocale()).toBe('zh-CN');
  });
  it.each([
    () => new Response('<html>SPA fallback</html>', { headers: { 'content-type': 'text/html' } }),
    () => Response.json({ locale: 'fr' }),
    () => Response.json(null),
    () => new Response('{broken', { headers: { 'content-type': 'application/json' } }),
    () => Response.json({ locale: 'zh-CN' }, { status: 503 }),
  ])('falls back to English for an unavailable or invalid endpoint', async makeResponse => {
    storage(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse()));
    expect(await initializeLocale()).toBe('en');
  });
  it('handles network errors without blocking startup', async () => {
    storage(); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await initializeLocale()).toBe('en');
  });
  it('bounds the entire lookup, including a stalled response body, and ignores late results', async () => {
    vi.useFakeTimers(); storage();
    let finish!: (value: unknown) => void;
    const body = new Promise(resolve => { finish = resolve; });
    const fetcher = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: () => body });
    vi.stubGlobal('fetch', fetcher);
    const initial = initializeLocale();
    await vi.advanceTimersByTimeAsync(1500);
    expect(await initial).toBe('en');
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    finish({ locale: 'zh-CN' });
    await Promise.resolve(); await Promise.resolve();
    expect(readLocale()).toBe('en');
  });
  it('does not overwrite a manual preference saved while lookup is pending', async () => {
    const preferences = storage();
    let finish!: (value: Response) => void;
    vi.stubGlobal('fetch', () => new Promise<Response>(resolve => { finish = resolve; }));
    const initial = initializeLocale();
    preferences.getItem.mockReturnValue('en');
    finish(Response.json({ locale: 'zh-CN' }));
    expect(await initial).toBe('en');
    expect(preferences.getItem).toHaveBeenCalledWith(LOCALE_KEY);
  });
});
