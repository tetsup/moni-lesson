import { describe, expect, it } from 'vitest';
import {
  MASTER_DATABASE_KEY,
  addMasterSong,
  addMasterTopic,
  emptyMasterDatabase,
  listMasterSongs,
  listMasterTopics,
  loadMasterDatabase,
  saveMasterDatabase,
  seedMasterDatabase,
  softDeleteMasterSong,
  softDeleteMasterTopic,
} from './master-database';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('master database persistence', () => {
  it('starts empty and saves/reloads master data independently', () => {
    const storage = new MemoryStorage();
    let database = addMasterSong(emptyMasterDatabase(), 'きらきら星');
    database = addMasterTopic(database, '右手だけ');
    saveMasterDatabase(database, storage);
    expect(storage.getItem(MASTER_DATABASE_KEY)).not.toBeNull();
    expect(loadMasterDatabase(storage)).toEqual(database);
  });

  it('returns an empty database for malformed or unsupported data', () => {
    const storage = new MemoryStorage();
    storage.setItem(MASTER_DATABASE_KEY, '{broken');
    expect(loadMasterDatabase(storage)).toEqual(emptyMasterDatabase());
    storage.setItem(MASTER_DATABASE_KEY, JSON.stringify({ version: 9, songs: [], topics: [] }));
    expect(loadMasterDatabase(storage)).toEqual(emptyMasterDatabase());
  });
});

describe('master songs and topics', () => {
  it('trims names, appends in order, and ignores blank names', () => {
    const empty = emptyMasterDatabase();
    const songs = addMasterSong(empty, ' 曲A ');
    expect(listMasterSongs(songs)).toMatchObject([{ title: '曲A', order: 0, deleted: false }]);
    expect(addMasterSong(songs, '  ')).toBe(songs);

    const topics = addMasterTopic(empty, ' お題A ');
    expect(listMasterTopics(topics)).toMatchObject([{ title: 'お題A', order: 0, deleted: false }]);
    expect(addMasterTopic(topics, '\n ')).toBe(topics);
  });

  it('soft-deletes master entries without removing them or creating song-topic links', () => {
    let database = addMasterSong(emptyMasterDatabase(), '曲A');
    database = addMasterTopic(database, 'お題A');
    const deletedSong = softDeleteMasterSong(database, database.songs[0].id);
    const deletedTopic = softDeleteMasterTopic(database, database.topics[0].id);
    expect(deletedSong.songs[0].deleted).toBe(true);
    expect(listMasterSongs(deletedSong)).toEqual([]);
    expect(deletedTopic.topics[0].deleted).toBe(true);
    expect(listMasterTopics(deletedTopic)).toEqual([]);
    expect(database).not.toHaveProperty('assignments');
    expect(database.songs[0]).not.toHaveProperty('topicIds');
  });

  it('does not change state when asked to delete an unknown or already deleted item', () => {
    const database = addMasterSong(emptyMasterDatabase(), '曲A');
    expect(softDeleteMasterSong(database, 'missing')).toBe(database);
    const deleted = softDeleteMasterSong(database, database.songs[0].id);
    expect(softDeleteMasterSong(deleted, database.songs[0].id)).toBe(deleted);
  });

  it('seeds existing active lesson entries once while preserving IDs', () => {
    const songs = [
      { id: 's1', title: '曲A', deleted: false },
      { id: 's2', title: '曲B', deleted: true },
    ];
    const topics = [
      { id: 't1', title: 'お題A', deleted: false },
      { id: 't2', title: 'お題B', deleted: true },
    ];
    const seeded = seedMasterDatabase(emptyMasterDatabase(), songs, topics);
    expect(listMasterSongs(seeded)).toMatchObject([{ id: 's1', title: '曲A' }]);
    expect(listMasterTopics(seeded)).toMatchObject([{ id: 't1', title: 'お題A' }]);
    expect(seedMasterDatabase(seeded, songs, topics)).toBe(seeded);
  });
});
