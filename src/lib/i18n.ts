import { englishMessages } from './messages';
import type { MessageKey } from './messages';

export type Locale = 'zh-CN' | 'en';
export const LOCALE_KEY = 'alethinosplan.locale.v1';
export const DEFAULT_LOCALE: Locale = 'zh-CN';
export type MessageParams = Record<string, string | number>;

export function isLocale(value: unknown): value is Locale {
  return value === 'zh-CN' || value === 'en';
}

export function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    return isLocale(saved) ? saved : DEFAULT_LOCALE;
  } catch { return DEFAULT_LOCALE; }
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
