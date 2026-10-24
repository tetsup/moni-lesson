export const LESSON_SESSION_KEY = 'moni-lesson-session';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type LessonExercise = {
  topicId: string;
  topicTitle: string;
  targetCount: number;
  pointsPerCompletion: number;
  goalBonusPoints: number;
  completionCount: number;
  goalBonusAwarded: boolean;
};

export type LessonSong = {
  songId: string;
  songTitle: string;
  order: number;
  exercises: LessonExercise[];
  allGoalsBonusPoints: number;
  allGoalsBonusAwarded: boolean;
};

export type LessonSession = {
  version: 1;
  date: string;
  songs: LessonSong[];
  dailyBonusPoints: number;
  dailyBonusAwarded: boolean;
  totalPoints: number;
  todayPoints: number;
};

export type LessonSongSetup = {
  songId: string;
  songTitle: string;
  order: number;
  exercises: Array<{
    topicId: string;
    topicTitle: string;
    targetCount: number;
    pointsPerCompletion: number;
    goalBonusPoints: number;
  }>;
  allGoalsBonusPoints: number;
};

export const createLessonSession = (
  date: string,
  songs: LessonSongSetup[],
  dailyBonusPoints: number,
  totalPoints = 0,
): LessonSession => ({
  version: 1,
  date,
  songs: songs
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((song) => ({
      songId: song.songId,
      songTitle: song.songTitle,
      order: song.order,
      exercises: song.exercises.map((exercise) => ({
        ...exercise,
        completionCount: 0,
        goalBonusAwarded: false,
      })),
      allGoalsBonusPoints: song.allGoalsBonusPoints,
      allGoalsBonusAwarded: false,
    })),
  dailyBonusPoints,
  dailyBonusAwarded: false,
  totalPoints,
  todayPoints: 0,
});

/**
 * Rebuilds the current lesson from teacher settings without discarding today's progress.
 * Earned points are historical and are never withdrawn when the setup changes.
 */
export const updateLessonSessionForSetup = (
  previous: LessonSession,
  date: string,
  songs: LessonSongSetup[],
  dailyBonusPoints: number,
): LessonSession => {
  const next = createLessonSession(date, songs, dailyBonusPoints, previous.totalPoints);
  if (previous.date !== date) return next;

  return {
    ...next,
    todayPoints: previous.todayPoints,
    dailyBonusAwarded: previous.dailyBonusAwarded,
    songs: next.songs.map((song) => {
      const oldSong = previous.songs.find((item) => item.songId === song.songId);
      if (!oldSong) return song;
      return {
        ...song,
        allGoalsBonusAwarded: oldSong.allGoalsBonusAwarded,
        exercises: song.exercises.map((exercise) => {
          const oldExercise = oldSong.exercises.find((item) => item.topicId === exercise.topicId);
          if (!oldExercise) return exercise;
          return {
            ...exercise,
            completionCount: oldExercise.completionCount,
            goalBonusAwarded: oldExercise.goalBonusAwarded,
          };
        }),
      };
    }),
  };
};

const isLessonSession = (value: unknown): value is LessonSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as LessonSession;
  return session.version === 1 &&
    typeof session.date === 'string' &&
    Array.isArray(session.songs) &&
    typeof session.dailyBonusPoints === 'number' &&
    typeof session.dailyBonusAwarded === 'boolean' &&
    typeof session.totalPoints === 'number' &&
    typeof session.todayPoints === 'number';
};

export const loadLessonSession = (storage: StorageLike): LessonSession | null => {
  try {
    const raw = storage.getItem(LESSON_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLessonSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveLessonSession = (session: LessonSession, storage: StorageLike): void => {
  storage.setItem(LESSON_SESSION_KEY, JSON.stringify(session));
};

/** Call when opening a page that uses the current lesson. Keeps its setup and lifetime points. */
export const resetLessonSessionForDate = (
  session: LessonSession,
  date: string,
): LessonSession => {
  if (session.date === date) return session;
  return {
    ...session,
    date,
    songs: session.songs.map((song) => ({
      ...song,
      exercises: song.exercises.map((exercise) => ({
        ...exercise,
        completionCount: 0,
        goalBonusAwarded: false,
      })),
      allGoalsBonusAwarded: false,
    })),
    dailyBonusAwarded: false,
    todayPoints: 0,
  };
};

const hasGoals = (song: LessonSong): boolean => song.exercises.length > 0;

const areSongGoalsAchieved = (song: LessonSong): boolean =>
  hasGoals(song) && song.exercises.every((exercise) => exercise.completionCount >= exercise.targetCount);

const areAllLessonGoalsAchieved = (songs: LessonSong[]): boolean =>
  songs.length > 0 &&
  songs.every((song) => hasGoals(song) && areSongGoalsAchieved(song));

/** Records one child-initiated completion and grants each newly earned bonus once. */
export const recordExerciseCompletion = (
  session: LessonSession,
  songId: string,
  topicId: string,
): LessonSession => {
  const song = session.songs.find((item) => item.songId === songId);
  const exercise = song?.exercises.find((item) => item.topicId === topicId);
  if (!song || !exercise) return session;

  const nextExercise = {
    ...exercise,
    completionCount: exercise.completionCount + 1,
  };
  const nextExercises = song.exercises.map((item) =>
    item.topicId === topicId ? nextExercise : item,
  );
  const nextSong = { ...song, exercises: nextExercises };
  let earnedPoints = exercise.pointsPerCompletion;

  if (
    !exercise.goalBonusAwarded &&
    nextExercise.completionCount >= exercise.targetCount
  ) {
    nextExercise.goalBonusAwarded = true;
    earnedPoints += exercise.goalBonusPoints;
  }

  if (
    !song.allGoalsBonusAwarded &&
    areSongGoalsAchieved(nextSong)
  ) {
    nextSong.allGoalsBonusAwarded = true;
    earnedPoints += song.allGoalsBonusPoints;
  }

  const nextSongs = session.songs.map((item) =>
    item.songId === songId ? nextSong : item,
  );
  let dailyBonusAwarded = session.dailyBonusAwarded;
  if (!dailyBonusAwarded && areAllLessonGoalsAchieved(nextSongs)) {
    dailyBonusAwarded = true;
    earnedPoints += session.dailyBonusPoints;
  }

  return {
    ...session,
    songs: nextSongs,
    dailyBonusAwarded,
    totalPoints: session.totalPoints + earnedPoints,
    todayPoints: session.todayPoints + earnedPoints,
  };
};
