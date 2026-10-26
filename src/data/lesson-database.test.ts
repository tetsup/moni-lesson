import { beforeEach, describe, expect, it } from 'vitest';
import {
  LESSON_DATABASE_KEY,
  addSong,
  addSongFromMaster,
  addTopic,
  addTopicFromMaster,
  emptyLessonDatabase,
  getActiveExercises,
  listSongs,
  listTopics,
  loadLessonDatabase,
  moveSong,
  moveTopic,
  saveLessonDatabase,
  setCurrentSong,
  setSongExercise,
  deleteSong,
  deleteTopic,
  type LessonDatabase,
} from './lesson-database';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const makeDatabase = (): LessonDatabase => ({
  version: 1,
  songs: [
    { id: 's1', title: 'Song 1', order: 0, deleted: false, exercises: [] },
    { id: 's2', title: 'Song 2', order: 1, deleted: false, exercises: [] },
    { id: 's3', title: 'Song 3', order: 2, deleted: false, exercises: [] },
  ],
  topics: [
    { id: 't1', title: 'Topic 1', order: 0, deleted: false },
    { id: 't2', title: 'Topic 2', order: 1, deleted: false },
    { id: 't3', title: 'Topic 3', order: 2, deleted: false },
  ],
  currentSongId: null,
});

describe('lesson database persistence', () => {
  let storage: MemoryStorage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it('starts empty when storage has no saved database', () => {
    expect(loadLessonDatabase(storage)).toEqual(emptyLessonDatabase());
  });

  it('saves and reloads all three data areas', () => {
    const db = setSongExercise(setCurrentSong(makeDatabase(), 's2'), 's2', 't1', true);
    saveLessonDatabase(db, storage);
    expect(storage.getItem(LESSON_DATABASE_KEY)).not.toBeNull();
    expect(loadLessonDatabase(storage)).toEqual(db);
  });

  it('returns an empty database for invalid JSON or an unsupported shape', () => {
    storage.setItem(LESSON_DATABASE_KEY, '{broken');
    expect(loadLessonDatabase(storage)).toEqual(emptyLessonDatabase());
    storage.setItem(LESSON_DATABASE_KEY, JSON.stringify({ version: 99, songs: [], topics: [] }));
    expect(loadLessonDatabase(storage)).toEqual(emptyLessonDatabase());
  });
});

