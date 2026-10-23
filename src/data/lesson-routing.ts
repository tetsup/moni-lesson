export type LessonRoute = { page: 'practice' } | { page: 'teacher' };

export const resolveHashRoute = (hash: string): LessonRoute =>
  hash.replace(/^#/, '').replace(/\/+$/, '') === '/teacher'
    ? { page: 'teacher' }
    : { page: 'practice' };
