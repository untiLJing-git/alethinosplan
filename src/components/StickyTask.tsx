import { useLocale } from '../hooks/LocaleProvider';
import { useEffect, useRef } from 'react';
import { Check, Clock3, MoreHorizontal, Play } from 'lucide-react';
import type { Task } from '../lib/types';

interface Props {
  task: Task; tearing: boolean; pending: boolean;
  onComplete(task: Task): void; onEdit(task: Task): void; onFocus(task: Task): void;
  onTearEnd(id: string): void;
}

export function StickyTask({ task, tearing, pending, onComplete, onEdit, onFocus, onTearEnd }: Props) {
  const { t } = useLocale();
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tearing || !sheet.current) return;
    const element = sheet.current;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => onTearEnd(task.id);
    const animationFinished = (event: AnimationEvent) => {
      if (event.target === element && event.animationName === 'tear-away') finish();
    };
    const preferenceChanged = () => { if (motionPreference.matches) finish(); };
    element.addEventListener('animationend', animationFinished);
    element.addEventListener('animationcancel', animationFinished);
    motionPreference.addEventListener('change', preferenceChanged);
    const style = getComputedStyle(element);
    if (motionPreference.matches || style.animationName === 'none' || parseFloat(style.animationDuration) === 0) finish();
    return () => {
      element.removeEventListener('animationend', animationFinished);
      element.removeEventListener('animationcancel', animationFinished);
      motionPreference.removeEventListener('change', preferenceChanged);
      finish();
    };
  }, [task.id, tearing, onTearEnd]);
  return <article className={`sticky-note tone-${task.tone} ${tearing ? 'is-tearing' : ''}`} data-testid="sticky-task" data-task-id={task.id} aria-busy={pending}>
    <span className="paper-tape" aria-hidden="true" />
    <div className="paper-stub" aria-hidden="true"><Check size={15} /></div>
    <div ref={sheet} className="paper-sheet">
      <div className="sticky-top"><span className="sticky-kicker">TODAY</span><button className="complete-button" type="button" onClick={() => onComplete(task)} disabled={pending} aria-label={t('完成：{title}', { title: task.title })}><Check size={18} strokeWidth={2} aria-hidden="true" /></button></div>
      <button className="sticky-title" type="button" onClick={() => onEdit(task)} disabled={pending}>{task.title}</button>
      <div className="sticky-bottom"><span className="sticky-estimate"><Clock3 size={13} />{task.estimate ? t('{count} 分钟', { count: task.estimate }) : t('时长待定')}</span><div className="sticky-actions"><button type="button" onClick={() => onFocus(task)} disabled={pending} className="sticky-start"><Play size={12} fill="currentColor" />{t("开始")}</button><button className="icon-button" type="button" onClick={() => onEdit(task)} disabled={pending} aria-label={t('编辑：{title}', { title: task.title })}><MoreHorizontal size={18} /></button></div></div>
    </div>
  </article>;
}
