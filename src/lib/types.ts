export const TONES = ['lemon', 'sky', 'rose', 'mint'] as const;
export type Tone = typeof TONES[number];
export type TaskStatus = 'planned' | 'done' | 'note';
export type Page = 'today' | 'calendar' | 'notes';

export interface Task {
  id: string;
  title: string;
  plannedDate: string | null;
  estimate: number | null;
  tone: Tone;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface TaskDraft {
  title: string;
  plannedDate: string | null;
  estimate: number | null;
  tone: Tone;
}

export type TaskPatch = Partial<TaskDraft & Pick<Task, 'status' | 'completedAt'>>;
export interface TaskRepository {
  list(): Promise<Task[]>;
  create(draft: TaskDraft): Promise<Task>;
  update(id: string, patch: TaskPatch): Promise<Task>;
  remove(id: string): Promise<void>;
}
