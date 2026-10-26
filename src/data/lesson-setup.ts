import { getActiveExercises, listSongs, type LessonDatabase } from './lesson-database';
import type { LessonSongSetup } from './lesson-session';

export const DEFAULT_TARGET_COUNT = 10;
export const DEFAULT_MINIMUM_INTERVAL_SECONDS = 0;
export const DEFAULT_POINTS_PER_COMPLETION = 1;
export const DEFAULT_GOAL_BONUS_POINTS = 5;
export const DEFAULT_ALL_GOALS_BONUS_POINTS = 5;
export const DEFAULT_DAILY_BONUS_POINTS = 10;

/** Builds lesson-session input from the topic assignments stored on each song. */
export const makeLessonSetup = (database: LessonDatabase): LessonSongSetup[] =>
  listSongs(database).map((song) => ({
    songId: song.id,
    songTitle: song.title,
    order: song.order,
    exercises: getActiveExercises(database, song.id).map((assignment) => ({
      topicId: assignment.topicId,
      topicTitle: assignment.topicTitle,
      targetCount: assignment.targetCount ?? DEFAULT_TARGET_COUNT,
      repeatAllowed: assignment.repeatAllowed ?? false,
      minimumIntervalSeconds: assignment.minimumIntervalSeconds ?? DEFAULT_MINIMUM_INTERVAL_SECONDS,
      pointsPerCompletion: assignment.pointsPerCompletion ?? DEFAULT_POINTS_PER_COMPLETION,
      goalBonusPoints: assignment.goalBonusPoints ?? DEFAULT_GOAL_BONUS_POINTS,
    })),
    allGoalsBonusPoints: song.allGoalsBonusPoints ?? DEFAULT_ALL_GOALS_BONUS_POINTS,
  })).filter((song) => song.exercises.length > 0);

/** The lesson can start when at least one song has a topic assignment. */
export const canStartLesson = (database: LessonDatabase): boolean => makeLessonSetup(database).length > 0;
