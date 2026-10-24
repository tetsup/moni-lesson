import { beforeEach, describe, expect, it } from 'vitest';
import {
  LESSON_SESSION_KEY,
  createLessonSession,
  loadLessonSession,
  recordExerciseCompletion,
  resetLessonSessionForDate,
  saveLessonSession,
  updateLessonSessionForSetup,
} from './lesson-session';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const setup = () => createLessonSession('2026-10-23', [
  {
    songId: 'song-a',
    songTitle: 'Song A',
    order: 0,
    exercises: [
      { topicId: 'topic-1', topicTitle: 'Topic 1', targetCount: 2, pointsPerCompletion: 1, goalBonusPoints: 5 },
      { topicId: 'topic-2', topicTitle: 'Topic 2', targetCount: 1, pointsPerCompletion: 2, goalBonusPoints: 3 },
    ],
    allGoalsBonusPoints: 7,
  },
  {
    songId: 'song-b',
    songTitle: 'Song B',
    order: 1,
    exercises: [
      { topicId: 'topic-3', topicTitle: 'Topic 3', targetCount: 1, pointsPerCompletion: 4, goalBonusPoints: 6 },
    ],
    allGoalsBonusPoints: 8,
  },
], 10, 100);

describe('lesson session persistence', () => {
  let storage: MemoryStorage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it('returns null when no session is saved', () => {
    expect(loadLessonSession(storage)).toBeNull();
  });

  it('saves and loads a session', () => {
    const session = setup();
    saveLessonSession(session, storage);
    expect(storage.getItem(LESSON_SESSION_KEY)).not.toBeNull();
    expect(loadLessonSession(storage)).toEqual(session);
  });

  it('returns null for invalid JSON or an unsupported shape', () => {
    storage.setItem(LESSON_SESSION_KEY, '{broken');
    expect(loadLessonSession(storage)).toBeNull();
    storage.setItem(LESSON_SESSION_KEY, JSON.stringify({ version: 99, songs: [] }));
    expect(loadLessonSession(storage)).toBeNull();
  });
});

