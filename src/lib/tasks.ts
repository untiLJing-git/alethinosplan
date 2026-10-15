import { isDate, shiftDay } from './dates';
import { TONES } from './types';
import type { Task, TaskDraft, TaskPatch } from './types';

export function validateDraft(draft: TaskDraft): string | null {
  if (!draft.title.trim()) return '写下一件具体的事。';
  if (draft.title.trim().length > 160) return '事项名称最多 160 个字符。';
  if (draft.plannedDate !== null && !isDate(draft.plannedDate)) return '请选择有效的计划日期。';
  if (draft.estimate !== null && (!Number.isInteger(draft.estimate) || draft.estimate < 1 || draft.estimate > 1440)) return '预计用时应为 1–1440 分钟，也可以留空。';
  if (!TONES.includes(draft.tone)) return '请选择有效的便签颜色。';
  return null;
}

export function applyTaskPatch(task: Task, patch: TaskPatch): Task {
  const next = { ...task, ...patch };
  const error = validateDraft(next);
  if (error) throw new Error(error);
  if (next.status === 'note' && (next.plannedDate !== null || next.completedAt !== null)) throw new Error('随手记尚未安排日期。');
  if (next.status !== 'note' && next.plannedDate === null) throw new Error('任务需要计划日期。');
  if ((next.status === 'done') !== Boolean(next.completedAt)) throw new Error('完成状态与完成时间不一致。');
  return { ...next, title: next.title.trim() };
}

export function scheduledPatch(date: string): TaskPatch {
  if (!isDate(date)) throw new Error('请选择有效日期。');
  return { plannedDate: date, status: 'planned', completedAt: null };
}

export function seedTasks(today: string): Task[] {
  const createdAt = new Date().toISOString();
  const entries: Array<Pick<Task, 'title' | 'plannedDate' | 'estimate' | 'tone'>> = [
    { title: '写好作品集的开场', plannedDate: today, estimate: 25, tone: 'lemon' },
    { title: '读一章书，记下一个想法', plannedDate: today, estimate: 20, tone: 'sky' },
    { title: '出去走走，不赶时间', plannedDate: today, estimate: 30, tone: 'rose' },
    { title: '整理作品集初稿', plannedDate: shiftDay(today, 1), estimate: 40, tone: 'mint' },
    { title: '周末的小小探索', plannedDate: shiftDay(today, 2), estimate: 60, tone: 'lemon' },
    { title: '想了解一门新的设计课程', plannedDate: null, estimate: null, tone: 'lemon' },
    { title: '找时间给朋友写封信', plannedDate: null, estimate: null, tone: 'rose' },
  ];
  return entries.map((entry, index) => ({ ...entry, id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, status: entry.plannedDate ? 'planned' : 'note', createdAt, completedAt: null }));
}
