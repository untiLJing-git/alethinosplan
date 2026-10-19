export interface FocusSession {
  taskId: string;
  accumulatedMs: number;
  startedAt: number | null;
}

export function focusElapsed(session: FocusSession | null, now: number): number {
  if (!session) return 0;
  return session.accumulatedMs + (session.startedAt === null ? 0 : Math.max(0, now - session.startedAt));
}
export function pauseFocus(session: FocusSession, now: number): FocusSession {
  return session.startedAt === null ? session : { ...session, accumulatedMs: focusElapsed(session, now), startedAt: null };
}
export function resumeFocus(session: FocusSession, now: number): FocusSession {
  return session.startedAt !== null ? session : { ...session, startedAt: now };
}
