import { useLocale } from '../hooks/LocaleProvider';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/ThemeProvider';
import { nextThemePreference } from '../lib/theme';

const icons = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { t, translateMessage } = useLocale();
  const labels = { light: t('浅色'), dark: t('深色'), system: t('跟随系统') };
  const theme = useTheme();
  const next = nextThemePreference(theme.preference);
  const Icon = icons[theme.preference];
  const description = t('切换主题：当前{current}，点击切换为{next}', { current: labels[theme.preference], next: labels[next] });
  return <div className="theme-switcher">
    <button type="button" className="theme-toggle" data-theme-mode={theme.preference} aria-label={description} title={description} onClick={() => theme.setPreference(next)}><Icon size={17} aria-hidden="true" /><span>{labels[theme.preference]}</span></button>
    {theme.persistenceError && <p className="theme-save-note" role="status">{translateMessage(theme.persistenceError)}</p>}
  </div>;
}
