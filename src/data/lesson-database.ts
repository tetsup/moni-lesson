export const LESSON_DATABASE_KEY = 'moni-lesson-database';

export type ExerciseAssignment = {
  topicId: string;
  active: boolean;
  targetCount?: number;
  pointsPerCompletion?: number;
  goalBonusPoints?: number;
};

export type Song = {
  id: string;
  title: string;
  order: number;
  deleted: boolean;
  exercises: ExerciseAssignment[];
  allGoalsBonusPoints?: number;
};

export type Topic = {
  id: string;
  title: string;
  order: number;
  deleted: boolean;
};

export type LessonDatabase = {
  version: 1;
  songs: Song[];
  topics: Topic[];
  currentSongId: string | null;
  dailyBonusPoints?: number;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const emptyLessonDatabase = (): LessonDatabase => ({
  version: 1,
  songs: [],
  topics: [],
  currentSongId: null,
});

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const loadLessonDatabase = (storage: StorageLike): LessonDatabase => {
  try {
    const raw = storage.getItem(LESSON_DATABASE_KEY);
    if (!raw) return emptyLessonDatabase();
    const parsed = JSON.parse(raw) as LessonDatabase;
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.songs) ||
      !Array.isArray(parsed.topics) ||
      (parsed.currentSongId !== null && typeof parsed.currentSongId !== 'string') ||
      !parsed.songs.every((song) => song && typeof song.id === 'string' &&
        typeof song.title === 'string' && typeof song.order === 'number' &&
        typeof song.deleted === 'boolean' && Array.isArray(song.exercises) &&
        song.exercises.every((exercise: ExerciseAssignment) =>
          exercise && typeof exercise.topicId === 'string' && typeof exercise.active === 'boolean')) ||
      !parsed.topics.every((topic) => topic && typeof topic.id === 'string' &&
        typeof topic.title === 'string' && typeof topic.order === 'number' &&
        typeof topic.deleted === 'boolean')
    ) return emptyLessonDatabase();
    return parsed;
  } catch {
    return emptyLessonDatabase();
  }
};

export const saveLessonDatabase = (database: LessonDatabase, storage: StorageLike): void => {
  storage.setItem(LESSON_DATABASE_KEY, JSON.stringify(database));
};

export const listSongs = (database: LessonDatabase): Song[] =>
  database.songs.filter((song) => !song.deleted).sort((a, b) => a.order - b.order);

export const listTopics = (database: LessonDatabase): Topic[] =>
  database.topics.filter((topic) => !topic.deleted).sort((a, b) => a.order - b.order);

export const addSong = (database: LessonDatabase, title: string): LessonDatabase => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return database;
  return {
    ...database,
    songs: [...database.songs, {
      id: createId(),
      title: normalizedTitle,
      order: Math.max(-1, ...database.songs.map((song) => song.order)) + 1,
      deleted: false,
      exercises: [],
    }],
  };
};

export const softDeleteSong = (database: LessonDatabase, songId: string): LessonDatabase => {
  if (!database.songs.some((song) => song.id === songId)) return database;
  return {
    ...database,
    songs: database.songs.map((song) => song.id === songId
      ? { ...song, deleted: true, exercises: [] }
      : song),
    currentSongId: database.currentSongId === songId ? null : database.currentSongId,
  };
};

export const moveSong = (database: LessonDatabase, songId: string, toIndex: number): LessonDatabase => {
  const ordered = listSongs(database);
  const fromIndex = ordered.findIndex((song) => song.id === songId);
  if (fromIndex < 0 || ordered.length < 2 || !Number.isFinite(toIndex)) return database;
  const targetIndex = Math.max(0, Math.min(ordered.length - 1, Math.trunc(toIndex)));
  if (fromIndex === targetIndex) return database;
  const [moved] = ordered.splice(fromIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  const orderById = new Map(ordered.map((song, index) => [song.id, index]));
  return {
    ...database,
    songs: database.songs.map((song) => orderById.has(song.id)
      ? { ...song, order: orderById.get(song.id)! }
      : song),
  };
};

export const setCurrentSong = (database: LessonDatabase, songId: string | null): LessonDatabase => {
  if (songId !== null && !database.songs.some((song) => song.id === songId && !song.deleted)) {
    return database;
  }
  return { ...database, currentSongId: songId };
};

export const addTopic = (database: LessonDatabase, title: string): LessonDatabase => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return database;
  return {
    ...database,
    topics: [...database.topics, {
      id: createId(),
      title: normalizedTitle,
      order: Math.max(-1, ...database.topics.map((topic) => topic.order)) + 1,
      deleted: false,
    }],
  };
};

