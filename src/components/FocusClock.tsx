import { useLocale } from '../hooks/LocaleProvider';
export function FocusClock({ elapsed }: { elapsed: number }) {
  const { t } = useLocale();
  const seconds = Math.floor(elapsed / 1000);
  return <div className="focus-clock" role="timer" aria-live="off" aria-label={t('已专注 {minutes} 分 {seconds} 秒', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })}><span>{String(Math.floor(seconds / 60)).padStart(2, '0')}</span><i>:</i><span>{String(seconds % 60).padStart(2, '0')}</span></div>;
}
