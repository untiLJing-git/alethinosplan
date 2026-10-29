import { englishMessages } from './messages';
import type { MessageKey } from './messages';

export type Locale = 'zh-CN' | 'en';
export const LOCALE_KEY = 'alethinosplan.locale.v1';
export const DEFAULT_LOCALE: Locale = 'en';
let regionalLocale: Locale = DEFAULT_LOCALE;
export type MessageParams = Record<string, string | number>;

export function isLocale(value: unknown): value is Locale {
  return value === 'zh-CN' || value === 'en';
}

export function readSavedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    return isLocale(saved) ? saved : null;
  } catch { return null; }
}

export function readLocale(): Locale {
  return readSavedLocale() ?? regionalLocale;
}

// Resolve before mounting React so the first view and fresh demo data agree.
export async function initializeLocale(): Promise<Locale> {
  regionalLocale = DEFAULT_LOCALE;
  const saved = readSavedLocale();
  if (saved) return saved;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const detected = (async (): Promise<Locale> => {
    try {
      const response = await fetch('/api/locale', {
        signal: controller.signal, cache: 'no-store', credentials: 'omit',
        mode: 'same-origin', redirect: 'error',
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return DEFAULT_LOCALE;
      const data: unknown = await response.json();
      return data && typeof data === 'object' && 'locale' in data && isLocale(data.locale) ? data.locale : DEFAULT_LOCALE;
    } catch { return DEFAULT_LOCALE; }
  })();
  const timeout = new Promise<Locale>(resolve => {
    timer = setTimeout(() => { resolve(DEFAULT_LOCALE); controller.abort(); }, 1500);
  });
  try { regionalLocale = await Promise.race([detected, timeout]); }
  finally { clearTimeout(timer); }
  // Another tab may have saved a manual preference while the request was pending.
  return readLocale();
}

export function translate(locale: Locale, key: MessageKey, params: MessageParams = {}): string {
  const entry = englishMessages[key];
  const template = locale === 'zh-CN' ? key : typeof entry === 'string' ? entry : params.count === 1 ? entry.one : entry.other;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}

// Errors and notifications retain source keys in state, so existing messages switch too.
export function translateMessage(locale: Locale, value: string | null | undefined): string {
  if (!value) return '';
  return Object.prototype.hasOwnProperty.call(englishMessages, value) ? translate(locale, value as MessageKey) : value;
}

export function weekdayLabels(locale: Locale): string[] {
  return Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, 0, 5 + day))));
}