describe('lesson session operations', () => {
  it('creates ordered songs with zeroed daily progress', () => {
    const session = setup();
    expect(session.songs.map((song) => song.songId)).toEqual(['song-a', 'song-b']);
    expect(session.songs[0].exercises[0]).toMatchObject({
      completionCount: 0,
      goalBonusAwarded: false,
    });
    expect(session).toMatchObject({ date: '2026-10-23', totalPoints: 100, todayPoints: 0 });
  });

  it('preserves current progress and earned points when the lesson setup changes', () => {
    let session = setup();
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    expect(session.songs[0].exercises[0].goalBonusAwarded).toBe(true);
    const earnedTotal = session.totalPoints;
    const earnedToday = session.todayPoints;

    const updated = updateLessonSessionForSetup(session, session.date, [
      {
        songId: 'song-a',
        songTitle: 'Song A',
        order: 0,
        exercises: [
          { topicId: 'topic-1', topicTitle: 'Topic 1 updated', targetCount: 2, pointsPerCompletion: 1, goalBonusPoints: 5 },
          { topicId: 'topic-4', topicTitle: 'New Topic', targetCount: 2, pointsPerCompletion: 1, goalBonusPoints: 5 },
        ],
        allGoalsBonusPoints: 7,
      },
    ], 10);

    expect(updated.totalPoints).toBe(earnedTotal);
    expect(updated.todayPoints).toBe(earnedToday);
    expect(updated.songs[0].exercises[0]).toMatchObject({
      topicTitle: 'Topic 1 updated',
      completionCount: 2,
      goalBonusAwarded: true,
    });
    expect(updated.songs[0].exercises[1]).toMatchObject({
      topicId: 'topic-4',
      completionCount: 0,
      goalBonusAwarded: false,
    });
    expect(updated.songs[0].allGoalsBonusAwarded).toBe(session.songs[0].allGoalsBonusAwarded);
    expect(updated.dailyBonusAwarded).toBe(session.dailyBonusAwarded);
  });

  it('starts fresh daily progress for a different date while preserving lifetime points', () => {
    const session = recordExerciseCompletion(setup(), 'song-a', 'topic-1');
    const updated = updateLessonSessionForSetup(session, '2026-10-24', [
      {
        songId: 'song-a',
        songTitle: 'Song A',
        order: 0,
        exercises: [
          { topicId: 'topic-1', topicTitle: 'Topic 1', targetCount: 2, pointsPerCompletion: 1, goalBonusPoints: 5 },
        ],
        allGoalsBonusPoints: 7,
      },
    ], 10);
    expect(updated.totalPoints).toBe(session.totalPoints);
    expect(updated.todayPoints).toBe(0);
    expect(updated.songs[0].exercises[0].completionCount).toBe(0);
    expect(updated.songs[0].exercises[0].goalBonusAwarded).toBe(false);
  });

  it('adds points for every completion', () => {
    const session = recordExerciseCompletion(setup(), 'song-a', 'topic-1');
    expect(session.totalPoints).toBe(101);
    expect(session.todayPoints).toBe(1);
    expect(session.songs[0].exercises[0].completionCount).toBe(1);
  });

  it('grants an exercise goal bonus once at its target count', () => {
    const first = recordExerciseCompletion(setup(), 'song-a', 'topic-1');
    const second = recordExerciseCompletion(first, 'song-a', 'topic-1');
    const third = recordExerciseCompletion(second, 'song-a', 'topic-1');
    expect(second.totalPoints).toBe(107);
    expect(third.totalPoints).toBe(108);
    expect(third.songs[0].exercises[0].goalBonusAwarded).toBe(true);
  });

  it('does not re-award an exercise bonus for the same topic or a different topic immediately afterward', () => {
    const session = setup();
    // Keep Topic 2 from completing Song A while this test isolates Topic 1's bonus.
    session.songs[0].exercises[1].targetCount = 10;

    const first = recordExerciseCompletion(session, 'song-a', 'topic-1');
    const achieved = recordExerciseCompletion(first, 'song-a', 'topic-1');
    expect(achieved.totalPoints - first.totalPoints).toBe(6); // ordinary point + Topic 1 bonus

    const sameTopicAgain = recordExerciseCompletion(achieved, 'song-a', 'topic-1');
    expect(sameTopicAgain.totalPoints - achieved.totalPoints).toBe(1);

    const differentTopicImmediately = recordExerciseCompletion(sameTopicAgain, 'song-a', 'topic-2');
    expect(differentTopicImmediately.totalPoints - sameTopicAgain.totalPoints).toBe(2);
    expect(differentTopicImmediately.songs[0].exercises[0].goalBonusAwarded).toBe(true);
    expect(differentTopicImmediately.songs[0].exercises[1].goalBonusAwarded).toBe(false);
    expect(differentTopicImmediately.songs[0].allGoalsBonusAwarded).toBe(false);
  });

  it('grants a song bonus when every assigned goal in that song is achieved', () => {
    let session = setup();
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-2');
    expect(session.songs[0].allGoalsBonusAwarded).toBe(true);
    expect(session.totalPoints).toBe(119);
  });

  it('does not re-award Song A bonus after its completion, including when Song B is completed next', () => {
    let session = setup();
    // Delay Song B's topic and song bonuses so the cross-song completion is easy to isolate.
    session.songs[1].exercises[0].targetCount = 2;

    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-2');
    expect(session.songs[0].allGoalsBonusAwarded).toBe(true);
    const songABonusTotal = session.totalPoints;

    const sameTopicAfterSongBonus = recordExerciseCompletion(session, 'song-a', 'topic-1');
    expect(sameTopicAfterSongBonus.totalPoints - songABonusTotal).toBe(1);

    // Song A's other topic was already completed to earn the song bonus.
    // Completing it again immediately must add only its ordinary points.
    const differentTopicAfterSongBonus = recordExerciseCompletion(sameTopicAfterSongBonus, 'song-a', 'topic-2');
    expect(differentTopicAfterSongBonus.totalPoints - sameTopicAfterSongBonus.totalPoints).toBe(2);
    expect(differentTopicAfterSongBonus.songs[0].allGoalsBonusAwarded).toBe(true);

    const differentSongImmediately = recordExerciseCompletion(differentTopicAfterSongBonus, 'song-b', 'topic-3');
    expect(differentSongImmediately.totalPoints - differentTopicAfterSongBonus.totalPoints).toBe(4);
    expect(differentSongImmediately.songs[0].allGoalsBonusAwarded).toBe(true);
    expect(differentSongImmediately.songs[1].allGoalsBonusAwarded).toBe(false);
    expect(differentSongImmediately.dailyBonusAwarded).toBe(false);
  });

  it('grants the daily bonus only after all goals across all selected songs are achieved', () => {
    let session = setup();
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-2');
    expect(session.dailyBonusAwarded).toBe(false);
    session = recordExerciseCompletion(session, 'song-b', 'topic-3');
    expect(session.dailyBonusAwarded).toBe(true);
    expect(session.totalPoints).toBe(147);
    expect(session.todayPoints).toBe(47);
  });

  it('does not re-award daily or already-earned song bonuses after the daily goal, for same and different topics', () => {
    let session = setup();
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    session = recordExerciseCompletion(session, 'song-a', 'topic-2');
    session = recordExerciseCompletion(session, 'song-b', 'topic-3');
    expect(session.dailyBonusAwarded).toBe(true);
    expect(session.songs.every((song) => song.allGoalsBonusAwarded)).toBe(true);
    const afterAllBonuses = session.totalPoints;

    const sameTopicAfterDailyBonus = recordExerciseCompletion(session, 'song-b', 'topic-3');
    expect(sameTopicAfterDailyBonus.totalPoints - afterAllBonuses).toBe(4);

    const differentTopicImmediately = recordExerciseCompletion(sameTopicAfterDailyBonus, 'song-a', 'topic-1');
    expect(differentTopicImmediately.totalPoints - sameTopicAfterDailyBonus.totalPoints).toBe(1);
    expect(differentTopicImmediately.dailyBonusAwarded).toBe(true);
    expect(differentTopicImmediately.songs.every((song) => song.allGoalsBonusAwarded)).toBe(true);
    expect(differentTopicImmediately.totalPoints).toBe(afterAllBonuses + 5);
  });

  it('does not change state for an unknown song or topic', () => {
    const session = setup();
    expect(recordExerciseCompletion(session, 'missing', 'topic-1')).toBe(session);
    expect(recordExerciseCompletion(session, 'song-a', 'missing')).toBe(session);
  });

  it('resets daily progress on a new date while preserving setup and total points', () => {
    let session = setup();
    session = recordExerciseCompletion(session, 'song-a', 'topic-1');
    const nextDay = resetLessonSessionForDate(session, '2026-10-24');
    expect(nextDay.date).toBe('2026-10-24');
    expect(nextDay.totalPoints).toBe(session.totalPoints);
    expect(nextDay.todayPoints).toBe(0);
    expect(nextDay.songs[0].exercises[0]).toMatchObject({
      completionCount: 0,
      goalBonusAwarded: false,
    });
    expect(nextDay.songs[0].allGoalsBonusAwarded).toBe(false);
    expect(nextDay.dailyBonusAwarded).toBe(false);
    expect(nextDay.songs[0].exercises[0].targetCount).toBe(2);
  });

  it('does not reset progress when the date is unchanged', () => {
    const session = recordExerciseCompletion(setup(), 'song-a', 'topic-1');
    expect(resetLessonSessionForDate(session, session.date)).toBe(session);
  });
});
