import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isLocale, LOCALE_KEY, readLocale, translate, translateMessage } from '../lib/i18n';
import type { Locale, MessageParams } from '../lib/i18n';
import type { MessageKey } from '../lib/messages';

interface LocaleState {
  locale: Locale;
  setLocale(locale: Locale): void;
  persistenceError: boolean;
  t(key: MessageKey, params?: MessageParams): string;
  translateMessage(value: string | null | undefined): string;
}
const LocaleContext = createContext<LocaleState | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setValue] = useState<Locale>(readLocale);
  const [persistenceError, setPersistenceError] = useState(false);
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `alēthinósplan — ${translate(locale, '记录、安排，然后一件件完成。')}`);
  }, [locale]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== LOCALE_KEY) return;
      setValue(readLocale());
      setPersistenceError(false);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setValue(next);
    try { localStorage.setItem(LOCALE_KEY, next); setPersistenceError(false); }
    catch { setPersistenceError(true); }
  }, []);
  const value = useMemo<LocaleState>(() => ({
    locale, setLocale, persistenceError,
    t: (key, params) => translate(locale, key, params),
    translateMessage: message => translateMessage(locale, message),
  }), [locale, setLocale, persistenceError]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('LocaleProvider is required.');
  return context;
}
