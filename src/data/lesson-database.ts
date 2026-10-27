export const LESSON_DATABASE_KEY = 'moni-lesson-database';

export type ExerciseAssignment = {
  topicId: string;
  topicTitle: string;
  targetCount?: number;
  repeatAllowed?: boolean;
  pointsPerCompletion?: number;
  goalBonusPoints?: number;
  minimumIntervalSeconds?: number;
};

export type Song = {
  id: string;
  title: string;
  order: number;
  deleted: boolean;
  exercises: ExerciseAssignment[];
  allGoalsBonusPoints?: number;
};

export type LessonDatabase = {
  version: 2;
  songs: Song[];
  currentSongId: string | null;
  dailyBonusPoints?: number;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const emptyLessonDatabase = (): LessonDatabase => ({
  version: 2,
  songs: [],
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
    const parsed = JSON.parse(raw) as any;
    if (!Array.isArray(parsed?.songs) ||
      (parsed.currentSongId !== null && typeof parsed.currentSongId !== 'string')) return emptyLessonDatabase();
    // Migrate the old independent topic list and active flags into title-snapshotted assignments.
    if (parsed.version === 1 && Array.isArray(parsed.topics)) {
      const topics = new Map<string, { id: string; title: string }>(parsed.topics.map((topic: any) => [topic.id, topic]));
      const songs = parsed.songs.map((song: any) => ({
        ...song,
        exercises: (Array.isArray(song.exercises) ? song.exercises : []).flatMap((exercise: any) => {
          if (!exercise?.active || typeof exercise.topicId !== 'string') return [];
          const topic = topics.get(exercise.topicId);
          if (!topic) return [];
          const { active: _active, ...settings } = exercise;
          return [{ ...settings, topicTitle: topic.title }];
        }),
      }));
      return { version: 2, songs, currentSongId: parsed.currentSongId, dailyBonusPoints: parsed.dailyBonusPoints };
    }
    if (parsed.version !== 2 || !parsed.songs.every((song: any) =>
      song && typeof song.id === 'string' && typeof song.title === 'string' &&
      typeof song.order === 'number' && typeof song.deleted === 'boolean' &&
      Array.isArray(song.exercises) && song.exercises.every((exercise: any) =>
        exercise && typeof exercise.topicId === 'string' && typeof exercise.topicTitle === 'string'))) {
      return emptyLessonDatabase();
    }
    return parsed as LessonDatabase;
  } catch {
    return emptyLessonDatabase();
  }
};

export const saveLessonDatabase = (database: LessonDatabase, storage: StorageLike): void => {
  storage.setItem(LESSON_DATABASE_KEY, JSON.stringify(database));
};

export const listSongs = (database: LessonDatabase): Song[] =>
  database.songs.filter((song) => !song.deleted).sort((a, b) => a.order - b.order);



export const deleteSong = (database: LessonDatabase, songId: string): LessonDatabase => {
  if (!database.songs.some((song) => song.id === songId)) return database;
  return {
    ...database,
    songs: database.songs.filter((song) => song.id !== songId),
    currentSongId: database.currentSongId === songId ? null : database.currentSongId,
  };
};

/** Adds a master song as a new entry in today's lesson list. Lesson settings start empty. */
export const addSongFromMaster = (
  database: LessonDatabase,
  masterSong: { id: string; title: string; deleted: boolean },
): LessonDatabase => {
  if (masterSong.deleted || database.songs.some((song) => song.id === masterSong.id)) return database;
  return {
    ...database,
    songs: [...database.songs, {
      id: masterSong.id,
      title: masterSong.title,
      order: Math.max(-1, ...database.songs.map((song) => song.order)) + 1,
      deleted: false,
      exercises: [],
    }],
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

/** Reorders one song's assigned topics, keeping each topic's settings attached. */
export const moveExercise = (
  database: LessonDatabase,
  songId: string,
  topicId: string,
  toIndex: number,
): LessonDatabase => {
  const song = database.songs.find((item) => item.id === songId && !item.deleted);
  if (!song || song.exercises.length < 2 || !Number.isFinite(toIndex)) return database;
  const fromIndex = song.exercises.findIndex((exercise) => exercise.topicId === topicId);
  if (fromIndex < 0) return database;
  const targetIndex = Math.max(0, Math.min(song.exercises.length - 1, Math.trunc(toIndex)));
  if (fromIndex === targetIndex) return database;
  const exercises = [...song.exercises];
  const [moved] = exercises.splice(fromIndex, 1);
  exercises.splice(targetIndex, 0, moved);
  return {
    ...database,
    songs: database.songs.map((item) => item.id === songId ? { ...item, exercises } : item),
  };
};

export const setCurrentSong = (database: LessonDatabase, songId: string | null): LessonDatabase => {
  if (songId !== null && !database.songs.some((song) => song.id === songId && !song.deleted)) {
    return database;
  }
  return { ...database, currentSongId: songId };
};

/** Add a topic selected from the independent master directly to one song. */
export const addTopicFromMaster = (
  database: LessonDatabase,
  songId: string,
  masterTopic: { id: string; title: string; deleted: boolean },
): LessonDatabase => {
  const song = database.songs.find((item) => item.id === songId && !item.deleted);
  if (!song || masterTopic.deleted || song.exercises.some((exercise) => exercise.topicId === masterTopic.id)) return database;
  return {
    ...database,
    songs: database.songs.map((item) => item.id !== songId ? item : {
      ...item,
      exercises: [...item.exercises, { topicId: masterTopic.id, topicTitle: masterTopic.title }],
    }),
  };
};

/** Remove an assignment from one song; the master topic is unaffected. */
export const removeTopicFromSong = (database: LessonDatabase, songId: string, topicId: string): LessonDatabase => {
  const song = database.songs.find((item) => item.id === songId);
  if (!song || !song.exercises.some((exercise) => exercise.topicId === topicId)) return database;
  return {
    ...database,
    songs: database.songs.map((item) => item.id !== songId ? item : {
      ...item, exercises: item.exercises.filter((exercise) => exercise.topicId !== topicId),
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

export const setExerciseRepeatAllowed = (
  database: LessonDatabase,
  songId: string,
  topicId: string,
  repeatAllowed: boolean,
): LessonDatabase => ({
  ...database,
  songs: database.songs.map((song) => song.id !== songId ? song : {
    ...song,
    exercises: song.exercises.map((exercise) =>
      exercise.topicId === topicId ? { ...exercise, repeatAllowed } : exercise),
  }),
});

export const setExerciseMinimumInterval = (
  database: LessonDatabase,
  songId: string,
  topicId: string,
  seconds: number,
): LessonDatabase => {
  if (!Number.isSafeInteger(seconds) || seconds < 0) return database;
  return {
    ...database,
    songs: database.songs.map((song) => song.id !== songId ? song : {
      ...song,
      exercises: song.exercises.map((exercise) =>
        exercise.topicId === topicId ? { ...exercise, minimumIntervalSeconds: seconds } : exercise),
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

/** All assignments are selected; no active flag or separate topic list exists. */
export const listSongExercises = (database: LessonDatabase, songId: string): ExerciseAssignment[] => {
  const song = database.songs.find((item) => item.id === songId && !item.deleted);
  return song ? song.exercises : [];
};

