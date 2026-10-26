import { describe, expect, it } from 'vitest';
import { createLessonSession, recordExerciseCompletion } from '../data/lesson-session';
import { isExerciseGoalAchieved } from './LessonMode';

const setup = () => createLessonSession('2026-10-24', [
  {
    songId: 'song-a',
    songTitle: '曲A',
    order: 1,
    allGoalsBonusPoints: 0,
    exercises: [
      { topicId: 'topic-a', topicTitle: 'お題A', targetCount: 1, repeatAllowed: false, minimumIntervalSeconds: 0, pointsPerCompletion: 1, goalBonusPoints: 0 },
      { topicId: 'topic-b', topicTitle: 'お題B', targetCount: 2, repeatAllowed: false, minimumIntervalSeconds: 0, pointsPerCompletion: 1, goalBonusPoints: 0 },
    ],
  },
  {
    songId: 'song-b',
    songTitle: '曲B',
    order: 2,
    allGoalsBonusPoints: 0,
    exercises: [
      { topicId: 'topic-a', topicTitle: '同じIDのお題', targetCount: 2, repeatAllowed: false, minimumIntervalSeconds: 0, pointsPerCompletion: 1, goalBonusPoints: 0 },
    { topicId: 'topic-c', topicTitle: 'お題C', targetCount: 1, repeatAllowed: false, minimumIntervalSeconds: 0, pointsPerCompletion: 1, goalBonusPoints: 0 },
    ],
  },
], 0);

describe('LessonMode goal display state', () => {
  it('shows achieved after the selected topic reaches its goal, and unachieved before it', () => {
    const initial = setup();
    expect(isExerciseGoalAchieved(initial, 'song-a', 'topic-a')).toBe(false);

    const achieved = recordExerciseCompletion(initial, 'song-a', 'topic-a');
    expect(isExerciseGoalAchieved(achieved, 'song-a', 'topic-a')).toBe(true);
  });

  it('shows a repeatable goal as achieved only at each target multiple', () => {
    const initial = setup();
    initial.songs[0].exercises[1].repeatAllowed = true;

    const first = recordExerciseCompletion(initial, 'song-a', 'topic-b');
    const achieved = recordExerciseCompletion(first, 'song-a', 'topic-b');
    const betweenGoals = recordExerciseCompletion(achieved, 'song-a', 'topic-b');
    const achievedAgain = recordExerciseCompletion(betweenGoals, 'song-a', 'topic-b');

    expect(isExerciseGoalAchieved(first, 'song-a', 'topic-b')).toBe(false);
    expect(isExerciseGoalAchieved(achieved, 'song-a', 'topic-b')).toBe(true);
    expect(isExerciseGoalAchieved(betweenGoals, 'song-a', 'topic-b')).toBe(false);
    expect(isExerciseGoalAchieved(achievedAgain, 'song-a', 'topic-b')).toBe(true);
  });

  it('updates correctly when switching topics in the same song, for achieved and unachieved topics', () => {
    const session = recordExerciseCompletion(setup(), 'song-a', 'topic-a');

    expect(isExerciseGoalAchieved(session, 'song-a', 'topic-a')).toBe(true);
    expect(isExerciseGoalAchieved(session, 'song-a', 'topic-b')).toBe(false);
  });

  it('updates correctly when switching songs, even when topic IDs are shared', () => {
    const session = recordExerciseCompletion(setup(), 'song-a', 'topic-a');

    expect(isExerciseGoalAchieved(session, 'song-a', 'topic-a')).toBe(true);
    expect(isExerciseGoalAchieved(session, 'song-b', 'topic-a')).toBe(false);
    expect(isExerciseGoalAchieved(session, 'song-b', 'topic-c')).toBe(false);
  });

  it('re-evaluates when entering lesson mode from topic selection for either status', () => {
    const session = recordExerciseCompletion(setup(), 'song-a', 'topic-a');

    // Selection -> lesson uses the selected song/topic IDs to derive the view.
    expect(isExerciseGoalAchieved(session, 'song-a', 'topic-a')).toBe(true);
    expect(isExerciseGoalAchieved(session, 'song-a', 'topic-b')).toBe(false);
  });
});
