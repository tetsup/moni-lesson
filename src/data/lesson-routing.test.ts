import { describe, expect, it } from 'vitest';
import { resolveHashRoute, routeToHash } from './lesson-routing';

describe('lesson hash routing', () => {
  it.each([
    ['/', { page: 'home' }],
    ['/practice', { page: 'practice' }],
    ['/teacher', { page: 'teacher' }],
    ['/teacher/lesson', { page: 'teacher-lesson' }],
    ['/teacher/topics', { page: 'teacher-topics' }],
    ['/teacher/review', { page: 'teacher-review' }],
    ['/teacher/songs/song-a', { page: 'teacher-song', songId: 'song-a' }],
  ] as const)('resolves # %s to the corresponding screen route', (path, expected) => {
    expect(resolveHashRoute(`#${path}`)).toEqual(expected);
  });

  it('resolves a hash route when the URL changes after the app has loaded', () => {
    expect(resolveHashRoute('#/teacher')).toEqual({ page: 'teacher' });
    expect(resolveHashRoute('#/practice')).toEqual({ page: 'practice' });
  });

  
  it.each([
    [{ page: 'home' }, '#/'],
    [{ page: 'practice' }, '#/practice'],
    [{ page: 'teacher' }, '#/teacher'],
    [{ page: 'teacher-lesson' }, '#/teacher/lesson'],
    [{ page: 'teacher-topics' }, '#/teacher/topics'],
    [{ page: 'teacher-review' }, '#/teacher/review'],
    [{ page: 'teacher-song', songId: 'song-a' }, '#/teacher/songs/song-a'],
  ] as const)('serializes a screen route to its hash URL', (route, expected) => {
    expect(routeToHash(route)).toBe(expected);
  });
});
