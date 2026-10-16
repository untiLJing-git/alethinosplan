import { describe, expect, it } from 'vitest';
import { isDevelopmentDemoRequested } from './demoMode';

describe('development-only demo', () => {
  it('requires an explicit flag in development', () => {
    expect(isDevelopmentDemoRequested('?demo=1', true)).toBe(true);
    expect(isDevelopmentDemoRequested('', true)).toBe(false);
    expect(isDevelopmentDemoRequested('?demo=0', true)).toBe(false);
  });
  it('never opens the demo in production', () => {
    expect(isDevelopmentDemoRequested('?demo=1', false)).toBe(false);
    expect(isDevelopmentDemoRequested('?demo=true', false)).toBe(false);
  });
});
