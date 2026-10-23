export type LessonRoute =
  | { page: 'home' }
  | { page: 'practice' }
  | { page: 'teacher' }
  | { page: 'teacher-lesson' }
  | { page: 'teacher-topics' }
  | { page: 'teacher-review' }
  | { page: 'teacher-song'; songId: string };

const normalizePath = (path: string): string => {
  const withoutQuery = path.split(/[?&]/, 1)[0] ?? '/';
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed || '/';
};

export const resolveHashRoute = (hash: string): LessonRoute => {
  const path = normalizePath(hash.startsWith('#') ? hash.slice(1) : hash);

  if (path === '/') return { page: 'home' };
  if (path === '/practice') return { page: 'practice' };
  if (path === '/teacher') return { page: 'teacher' };
  if (path === '/teacher/lesson') return { page: 'teacher-lesson' };
  if (path === '/teacher/topics') return { page: 'teacher-topics' };
  if (path === '/teacher/review') return { page: 'teacher-review' };

  const songMatch = path.match(/^\/teacher\/songs\/([^/]+)$/);
  if (songMatch) {
    try {
      return { page: 'teacher-song', songId: decodeURIComponent(songMatch[1]) };
    } catch {
      return { page: 'home' };
    }
  }

  return { page: 'home' };
};

/** Converts a screen route into its canonical hash URL. */
export const routeToHash = (route: LessonRoute): string => {
  switch (route.page) {
    case 'home':
      return '#/';
    case 'practice':
    case 'teacher':
      return `#/${route.page}`;
    case 'teacher-lesson':
      return '#/teacher/lesson';
    case 'teacher-topics':
      return '#/teacher/topics';
    case 'teacher-review':
      return '#/teacher/review';
    case 'teacher-song':
      return `#/teacher/songs/${encodeURIComponent(route.songId)}`;
  }
};
