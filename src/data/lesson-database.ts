export const LESSON_DATABASE_KEY = 'moni-lesson-database';

export type Song = {
  id: string;
  title: string;
  order: number;
  deleted: boolean;
};

export type Topic = {
  id: string;
  title: string;
  order: number;
  deleted: boolean;
};

export type SongTopicAssignment = {
  id: string;
  songId: string;
  topicId: string;
  active: boolean;
};

export type LessonDatabase = {
  version: 1;
  songs: Song[];
  topics: Topic[];
  assignments: SongTopicAssignment[];
  currentSongId: string | null;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const emptyLessonDatabase = (): LessonDatabase => ({
  version: 1,
  songs: [],
  topics: [],
  assignments: [],
  currentSongId: null,
});

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const loadLessonDatabase = (storage: StorageLike): LessonDatabase => {
  try {
    const raw = storage.getItem(LESSON_DATABASE_KEY);
    if (!raw) return emptyLessonDatabase();
    const parsed = JSON.parse(raw) as LessonDatabase;
    if (parsed.version !== 1 || !Array.isArray(parsed.songs) ||
      !Array.isArray(parsed.topics) || !Array.isArray(parsed.assignments)) {
      return emptyLessonDatabase();
    }
    return parsed;
  } catch {
    return emptyLessonDatabase();
  }
};

export const saveLessonDatabase = (database: LessonDatabase, storage: StorageLike): void => {
  storage.setItem(LESSON_DATABASE_KEY, JSON.stringify(database));
};

export const addSong = (database: LessonDatabase, title: string): LessonDatabase => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return database;
  return {
    ...database,
    songs: [...database.songs, {
      id: createId(), title: normalizedTitle,
      order: Math.max(-1, ...database.songs.map((song) => song.order)) + 1,
      deleted: false,
    }],
  };
};

export const softDeleteSong = (database: LessonDatabase, songId: string): LessonDatabase => ({
  ...database,
  songs: database.songs.map((song) => song.id === songId ? { ...song, deleted: true } : song),
  currentSongId: database.currentSongId === songId ? null : database.currentSongId,
});

export const moveSong = (database: LessonDatabase, songId: string, toIndex: number): LessonDatabase => {
  const ordered = database.songs.filter((song) => !song.deleted).sort((a, b) => a.order - b.order);
  const fromIndex = ordered.findIndex((song) => song.id === songId);
  if (fromIndex < 0 || ordered.length < 2) return database;
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
      id: createId(), title: normalizedTitle,
      order: Math.max(-1, ...database.topics.map((topic) => topic.order)) + 1,
      deleted: false,
    }],
  };
};

export const softDeleteTopic = (database: LessonDatabase, topicId: string): LessonDatabase => ({
  ...database,
  topics: database.topics.map((topic) => topic.id === topicId ? { ...topic, deleted: true } : topic),
});

export const moveTopic = (database: LessonDatabase, topicId: string, toIndex: number): LessonDatabase => {
  const ordered = database.topics.filter((topic) => !topic.deleted).sort((a, b) => a.order - b.order);
  const fromIndex = ordered.findIndex((topic) => topic.id === topicId);
  if (fromIndex < 0 || ordered.length < 2) return database;
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

export const setSongTopicAssignment = (
  database: LessonDatabase,
  songId: string,
  topicId: string,
  active: boolean,
): LessonDatabase => {
  const songExists = database.songs.some((song) => song.id === songId && !song.deleted);
  const topicExists = database.topics.some((topic) => topic.id === topicId && !topic.deleted);
  if (!songExists || !topicExists) return database;

  const existing = database.assignments.find(
    (assignment) => assignment.songId === songId && assignment.topicId === topicId,
  );
  if (existing) {
    return {
      ...database,
      assignments: database.assignments.map((assignment) =>
        assignment.id === existing.id ? { ...assignment, active } : assignment),
    };
  }
  return {
    ...database,
    assignments: [...database.assignments, { id: createId(), songId, topicId, active }],
  };
};
