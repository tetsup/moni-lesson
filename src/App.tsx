import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Container, Stack, TextField, Typography } from '@mui/material';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import { canStartLesson, makeLessonSetup, DEFAULT_DAILY_BONUS_POINTS } from './data/lesson-setup';
import {
  addSong,
  addTopic,
  getActiveExercises,
  listSongs,
  listTopics,
  loadLessonDatabase,
  saveLessonDatabase,
  setSongExercise,
  type LessonDatabase,
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

const loadDatabase = (): LessonDatabase => loadLessonDatabase(window.localStorage);
const loadInitialSession = (): LessonSession => {
  const saved = loadLessonSession(window.localStorage);
  return saved ? resetLessonSessionForDate(saved, today()) : createLessonSession(today(), [], DEFAULT_DAILY_BONUS_POINTS);
};

export default function App() {
  const [database, setDatabase] = useState<LessonDatabase>(loadDatabase);
  const [session, setSession] = useState<LessonSession>(loadInitialSession);
  const [teacherMode, setTeacherMode] = useState(() => {
    const initialDatabase = loadDatabase();
    return listSongs(initialDatabase).length === 0 || listTopics(initialDatabase).length === 0;
  });
  const [songTitle, setSongTitle] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [selectedSongId, setSelectedSongId] = useState(() => loadDatabase().currentSongId ?? '');
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);

  const songs = useMemo(() => listSongs(database), [database]);
  const topics = useMemo(() => listTopics(database), [database]);
  const activeSongId = songs.some((song) => song.id === selectedSongId) ? selectedSongId : (songs[0]?.id ?? '');
  const sessionSongs = session.songs;
  const currentSong = sessionSongs.find((song) =>
    song.exercises.some((exercise) => exercise.topicId === currentTopicId),
  ) ?? sessionSongs[0];
  const currentExercise = currentSong?.exercises.find((exercise) =>
    exercise.topicId === currentTopicId,
  ) ?? currentSong?.exercises[0];

  useEffect(() => saveLessonSession(session, window.localStorage), [session]);
  useEffect(() => saveLessonDatabase(database, window.localStorage), [database]);

  const addSongFromTeacher = () => {
    if (!songTitle.trim()) return;
    const next = addSong(database, songTitle);
    const added = listSongs(next).at(-1);
    setDatabase(next);
    setSongTitle('');
    if (added) setSelectedSongId(added.id);
  };

  const addTopicFromTeacher = () => {
    if (!topicTitle.trim()) return;
    const next = addTopic(database, topicTitle);
    const added = listTopics(next).at(-1);
    setDatabase(next);
    setTopicTitle('');
    if (added && activeSongId) {
      setDatabase((previous) => setSongExercise(previous, activeSongId, added.id, true));
    }
  };

  const toggleTopicForSong = (topicId: string, active: boolean) => {
    if (!activeSongId) return;
    setDatabase((previous) => setSongExercise(previous, activeSongId, topicId, active));
  };

  const openLesson = () => {
    const setup = makeLessonSetup(database);
    if (setup.length === 0) return;
    const previous = loadLessonSession(window.localStorage);
    const next = createLessonSession(today(), setup, DEFAULT_DAILY_BONUS_POINTS, previous?.totalPoints ?? session.totalPoints);
    setSession(next);
    setCurrentTopicId(setup[0]?.exercises[0]?.topicId ?? null);
    setTeacherMode(false);
  };

  const getNextExercise = (songId: string, topicId: string) => {
    const allExercises = sessionSongs.flatMap((song) =>
      song.exercises.map((exercise) => ({ songId: song.songId, topicId: exercise.topicId })),
    );
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
          <Stack direction="row" spacing={1} alignItems="center">
            {!teacherMode && <Chip icon={<StarsRoundedIcon />} label={`${session.todayPoints} pt`} sx={{ bgcolor: '#fff0c9', color: '#8d6821', fontWeight: 800, height: 40 }} />}
            <Button size="small" variant="outlined" onClick={() => setTeacherMode((value) => !value)} sx={{ borderRadius: 3 }}>
              {teacherMode ? 'レッスンへ' : '先生画面'}
            </Button>
          </Stack>
        </Stack>

        {teacherMode ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>先生の設定画面</Typography>
              <Typography color="text.secondary">曲とお題を登録して、レッスンで使うお題を選んでね。</Typography>
            </Box>
            <Card sx={{ borderRadius: 4, border: '1px solid #f0e6f2' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>曲を登録</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth size="small" label="曲名" value={songTitle} onChange={(event) => setSongTitle(event.target.value)} />
                  <Button variant="contained" onClick={addSongFromTeacher} disabled={!songTitle.trim()} sx={{ minWidth: 84, borderRadius: 2.5 }}>追加</Button>
                </Stack>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 4, border: '1px solid #f0e6f2' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>お題を登録</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth size="small" label="お題（例：右手だけ）" value={topicTitle} onChange={(event) => setTopicTitle(event.target.value)} />
                  <Button variant="contained" onClick={addTopicFromTeacher} disabled={!topicTitle.trim()} sx={{ minWidth: 84, borderRadius: 2.5 }}>追加</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>追加したお題は、選択中の曲に自動で有効登録されるよ。</Typography>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 4, border: '1px solid #f0e6f2' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>曲ごとのお題を設定</Typography>
                {songs.length === 0 ? <Typography color="text.secondary">先に曲を登録してね。</Typography> : (
                  <>
                    <TextField select fullWidth size="small" label="曲を選択" value={activeSongId} onChange={(event) => setSelectedSongId(event.target.value)} sx={{ mb: 1.5 }}>
                      {songs.map((song) => <option key={song.id} value={song.id}>{song.title}</option>)}
                    </TextField>
                    {topics.length === 0 ? <Typography color="text.secondary">先にお題を登録してね。</Typography> : (
                      <Stack spacing={1}>
                        {topics.map((topic) => {
                          const song = songs.find((item) => item.id === activeSongId);
                          const assignment = song?.exercises.find((item) => item.topicId === topic.id);
                          const active = assignment?.active ?? false;
                          return (
                            <Stack key={topic.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.2, borderRadius: 2.5, bgcolor: '#faf7fc' }}>
                              <Typography fontWeight={700}>{topic.title}</Typography>
                              <Button size="small" variant={active ? 'contained' : 'outlined'} onClick={() => toggleTopicForSong(topic.id, !active)} sx={{ borderRadius: 2.5 }}>
                                {active ? 'レッスンに使う' : '使わない'}
                              </Button>
                            </Stack>
                          );
                        })}
                      </Stack>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            <Button fullWidth variant="contained" size="large" onClick={openLesson} disabled={!canStartLesson(database)} sx={{ minHeight: 58, borderRadius: 4, fontWeight: 900, bgcolor: '#b486c9' }}>
              レッスン画面へ
            </Button>
          </Stack>
        ) : (
          <>
            <Card sx={{ mb: 2, borderRadius: 4, bgcolor: '#f7eefb', border: '1px solid #eadcf1' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800}>きょうのレッスン</Typography>
                <Typography color="text.secondary" sx={{ mt: .5 }}>「できた！」で練習を記録しよう。次のお題へ進むときは「次のお題」を押してね。</Typography>
                <Typography sx={{ mt: 1, fontWeight: 700 }}>{doneCount} / {totalCount} お題クリア</Typography>
              </CardContent>
            </Card>
            {sessionSongs.length === 0 ? (
              <Card sx={{ borderRadius: 4, border: '1px solid #f0e6f2' }}>
                <CardContent>
                  <Typography fontWeight={800}>まだレッスンのお題がないよ</Typography>
                  <Typography color="text.secondary" sx={{ mt: .5 }}>先生画面で曲とお題を登録してね。</Typography>
                  <Button sx={{ mt: 1 }} variant="contained" onClick={() => setTeacherMode(true)}>先生画面を開く</Button>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={1.5}>
                {sessionSongs.map((song) => (
                  <Card key={song.songId} sx={{ borderRadius: 4, border: currentSong?.songId === song.songId ? '2px solid #b486c9' : '1px solid #f0e6f2', bgcolor: '#fff' }}>
                    <CardContent sx={{ p: '16px !important' }}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#80509a', mb: 1 }}>{song.songTitle}</Typography>
                      <Stack spacing={1}>
                        {song.exercises.map((exercise) => {
                          const isCurrent = currentSong?.songId === song.songId && currentExercise?.topicId === exercise.topicId;
                          const isDone = exercise.completionCount >= exercise.targetCount;
                          const next = getNextExercise(song.songId, exercise.topicId);
                          return (
                            <Box key={exercise.topicId} sx={{ p: 1.5, borderRadius: 3, bgcolor: isCurrent ? '#fff4fa' : '#faf8fc', border: isCurrent ? '1px solid #e8c5dc' : '1px solid #f0eaf3' }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography fontWeight={800}>{exercise.topicTitle}</Typography>
                                  <Typography variant="body2" color="text.secondary">{exercise.completionCount} / {exercise.targetCount} 回{isDone ? ' · 目標達成！' : ''}</Typography>
                                </Box>
                                <Stack direction="row" spacing={.75}>
                                  <Button size="small" variant={isDone ? 'outlined' : 'contained'} onClick={() => {
                                    setCurrentTopicId(exercise.topicId);
                                    setSession((previous) => recordExerciseCompletion(previous, song.songId, exercise.topicId));
                                  }} sx={{ minWidth: 82, borderRadius: 2.5, bgcolor: isDone ? 'transparent' : '#b486c9' }}>できた！</Button>
                                  <Button size="small" variant="outlined" disabled={!next} onClick={() => next && setCurrentTopicId(next.topicId)} sx={{ minWidth: 94, borderRadius: 2.5, borderColor: '#b486c9', color: '#80509a' }}>次のお題</Button>
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
          </>
        )}
      </Container>
    </Box>
  );
}
