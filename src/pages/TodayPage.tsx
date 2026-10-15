import { Check, ChevronRight, Plus, RotateCcw, Sun } from 'lucide-react';
import { StickyTask } from '../components/StickyTask';
import { dayLabel } from '../lib/dates';
import type { Task } from '../lib/types';

interface Props {
  today: string; tasks: Task[]; pending: Set<string>; tearing: Set<string>;
  onCreate(): void; onEdit(task: Task): void; onFocus(task: Task): void;
  onComplete(task: Task): void; onRestore(task: Task): void;
  onTearEnd(id: string): void;
}

export function TodayPage({ today, tasks, pending, tearing, onCreate, onEdit, onFocus, onComplete, onRestore, onTearEnd }: Props) {
  const planned = tasks.filter(task => task.plannedDate === today && task.status === 'planned');
  const done = tasks.filter(task => task.plannedDate === today && task.status === 'done');
  const overdue = tasks.filter(task => task.status === 'planned' && task.plannedDate! < today);
  const minutes = planned.reduce((sum, task) => sum + (task.estimate || 0), 0);
  return <section className="today-page">
    <header className="page-heading"><div><p className="eyebrow">{dayLabel(today, true)}</p><h1>我的一天<span className="title-period">.</span></h1></div><button className="button primary" type="button" onClick={onCreate}><Plus size={17} />新建任务</button></header>
    <div className="board-caption"><span><i className="status-dot" />待完成 <strong>{planned.length}</strong></span><span>{minutes > 0 ? `约 ${minutes} 分钟` : ''}{planned.some(task => task.estimate === null) ? `${minutes ? ' · ' : ''}有待估时` : ''}</span></div>
    {planned.length ? <div className="sticky-board">{planned.map(task => <StickyTask key={task.id} task={task} tearing={tearing.has(task.id)} pending={pending.has(task.id)} onComplete={onComplete} onEdit={onEdit} onFocus={onFocus} onTearEnd={onTearEnd} />)}</div> : <div className="empty-board"><span className="empty-sun"><Sun size={32} strokeWidth={1.4} /></span><h2>{done.length ? '今天的计划，完成了。' : '给今天留一件重要的事。'}</h2><button type="button" className="text-button" onClick={onCreate}><Plus size={16} />添加任务</button></div>}
    {done.length > 0 && <section className="completed-section" aria-label="已完成任务"><h2><Check size={17} />已完成 <span>{done.length}</span></h2>{done.map(task => <div className="completed-row" key={task.id}><Check size={15} /><button type="button" onClick={() => onEdit(task)}>{task.title}</button><button className="restore-button" type="button" onClick={() => onRestore(task)} disabled={pending.has(task.id)} aria-label={`恢复：${task.title}`}><RotateCcw size={14} />恢复</button></div>)}</section>}
    {overdue.length > 0 && <details className="overdue-section"><summary><ChevronRight size={15} />此前未完成 <span>{overdue.length}</span></summary>{overdue.map(task => <div className="overdue-row" key={task.id}><span>{task.title}</span><button type="button" className="text-button" onClick={() => onEdit(task)}>重新安排</button></div>)}</details>}
  </section>;
}
