export type LessonRoute = { page: 'practice' } | { page: 'teacher' } | { page: 'complete' } | { page: 'admin' } | { page: 'recordings' } | { page: 'shop' } | { page: 'items' };

export type LessonProgress = {
  songs: Array<{ songId: string; topicIds: string[] }>;
  currentSongIndex: number;
  currentTopicIndex: number;
};

export type LessonPrimaryAction = {
  label: string;
  action: 'advance' | 'finish';
};

export type LessonActionResult =
  | { type: 'advance'; songIndex: number; topicIndex: number }
  | { type: 'navigate'; route: 'complete' }
  | { type: 'invalid' };

const isLastTopic = (progress: LessonProgress): boolean => {
  const song = progress.songs[progress.currentSongIndex];
  return Boolean(song) && progress.currentTopicIndex === song.topicIds.length - 1;
};

const isLastSong = (progress: LessonProgress): boolean =>
  progress.currentSongIndex === progress.songs.length - 1;

export const getLessonPrimaryAction = (progress: LessonProgress): LessonPrimaryAction => {
  const song = progress.songs[progress.currentSongIndex];
  if (!song) return { label: '次のお題へ', action: 'advance' };

  if (isLastTopic(progress) && isLastSong(progress)) {
    return { label: 'レッスン終了！', action: 'finish' };
  }

  if (isLastTopic(progress)) {
    return { label: '次の曲', action: 'advance' };
  }

  return { label: '次のお題へ', action: 'advance' };
};

export const resolveLessonAction = (
  progress: LessonProgress,
  action: LessonPrimaryAction['action'],
): LessonActionResult => {
  const song = progress.songs[progress.currentSongIndex];
  if (!song || progress.currentTopicIndex < 0 || progress.currentTopicIndex >= song.topicIds.length) {
    return { type: 'invalid' };
  }

  if (action === 'finish') {
    return isLastTopic(progress) && isLastSong(progress)
      ? { type: 'navigate', route: 'complete' }
      : { type: 'invalid' };
  }

  if (progress.currentTopicIndex < song.topicIds.length - 1) {
    return {
      type: 'advance',
      songIndex: progress.currentSongIndex,
      topicIndex: progress.currentTopicIndex + 1,
    };
  }

  const nextSongIndex = progress.currentSongIndex + 1;
  const nextSong = progress.songs[nextSongIndex];
  if (nextSong && nextSong.topicIds.length > 0) {
    return { type: 'advance', songIndex: nextSongIndex, topicIndex: 0 };
  }

  return { type: 'invalid' };
};

export const resolveHashRoute = (hash: string): LessonRoute => {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/teacher') return { page: 'teacher' };
  if (path === '/complete') return { page: 'complete' };
  if (path === '/admin') return { page: 'admin' };
  if (path === '/recordings') return { page: 'recordings' };
  if (path === '/shop') return { page: 'shop' };
  if (path === '/items') return { page: 'items' };
  return { page: 'practice' };
};
