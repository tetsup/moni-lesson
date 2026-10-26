import { describe, expect, it } from 'vitest';
import {
  addSongFromMaster,
  addTopicFromMaster,
  emptyLessonDatabase,
  setExercisePoints,
  setExerciseTargetCount,
  setExerciseRepeatAllowed,
  setSongBonusPoints,
} from './lesson-database';
import { canStartLesson, makeLessonSetup } from './lesson-setup';

describe('lesson setup', () => {
  it('cannot start when there are no songs or topics', () => {
    expect(makeLessonSetup(emptyLessonDatabase())).toEqual([]);
    expect(canStartLesson(emptyLessonDatabase())).toBe(false);
  });

  it('enables start after a song gets an active topic', () => {
    let database = emptyLessonDatabase();
    database = addSongFromMaster(database, { id: 'song-1', title: 'きらきら星', deleted: false });
    const song = database.songs[0];

    const topic = { id: 'topic-1', title: '右手だけ', deleted: false };
    database = addTopicFromMaster(database, song.id, topic);

    expect(canStartLesson(database)).toBe(true);
    expect(makeLessonSetup(database)).toEqual([{
      songId: song.id,
      songTitle: 'きらきら星',
      order: song.order,
      exercises: [{
        topicId: topic.id,
        topicTitle: '右手だけ',
        targetCount: 10,
        repeatAllowed: false,
        minimumIntervalSeconds: 0,
        pointsPerCompletion: 1,
        goalBonusPoints: 5,
      }],
      allGoalsBonusPoints: 5,
    }]);
  });

  it('uses teacher-configured repetition target for each topic', () => {
    let database = emptyLessonDatabase();
    database = addSongFromMaster(database, { id: 'song-1', title: 'きらきら星', deleted: false });
    const song = database.songs[0];
    const topic = { id: 'topic-1', title: '右手だけ', deleted: false };
    database = addTopicFromMaster(database, song.id, topic);
    database = setExerciseTargetCount(database, song.id, topic.id, 7);

    expect(makeLessonSetup(database)[0].exercises[0].targetCount).toBe(7);
  });

  it('passes the repeatable-goal setting into lesson setup and defaults old assignments to false', () => {
    let database = emptyLessonDatabase();
    database = addSongFromMaster(database, { id: 'song-1', title: 'きらきら星', deleted: false });
    const song = database.songs[0];
    const topic = { id: 'topic-1', title: '右手だけ', deleted: false };
    database = addTopicFromMaster(database, song.id, topic);

    expect(makeLessonSetup(database)[0].exercises[0].repeatAllowed).toBe(false);
    database = setExerciseRepeatAllowed(database, song.id, topic.id, true);
    expect(makeLessonSetup(database)[0].exercises[0].repeatAllowed).toBe(true);
  });

  it('keeps the default repetition target for older assignments and rejects invalid targets', () => {
    let database = emptyLessonDatabase();
    database = addSongFromMaster(database, { id: 'song-1', title: 'きらきら星', deleted: false });
    const song = database.songs[0];
    const topic = { id: 'topic-1', title: '右手だけ', deleted: false };
    database = addTopicFromMaster(database, song.id, topic);
    expect(makeLessonSetup(database)[0].exercises[0].targetCount).toBe(10);
    expect(setExerciseTargetCount(database, song.id, topic.id, 0)).toBe(database);
    expect(setExerciseTargetCount(database, song.id, topic.id, -1)).toBe(database);
  });

  it('uses teacher-configured points for exercises and song bonuses', () => {
    let database = emptyLessonDatabase();
    database = addSongFromMaster(database, { id: 'song-1', title: 'きらきら星', deleted: false });
    const song = database.songs[0];
    const topic = { id: 'topic-1', title: '右手だけ', deleted: false };
    database = addTopicFromMaster(database, song.id, topic);
    database = setExercisePoints(database, song.id, topic.id, 'pointsPerCompletion', 3);
    database = setExercisePoints(database, song.id, topic.id, 'goalBonusPoints', 12);
    database = setSongBonusPoints(database, song.id, 20);

    expect(makeLessonSetup(database)[0]).toMatchObject({
      exercises: [{ topicId: topic.id, pointsPerCompletion: 3, goalBonusPoints: 12 }],
      allGoalsBonusPoints: 20,
    });
  });

  it('does not enable start when the only assignment is removed', () => {
    let database = addSongFromMaster(emptyLessonDatabase(), { id: 'song-1', title: 'きらきら星', deleted: false });
    database = addTopicFromMaster(database, 'song-1', { id: 'topic-1', title: '右手だけ', deleted: false });
    expect(canStartLesson(database)).toBe(true);
    database = removeTopicFromSong(database, 'song-1', 'topic-1');
    expect(canStartLesson(database)).toBe(false);
  });

  it('builds multiple songs with only their own topic assignments', () => {
    let database = emptyLessonDatabase();
    database = addSongFromMaster(database, { id: 'song-a', title: '曲A', deleted: false });
    database = addSongFromMaster(database, { id: 'song-b', title: '曲B', deleted: false });
    database = addTopicFromMaster(database, 'song-a', { id: 'topic-1', title: 'お題1', deleted: false });
    database = addTopicFromMaster(database, 'song-b', { id: 'topic-2', title: 'お題2', deleted: false });
    const setup = makeLessonSetup(database);
    expect(setup).toHaveLength(2);
    expect(setup[0].exercises.map((exercise) => exercise.topicId)).toEqual(['topic-1']);
    expect(setup[1].exercises.map((exercise) => exercise.topicId)).toEqual(['topic-2']);
  });});
