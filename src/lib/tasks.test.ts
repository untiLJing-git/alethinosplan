import { describe, expect, it } from 'vitest';
import { applyTaskPatch, scheduledPatch, seedTasks, validateDraft } from './tasks';
import type { TaskDraft } from './types';

describe('task invariants', () => {
  const draft: TaskDraft = { title: '做一件事', plannedDate: '2026-10-15', estimate: 25, tone: 'lemon' };
  it('requires a title but not an estimate or schedule for notes', () => {
    expect(validateDraft({ ...draft, title: '   ' })).toBeTruthy();
    expect(validateDraft({ ...draft, plannedDate: null, estimate: null })).toBeNull();
    expect(validateDraft({ ...draft, estimate: 0 })).toBeTruthy();
    expect(validateDraft({ ...draft, estimate: 1.5 })).toBeTruthy();
    expect(validateDraft({ ...draft, estimate: 1441 })).toBeTruthy();
  });
  it('promotes a note only with an explicit date', () => {
    const note = seedTasks('2026-10-15').find(task => task.status === 'note')!;
    expect(note.plannedDate).toBeNull();
    expect(() => applyTaskPatch(note, { status: 'planned' })).toThrow();
    const planned = applyTaskPatch(note, scheduledPatch('2026-10-16'));
    expect(planned.status).toBe('planned');
    expect(planned.plannedDate).toBe('2026-10-16');
  });
  it('keeps completion and its timestamp consistent', () => {
    const task = seedTasks('2026-10-15')[0];
    expect(() => applyTaskPatch(task, { status: 'done' })).toThrow();
    const done = applyTaskPatch(task, { status: 'done', completedAt: '2026-10-15T08:00:00Z' });
    expect(done.status).toBe('done');
    const undo = applyTaskPatch(done, { status: 'planned', completedAt: null });
    expect(undo).toEqual(task);
  });
  it('does not count rescheduling as completion', () => {
    const task = seedTasks('2026-10-15')[0];
    const moved = applyTaskPatch(task, scheduledPatch('2026-10-17'));
    expect(moved.status).toBe('planned');
    expect(moved.completedAt).toBeNull();
  });
  it('requires unassignment to clear the planned date', () => {
    const task = seedTasks('2026-10-15')[0];
    expect(() => applyTaskPatch(task, { status: 'note' })).toThrow();
    expect(applyTaskPatch(task, { status: 'note', plannedDate: null }).status).toBe('note');
  });
});
