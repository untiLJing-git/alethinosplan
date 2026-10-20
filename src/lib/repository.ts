import { readLocale } from './i18n';
import type { SupabaseClient } from '@supabase/supabase-js';
import { todayDate } from './dates';
import { applyTaskPatch, seedTasks, validateDraft } from './tasks';
import type { Task, TaskDraft, TaskPatch, TaskRepository, TaskStatus, Tone } from './types';

const DEMO_KEY = 'alethinosplan.demo.v1';

export function demoRepository(): TaskRepository {
  function read(): Task[] {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) {
      const initial = seedTasks(todayDate(), readLocale());
      localStorage.setItem(DEMO_KEY, JSON.stringify(initial));
      return initial;
    }
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || data.length > 5000) throw new Error('localStorage data invalid');
    return data.map(item => {
      if (!item || typeof item.id !== 'string' || typeof item.title !== 'string' || !['planned', 'done', 'note'].includes(item.status)) throw new Error('localStorage data invalid');
      return applyTaskPatch(item as Task, {});
    });
  }
  function save(tasks: Task[]) { localStorage.setItem(DEMO_KEY, JSON.stringify(tasks)); }
  return {
    async list() { return read(); },
    async create(draft) {
      const error = validateDraft(draft); if (error) throw new Error(error);
      const task: Task = { ...draft, title: draft.title.trim(), id: crypto.randomUUID(), status: draft.plannedDate ? 'planned' : 'note', createdAt: new Date().toISOString(), completedAt: null };
      save([...read(), task]); return task;
    },
    async update(id, patch) {
      const tasks = read(); const index = tasks.findIndex(task => task.id === id);
      if (index < 0) throw new Error('Task not found');
      const task = applyTaskPatch(tasks[index], patch); tasks[index] = task; save(tasks); return task;
    },
    async remove(id) { save(read().filter(task => task.id !== id)); },
  };
}

interface TaskRow {
  id: string; title: string; planned_date: string | null; estimate_minutes: number | null;
  tone: Tone; status: TaskStatus; created_at: string; completed_at: string | null;
}
function fromRow(row: TaskRow): Task {
  return { id: row.id, title: row.title, plannedDate: row.planned_date, estimate: row.estimate_minutes, tone: row.tone, status: row.status, createdAt: row.created_at, completedAt: row.completed_at };
}
function toPatch(patch: TaskPatch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.plannedDate !== undefined ? { planned_date: patch.plannedDate } : {}),
    ...(patch.estimate !== undefined ? { estimate_minutes: patch.estimate } : {}),
    ...(patch.tone !== undefined ? { tone: patch.tone } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.completedAt !== undefined ? { completed_at: patch.completedAt } : {}),
  };
}
export function cloudRepository(client: SupabaseClient, userId: string): TaskRepository {
  return {
    async list() {
      const { data, error } = await client.from('alethinos_tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true });
      if (error) throw new Error(error.message); return (data as TaskRow[]).map(fromRow);
    },
    async create(draft: TaskDraft) {
      const issue = validateDraft(draft); if (issue) throw new Error(issue);
      const { data, error } = await client.from('alethinos_tasks').insert({ ...toPatch(draft), user_id: userId, status: draft.plannedDate ? 'planned' : 'note' }).select('*').single();
      if (error) throw new Error(error.message); return fromRow(data as TaskRow);
    },
    async update(id, patch) {
      const { data, error } = await client.from('alethinos_tasks').update(toPatch(patch)).eq('id', id).eq('user_id', userId).select('*').single();
      if (error) throw new Error(error.message); return fromRow(data as TaskRow);
    },
    async remove(id) {
      const { error } = await client.from('alethinos_tasks').delete().eq('id', id).eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
  };
}
