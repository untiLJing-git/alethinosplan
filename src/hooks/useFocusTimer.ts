import { useCallback, useEffect, useRef, useState } from 'react';
import { focusElapsed, pauseFocus, resumeFocus } from '../lib/focusTimer';
import type { FocusSession } from '../lib/focusTimer';

export function useFocusTimer(clockWindow: Window | null) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const current = useRef<FocusSession | null>(null);
  const commit = useCallback((next: FocusSession | null) => {
    current.current = next; setSession(next); setElapsed(focusElapsed(next, performance.now()));
  }, []);
  const start = useCallback((taskId: string) => {
    if (current.current) return current.current.taskId === taskId;
    commit({ taskId, accumulatedMs: 0, startedAt: performance.now() });
    return true;
  }, [commit]);
  const stop = useCallback((taskId?: string) => {
    if (!current.current || (taskId && current.current.taskId !== taskId)) return;
    commit(null);
  }, [commit]);
  const pause = useCallback((taskId?: string) => {
    const value = current.current;
    if (value && (!taskId || value.taskId === taskId)) commit(pauseFocus(value, performance.now()));
  }, [commit]);
  const toggle = useCallback(() => {
    const value = current.current;
    if (!value) return;
    commit(value.startedAt === null ? resumeFocus(value, performance.now()) : pauseFocus(value, performance.now()));
  }, [commit]);
  useEffect(() => {
    if (!session || session.startedAt === null) return;
    // Use the visible PiP's scheduler, but always measure against the opener's time origin.
    const clock = clockWindow && !clockWindow.closed ? clockWindow : window;
    const clockDocument = clock.document;
    const refresh = () => setElapsed(focusElapsed(current.current, performance.now()));
    refresh();
    const timer = clock.setInterval(refresh, 250);
    clockDocument.addEventListener('visibilitychange', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clock.clearInterval(timer);
      clockDocument.removeEventListener('visibilitychange', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [clockWindow, session]);
  return { session, elapsed, running: session?.startedAt !== null && session !== null, start, pause, toggle, stop };
}
