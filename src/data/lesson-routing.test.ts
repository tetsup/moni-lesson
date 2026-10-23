import { describe, expect, it } from 'vitest';
import { resolveHashRoute } from './lesson-routing';

describe('lesson hash routing for existing app modes', () => {
  it('opens teacher mode for #/teacher', () => {
    expect(resolveHashRoute('#/teacher')).toEqual({ page: 'teacher' });
  });

  it('uses practice mode for the app root and #/practice', () => {
    expect(resolveHashRoute('#/')).toEqual({ page: 'practice' });
    expect(resolveHashRoute('#/practice')).toEqual({ page: 'practice' });
  });
});