export const softDeleteTopic = (database: LessonDatabase, topicId: string): LessonDatabase => {
  if (!database.topics.some((topic) => topic.id === topicId)) return database;
  return {
    ...database,
    topics: database.topics.map((topic) => topic.id === topicId ? { ...topic, deleted: true } : topic),
    songs: database.songs.map((song) => ({
      ...song,
      exercises: song.exercises.filter((exercise) => exercise.topicId !== topicId),
    })),
  };
};

export const moveTopic = (database: LessonDatabase, topicId: string, toIndex: number): LessonDatabase => {
  const ordered = listTopics(database);
  const fromIndex = ordered.findIndex((topic) => topic.id === topicId);
  if (fromIndex < 0 || ordered.length < 2 || !Number.isFinite(toIndex)) return database;
  const targetIndex = Math.max(0, Math.min(ordered.length - 1, Math.trunc(toIndex)));
  if (fromIndex === targetIndex) return database;
  const [moved] = ordered.splice(fromIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  const orderById = new Map(ordered.map((topic, index) => [topic.id, index]));
  return {
    ...database,
    topics: database.topics.map((topic) => orderById.has(topic.id)
      ? { ...topic, order: orderById.get(topic.id)! }
      : topic),
  };
};

/** Creates or updates the song's reference to a topic; only topic ID and active state are stored. */
export const setSongExercise = (
  database: LessonDatabase,
  songId: string,
  topicId: string,
  active: boolean,
): LessonDatabase => {
  const song = database.songs.find((item) => item.id === songId && !item.deleted);
  const topicExists = database.topics.some((item) => item.id === topicId && !item.deleted);
  if (!song || !topicExists) return database;

  const hasExercise = song.exercises.some((exercise) => exercise.topicId === topicId);
  return {
    ...database,
    songs: database.songs.map((item) => item.id !== songId ? item : {
      ...item,
      exercises: hasExercise
        ? item.exercises.map((exercise) => exercise.topicId === topicId ? { ...exercise, active } : exercise)
        : [...item.exercises, { topicId, active }],
    }),
  };
};

export const setExerciseTargetCount = (
  database: LessonDatabase,
  songId: string,
  topicId: string,
  targetCount: number,
): LessonDatabase => {
  if (!Number.isSafeInteger(targetCount) || targetCount < 1) return database;
  return {
    ...database,
    songs: database.songs.map((song) => song.id !== songId ? song : {
      ...song,
      exercises: song.exercises.map((exercise) =>
        exercise.topicId === topicId ? { ...exercise, targetCount } : exercise),
    }),
  };
};

export const setExercisePoints = (
  database: LessonDatabase,
  songId: string,
  topicId: string,
  field: 'pointsPerCompletion' | 'goalBonusPoints',
  points: number,
): LessonDatabase => {
  if (!Number.isSafeInteger(points) || points < 0) return database;
  return {
    ...database,
    songs: database.songs.map((song) => song.id !== songId ? song : {
      ...song,
      exercises: song.exercises.map((exercise) =>
        exercise.topicId === topicId ? { ...exercise, [field]: points } : exercise),
    }),
  };
};

export const setSongBonusPoints = (
  database: LessonDatabase,
  songId: string,
  points: number,
): LessonDatabase => {
  if (!Number.isSafeInteger(points) || points < 0) return database;
  return {
    ...database,
    songs: database.songs.map((song) =>
      song.id === songId ? { ...song, allGoalsBonusPoints: points } : song),
  };
};

export const setDailyBonusPoints = (database: LessonDatabase, points: number): LessonDatabase => {
  if (!Number.isSafeInteger(points) || points < 0) return database;
  return { ...database, dailyBonusPoints: points };
};

export const getActiveExercises = (database: LessonDatabase, songId: string): ExerciseAssignment[] => {
  const song = database.songs.find((item) => item.id === songId && !item.deleted);
  if (!song) return [];
  return song.exercises.filter((exercise) =>
    exercise.active && database.topics.some((topic) => topic.id === exercise.topicId && !topic.deleted));
};
