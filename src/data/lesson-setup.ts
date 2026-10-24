import {
  getActiveExercises,
  listSongs,
  listTopics,
  type LessonDatabase,
} from './lesson-database';
import type { LessonSongSetup } from './lesson-session';

export const DEFAULT_TARGET_COUNT = 2;
export const DEFAULT_POINTS_PER_COMPLETION = 1;
export const DEFAULT_GOAL_BONUS_POINTS = 5;
export const DEFAULT_ALL_GOALS_BONUS_POINTS = 5;
export const DEFAULT_DAILY_BONUS_POINTS = 10;

/** Builds the lesson-session input from currently active song/topic assignments. */
export const makeLessonSetup = (database: LessonDatabase): LessonSongSetup[] => {
  const topics = listTopics(database);

  return listSongs(database).map((song) => ({
    songId: song.id,
    songTitle: song.title,
    order: song.order,
    exercises: getActiveExercises(database, song.id).flatMap((assignment) => {
      const topic = topics.find((topic) => topic.id === assignment.topicId);
      if (!topic) return [];
      return [{
        topicId: topic.id,
        topicTitle: topic.title,
        targetCount: DEFAULT_TARGET_COUNT,
        pointsPerCompletion: assignment.pointsPerCompletion ?? DEFAULT_POINTS_PER_COMPLETION,
        goalBonusPoints: assignment.goalBonusPoints ?? DEFAULT_GOAL_BONUS_POINTS,
      }];
    }),
    allGoalsBonusPoints: song.allGoalsBonusPoints ?? DEFAULT_ALL_GOALS_BONUS_POINTS,
  })).filter((song) => song.exercises.length > 0);
};

/** The lesson can start only when at least one active topic resolves to a live topic. */
export const canStartLesson = (database: LessonDatabase): boolean =>
  makeLessonSetup(database).length > 0;
