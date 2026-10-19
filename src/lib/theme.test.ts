import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { isThemePreference, nextThemePreference, readThemePreference, resolveTheme, THEME_KEY } from './theme';

describe('theme preferences', () => {
  it('accepts only the three supported preferences', () => {
    for (const value of ['light', 'dark', 'system']) expect(isThemePreference(value)).toBe(true);
    for (const value of [null, undefined, '', 'auto', 'LIGHT', {}]) expect(isThemePreference(value)).toBe(false);
  });
  it('cycles light, dark, system without opening a selector', () => {
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
    expect(nextThemePreference('system')).toBe('light');
  });
  it('manual themes override the system while system mode follows it', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
  it('reads valid storage and safely falls back for invalid or blocked storage', () => {
    expect(readThemePreference({ getItem: key => key === THEME_KEY ? 'dark' : null })).toBe('dark');
    expect(readThemePreference({ getItem: () => 'invalid' })).toBe('system');
    expect(readThemePreference({ getItem: () => { throw new Error('Blocked'); } })).toBe('system');
  });
  it('the pre-paint bootstrap agrees with the application theme contract', () => {
    const source = readFileSync('public/theme-init.js', 'utf8');
    for (const saved of ['light', 'dark', 'system', 'bad', null]) {
      for (const systemDark of [true, false]) {
        const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
        runInNewContext(source, { document: { documentElement: root }, localStorage: { getItem: (key: string) => key === THEME_KEY ? saved : null }, matchMedia: () => ({ matches: systemDark }) });
        const preference = isThemePreference(saved) ? saved : 'system';
        expect(root.dataset.theme).toBe(resolveTheme(preference, systemDark));
        expect(root.dataset.themePreference).toBe(preference);
        expect(root.style.colorScheme).toBe(root.dataset.theme);
      }
    }
    const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
    runInNewContext(source, { document: { documentElement: root }, localStorage: { getItem: () => { throw new Error('Blocked'); } }, matchMedia: () => ({ matches: true }) });
    expect(root.dataset.theme).toBe('dark');
  });
});
