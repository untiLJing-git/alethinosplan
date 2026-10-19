import { useRef, useState } from 'react';
import { ArrowUpRight, Check, LoaderCircle, Plus, RotateCcw, Sun, X } from 'lucide-react';
import { dayLabel } from '../lib/dates';
import type { Task } from '../lib/types';

interface Props {
  today: string; tasks: Task[]; pending: Set<string>; loading: boolean; error: string;
  onCreate(title: string): Promise<boolean>; onComplete(task: Task): Promise<boolean>;
  onRestore(task: Task): Promise<boolean>; onReturn(): void; onClose(): void;
}

export function DesktopTasks({ today, tasks, pending, loading, error, onCreate, onComplete, onRestore, onReturn, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastDone, setLastDone] = useState<string | null>(null);
  const locked = useRef(false);
  const planned = tasks.filter(task => task.plannedDate === today && task.status === 'planned');
  const done = tasks.filter(task => task.plannedDate === today && task.status === 'done');
  const undoTask = done.find(task => task.id === lastDone);
  async function create() {
    if (!title.trim() || locked.current || loading) return;
    locked.current = true; setSaving(true);
    try { if (await onCreate(title.trim())) setTitle(''); }
    finally { locked.current = false; setSaving(false); }
  }
  return <main className="desktop-tasks">
    <header className="desktop-tasks-heading"><div><span className="eyebrow">A LITTLE PLAN.</span><h1><Sun size={19} />我的一天</h1><p>{dayLabel(today, true)}</p></div><div className="desktop-tasks-controls"><button type="button" className="icon-button" aria-label="回到主页面" title="回到主页面" onClick={onReturn}><ArrowUpRight size={18} /></button><button type="button" className="icon-button" aria-label="关闭置顶小窗" onClick={onClose}><X size={18} /></button></div></header>
    <div className="desktop-tasks-summary"><span>待完成 <strong>{planned.length}</strong></span><span>已完成 {done.length}</span></div>
    {error && <p className="desktop-tasks-error" role="alert">{error}</p>}
    {loading ? <p className="desktop-tasks-empty" role="status">正在打开计划…</p> : <ul className="desktop-tasks-list">{planned.map(task => <li key={task.id} className={`tone-${task.tone}`}><button type="button" className="desktop-task-check" aria-label={`完成：${task.title}`} disabled={pending.has(task.id)} onClick={() => { void onComplete(task).then(saved => { if (saved) setLastDone(task.id); }); }}>{pending.has(task.id) ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}</button><div><span>{task.title}</span>{task.estimate && <small>{task.estimate} 分钟</small>}</div></li>)}</ul>}
    {!loading && planned.length === 0 && <p className="desktop-tasks-empty">{done.length ? '今天的计划，完成了。' : '给今天留一件重要的事。'}</p>}
    {undoTask && <div className="desktop-tasks-undo" role="status"><span>已完成一件小事</span><button type="button" className="text-button" disabled={pending.has(undoTask.id)} onClick={() => { void onRestore(undoTask).then(saved => { if (saved) setLastDone(null); }); }}><RotateCcw size={13} />撤销</button></div>}
    <form className="desktop-tasks-add" onSubmit={event => { event.preventDefault(); void create(); }}><label className="desktop-tasks-label" htmlFor="desktop-task-title">添加今日任务</label><div><input id="desktop-task-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="再记下一件小事…" disabled={saving || loading} required /><button type="submit" className="button primary" aria-label="添加今日任务" disabled={saving || loading || !title.trim()}>{saving ? <LoaderCircle size={17} className="spin" /> : <Plus size={18} />}</button></div></form>
    <footer>与主页面同步 · 关闭主页面后小窗也会关闭</footer>
  </main>;
}
