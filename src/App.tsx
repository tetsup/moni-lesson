import { useEffect, useMemo, useState } from 'react';
import LessonMode from './components/LessonMode';
import TeacherMode from './components/TeacherMode';
import AudioMaintenance from './components/AudioMaintenance';
import RecordingLibrary from './components/RecordingLibrary';
import { resolveHashRoute } from './data/lesson-routing';
import { Box, Button, Card, CardContent, Checkbox, Chip, Container, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import { canStartLesson, makeLessonSetup, DEFAULT_DAILY_BONUS_POINTS, DEFAULT_POINTS_PER_COMPLETION, DEFAULT_GOAL_BONUS_POINTS, DEFAULT_ALL_GOALS_BONUS_POINTS } from './data/lesson-setup';
import {
  addSongFromMaster,
  addTopicFromMaster,
  listSongs,
  loadLessonDatabase,
  saveLessonDatabase,
  removeTopicFromSong,
  setExercisePoints,
  setExerciseTargetCount,
  setExerciseRepeatAllowed,
  setExerciseMinimumInterval,
  setSongBonusPoints,
  setDailyBonusPoints,
  deleteSong,
  type LessonDatabase,
} from './data/lesson-database';
import {
  addMasterSong, addMasterTopic, listMasterSongs, listMasterTopics,
  loadMasterDatabase, saveMasterDatabase, seedMasterDatabase,
  softDeleteMasterTopic, type MasterDatabase,
} from './data/master-database';
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
const loadMaster = (): MasterDatabase => {
  const current = loadMasterDatabase(window.localStorage);
  try {
    const raw = window.localStorage.getItem('moni-lesson-database');
    const legacy = raw ? JSON.parse(raw) : null;
    return seedMasterDatabase(current, legacy?.songs ?? [], legacy?.topics ?? []);
  } catch {
    return current;
  }
};
const loadInitialSession = (): LessonSession => {
  const date = today();
  const saved = loadLessonSession(window.localStorage);
  const previous = saved
    ? resetLessonSessionForDate(saved, date)
    : createLessonSession(date, [], DEFAULT_DAILY_BONUS_POINTS);
  const database = loadDatabase();
  return updateLessonSessionForSetup(
    previous,
    date,
    makeLessonSetup(database),
    database.dailyBonusPoints ?? DEFAULT_DAILY_BONUS_POINTS,
  );
};

export default function App() {
  const [database, setDatabase] = useState<LessonDatabase>(loadDatabase);
  const [masterDatabase, setMasterDatabase] = useState<MasterDatabase>(loadMaster);
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
  const [selectedMasterSongId, setSelectedMasterSongId] = useState('');
  const [pointDrafts, setPointDrafts] = useState<Record<string, string>>({});

  const songs = useMemo(() => listSongs(database), [database]);
  const masterSongs = useMemo(() => listMasterSongs(masterDatabase), [masterDatabase]);
  const activeSongId = songs.some((song) => song.id === selectedSongId) ? selectedSongId : (songs[0]?.id ?? '');
  const topics = useMemo(() => {
    const available = listMasterTopics(masterDatabase);
    const knownIds = new Set(available.map((topic) => topic.id));
    const assigned = songs.find((song) => song.id === activeSongId)?.exercises ?? [];
    const snapshots = assigned.filter((item) => !knownIds.has(item.topicId)).map((item, index) => ({
      id: item.topicId, title: item.topicTitle, order: available.length + index, deleted: true,
    }));
    return [...available, ...snapshots];
  }, [masterDatabase, database, activeSongId, songs]);


  useEffect(() => saveLessonSession(session, window.localStorage), [session]);
  useEffect(() => saveLessonDatabase(database, window.localStorage), [database]);
  useEffect(() => saveMasterDatabase(masterDatabase, window.localStorage), [masterDatabase]);

  const addSongFromTeacher = () => {
    if (!songTitle.trim()) return;
    setMasterDatabase((previous) => addMasterSong(previous, songTitle));
    setSongTitle('');
  };

  const addSelectedMasterSong = () => {
    const masterSong = masterSongs.find((song) => song.id === selectedMasterSongId);
    if (!masterSong) return;
    setDatabase((previous) => addSongFromMaster(previous, masterSong));
    setSelectedSongId(masterSong.id);
  };

  const addTopicFromTeacher = () => {
    if (!topicTitle.trim()) return;
    setMasterDatabase((previous) => addMasterTopic(previous, topicTitle));
    setTopicTitle('');
  };

  const toggleTopicForSong = (topicId: string, selected: boolean) => {
    if (!activeSongId) return;
    const topic = topics.find((item) => item.id === topicId);
    if (!topic) return;
    setDatabase((previous) => selected
      ? addTopicFromMaster(previous, activeSongId, topic)
      : removeTopicFromSong(previous, activeSongId, topicId));
  };

  const deleteSongFromTeacher = (songId: string) => {
    const song = songs.find((item) => item.id === songId);
    if (!song || !window.confirm('「' + song.title + '」を削除しますか？')) return;
    setDatabase((previous) => deleteSong(previous, songId));
    setSelectedSongId((current) => current === songId ? '' : current);
  };

  const deleteTopicFromTeacher = (topicId: string) => {
    const topic = topics.find((item) => item.id === topicId);
    if (!topic || !window.confirm('マスターのお題「' + topic.title + '」を非表示にしますか？')) return;
    setMasterDatabase((previous) => softDeleteMasterTopic(previous, topicId));
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

  const updateExerciseRepeatAllowed = (topicId: string, repeatAllowed: boolean) => {
    if (!activeSongId) return;
    setDatabase((previous) => setExerciseRepeatAllowed(previous, activeSongId, topicId, repeatAllowed));
  };

  const updateExerciseMinimumInterval = (topicId: string, value: string) => {
    if (!activeSongId || value.trim() === '') return;
    const seconds = Number(value);
    if (!Number.isSafeInteger(seconds) || seconds < 0) return;
    setDatabase((previous) => setExerciseMinimumInterval(previous, activeSongId, topicId, seconds));
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

  const openRecordings = () => {
    setRoute({ page: 'recordings' });
    window.location.hash = '/recordings';
  };

  const returnToLesson = () => {
    setRoute({ page: 'practice' });
    window.location.hash = '/practice';
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

        {route.page === 'recordings' ? (
          <RecordingLibrary onBack={returnToLesson} />
        ) : route.page === 'admin' ? (
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
          <TeacherMode database={database} setDatabase={setDatabase} masterDatabase={masterDatabase} setMasterDatabase={setMasterDatabase} onOpenLesson={openLesson} />
        ) : (
          <LessonMode session={session} onSessionChange={setSession} onNavigate={navigateToCompletion} onOpenRecordings={openRecordings} />
        )}
      </Container>
    </Box>
  );
}
