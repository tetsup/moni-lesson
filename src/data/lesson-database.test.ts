import { beforeEach, describe, expect, it } from 'vitest';
import {
  LESSON_DATABASE_KEY, addSongFromMaster, addTopicFromMaster, emptyLessonDatabase,
  getActiveExercises, listSongs, loadLessonDatabase, removeTopicFromSong,
  saveLessonDatabase, setCurrentSong, setExerciseRepeatAllowed, setExerciseTargetCount,
  deleteSong, type LessonDatabase,
} from './lesson-database';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const makeDatabase = (): LessonDatabase => ({
  version: 2,
  songs: [
    { id: 's1', title: 'Song 1', order: 0, deleted: false, exercises: [] },
    { id: 's2', title: 'Song 2', order: 1, deleted: false, exercises: [] },
  ],
  currentSongId: null,
});

describe('lesson database persistence and migration', () => {
  let storage: MemoryStorage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it('starts empty and saves/reloads lesson data', () => {
    const db = makeDatabase();
    saveLessonDatabase(db, storage);
    expect(storage.getItem(LESSON_DATABASE_KEY)).not.toBeNull();
    expect(loadLessonDatabase(storage)).toEqual(db);
  });

  it('returns an empty database for invalid JSON or unsupported versions', () => {
    storage.setItem(LESSON_DATABASE_KEY, '{broken');
    expect(loadLessonDatabase(storage)).toEqual(emptyLessonDatabase());
    storage.setItem(LESSON_DATABASE_KEY, JSON.stringify({ version: 99, songs: [], topics: [], currentSongId: null }));
    expect(loadLessonDatabase(storage)).toEqual(emptyLessonDatabase());
  });

  it('migrates v1 active assignments into title snapshots and drops inactive assignments', () => {
    storage.setItem(LESSON_DATABASE_KEY, JSON.stringify({
      version: 1,
      currentSongId: 's1',
      dailyBonusPoints: 12,
      topics: [{ id: 't1', title: '旧お題', order: 0, deleted: false }],
      songs: [{
        id: 's1', title: '旧曲', order: 0, deleted: false,
        exercises: [
          { topicId: 't1', active: true, targetCount: 7, repeatAllowed: true },
          { topicId: 't2', active: false },
        ],
      }],
    }));
    expect(loadLessonDatabase(storage)).toEqual({
      version: 2, currentSongId: 's1', dailyBonusPoints: 12,
      songs: [{
        id: 's1', title: '旧曲', order: 0, deleted: false,
        exercises: [{ topicId: 't1', topicTitle: '旧お題', targetCount: 7, repeatAllowed: true }],
      }],
    });
  });
});

describe('today song list', () => {
  it('adds a selected master song with no topic assignments or settings', () => {
    const initial = makeDatabase();
    const masterSong = { id: 'master-song', title: 'Master song', deleted: false };
    const added = addSongFromMaster(initial, masterSong);
    expect(added.songs[2]).toMatchObject({
      id: 'master-song', title: 'Master song', order: 2, deleted: false, exercises: [],
    });
    expect(addSongFromMaster(added, masterSong)).toBe(added);
    expect(addSongFromMaster(initial, { ...masterSong, deleted: true })).toBe(initial);
  });

  it('physically removes a song and clears currentSongId if needed', () => {
    const selected = setCurrentSong(makeDatabase(), 's2');
    const deleted = deleteSong(selected, 's2');
    expect(deleted.songs.map((song) => song.id)).toEqual(['s1']);
    expect(deleted.currentSongId).toBeNull();
    expect(deleteSong(deleted, 'missing')).toBe(deleted);
  });

  it('selects only an existing song as current', () => {
    const db = makeDatabase();
    expect(setCurrentSong(db, 's1').currentSongId).toBe('s1');
    expect(setCurrentSong(db, 'missing')).toBe(db);
    expect(setCurrentSong(db, null).currentSongId).toBeNull();
  });
});

describe('topic assignments on a song', () => {
  const topic = { id: 't1', title: 'Right hand only', deleted: false };

  it('adds the master topic only to the specified song and snapshots its title', () => {
    const initial = makeDatabase();
    const added = addTopicFromMaster(initial, 's1', topic);
    expect(added.songs[0].exercises).toEqual([{ topicId: 't1', topicTitle: 'Right hand only' }]);
    expect(added.songs[1].exercises).toEqual([]);
    expect(added).not.toHaveProperty('topics');
    expect(addTopicFromMaster(added, 's1', topic)).toBe(added);
    expect(addTopicFromMaster(initial, 'missing', topic)).toBe(initial);
    expect(addTopicFromMaster(initial, 's1', { ...topic, deleted: true })).toBe(initial);
  });

  it('treats assignment presence as selected; there is no active flag', () => {
    const assigned = addTopicFromMaster(makeDatabase(), 's1', topic);
    expect(getActiveExercises(assigned, 's1')).toEqual([{ topicId: 't1', topicTitle: 'Right hand only' }]);
    expect(getActiveExercises(assigned, 'missing')).toEqual([]);
    expect(assigned.songs[0].exercises[0]).not.toHaveProperty('active');
  });

  it('removes the assignment only from the specified song', () => {
    let db = addTopicFromMaster(makeDatabase(), 's1', topic);
    db = addTopicFromMaster(db, 's2', topic);
    const removed = removeTopicFromSong(db, 's1', 't1');
    expect(removed.songs[0].exercises).toEqual([]);
    expect(removed.songs[1].exercises).toEqual([{ topicId: 't1', topicTitle: 'Right hand only' }]);
    expect(removeTopicFromSong(removed, 's1', 'missing')).toBe(removed);
  });

  it('preserves assignments and their title snapshots if the master topic is deleted', () => {
    const db = addTopicFromMaster(makeDatabase(), 's1', topic);
    expect(db.songs[0].exercises[0].topicTitle).toBe('Right hand only');
    expect(getActiveExercises(db, 's1')).toEqual([{ topicId: 't1', topicTitle: 'Right hand only' }]);
  });

  it('updates target and repeat settings on the assigned topic', () => {
    let db = addTopicFromMaster(makeDatabase(), 's1', topic);
    db = setExerciseTargetCount(db, 's1', 't1', 5);
    db = setExerciseRepeatAllowed(db, 's1', 't1', true);
    expect(db.songs[0].exercises[0]).toMatchObject({
      topicId: 't1', topicTitle: 'Right hand only', targetCount: 5, repeatAllowed: true,
    });
    expect(setExerciseTargetCount(db, 's1', 't1', 0)).toBe(db);
  });
});
