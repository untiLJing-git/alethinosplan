import { useLocale } from '../hooks/LocaleProvider';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { LoaderCircle, Trash2, X } from 'lucide-react';
import { TONES } from '../lib/types';
import type { Task, TaskDraft, Tone } from '../lib/types';
import { validateDraft } from '../lib/tasks';

export interface TaskEditorState { task?: Task; date: string | null; kind: 'plan' | 'note' }
interface Props {
  editor: TaskEditorState; onClose(): void;
  onSave(draft: TaskDraft, task?: Task): Promise<boolean>;
  onDelete(task: Task): Promise<boolean>;
}

export function TaskDialog({ editor, onClose, onSave, onDelete }: Props) {
  const { t, translateMessage } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(editor.task?.title || '');
  const [date, setDate] = useState(editor.date || '');
  const [estimate, setEstimate] = useState(editor.task?.estimate?.toString() || '');
  const [tone, setTone] = useState<Tone>(editor.task?.tone || 'lemon');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNote = editor.kind === 'note';
  const isDone = editor.task?.status === 'done';
  useEffect(() => { const element = dialog.current!; element.showModal(); element.querySelector<HTMLTextAreaElement>('textarea')?.focus(); return () => element.close(); }, []);

  async function save(event?: FormEvent<HTMLFormElement>, unschedule = false) {
    event?.preventDefault();
    const draft: TaskDraft = { title: title.trim(), plannedDate: unschedule || isNote ? null : date, estimate: estimate ? Number(estimate) : null, tone };
    const issue = validateDraft(draft);
    if (issue) { setError(issue); return; }
    setBusy(true); setError('');
    const success = await onSave(draft, editor.task);
    if (success) onClose(); else { setError('未能保存，请检查连接后重试。'); setBusy(false); }
  }
  async function remove() {
    if (!editor.task) return;
    setBusy(true);
    if (await onDelete(editor.task)) onClose(); else { setError('删除未完成，请重试。'); setBusy(false); }
  }

  return <dialog ref={dialog} className="task-dialog" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }} aria-labelledby="task-dialog-heading">
    <form onSubmit={event => void save(event)}>
      <div className="dialog-heading"><h2 id="task-dialog-heading">{isNote ? t('随手记') : editor.task ? t('编辑任务') : t('新建任务')}</h2><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label={t("关闭")}><X size={20} /></button></div>
      <label className="field">{isNote ? t('记下什么？') : t('准备做什么？')}<textarea name="title" value={title} onChange={event => setTitle(event.target.value)} placeholder={isNote ? t('一个想法，或一件还没安排的事') : t('写下一件具体的事')} maxLength={160} autoFocus required rows={3} disabled={busy} /></label>
      {!isNote && <><div className="form-grid"><label className="field">{t("计划日期")}<input name="date" type="date" min="1900-01-01" max="2100-12-31" value={date} onChange={event => setDate(event.target.value)} required disabled={busy || isDone} /></label><label className="field">{t("预计分钟")}<input name="estimate" type="number" min={1} max={1440} step={1} value={estimate} onChange={event => setEstimate(event.target.value)} placeholder={t("可不填")} disabled={busy} /></label></div><div className="tone-picker" role="group" aria-label={t("便签颜色")}><span>{t("颜色")}</span>{TONES.map((value, index) => <button type="button" className={`tone-dot tone-${value}`} key={value} aria-label={[t('浅黄'), t('浅蓝'), t('浅粉'), t('浅绿')][index]} aria-pressed={tone === value} onClick={() => setTone(value)} disabled={busy} />)}</div></>}
      {error && <p className="form-error" role="alert">{translateMessage(error)}</p>}
      <div className="dialog-footer"><div className="dialog-secondary">{editor.task && <button type="button" className="text-button danger" onClick={() => setConfirmDelete(value => !value)} disabled={busy}><Trash2 size={15} />{t("删除")}</button>}{!isNote && editor.task && !isDone && <button type="button" className="text-button" onClick={() => void save(undefined, true)} disabled={busy}>{t("暂不安排")}</button>}</div><button type="submit" className="button primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={16} />}{isNote ? t('记下') : t('保存')}</button></div>
      {confirmDelete && <div className="delete-confirm" role="alert"><span>{t("删除这件事？此操作不可撤销。")}</span><button type="button" className="text-button" onClick={() => setConfirmDelete(false)} disabled={busy}>{t("取消")}</button><button type="button" className="button danger-fill" onClick={() => void remove()} disabled={busy}>{t("确定删除")}</button></div>}
    </form>
  </dialog>;
}
