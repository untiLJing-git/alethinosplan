import { describe, expect, it } from 'vitest';
import { focusElapsed, pauseFocus, resumeFocus } from './focusTimer';
import type { FocusSession } from './focusTimer';

const running: FocusSession = { taskId: 'a', accumulatedMs: 0, startedAt: 1000 };
describe('shared focus timer', () => {
  it('uses elapsed time rather than callback counts', () => {
    expect(focusElapsed(running, 3500)).toBe(2500);
    expect(focusElapsed(running, 61000)).toBe(60000);
    expect(focusElapsed(null, 61000)).toBe(0);
  });
  it('keeps pause and resume time without counting paused intervals', () => {
    const paused = pauseFocus(running, 3500);
    expect(focusElapsed(paused, 60000)).toBe(2500);
    const resumed = resumeFocus(paused, 60000);
    expect(focusElapsed(resumed, 62000)).toBe(4500);
    expect(focusElapsed(pauseFocus(resumed, 62500), 70000)).toBe(5000);
  });
  it('does not reset already running or already paused sessions', () => {
    expect(resumeFocus(running, 9000)).toBe(running);
    const paused = pauseFocus(running, 3500);
    expect(pauseFocus(paused, 9000)).toBe(paused);
    expect(focusElapsed(running, 500)).toBe(0);
  });
});