describe('songs', () => {
  it('adds trimmed titles with a new ID, next order and an empty exercises array', () => {
    const db = addSong(makeDatabase(), '  New song  ');
    const added = db.songs[3];
    expect(added.title).toBe('New song');
    expect(added.id).toBeTruthy();
    expect(added.order).toBe(3);
    expect(added.deleted).toBe(false);
    expect(added.exercises).toEqual([]);
  });

  it('does not add a blank title', () => {
    const db = makeDatabase();
    expect(addSong(db, '  ')).toBe(db);
  });

  it('adds a selected master song to today with fresh lesson settings and rejects duplicates/deleted masters', () => {
    const initial = makeDatabase();
    const masterSong = { id: 'master-song', title: 'Master song', deleted: false };
    const added = addSongFromMaster(initial, masterSong);
    expect(added.songs[3]).toMatchObject({
      id: 'master-song', title: 'Master song', order: 3, deleted: false, exercises: [],
    });
    expect(addSongFromMaster(added, masterSong)).toBe(added);
    expect(addSongFromMaster(initial, { ...masterSong, deleted: true })).toBe(initial);
    expect(initial.songs).toHaveLength(3);
  });

  it('completely removes a song and clears it if it was current', () => {
    let db = makeDatabase();
    db = setSongExercise(db, 's2', 't1', true);
    db = setSongExercise(db, 's2', 't2', false);
    db = setCurrentSong(db, 's2');
    const deleted = deleteSong(db, 's2');
    expect(deleted.songs.find((song) => song.id === 's2')).toBeUndefined();
    expect(deleted.songs).toHaveLength(2);
    expect(deleted.currentSongId).toBeNull();
    expect(listSongs(deleted).map((song) => song.id)).toEqual(['s1', 's3']);
    expect(deleted.topics.every((topic) => !topic.deleted)).toBe(true);
  });

  it('does not change state when asked to delete an unknown song', () => {
    const db = makeDatabase();
    expect(deleteSong(db, 'missing')).toBe(db);
  });

  it('does not mutate the original database when soft-deleting a song', () => {
    let db = makeDatabase();
    db = setSongExercise(db, 's2', 't1', true);
    const deleted = deleteSong(db, 's2');
    expect(db.songs.find((song) => song.id === 's2')?.exercises).toEqual([{ topicId: 't1', active: true }]);
    expect(deleted.songs.find((song) => song.id === 's2')).toBeUndefined();
    expect(deleted.songs.find((song) => song.id === 's1')?.exercises).toEqual([]);
  });

  it('reorders active songs and normalizes their order values', () => {
    const db = moveSong(makeDatabase(), 's3', 0);
    expect(listSongs(db).map((song) => song.id)).toEqual(['s3', 's1', 's2']);
    expect(listSongs(db).map((song) => song.order)).toEqual([0, 1, 2]);
  });

  it('clamps reorder positions and ignores deleted or unknown songs', () => {
    const initial = deleteSong(makeDatabase(), 's2');
    expect(listSongs(moveSong(initial, 's1', 100)).map((song) => song.id)).toEqual(['s3', 's1']);
    expect(moveSong(initial, 's2', 0)).toBe(initial);
    expect(moveSong(initial, 'missing', 0)).toBe(initial);
  });

  it('selects only existing non-deleted songs as current', () => {
    const db = makeDatabase();
    expect(setCurrentSong(db, 's1').currentSongId).toBe('s1');
    expect(setCurrentSong(db, 'missing')).toBe(db);
    expect(setCurrentSong(deleteSong(db, 's1'), 's1').currentSongId).toBeNull();
    expect(setCurrentSong(db, null).currentSongId).toBeNull();
  });
});

describe('topics', () => {
  it('adds trimmed titles with the next order', () => {
    const db = addTopic(makeDatabase(), '  Scales  ');
    expect(db.topics[3]).toMatchObject({ title: 'Scales', order: 3, deleted: false });
    expect(db.topics[3].id).toBeTruthy();
  });

  it('does not add a blank topic', () => {
    const db = makeDatabase();
    expect(addTopic(db, ' \n ')).toBe(db);
  });

  it('adds a selected master topic to today and rejects duplicates/deleted masters', () => {
    const initial = makeDatabase();
    const masterTopic = { id: 'master-topic', title: 'Master topic', deleted: false };
    const added = addTopicFromMaster(initial, masterTopic);
    expect(added.topics[3]).toMatchObject({
      id: 'master-topic', title: 'Master topic', order: 3, deleted: false,
    });
    expect(addTopicFromMaster(added, masterTopic)).toBe(added);
    expect(addTopicFromMaster(initial, { ...masterTopic, deleted: true })).toBe(initial);
    expect(initial.topics).toHaveLength(3);
  });

  it('completely removes a topic and its references from every song', () => {
    let db = makeDatabase();
    db = setSongExercise(db, 's1', 't2', true);
    db = setSongExercise(db, 's2', 't2', false);
    db = setSongExercise(db, 's3', 't1', true);
    const deleted = deleteTopic(db, 't2');
    expect(deleted.topics).toHaveLength(2);
    expect(deleted.topics.find((topic) => topic.id === 't2')).toBeUndefined();
    expect(listTopics(deleted).map((topic) => topic.id)).toEqual(['t1', 't3']);
    expect(deleted.songs.find((song) => song.id === 's1')?.exercises).toEqual([]);
    expect(deleted.songs.find((song) => song.id === 's2')?.exercises).toEqual([]);
    expect(deleted.songs.find((song) => song.id === 's3')?.exercises).toEqual([{ topicId: 't1', active: true }]);
  });

  it('does not change state when asked to delete an unknown topic', () => {
    const db = makeDatabase();
    expect(deleteTopic(db, 'missing')).toBe(db);
  });

  it('removes topic references from every song', () => {
    let db = makeDatabase();
    db = setSongExercise(db, 's1', 't2', true);
    db = setSongExercise(db, 's2', 't2', false);
    db = setSongExercise(db, 's3', 't1', true);
    db = deleteSong(db, 's2');
    const deleted = deleteTopic(db, 't2');
    expect(deleted.songs.find((song) => song.id === 's1')?.exercises).toEqual([]);
    expect(deleted.songs.find((song) => song.id === 's2')?.exercises).toEqual([]);
    expect(deleted.songs.find((song) => song.id === 's3')?.exercises).toEqual([{ topicId: 't1', active: true }]);
  });

  it('does not mutate the original database when deleting a topic', () => {
    let db = makeDatabase();
    db = setSongExercise(db, 's1', 't1', true);
    db = setSongExercise(db, 's1', 't2', true);
    const deleted = deleteTopic(db, 't2');
    expect(db.songs[0].exercises).toHaveLength(2);
    expect(deleted.songs[0].exercises).toEqual([{ topicId: 't1', active: true }]);
  });

  it('reorders active topics and normalizes their order values', () => {
    const db = moveTopic(makeDatabase(), 't3', 0);
    expect(listTopics(db).map((topic) => topic.id)).toEqual(['t3', 't1', 't2']);
    expect(listTopics(db).map((topic) => topic.order)).toEqual([0, 1, 2]);
  });

  it('ignores deleted or unknown topics during reorder', () => {
    const db = deleteTopic(makeDatabase(), 't2');
    expect(moveTopic(db, 't2', 0)).toBe(db);
    expect(moveTopic(db, 'missing', 0)).toBe(db);
  });
});

