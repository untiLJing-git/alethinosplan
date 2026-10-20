import { Languages } from 'lucide-react';
import { useLocale } from '../hooks/LocaleProvider';

export function LanguageToggle() {
  const { locale, setLocale, persistenceError, t } = useLocale();
  return <div className="language-control">
    <div className="language-toggle" role="group" aria-label={t('切换语言')}>
      <Languages size={15} aria-hidden="true" />
      <button type="button" lang="zh-CN" aria-label="切换到中文" aria-pressed={locale === 'zh-CN'} onClick={() => setLocale('zh-CN')}><span>中文</span></button>
      <button type="button" lang="en" aria-label="Switch to English" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}><span>EN</span></button>
    </div>
    {persistenceError && <p className="language-save-note" role="status">{t('语言偏好未保存，本次切换仍然有效。')}</p>}
  </div>;
}
