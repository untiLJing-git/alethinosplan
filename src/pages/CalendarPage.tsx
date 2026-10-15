import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { dayLabel, isDate, monthDates, monthLabel, shiftDay, shiftMonth, weekDates } from '../lib/dates';
import type { Task } from '../lib/types';

interface Props {
  today: string; tasks: Task[]; pending: Set<string>;
  onCreate(date: string): void; onEdit(task: Task): void;
  onMove(task: Task, date: string): Promise<boolean>;
}
interface DragState { id: string; x: number; y: number; pointer: number; active: boolean }
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function CalendarPage({ today, tasks, pending, onCreate, onEdit, onMove }: Props) {
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const days = view === 'month' ? monthDates(selected) : weekDates(selected);
  const tasksOn = (date: string) => tasks.filter(task => task.plannedDate === date && task.status !== 'note');
  const selectedTasks = tasksOn(selected);

  useEffect(() => {
    function clear() { drag.current = null; setDragId(null); setDropDate(null); }
    function targetDate(event: PointerEvent) {
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-calendar-date]');
      return element && root.current?.contains(element) ? element.dataset.calendarDate || null : null;
    }
    function move(event: PointerEvent) {
      const current = drag.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return;
      current.active = true; event.preventDefault(); setDragId(current.id); setDropDate(targetDate(event));
    }
    function up(event: PointerEvent) {
      const current = drag.current;
      if (!current || current.pointer !== event.pointerId) return;
      const date = targetDate(event);
      const task = tasks.find(item => item.id === current.id);
      clear();
      if (!current.active) return;
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      event.preventDefault();
      if (date && isDate(date) && task && task.plannedDate !== date) void onMove(task, date).then(success => { if (success) setSelected(date); });
    }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', clear);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', clear); };
  }, [tasks, onMove]);

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>, task: Task) {
    if (event.button !== 0 || event.pointerType !== 'mouse' || task.status !== 'planned' || pending.has(task.id)) return;
    drag.current = { id: task.id, x: event.clientX, y: event.clientY, pointer: event.pointerId, active: false };
  }
  function eventChip(task: Task) {
    return <button type="button" key={task.id} className={`calendar-event tone-${task.tone} ${task.status === 'done' ? 'is-done' : ''} ${dragId === task.id ? 'is-dragging' : ''}`} data-task-id={task.id} aria-label={`${task.title}，${task.status === 'done' ? '已完成' : '已安排'}`} title={task.title} draggable={false} onPointerDown={event => beginDrag(event, task)} onClick={() => onEdit(task)} disabled={pending.has(task.id)}>{task.status === 'done' ? <Check size={11} /> : <span className="event-dot" />}<span>{task.title}</span></button>;
  }
  function navigate(amount: number) { const next = view === 'month' ? shiftMonth(selected, amount) : shiftDay(selected, amount * 7); if (isDate(next)) setSelected(next); }

  return <section ref={root} className="calendar-page" onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
    <header className="page-heading"><div><p className="eyebrow">THE BIG PICTURE</p><h1>规划日历<span className="title-period">.</span></h1></div><button className="button primary" type="button" onClick={() => onCreate(selected)}><Plus size={17} />添加计划</button></header>
    <div className="calendar-toolbar"><div className="calendar-period"><h2>{view === 'month' ? monthLabel(selected) : `${dayLabel(days[0])} — ${dayLabel(days[6])}`}</h2><div className="period-controls"><button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label={view === 'month' ? '上一月' : '上一周'}><ChevronLeft size={18} /></button><button className="button compact" type="button" onClick={() => setSelected(today)}>今天</button><button className="icon-button" type="button" onClick={() => navigate(1)} aria-label={view === 'month' ? '下一月' : '下一周'}><ChevronRight size={18} /></button></div></div><div className="segmented" role="group" aria-label="日历视图"><button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>月</button><button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')}>周</button></div></div>
    <div className={`calendar-layout view-${view}`}>
      <div className="calendar-board">
        {view === 'month' && <div className="weekdays" aria-hidden="true">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>}
        <div className={view === 'month' ? 'month-grid' : 'week-grid'}>{days.map((date, index) => {
          const items = tasksOn(date);
          return <div key={date} data-calendar-date={date} className={`calendar-day ${date === selected ? 'is-selected' : ''} ${date === today ? 'is-today' : ''} ${date.slice(0, 7) !== selected.slice(0, 7) ? 'is-outside' : ''} ${dropDate === date ? 'is-drop-target' : ''}`} onClick={event => { if (event.target === event.currentTarget) setSelected(date); }}>
            <button className="day-number" type="button" onClick={() => setSelected(date)} aria-label={`${date}，${items.length} 项计划`} aria-pressed={date === selected}>{view === 'week' && <small>周{WEEKDAYS[index]}</small>}<span>{Number(date.slice(-2))}</span></button>
            <div className="day-events">{(view === 'month' ? items.slice(0, 2) : items).map(eventChip)}{view === 'month' && items.length > 2 && <button className="more-events" type="button" onClick={() => setSelected(date)}>+{items.length - 2} 项</button>}{view === 'week' && <button className="week-add" type="button" onClick={() => onCreate(date)} aria-label={`添加 ${dayLabel(date)}的计划`}><Plus size={13} /></button>}</div>
            {view === 'month' && items.length > 0 && <span className="day-count" aria-hidden="true">{items.length} 项</span>}
          </div>;
        })}</div>
      </div>
      <aside className="day-detail" aria-label="当天计划"><div className="day-detail-heading"><h2>{dayLabel(selected)}{selected === today && <span>今天</span>}</h2><span>{selectedTasks.length} 项计划</span></div>{selectedTasks.map(task => <button type="button" className="day-detail-task" key={task.id} onClick={() => onEdit(task)} disabled={pending.has(task.id)}><span className={`detail-task-dot tone-${task.tone} ${task.status === 'done' ? 'is-done' : ''}`}>{task.status === 'done' && <Check size={12} />}</span><span>{task.title}<small>{task.status === 'done' ? '已完成' : task.estimate ? `${task.estimate} 分钟` : '待估时'}</small></span></button>)}{!selectedTasks.length && <p className="empty-day">还没有安排。</p>}<button className="button day-detail-add" type="button" onClick={() => onCreate(selected)}><Plus size={15} />添加计划</button></aside>
    </div>
  </section>;
}