describe('song exercises (topic ID references)', () => {
  it('stores only topic ID and active state on the song', () => {
    const db = setSongExercise(makeDatabase(), 's1', 't2', true);
    expect(db.songs[0].exercises).toEqual([{ topicId: 't2', active: true }]);
    expect(Object.keys(db.songs[0].exercises[0]).sort()).toEqual(['active', 'topicId']);
    expect(db).not.toHaveProperty('assignments');
  });

  it('updates an existing exercise rather than creating duplicate references', () => {
    const once = setSongExercise(makeDatabase(), 's1', 't1', true);
    const twice = setSongExercise(once, 's1', 't1', false);
    expect(twice.songs[0].exercises).toEqual([{ topicId: 't1', active: false }]);
  });

  it('does not assign missing or deleted songs or topics', () => {
    const db = makeDatabase();
    expect(setSongExercise(db, 'missing', 't1', true)).toBe(db);
    expect(setSongExercise(db, 's1', 'missing', true)).toBe(db);
    expect(setSongExercise(deleteSong(db, 's1'), 's1', 't1', true).songs[0].exercises).toEqual([]);
    expect(setSongExercise(deleteTopic(db, 't1'), 's1', 't1', true).songs[0].exercises).toEqual([]);
  });

  it('returns only active references to non-deleted topics for a non-deleted song', () => {
    let db = makeDatabase();
    db = setSongExercise(db, 's1', 't1', true);
    db = setSongExercise(db, 's1', 't2', false);
    db = setSongExercise(db, 's1', 't3', true);
    db = deleteTopic(db, 't3');
    expect(getActiveExercises(db, 's1')).toEqual([{ topicId: 't1', active: true }]);
    expect(getActiveExercises(deleteSong(db, 's1'), 's1')).toEqual([]);
    expect(getActiveExercises(db, 'missing')).toEqual([]);
  });

  it('does not mutate the original database when updating an exercise', () => {
    const original = makeDatabase();
    const updated = setSongExercise(original, 's1', 't1', true);
    expect(original.songs[0].exercises).toEqual([]);
    expect(updated.songs[0].exercises).toEqual([{ topicId: 't1', active: true }]);
  });
});
