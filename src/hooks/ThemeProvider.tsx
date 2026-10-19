import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { applyTheme, readThemePreference, resolveTheme, THEME_KEY } from '../lib/theme';
import type { ResolvedTheme, ThemePreference } from '../lib/theme';

interface ThemeState { preference: ThemePreference; resolved: ResolvedTheme; persistenceError: string; setPreference(preference: ThemePreference): void }
const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setValue] = useState<ThemePreference>(() => readThemePreference());
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [persistenceError, setPersistenceError] = useState('');
  useLayoutEffect(() => { applyTheme(preference, systemDark); }, [preference, systemDark]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => setSystemDark(media.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_KEY) return;
      setValue(readThemePreference()); setPersistenceError('');
    };
    onSystemChange();
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => { media.removeEventListener('change', onSystemChange); window.removeEventListener('storage', onStorage); };
  }, []);
  function setPreference(next: ThemePreference) {
    setValue(next);
    try { localStorage.setItem(THEME_KEY, next); setPersistenceError(''); }
    catch { setPersistenceError('当前页面已应用，浏览器未允许保存偏好。'); }
  }
  return <ThemeContext.Provider value={{ preference, resolved: resolveTheme(preference, systemDark), persistenceError, setPreference }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required.');
  return context;
}
