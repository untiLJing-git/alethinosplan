import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dayLabel, monthLabel } from './dates';
import { DEFAULT_LOCALE, LOCALE_KEY, readLocale, translate, translateMessage, weekdayLabels } from './i18n';
import { englishMessages } from './messages';
import type { MessageKey } from './messages';
import { seedTasks } from './tasks';

afterEach(() => vi.unstubAllGlobals());

describe('localization', () => {
  it('falls back to English when storage and regional information are unavailable', () => {
    for (const saved of [null, '', 'fr', 'en-US']) {
      vi.stubGlobal('localStorage', { getItem: () => saved });
      expect(readLocale()).toBe(DEFAULT_LOCALE);
    }
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked'); } });
    expect(readLocale()).toBe('en');
  });

  it('reads an explicit preference without depending on browser language', () => {
    const getItem = vi.fn(() => 'en');
    vi.stubGlobal('localStorage', { getItem });
    expect(readLocale()).toBe('en');
    expect(getItem).toHaveBeenCalledWith(LOCALE_KEY);
  });

  it('keeps placeholder names in sync across all translations', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    for (const [key, value] of Object.entries(englishMessages)) {
      for (const text of typeof value === 'string' ? [value] : [value.one, value.other]) {
        expect(text.trim(), key).not.toBe('');
        expect(text, key).not.toMatch(/\p{Script=Han}/u);
        expect(placeholders(text), key).toEqual(placeholders(key));
      }
    }
  });

  it('covers application errors from validation, authentication, and storage', () => {
    for (const file of ['errors.ts', 'supabase.ts', 'tasks.ts', '../hooks/useTasks.ts', '../hooks/useDesktopWindow.ts', '../hooks/ThemeProvider.tsx']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      for (const match of source.matchAll(/'([^'\n]*\p{Script=Han}[^'\n]*)'/gu)) {
        expect(Object.hasOwn(englishMessages, match[1]), `${file}: ${match[1]}`).toBe(true);
      }
    }
  });

  it('formats whole phrases and English singular/plural forms', () => {
    expect(translate('zh-CN', '{count} 项计划', { count: 1 })).toBe('1 项计划');
    expect(translate('en', '{count} 项计划', { count: 0 })).toBe('0 plans');
    expect(translate('en', '{count} 项计划', { count: 1 })).toBe('1 plan');
    expect(translate('en', '{count} 项计划', { count: 2 })).toBe('2 plans');
    expect(translate('en', '编辑：{title}', { title: '中文 {count} <idea>' })).toBe('Edit: 中文 {count} <idea>');
  });

  it('translates stored messages at render time without changing the source', () => {
    const key: MessageKey = '已完成';
    expect(translateMessage('en', key)).toBe('Completed');
    expect(translateMessage('zh-CN', key)).toBe('已完成');
    expect(translateMessage('en', null)).toBe('');
    expect(translateMessage('en', 'Unknown internal message')).toBe('Unknown internal message');
  });

  it('formats dates and Monday-first weekday labels in the selected locale', () => {
    expect(monthLabel('2026-10-20', 'en')).toBe('October 2026');
    expect(monthLabel('2026-10-20')).toBe('2026 年 10 月');
    expect(dayLabel('2026-10-20', true, 'en')).toContain('Tuesday');
    expect(dayLabel('2026-10-20', false, 'en')).toBe('Oct 20');
    expect(dayLabel('2026-10-20', true)).toContain('星期二');
    expect(weekdayLabels('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayLabels('zh-CN')).toEqual(['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
  });

  it('localizes only newly seeded demo titles, preserving IDs, dates, and task metadata', () => {
    const chinese = seedTasks('2026-10-20');
    const english = seedTasks('2026-10-20', 'en');
    expect(english[0].title).toBe('Write the introduction to my portfolio');
    for (const [index, task] of english.entries()) {
      expect(task.title).not.toMatch(/\p{Script=Han}/u);
      const { title: _title, createdAt: _createdAt, ...metadata } = task;
      expect(chinese[index]).toMatchObject(metadata);
    }
    expect(chinese[0].title).toBe('写好作品集的开场');
  });
});
