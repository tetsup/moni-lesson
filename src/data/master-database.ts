export const MASTER_DATABASE_KEY = 'moni-lesson-master-database';

export type MasterSong = {
  id: string;
  title: string;
  order: number;
  deleted: boolean;
};

export type MasterTopic = {
  id: string;
  title: string;
  order: number;
  deleted: boolean;
};

export type MasterDatabase = {
  version: 1;
  songs: MasterSong[];
  topics: MasterTopic[];
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const emptyMasterDatabase = (): MasterDatabase => ({
  version: 1,
  songs: [],
  topics: [],
});

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isMasterItem = (item: unknown): item is MasterSong | MasterTopic => {
  if (!item || typeof item !== 'object') return false;
  const value = item as Partial<MasterSong | MasterTopic>;
  return typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.order === 'number' &&
    typeof value.deleted === 'boolean';
};

export const loadMasterDatabase = (storage: StorageLike): MasterDatabase => {
  try {
    const raw = storage.getItem(MASTER_DATABASE_KEY);
    if (!raw) return emptyMasterDatabase();
    const parsed = JSON.parse(raw) as MasterDatabase;
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.songs) ||
      !Array.isArray(parsed.topics) ||
      !parsed.songs.every(isMasterItem) ||
      !parsed.topics.every(isMasterItem)
    ) return emptyMasterDatabase();
    return parsed;
  } catch {
    return emptyMasterDatabase();
  }
};

export const saveMasterDatabase = (database: MasterDatabase, storage: StorageLike): void => {
  storage.setItem(MASTER_DATABASE_KEY, JSON.stringify(database));
};

/** Lists non-deleted master songs, optionally filtered by a case-insensitive partial title match. */
export const listMasterSongs = (database: MasterDatabase, searchText = ''): MasterSong[] => {
  const query = searchText.trim().toLocaleLowerCase();
  return database.songs
    .filter((song) => !song.deleted && song.title.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.order - b.order);
};

/** Lists non-deleted master topics, optionally filtered by a case-insensitive partial title match. */
export const listMasterTopics = (database: MasterDatabase, searchText = ''): MasterTopic[] => {
  const query = searchText.trim().toLocaleLowerCase();
  return database.topics
    .filter((topic) => !topic.deleted && topic.title.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.order - b.order);
};

export const addMasterSong = (database: MasterDatabase, title: string): MasterDatabase => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return database;
  return {
    ...database,
    songs: [...database.songs, {
      id: createId(),
      title: normalizedTitle,
      order: Math.max(-1, ...database.songs.map((song) => song.order)) + 1,
      deleted: false,
    }],
  };
};

export const addMasterTopic = (database: MasterDatabase, title: string): MasterDatabase => {
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

export const softDeleteMasterSong = (database: MasterDatabase, songId: string): MasterDatabase => {
  if (!database.songs.some((song) => song.id === songId && !song.deleted)) return database;
  return {
    ...database,
    songs: database.songs.map((song) => song.id === songId ? { ...song, deleted: true } : song),
  };
};

export const softDeleteMasterTopic = (database: MasterDatabase, topicId: string): MasterDatabase => {
  if (!database.topics.some((topic) => topic.id === topicId && !topic.deleted)) return database;
  return {
    ...database,
    topics: database.topics.map((topic) => topic.id === topicId ? { ...topic, deleted: true } : topic),
  };
};

/** Copies the current lesson's non-deleted titles into an initially empty master database.
 * Existing lesson data is not modified; this is intended for a one-time migration.
 */
export const seedMasterDatabase = (
  database: MasterDatabase,
  songs: ReadonlyArray<{ id: string; title: string; deleted: boolean }>,
  topics: ReadonlyArray<{ id: string; title: string; deleted: boolean }>,
): MasterDatabase => {
  const knownSongIds = new Set(database.songs.map((song) => song.id));
  const knownTopicIds = new Set(database.topics.map((topic) => topic.id));
  const newSongs = songs.filter((song) => !knownSongIds.has(song.id))
    .map((song, index) => ({
      id: song.id,
      title: song.title,
      order: database.songs.length + index,
      deleted: song.deleted,
    }));
  const newTopics = topics.filter((topic) => !knownTopicIds.has(topic.id))
    .map((topic, index) => ({
      id: topic.id,
      title: topic.title,
      order: database.topics.length + index,
      deleted: topic.deleted,
    }));
  if (newSongs.length === 0 && newTopics.length === 0) return database;
  return {
    ...database,
    songs: [...database.songs, ...newSongs],
    topics: [...database.topics, ...newTopics],
  };
};
