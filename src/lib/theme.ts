export const THEME_KEY = 'alethinosplan.theme.v1';
export const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
export type ThemePreference = typeof THEME_OPTIONS[number];
export type ResolvedTheme = 'light' | 'dark';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}
export function nextThemePreference(preference: ThemePreference): ThemePreference {
  return THEME_OPTIONS[(THEME_OPTIONS.indexOf(preference) + 1) % THEME_OPTIONS.length];
}
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === 'system' ? systemDark ? 'dark' : 'light' : preference;
}
export function readThemePreference(storage?: Pick<Storage, 'getItem'>): ThemePreference {
  try {
    const value = (storage ?? window.localStorage).getItem(THEME_KEY);
    return isThemePreference(value) ? value : 'system';
  } catch { return 'system'; }
}
export function applyTheme(preference: ThemePreference, systemDark: boolean) {
  const root = document.documentElement;
  const resolved = resolveTheme(preference, systemDark);
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;
}
