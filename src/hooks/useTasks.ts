import { useCallback, useEffect, useRef, useState } from 'react';
import { dataErrorMessage } from '../lib/errors';
import { applyTaskPatch } from '../lib/tasks';
import type { Task, TaskDraft, TaskPatch, TaskRepository } from '../lib/types';

export function useTasks(repository: TaskRepository) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [tearing, setTearing] = useState<Set<string>>(new Set());
  const active = useRef(true);
  const request = useRef(0);
  const pendingIds = useRef(new Set<string>());
  const tearWaiters = useRef(new Map<string, { resolve(): void; timer: ReturnType<typeof setTimeout> }>());
  const finishTear = useCallback((id: string) => {
    const waiter = tearWaiters.current.get(id);
    if (!waiter) return;
    tearWaiters.current.delete(id);
    clearTimeout(waiter.timer);
    waiter.resolve();
  }, []);

  const reload = useCallback(async () => {
    const generation = ++request.current;
    setLoading(true); setError('');
    try {
      const values = await repository.list();
      if (active.current && generation === request.current) setTasks(values);
    } catch (issue) { if (active.current && generation === request.current) setError(dataErrorMessage(issue)); }
    finally { if (active.current && generation === request.current) setLoading(false); }
  }, [repository]);

  useEffect(() => {
    active.current = true; void reload();
    return () => {
      active.current = false; request.current += 1;
      for (const id of tearWaiters.current.keys()) finishTear(id);
    };
  }, [reload, finishTear]);

  async function create(draft: TaskDraft): Promise<Task | null> {
    setError('');
    try {
      const task = await repository.create(draft);
      if (active.current) setTasks(previous => [...previous, task]);
      return task;
    } catch (issue) { if (active.current) setError(dataErrorMessage(issue)); return null; }
  }

  async function update(id: string, patch: TaskPatch, tear = false): Promise<Task | null> {
    if (pendingIds.current.has(id)) return null;
    const before = tasks.find(task => task.id === id);
    if (!before) return null;
    try { applyTaskPatch(before, patch); } catch (issue) { setError(issue instanceof Error ? issue.message : '任务状态无效。'); return null; }
    pendingIds.current.add(id); setPending(new Set(pendingIds.current)); setError('');
    let animationDone = Promise.resolve();
    if (tear && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animationDone = new Promise<void>(resolve => {
        // Normal completion comes from the sheet; the timeout only prevents a missing event from stalling a task.
        const timer = setTimeout(() => finishTear(id), 3000);
        tearWaiters.current.set(id, { resolve, timer });
      });
      setTearing(previous => new Set([...previous, id]));
    }
    try {
      const [task] = await Promise.all([repository.update(id, patch), animationDone]);
      if (active.current) setTasks(previous => previous.map(item => item.id === id ? task : item));
      return task;
    } catch (issue) { if (active.current) setError(dataErrorMessage(issue)); return null; }
    finally {
      finishTear(id);
      pendingIds.current.delete(id);
      if (active.current) {
        setPending(new Set(pendingIds.current));
        setTearing(previous => { const next = new Set(previous); next.delete(id); return next; });
      }
    }
  }

  async function remove(id: string): Promise<boolean> {
    if (pendingIds.current.has(id)) return false;
    pendingIds.current.add(id); setPending(new Set(pendingIds.current)); setError('');
    try {
      await repository.remove(id);
      if (active.current) setTasks(previous => previous.filter(task => task.id !== id));
      return true;
    } catch (issue) { if (active.current) setError(dataErrorMessage(issue)); return false; }
    finally { pendingIds.current.delete(id); if (active.current) setPending(new Set(pendingIds.current)); }
  }

  return { tasks, loading, error, pending, tearing, finishTear, reload, create, update, remove, clearError: () => setError('') };
}
