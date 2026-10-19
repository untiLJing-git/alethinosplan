import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { ArrowUpRight, Check, Info, LoaderCircle, Plus, RotateCcw, Sun, X } from 'lucide-react';
import { DesktopContextMenu } from './DesktopContextMenu';
import type { DesktopMenuAction, DesktopMenuState } from './DesktopContextMenu';
import { dayLabel } from '../lib/dates';
import type { Task } from '../lib/types';

interface Props {
  today: string; tasks: Task[]; pending: Set<string>; loading: boolean; error: string;
  onCreate(title: string): Promise<boolean>; onComplete(task: Task): Promise<boolean>;
  onRestore(task: Task): Promise<boolean>; onReturn(): void; onClose(): void;
}
type TaskView = 'planned' | 'done';

export function DesktopTasks({ today, tasks, pending, loading, error, onCreate, onComplete, onRestore, onReturn, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<TaskView>('planned');
  const [showHelp, setShowHelp] = useState(false);
  const locked = useRef(false);
  const root = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<DesktopMenuState | null>(null);
  const planned = tasks.filter(task => task.plannedDate === today && task.status === 'planned');
  const done = tasks.filter(task => task.plannedDate === today && task.status === 'done')
    .sort((a, b) => (Date.parse(b.completedAt || '') || 0) - (Date.parse(a.completedAt || '') || 0));
  const visible = view === 'planned' ? planned : done;
  // The shared task list is authoritative, regardless of which window completed a task.
  const undoTask = done[0];
  const updating = loading || saving || pending.size > 0;

  function preserveNative(target: Element) {
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]') || target.ownerDocument.getSelection()?.toString().trim());
  }
  function showMenu(target: Element, x: number, y: number) {
    const anchor = target.closest<HTMLElement>('button, [tabindex]') || root.current!;
    const taskId = target.closest<HTMLElement>('[data-desktop-task]')?.dataset.desktopTask;
    setMenu({ x, y, anchor, taskId });
  }
  function contextMenu(event: MouseEvent<HTMLElement>) {
    const target = event.target as Element;
    if (event.shiftKey || preserveNative(target)) { setMenu(null); return; }
    event.preventDefault();
    const box = target.getBoundingClientRect();
    showMenu(target, event.clientX || box.left + 8, event.clientY || box.bottom);
  }
  function menuKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    const target = event.target as Element;
    if (preserveNative(target)) return;
    event.preventDefault();
    const box = target.getBoundingClientRect();
    showMenu(target, box.left + 8, box.bottom);
  }
  function dismissMenu(restoreFocus = false) {
    if (restoreFocus && menu?.anchor.isConnected) menu.anchor.focus({ preventScroll: true });
    setMenu(null);
  }
  const contextTask = menu?.taskId ? tasks.find(task => task.id === menu.taskId) : undefined;
  const menuActions: DesktopMenuAction[] = [
    ...(contextTask ? [{ label: contextTask.status === 'done' ? '恢复到待完成' : '标记完成', icon: contextTask.status === 'done' ? <RotateCcw size={15} /> : <Check size={15} />, disabled: pending.has(contextTask.id) || loading, action: () => { void (contextTask.status === 'done' ? onRestore(contextTask) : onComplete(contextTask)); } }] : []),
    { label: '查看待完成', icon: <Sun size={15} />, action: () => setView('planned') },
    { label: '查看已完成', icon: <Check size={15} />, action: () => setView('done') },
    { label: '添加今日任务', icon: <Plus size={15} />, disabled: loading || saving, action: () => { setView('planned'); input.current?.focus(); } },
    { label: '回到主页面', icon: <ArrowUpRight size={15} />, action: onReturn },
    { label: '关闭小窗', icon: <X size={15} />, action: onClose },
  ];

  function switchTab(event: KeyboardEvent<HTMLDivElement>) {
    let next: TaskView;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = view === 'planned' ? 'done' : 'planned';
    else if (event.key === 'Home') next = 'planned';
    else if (event.key === 'End') next = 'done';
    else return;
    event.preventDefault(); setView(next);
    event.currentTarget.querySelector<HTMLButtonElement>('[data-view="' + next + '"]')?.focus();
  }
  async function create() {
    if (!title.trim() || locked.current || loading) return;
    locked.current = true; setSaving(true);
    try { if (await onCreate(title.trim())) { setTitle(''); setView('planned'); } }
    finally { locked.current = false; setSaving(false); }
  }
  return <main className="desktop-tasks" ref={root} tabIndex={-1} onContextMenu={contextMenu} onKeyDown={menuKey}>
    <header className="desktop-tasks-heading"><div><span className="eyebrow">A LITTLE PLAN.</span><h1><Sun size={19} />我的一天</h1><p>{dayLabel(today, true)}</p></div><div className="desktop-tasks-controls"><button type="button" className="icon-button" aria-label="回到主页面" title="回到主页面" onClick={onReturn}><ArrowUpRight size={18} /></button><button type="button" className="icon-button" aria-label="关闭置顶小窗" onClick={onClose}><X size={18} /></button></div></header>
    <div className="desktop-tasks-tabs" role="tablist" aria-label="今日任务状态" onKeyDown={switchTab}>
      <button type="button" role="tab" id="desktop-planned-tab" data-view="planned" aria-selected={view === 'planned'} aria-controls="desktop-task-panel" tabIndex={view === 'planned' ? 0 : -1} onClick={() => setView('planned')}>待完成 <span>{planned.length}</span></button>
      <button type="button" role="tab" id="desktop-done-tab" data-view="done" aria-selected={view === 'done'} aria-controls="desktop-task-panel" tabIndex={view === 'done' ? 0 : -1} onClick={() => setView('done')}>已完成 <span>{done.length}</span></button>
    </div>
    {error && <p className="desktop-tasks-error" role="alert">{error}</p>}
    <section id="desktop-task-panel" role="tabpanel" aria-labelledby={view === 'planned' ? 'desktop-planned-tab' : 'desktop-done-tab'} tabIndex={0} aria-busy={loading}>
      {loading ? <p className="desktop-tasks-empty" role="status">正在打开计划…</p> : <ul className="desktop-tasks-list">{visible.map(task => <li key={task.id} data-desktop-task={task.id} className={'tone-' + task.tone + (view === 'done' ? ' is-done' : '')}>
        {view === 'planned' ? <button type="button" className="desktop-task-check" aria-label={'完成：' + task.title} disabled={pending.has(task.id)} onClick={() => { void onComplete(task); }}>{pending.has(task.id) ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}</button> : <Check className="desktop-task-done" size={17} aria-hidden="true" />}
        <div><span>{task.title}</span>{view === 'planned' && task.estimate && <small>{task.estimate} 分钟</small>}</div>
        {view === 'done' && <button type="button" className="icon-button desktop-task-restore" aria-label={'恢复：' + task.title} title="恢复到待完成" disabled={pending.has(task.id)} onClick={() => { void onRestore(task); }}>{pending.has(task.id) ? <LoaderCircle size={15} className="spin" /> : <RotateCcw size={15} />}</button>}
      </li>)}</ul>}
      {!loading && visible.length === 0 && <p className="desktop-tasks-empty">{view === 'done' ? '完成的小事，会留在这里。' : done.length ? '今天的计划，完成了。' : '给今天留一件重要的事。'}</p>}
    </section>
    {!loading && undoTask && <div className="desktop-tasks-undo"><div><small>最近完成</small><span title={undoTask.title}>{undoTask.title}</span></div><button type="button" className="text-button" disabled={pending.has(undoTask.id)} onClick={() => { void onRestore(undoTask); }}><RotateCcw size={13} />撤销</button></div>}
    <form className="desktop-tasks-add" onSubmit={event => { event.preventDefault(); void create(); }}><label className="desktop-tasks-label" htmlFor="desktop-task-title">添加今日任务</label><div><input ref={input} id="desktop-task-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="再记下一件小事…" disabled={saving || loading} required /><button type="submit" className="button primary" aria-label="添加今日任务" disabled={saving || loading || !title.trim()}>{saving ? <LoaderCircle size={17} className="spin" /> : <Plus size={18} />}</button></div></form>
    <footer className="desktop-tasks-footer" onKeyDown={event => { if (event.key === 'Escape') setShowHelp(false); }}>
      <div className="desktop-footer-bar"><span className="desktop-sync-state" data-state={error ? 'error' : updating ? 'pending' : 'ready'} role="status"><i aria-hidden="true" />{error ? '更新未完成' : updating ? '正在更新' : '与主页面同步'}</span><button type="button" className="desktop-help-button" aria-label="小窗使用说明" aria-expanded={showHelp} aria-controls="desktop-help" onClick={() => setShowHelp(value => !value)}><Info size={14} /><span>使用说明</span></button></div>
      {showHelp && <p className="desktop-help" id="desktop-help">请保持主页面打开。关闭主页面或退出账号后，小窗也会关闭。</p>}
    </footer>
    {menu && <DesktopContextMenu state={menu} actions={menuActions} onDismiss={dismissMenu} />}
  </main>;
}
