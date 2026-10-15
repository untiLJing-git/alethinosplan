import { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, X } from 'lucide-react';
import type { Task } from '../lib/types';

interface Props { task: Task; pending: boolean; onClose(): void; onComplete(task: Task): void }

export function FocusDialog({ task, pending, onClose, onComplete }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());
  const carried = useRef(0);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  useEffect(() => {
    if (!running) return;
    started.current = Date.now();
    const timer = setInterval(() => setElapsed(carried.current + Date.now() - started.current), 250);
    return () => clearInterval(timer);
  }, [running]);
  function toggle() {
    if (running) { carried.current += Date.now() - started.current; setElapsed(carried.current); }
    setRunning(value => !value);
  }
  const seconds = Math.floor(elapsed / 1000);
  return <dialog ref={dialog} className={`focus-dialog tone-${task.tone}`} aria-labelledby="focus-title" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <button type="button" className="icon-button focus-close" aria-label="离开专注" onClick={onClose} disabled={pending}><X size={20} /></button>
    <span className="eyebrow">JUST THIS ONE THING</span><h2 id="focus-title">{task.title}</h2>
    <div className="focus-clock" aria-label={`已专注 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`}><span>{String(Math.floor(seconds / 60)).padStart(2, '0')}</span><i>:</i><span>{String(seconds % 60).padStart(2, '0')}</span></div>
    <span className="focus-state">{running ? '专注中' : '已暂停'}</span>
    <div className="focus-controls"><button type="button" className="button" onClick={toggle} disabled={pending}>{running ? <Pause size={17} /> : <Play size={17} />}{running ? '暂停' : '继续'}</button><button type="button" className="button primary" onClick={() => onComplete(task)} disabled={pending}><Check size={17} />{pending ? '正在完成' : '完成'}</button></div>
  </dialog>;
}
