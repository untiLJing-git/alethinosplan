import { useLocale } from '../hooks/LocaleProvider';
import { useEffect, useRef } from 'react';
import { Check, Pause, PictureInPicture2, Play, X } from 'lucide-react';
import { FocusClock } from './FocusClock';
import type { Task } from '../lib/types';

interface Props {
  task: Task; pending: boolean; running: boolean; elapsed: number;
  onToggle(): void; onClose(): void; onComplete(task: Task): void;
  onDock?: () => void; docking: boolean; dockError: string;
}

export function FocusDialog({ task, pending, running, elapsed, onToggle, onClose, onComplete, onDock, docking, dockError }: Props) {
  const { t, translateMessage } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className={'focus-dialog tone-' + task.tone} aria-labelledby="focus-title" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <button type="button" className="icon-button focus-close" aria-label={t("离开专注")} onClick={onClose} disabled={pending}><X size={20} /></button>
    <span className="eyebrow">JUST THIS ONE THING</span><h2 id="focus-title">{task.title}</h2>
    <FocusClock elapsed={elapsed} />
    <span className="focus-state">{running ? t('专注中') : t('已暂停')}</span>
    <div className="focus-controls"><button type="button" className="button" onClick={onToggle} disabled={pending}>{running ? <Pause size={17} /> : <Play size={17} />}{running ? t('暂停') : t('继续')}</button><button type="button" className="button primary" onClick={() => onComplete(task)} disabled={pending}><Check size={17} />{pending ? t('正在完成') : t('完成')}</button></div>
    {onDock && <button type="button" className="text-button focus-dock" onClick={onDock} disabled={pending || docking}><PictureInPicture2 size={15} />{t("在小窗中继续计时")}</button>}
    {dockError && <p className="form-error" role="alert">{translateMessage(dockError)}</p>}
  </dialog>;
}
