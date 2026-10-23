import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import {
  getActiveExercises,
  listSongs,
  listTopics,
  loadLessonDatabase,
  setCurrentSong,
  saveLessonDatabase,
  type LessonDatabase,
  type Song,
} from './data/lesson-database';
import {
  createLessonSession,
  loadLessonSession,
  recordExerciseCompletion,
  resetLessonSessionForDate,
  saveLessonSession,
  type LessonSession,
  type LessonSongSetup,
} from './data/lesson-session';

const today = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// First-pass defaults; a later lesson-settings UI can make these configurable.
const DEFAULT_TARGET_COUNT = 2;
const DEFAULT_POINTS_PER_COMPLETION = 1;
const DEFAULT_GOAL_BONUS_POINTS = 5;
const DEFAULT_ALL_GOALS_BONUS_POINTS = 5;
const DEFAULT_DAILY_BONUS_POINTS = 10;

const makeSessionSetup = (database: LessonDatabase): LessonSongSetup[] => {
  const topics = listTopics(database);
  return listSongs(database).map((song) => ({
    songId: song.id,
    songTitle: song.title,
    order: song.order,
    exercises: getActiveExercises(database, song.id).flatMap((assignment) => {
      const topic = topics.find((item) => item.id === assignment.topicId);
      if (!topic) return [];
      return [{
        topicId: topic.id,
        topicTitle: topic.title,
        targetCount: DEFAULT_TARGET_COUNT,
        pointsPerCompletion: DEFAULT_POINTS_PER_COMPLETION,
        goalBonusPoints: DEFAULT_GOAL_BONUS_POINTS,
      }];
    }),
    allGoalsBonusPoints: DEFAULT_ALL_GOALS_BONUS_POINTS,
  })).filter((song) => song.exercises.length > 0);
};

const loadDatabase = (): LessonDatabase => loadLessonDatabase(window.localStorage);

const initializeSession = (database: LessonDatabase): LessonSession => {
  const existing = loadLessonSession(window.localStorage);
  if (existing) return resetLessonSessionForDate(existing, today());
  return createLessonSession(today(), makeSessionSetup(database), DEFAULT_DAILY_BONUS_POINTS);
};

