import { useEffect, useMemo, useState } from 'react';
import LessonMode from './components/LessonMode';
import AudioMaintenance from './components/AudioMaintenance';
import { resolveHashRoute } from './data/lesson-routing';
import { Box, Button, Card, CardContent, Chip, Container, MenuItem, Stack, TextField, Typography } from '@mui/material';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import { canStartLesson, makeLessonSetup, DEFAULT_DAILY_BONUS_POINTS, DEFAULT_POINTS_PER_COMPLETION, DEFAULT_GOAL_BONUS_POINTS, DEFAULT_ALL_GOALS_BONUS_POINTS } from './data/lesson-setup';
import {
  addSong,
  addTopic,
  getActiveExercises,
  listSongs,
  listTopics,
  loadLessonDatabase,
  saveLessonDatabase,
  setSongExercise,
  setExercisePoints,
  setExerciseTargetCount,
  setSongBonusPoints,
  setDailyBonusPoints,
  softDeleteSong,
  softDeleteTopic,
  type LessonDatabase,
} from './data/lesson-database';
import {
  createLessonSession,
  loadLessonSession,
  updateLessonSessionForSetup,
  resetLessonSessionForDate,
  saveLessonSession,
  type LessonSession,
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
  const [route, setRoute] = useState(() => resolveHashRoute(window.location.hash));

  useEffect(() => {
    const syncRoute = () => setRoute(resolveHashRoute(window.location.hash));
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);
  const [songTitle, setSongTitle] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [selectedSongId, setSelectedSongId] = useState(() => loadDatabase().currentSongId ?? '');
  const [pointDrafts, setPointDrafts] = useState<Record<string, string>>({});

  const songs = useMemo(() => listSongs(database), [database]);
  const topics = useMemo(() => listTopics(database), [database]);
  const activeSongId = songs.some((song) => song.id === selectedSongId) ? selectedSongId : (songs[0]?.id ?? '');


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

  const deleteSongFromTeacher = (songId: string) => {
    const song = songs.find((item) => item.id === songId);
    if (!song || !window.confirm('「' + song.title + '」を削除しますか？')) return;
    setDatabase((previous) => softDeleteSong(previous, songId));
    setSelectedSongId((current) => current === songId ? '' : current);
  };

  const deleteTopicFromTeacher = (topicId: string) => {
    const topic = topics.find((item) => item.id === topicId);
    if (!topic || !window.confirm('お題「' + topic.title + '」を削除しますか？')) return;
    setDatabase((previous) => softDeleteTopic(previous, topicId));
  };

  const pointDraftKey = (key: string) => `${activeSongId}:${key}`;

  const pointInputValue = (key: string, savedValue: number | undefined, defaultValue: number) =>
    pointDrafts[pointDraftKey(key)] ?? String(savedValue ?? defaultValue);

  const changePointDraft = (
    key: string,
    value: string,
    save: (points: number) => void,
  ) => {
    setPointDrafts((previous) => ({ ...previous, [pointDraftKey(key)]: value }));
    if (value.trim() === '') return;
    const points = Number(value);
    if (Number.isSafeInteger(points) && points >= 0) save(points);
  };

  const commitPointDraft = (
    key: string,
    value: string,
    save: (points: number) => void,
  ) => {
    const points = value.trim() === '' ? 0 : Number(value);
    if (!Number.isSafeInteger(points) || points < 0) {
      setPointDrafts((previous) => ({ ...previous, [pointDraftKey(key)]: '0' }));
      save(0);
      return;
    }
    setPointDrafts((previous) => ({ ...previous, [pointDraftKey(key)]: String(points) }));
    save(points);
  };

  const updateExerciseTargetCount = (topicId: string, value: string) => {
    if (!activeSongId || value.trim() === '') return;
    const targetCount = Number(value);
    if (!Number.isSafeInteger(targetCount) || targetCount < 1) return;
    setDatabase((previous) => setExerciseTargetCount(previous, activeSongId, topicId, targetCount));
  };

  const updateExercisePoints = (topicId: string, field: 'pointsPerCompletion' | 'goalBonusPoints', value: string) => {
    if (!activeSongId) return;
    changePointDraft(`${topicId}:${field}`, value, (points) => {
      setDatabase((previous) => setExercisePoints(previous, activeSongId, topicId, field, points));
    });
  };

  const commitExercisePoints = (topicId: string, field: 'pointsPerCompletion' | 'goalBonusPoints', value: string) => {
    if (!activeSongId) return;
    commitPointDraft(`${topicId}:${field}`, value, (points) => {
      setDatabase((previous) => setExercisePoints(previous, activeSongId, topicId, field, points));
    });
  };

  const updateSongBonusPoints = (value: string) => {
    if (!activeSongId) return;
    changePointDraft('songBonus', value, (points) => {
      setDatabase((previous) => setSongBonusPoints(previous, activeSongId, points));
    });
  };

  const commitSongBonusPoints = (value: string) => {
    if (!activeSongId) return;
    commitPointDraft('songBonus', value, (points) => {
      setDatabase((previous) => setSongBonusPoints(previous, activeSongId, points));
    });
  };

  const updateDailyBonusPoints = (value: string) => {
    changePointDraft('dailyBonus', value, (points) => {
      setDatabase((previous) => setDailyBonusPoints(previous, points));
    });
  };

  const commitDailyBonusPoints = (value: string) => {
    commitPointDraft('dailyBonus', value, (points) => {
      setDatabase((previous) => setDailyBonusPoints(previous, points));
    });
  };

  const navigateToCompletion = () => {
    setRoute({ page: 'complete' });
    window.location.hash = '/complete';
  };

  const openLesson = () => {
    const setup = makeLessonSetup(database);
    if (setup.length === 0) return;
    const previous = loadLessonSession(window.localStorage) ?? session;
    const next = updateLessonSessionForSetup(previous, today(), setup, database.dailyBonusPoints ?? DEFAULT_DAILY_BONUS_POINTS);
    setSession(next);
    setRoute({ page: 'practice' });
    window.location.hash = '/practice';
  };



  return (
    <Box sx={{ minHeight: '100vh', pb: 4, bgcolor: '#fffafd' }}>
      <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="h5" sx={{ color: '#80509a', lineHeight: 1.1, fontWeight: 800 }}>moni lesson</Typography>
            <Typography variant="caption" color="text.secondary">きょうも、音楽と仲よくなろう ♡</Typography>
          </Box>
          {route.page === 'practice' && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Chip
                icon={<AccountBalanceWalletRoundedIcon />}
                label={`${session.totalPoints} pt`}
                aria-label={`所持ポイント ${session.totalPoints}ポイント`}
                size="small"
                sx={{ bgcolor: '#eee5f5', color: '#80509a', fontWeight: 800, '& .MuiChip-icon': { color: '#80509a' } }}
              />
              <Chip
                icon={<StarsRoundedIcon />}
                label={`${session.todayPoints} pt`}
                aria-label={`今日の獲得ポイント ${session.todayPoints}ポイント`}
                size="small"
                sx={{ bgcolor: '#fff0c9', color: '#8d6821', fontWeight: 800, '& .MuiChip-icon': { color: '#d99a13' } }}
              />
            </Stack>
          )}
        </Stack>

        {route.page === 'admin' ? (
          <AudioMaintenance />
        ) : route.page === 'complete' ? (
          <Stack spacing={2}>
            <Card sx={{ borderRadius: 2, bgcolor: '#fff0f8', border: '1px solid #f0d7e8', textAlign: 'center' }}>
              <CardContent sx={{ py: 4 }}>
                <Typography variant="h4" fontWeight={900} sx={{ color: '#80509a' }}>今日も頑張ったね！</Typography>
                <Typography color="text.secondary" sx={{ mt: 2 }}>今日のポイント</Typography>
                <Typography variant="h2" fontWeight={900} sx={{ color: '#80509a' }}>{session.todayPoints}<Typography component="span" variant="h5" fontWeight={800}> pt</Typography></Typography>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>今日取り組んだお題</Typography>
                {session.songs.map((song) => {
                  const completed = song.exercises.filter((exercise) => exercise.completionCount > 0);
                  if (completed.length === 0) return null;
                  return (
                    <Box key={song.songId} sx={{ mb: 1.5 }}>
                      <Typography fontWeight={800}>{song.songTitle}</Typography>
                      {completed.map((exercise) => (
                        <Typography key={exercise.topicId} color="text.secondary" sx={{ pl: 1 }}>
                          • {exercise.topicTitle}（{exercise.completionCount}回）
                        </Typography>
                      ))}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
            <Button fullWidth variant="contained" size="large" onClick={() => { setRoute({ page: 'practice' }); window.location.hash = '/practice'; }} sx={{ minHeight: 56, borderRadius: 2, fontWeight: 900, bgcolor: '#b486c9' }}>
              レッスン画面へ戻る
            </Button>
          </Stack>
        ) : route.page === 'teacher' ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>先生の設定画面</Typography>
              <Typography color="text.secondary">曲とお題を登録して、レッスンで使うお題を選んでね。</Typography>
            </Box>
            <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>曲を登録</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth size="small" label="曲名" value={songTitle} onChange={(event) => setSongTitle(event.target.value)} />
                  <Button variant="contained" onClick={addSongFromTeacher} disabled={!songTitle.trim()} sx={{ minWidth: 84, borderRadius: 2.5 }}>追加</Button>
                </Stack>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>お題を登録</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth size="small" label="お題（例：右手だけ）" value={topicTitle} onChange={(event) => setTopicTitle(event.target.value)} />
                  <Button variant="contained" onClick={addTopicFromTeacher} disabled={!topicTitle.trim()} sx={{ minWidth: 84, borderRadius: 2.5 }}>追加</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>追加したお題は、選択中の曲に自動で有効登録されるよ。</Typography>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>曲ごとのお題を設定</Typography>
                {songs.length === 0 ? <Typography color="text.secondary">先に曲を登録してね。</Typography> : (
                  <>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      <TextField select fullWidth size="small" label="曲を選択" value={activeSongId} onChange={(event) => setSelectedSongId(event.target.value)}>
                        {songs.map((song) => <MenuItem key={song.id} value={song.id}>{song.title}</MenuItem>)}
                      </TextField>
                      <Button color="error" variant="outlined" onClick={() => deleteSongFromTeacher(activeSongId)} disabled={!activeSongId} sx={{ flexShrink: 0 }}>曲を削除</Button>
                    </Stack>
                    {topics.length === 0 ? <Typography color="text.secondary">先にお題を登録してね。</Typography> : (
                      <Stack spacing={1}>
                        {topics.map((topic) => {
                          const song = songs.find((item) => item.id === activeSongId);
                          const assignment = song?.exercises.find((item) => item.topicId === topic.id);
                          const active = assignment?.active ?? false;
                          return (
                            <Stack key={topic.id} spacing={1} sx={{ p: 1.2, borderRadius: 2.5, bgcolor: '#faf7fc' }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                <Typography fontWeight={700}>{topic.title}</Typography>
                                <Stack direction="row" spacing={0.5}>
                                  <Button size="small" variant={active ? 'contained' : 'outlined'} onClick={() => toggleTopicForSong(topic.id, !active)} sx={{ borderRadius: 2.5, flexShrink: 0 }}>
                                    {active ? 'レッスンに使う' : '使わない'}
                                  </Button>
                                  <Button size="small" color="error" variant="text" onClick={() => deleteTopicFromTeacher(topic.id)} sx={{ flexShrink: 0 }}>削除</Button>
                                </Stack>
                              </Stack>
                              <Stack direction="row" spacing={1}>
                                <TextField size="small" type="number" label="目標回数" value={pointInputValue(`${topic.id}:targetCount`, assignment?.targetCount, 10)} inputProps={{ min: 1, step: 1 }} onChange={(event) => updateExerciseTargetCount(topic.id, event.target.value)} />
                                <TextField size="small" type="number" label="1回のポイント" value={pointInputValue(`${topic.id}:pointsPerCompletion`, assignment?.pointsPerCompletion, DEFAULT_POINTS_PER_COMPLETION)} inputProps={{ min: 0, step: 1 }} onChange={(event) => updateExercisePoints(topic.id, 'pointsPerCompletion', event.target.value)} onBlur={(event) => commitExercisePoints(topic.id, 'pointsPerCompletion', event.target.value)} />
                                <TextField size="small" type="number" label="達成ボーナス" value={pointInputValue(`${topic.id}:goalBonusPoints`, assignment?.goalBonusPoints, DEFAULT_GOAL_BONUS_POINTS)} inputProps={{ min: 0, step: 1 }} onChange={(event) => updateExercisePoints(topic.id, 'goalBonusPoints', event.target.value)} onBlur={(event) => commitExercisePoints(topic.id, 'goalBonusPoints', event.target.value)} />
                              </Stack>
                            </Stack>
                          );
                        })}
                        <TextField fullWidth size="small" type="number" label="この曲のお題を全部達成したボーナス" value={pointInputValue('songBonus', songs.find((item) => item.id === activeSongId)?.allGoalsBonusPoints, DEFAULT_ALL_GOALS_BONUS_POINTS)} inputProps={{ min: 0, step: 1 }} onChange={(event) => updateSongBonusPoints(event.target.value)} onBlur={(event) => commitSongBonusPoints(event.target.value)} />
                        <TextField fullWidth size="small" type="number" label="今日のお題を全部達成したボーナス" value={pointInputValue('dailyBonus', database.dailyBonusPoints, DEFAULT_DAILY_BONUS_POINTS)} inputProps={{ min: 0, step: 1 }} onChange={(event) => updateDailyBonusPoints(event.target.value)} onBlur={(event) => commitDailyBonusPoints(event.target.value)} />
                      </Stack>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            <Button fullWidth variant="contained" size="large" onClick={openLesson} disabled={!canStartLesson(database)} sx={{ minHeight: 58, borderRadius: 2, fontWeight: 900, bgcolor: '#b486c9' }}>
              レッスン画面へ
            </Button>
          </Stack>
        ) : (
          <LessonMode session={session} onSessionChange={setSession} onNavigate={navigateToCompletion} />
        )}
      </Container>
    </Box>
  );
}
