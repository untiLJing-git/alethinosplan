import { useCallback, useEffect, useRef, useState } from 'react';

export const PREVIEW_PANELS = ['today', 'calendar', 'notes'] as const;
export type PreviewPanel = typeof PREVIEW_PANELS[number];
export type TodayPreviewStage = 'poster' | 'ready' | 'tear' | 'done';
export const PANEL_DURATION_MS: Record<PreviewPanel, number> = { today: 3600, calendar: 3200, notes: 3200 };

export function useProductPreview(interruption: number, enabled: boolean) {
  const [panel, setPanel] = useState<PreviewPanel>('today');
  const [todayStage, setTodayStage] = useState<TodayPreviewStage>('poster');
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const currentPanel = useRef<PreviewPanel>('today');
  const isPlaying = useRef(false);
  const attemptedAutoplay = useRef(false);
  const interrupted = useRef(interruption > 0);

  const clearTimers = useCallback(() => {
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const stop = useCallback(() => {
    clearTimers(); isPlaying.current = false; setPlaying(false);
    setTodayStage(current => current === 'tear' ? 'done' : current);
  }, [clearTimers]);

  const showPanel = useCallback(function show(next: PreviewPanel) {
    if (!isPlaying.current) return;
    clearTimers(); currentPanel.current = next; setPanel(next);
    if (next === 'today') {
      setTodayStage('ready');
      timers.current.push(window.setTimeout(() => setTodayStage('tear'), 1700));
    } else {
      setTodayStage(current => current === 'tear' ? 'done' : current);
    }
    timers.current.push(window.setTimeout(() => {
      const index = PREVIEW_PANELS.indexOf(next);
      show(PREVIEW_PANELS[(index + 1) % PREVIEW_PANELS.length]);
    }, PANEL_DURATION_MS[next]));
  }, [clearTimers]);

  const play = useCallback(() => {
    if (!enabled || document.visibilityState === 'hidden'
      || matchMedia('(prefers-reduced-motion: reduce)').matches
      || matchMedia('(max-width: 760px)').matches) return;
    isPlaying.current = true; setPlaying(true);
    showPanel(currentPanel.current);
  }, [enabled, showPanel]);

  const finishTear = useCallback(() => {
    setTodayStage(current => current === 'tear' ? 'done' : current);
  }, []);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 760px)');
    const syncPreferences = () => {
      const allowed = enabled && !reduced.matches && !compact.matches;
      if (!allowed) stop();
    };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') stop(); };
    syncPreferences();
    // Keep Strict Mode's discarded mount from starting a second carousel.
    const frame = requestAnimationFrame(() => {
      if (attemptedAutoplay.current) return;
      attemptedAutoplay.current = true;
      if (!interrupted.current) play();
    });
    reduced.addEventListener('change', syncPreferences);
    compact.addEventListener('change', syncPreferences);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelAnimationFrame(frame); clearTimers(); isPlaying.current = false;
      reduced.removeEventListener('change', syncPreferences);
      compact.removeEventListener('change', syncPreferences);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearTimers, enabled, play, stop]);

  useEffect(() => {
    if (interruption > 0) { interrupted.current = true; stop(); }
  }, [interruption, stop]);

  const stage = panel === 'today' ? todayStage : panel === 'calendar' ? 'plan' : 'capture';
  return { panel, todayStage, stage, playing, finishTear };
}
