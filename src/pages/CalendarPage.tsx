import { weekdayLabels } from '../lib/i18n';
import { useLocale } from '../hooks/LocaleProvider';
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

export function CalendarPage({ today, tasks, pending, onCreate, onEdit, onMove }: Props) {
  const { t, locale } = useLocale();
  const weekdays = weekdayLabels(locale);
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
    return <button type="button" key={task.id} className={`calendar-event tone-${task.tone} ${task.status === 'done' ? 'is-done' : ''} ${dragId === task.id ? 'is-dragging' : ''}`} data-task-id={task.id} aria-label={t('{title}，{status}', { title: task.title, status: task.status === 'done' ? t('已完成') : t('已安排') })} title={task.title} draggable={false} onPointerDown={event => beginDrag(event, task)} onClick={() => onEdit(task)} disabled={pending.has(task.id)}>{task.status === 'done' ? <Check size={11} /> : <span className="event-dot" />}<span>{task.title}</span></button>;
  }
  function navigate(amount: number) { const next = view === 'month' ? shiftMonth(selected, amount) : shiftDay(selected, amount * 7); if (isDate(next)) setSelected(next); }

  return <section ref={root} className="calendar-page" onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
    <header className="page-heading"><div><p className="eyebrow">THE BIG PICTURE</p><h1>{t("规划日历")}</h1></div><button className="button primary" type="button" onClick={() => onCreate(selected)}><Plus size={17} />{t("添加计划")}</button></header>
    <div className="calendar-toolbar"><div className="calendar-period"><h2>{view === 'month' ? monthLabel(selected, locale) : `${dayLabel(days[0], false, locale)} — ${dayLabel(days[6], false, locale)}`}</h2><div className="period-controls"><button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label={view === 'month' ? t('上一月') : t('上一周')}><ChevronLeft size={18} /></button><button className="button compact" type="button" onClick={() => setSelected(today)}>{t("今天")}</button><button className="icon-button" type="button" onClick={() => navigate(1)} aria-label={view === 'month' ? t('下一月') : t('下一周')}><ChevronRight size={18} /></button></div></div><div className="segmented" role="group" aria-label={t("日历视图")}><button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>{t("月")}</button><button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')}>{t("周")}</button></div></div>
    <div className={`calendar-layout view-${view}`}>
      <div className="calendar-board">
        {view === 'month' && <div className="weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{locale === 'zh-CN' ? day.replace('周', '') : day}</span>)}</div>}
        <div className={view === 'month' ? 'month-grid' : 'week-grid'}>{days.map((date, index) => {
          const items = tasksOn(date);
          return <div key={date} data-calendar-date={date} className={`calendar-day ${date === selected ? 'is-selected' : ''} ${date === today ? 'is-today' : ''} ${date.slice(0, 7) !== selected.slice(0, 7) ? 'is-outside' : ''} ${dropDate === date ? 'is-drop-target' : ''}`} onClick={event => { if (event.target === event.currentTarget) setSelected(date); }}>
            <button className="day-number" type="button" onClick={() => setSelected(date)} aria-label={t('{date}，{count} 项计划', { date: locale === 'zh-CN' ? date : dayLabel(date, true, locale), count: items.length })} aria-pressed={date === selected}>{view === 'week' && <small>{weekdays[index]}</small>}<span>{Number(date.slice(-2))}</span></button>
            <div className="day-events">{(view === 'month' ? items.slice(0, 2) : items).map(eventChip)}{view === 'month' && items.length > 2 && <button className="more-events" type="button" onClick={() => setSelected(date)}>{t('+{count} 项', { count: items.length - 2 })}</button>}{view === 'week' && <button className="week-add" type="button" onClick={() => onCreate(date)} aria-label={t('添加 {date}的计划', { date: dayLabel(date, false, locale) })}><Plus size={13} /></button>}</div>
            {view === 'month' && items.length > 0 && <span className="day-count" aria-hidden="true">{t('{count} 项', { count: items.length })}</span>}
          </div>;
        })}</div>
      </div>
      <aside className="day-detail" aria-label={t("当天计划")}><div className="day-detail-heading"><h2>{dayLabel(selected, false, locale)}{selected === today && <span>{t("今天")}</span>}</h2><span>{t('{count} 项计划', { count: selectedTasks.length })}</span></div>{selectedTasks.map(task => <button type="button" className="day-detail-task" key={task.id} onClick={() => onEdit(task)} disabled={pending.has(task.id)}><span className={`detail-task-dot tone-${task.tone} ${task.status === 'done' ? 'is-done' : ''}`}>{task.status === 'done' && <Check size={12} />}</span><span>{task.title}<small>{task.status === 'done' ? t('已完成') : task.estimate ? t('{count} 分钟', { count: task.estimate }) : t('待估时')}</small></span></button>)}{!selectedTasks.length && <p className="empty-day">{t("还没有安排。")}</p>}<button className="button day-detail-add" type="button" onClick={() => onCreate(selected)}><Plus size={15} />{t("添加计划")}</button></aside>
    </div>
  </section>;
}
