import { describe, expect, it } from 'vitest';
import {
  addSongFromMaster,
  addTopicFromMaster,
  emptyLessonDatabase,
  setSongExercise,
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
    database = addSong(database, 'きらきら星');
    const song = database.songs[0];

    database = addTopic(database, '右手だけ');
    const topic = database.topics[0];

    // Teacher flow: the new topic is assigned and activated for the selected song.
    database = setSongExercise(database, song.id, topic.id, true);

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
    database = addSong(database, 'きらきら星');
    const song = database.songs[0];
    database = addTopic(database, '右手だけ');
    const topic = database.topics[0];
    database = setSongExercise(database, song.id, topic.id, true);
    database = setExerciseTargetCount(database, song.id, topic.id, 7);

    expect(makeLessonSetup(database)[0].exercises[0].targetCount).toBe(7);
  });

  it('passes the repeatable-goal setting into lesson setup and defaults old assignments to false', () => {
    let database = emptyLessonDatabase();
    database = addSong(database, 'きらきら星');
    const song = database.songs[0];
    database = addTopic(database, '右手だけ');
    const topic = database.topics[0];
    database = setSongExercise(database, song.id, topic.id, true);

    expect(makeLessonSetup(database)[0].exercises[0].repeatAllowed).toBe(false);
    database = setExerciseRepeatAllowed(database, song.id, topic.id, true);
    expect(makeLessonSetup(database)[0].exercises[0].repeatAllowed).toBe(true);
  });

  it('keeps the default repetition target for older assignments and rejects invalid targets', () => {
    let database = emptyLessonDatabase();
    database = addSong(database, 'きらきら星');
    const song = database.songs[0];
    database = addTopic(database, '右手だけ');
    const topic = database.topics[0];
    database = setSongExercise(database, song.id, topic.id, true);
    expect(makeLessonSetup(database)[0].exercises[0].targetCount).toBe(10);
    expect(setExerciseTargetCount(database, song.id, topic.id, 0)).toBe(database);
    expect(setExerciseTargetCount(database, song.id, topic.id, -1)).toBe(database);
  });

  it('uses teacher-configured points for exercises and song bonuses', () => {
    let database = emptyLessonDatabase();
    database = addSong(database, 'きらきら星');
    const song = database.songs[0];
    database = addTopic(database, '右手だけ');
    const topic = database.topics[0];
    database = setSongExercise(database, song.id, topic.id, true);
    database = setExercisePoints(database, song.id, topic.id, 'pointsPerCompletion', 3);
    database = setExercisePoints(database, song.id, topic.id, 'goalBonusPoints', 12);
    database = setSongBonusPoints(database, song.id, 20);

    expect(makeLessonSetup(database)[0]).toMatchObject({
      exercises: [{ topicId: topic.id, pointsPerCompletion: 3, goalBonusPoints: 12 }],
      allGoalsBonusPoints: 20,
    });
  });

  it('does not enable start for inactive or deleted topics', () => {
    let database = emptyLessonDatabase();
    database = addSong(database, 'きらきら星');
    const song = database.songs[0];
    database = addTopic(database, '右手だけ');
    const topic = database.topics[0];

    database = setSongExercise(database, song.id, topic.id, false);
    expect(canStartLesson(database)).toBe(false);

    database = setSongExercise(database, song.id, topic.id, true);
    database = {
      ...database,
      topics: database.topics.map((item) => item.id === topic.id ? { ...item, deleted: true } : item),
    };
    expect(canStartLesson(database)).toBe(false);
  });

  it('builds multiple songs with only their active topics', () => {
    let database = emptyLessonDatabase();
    database = addSong(database, '曲A');
    database = addSong(database, '曲B');
    database = addTopic(database, 'お題1');
    database = addTopic(database, 'お題2');
    const [songA, songB] = database.songs;
    const [topic1, topic2] = database.topics;

    database = setSongExercise(database, songA.id, topic1.id, true);
    database = setSongExercise(database, songA.id, topic2.id, false);
    database = setSongExercise(database, songB.id, topic2.id, true);

    const setup = makeLessonSetup(database);
    expect(setup).toHaveLength(2);
    expect(setup[0].exercises.map((exercise) => exercise.topicId)).toEqual([topic1.id]);
    expect(setup[1].exercises.map((exercise) => exercise.topicId)).toEqual([topic2.id]);
  });
});
