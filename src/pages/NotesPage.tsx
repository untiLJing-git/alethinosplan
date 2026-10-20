import { useLocale } from '../hooks/LocaleProvider';
import { CalendarDays, MoreHorizontal, Plus, StickyNote } from 'lucide-react';
import type { Task } from '../lib/types';

interface Props { tasks: Task[]; pending: Set<string>; onCreate(): void; onEdit(task: Task): void; onSchedule(task: Task): void }
export function NotesPage({ tasks, pending, onCreate, onEdit, onSchedule }: Props) {
  const { t } = useLocale();
  const notes = tasks.filter(task => task.status === 'note');
  return <section className="notes-page">
    <header className="page-heading"><div><p className="eyebrow">QUICK CAPTURE</p><h1>{t("随手记")}</h1></div><button type="button" className="button primary" onClick={onCreate}><Plus size={17} />{t("记一件事")}</button></header>
    <div className="board-caption"><span>{t("未安排")} <strong>{notes.length}</strong></span></div>
    {notes.length ? <div className="notes-list">{notes.map(note => <article className={`capture-note tone-${note.tone}`} key={note.id}><span className="capture-note-mark"><StickyNote size={18} /></span><div className="capture-note-body"><button className="capture-note-title" type="button" onClick={() => onEdit(note)}>{note.title}</button><button className="text-button" type="button" onClick={() => onSchedule(note)} disabled={pending.has(note.id)}><CalendarDays size={14} />{t("安排日期")}</button></div><button type="button" className="icon-button" aria-label={t('编辑：{title}', { title: note.title })} onClick={() => onEdit(note)} disabled={pending.has(note.id)}><MoreHorizontal size={20} /></button></article>)}</div> : <div className="empty-board"><StickyNote size={34} strokeWidth={1.4} /><h2>{t("想到什么，就先记下来。")}</h2><button className="text-button" type="button" onClick={onCreate}><Plus size={16} />{t("记一件事")}</button></div>}
  </section>;
}