export default function App() {
  const [database, setDatabase] = useState<LessonDatabase>(loadDatabase);
  const [session, setSession] = useState<LessonSession>(() => initializeSession(loadDatabase()));
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(() => {
    const initialSession = initializeSession(loadDatabase());
    return initialSession.songs[0]?.exercises[0]?.topicId ?? null;
  });

  const songs = useMemo(() => listSongs(database), [database]);
  const sessionSongs = session.songs;
  const allExercises = sessionSongs.flatMap((song) =>
    song.exercises.map((exercise) => ({ songId: song.songId, topicId: exercise.topicId })),
  );
  const currentSong = sessionSongs.find((song) =>
    song.exercises.some((exercise) => exercise.topicId === currentTopicId),
  ) ?? sessionSongs[0];
  const currentExercise = currentSong?.exercises.find((exercise) =>
    exercise.topicId === currentTopicId,
  ) ?? currentSong?.exercises[0];

  useEffect(() => saveLessonSession(session, window.localStorage), [session]);
  useEffect(() => saveLessonDatabase(database, window.localStorage), [database]);

  const chooseSong = (song: Song) => {
    setDatabase((previous) => setCurrentSong(previous, song.id));
    const songSession = sessionSongs.find((item) => item.songId === song.id);
    setCurrentTopicId(songSession?.exercises[0]?.topicId ?? null);
  };

  const getNextExercise = (songId: string, topicId: string) => {
    const position = allExercises.findIndex((item) => item.songId === songId && item.topicId === topicId);
    return allExercises[position + 1];
  };

  const doneCount = sessionSongs.reduce((count, song) =>
    count + song.exercises.filter((exercise) => exercise.completionCount >= exercise.targetCount).length, 0);
  const totalCount = sessionSongs.reduce((count, song) => count + song.exercises.length, 0);

  return (
    <Box sx={{ minHeight: '100vh', pb: 4, bgcolor: '#fffafd' }}>
      <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="h5" sx={{ color: '#80509a', lineHeight: 1.1, fontWeight: 800 }}>moni lesson</Typography>
            <Typography variant="caption" color="text.secondary">きょうも、音楽と仲よくなろう ♡</Typography>
          </Box>
          <Chip icon={<StarsRoundedIcon />} label={`${session.todayPoints} pt`} sx={{ bgcolor: '#fff0c9', color: '#8d6821', fontWeight: 800, height: 40 }} />
        </Stack>

        <Card sx={{ mb: 2, borderRadius: 4, bgcolor: '#f7eefb', border: '1px solid #eadcf1' }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800}>きょうのレッスン</Typography>
            <Typography color="text.secondary" sx={{ mt: .5 }}>
              「できた！」で練習を記録しよう。次のお題へ進むときは「次のお題」を押してね。
            </Typography>
            <Typography sx={{ mt: 1, fontWeight: 700 }}>{doneCount} / {totalCount} お題クリア</Typography>
          </CardContent>
        </Card>

        {songs.length === 0 || sessionSongs.length === 0 ? (
          <Card sx={{ borderRadius: 4, border: '1px solid #f0e6f2' }}>
            <CardContent>
              <Typography fontWeight={800}>まだレッスンのお題がないよ</Typography>
              <Typography color="text.secondary" sx={{ mt: .5 }}>
                曲とお題を登録して、曲のお題を「有効」にすると、ここにレッスンが表示されるよ。
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {sessionSongs.map((song) => (
              <Card key={song.songId} sx={{
                borderRadius: 4,
                border: currentSong?.songId === song.songId ? '2px solid #b486c9' : '1px solid #f0e6f2',
                bgcolor: '#fff',
              }}>
                <CardContent sx={{ p: '16px !important' }}>
                  <Button
                    fullWidth
                    onClick={() => {
                      const sourceSong = songs.find((item) => item.id === song.songId);
                      if (sourceSong) chooseSong(sourceSong);
                    }}
                    sx={{ justifyContent: 'space-between', textAlign: 'left', px: 0, mb: 1, color: '#80509a' }}
                  >
                    <Typography variant="h6" fontWeight={800}>{song.songTitle}</Typography>
                    <Typography variant="body2">{currentSong?.songId === song.songId ? 'レッスン中' : 'この曲に切り替える'}</Typography>
                  </Button>
                  <Stack spacing={1}>
                    {song.exercises.map((exercise) => {
                      const isCurrent = currentSong?.songId === song.songId && currentExercise?.topicId === exercise.topicId;
                      const isDone = exercise.completionCount >= exercise.targetCount;
                      const next = getNextExercise(song.songId, exercise.topicId);
                      return (
                        <Box key={exercise.topicId} sx={{
                          p: 1.5, borderRadius: 3, bgcolor: isCurrent ? '#fff4fa' : '#faf8fc',
                          border: isCurrent ? '1px solid #e8c5dc' : '1px solid #f0eaf3',
                        }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography fontWeight={800}>{exercise.topicTitle}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {exercise.completionCount} / {exercise.targetCount} 回
                                {isDone ? ' · 目標達成！' : ''}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={.75}>
                              <Button
                                size="small"
                                variant={isDone ? 'outlined' : 'contained'}
                                onClick={() => {
                                  setCurrentTopicId(exercise.topicId);
                                  setSession((previous) => recordExerciseCompletion(previous, song.songId, exercise.topicId));
                                }}
                                sx={{ minWidth: 82, borderRadius: 2.5, bgcolor: isDone ? 'transparent' : '#b486c9' }}
                              >できた！</Button>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!next}
                                onClick={() => {
                                  if (!next) return;
                                  const nextSong = songs.find((item) => item.id === next.songId);
                                  if (nextSong) setDatabase((previous) => setCurrentSong(previous, next.songId));
                                  setCurrentTopicId(next.topicId);
                                }}
                                sx={{ minWidth: 94, borderRadius: 2.5, borderColor: '#b486c9', color: '#80509a' }}
                              >次のお題</Button>
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
