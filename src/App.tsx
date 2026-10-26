import { useEffect, useMemo, useState } from 'react';
import LessonMode from './components/LessonMode';
import TeacherMode from './components/TeacherMode';
import AudioMaintenance from './components/AudioMaintenance';
import RecordingLibrary from './components/RecordingLibrary';
import ShopPage, { type ShopItem } from './components/ShopPage';
import ItemsPage from './components/ItemsPage';
import { resolveHashRoute } from './data/lesson-routing';
import { Box, Button, Card, CardContent, Checkbox, Chip, Container, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
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
  const [purchasedItems, setPurchasedItems] = useState<ShopItem[]>(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem('moni-lesson-purchased-items') ?? '[]');
      return Array.isArray(saved) ? saved as ShopItem[] : [];
    } catch {
      return [];
    }
  });
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
  useEffect(() => window.localStorage.setItem('moni-lesson-purchased-items', JSON.stringify(purchasedItems)), [purchasedItems]);
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

  const openShop = () => {
    setRoute({ page: 'shop' });
    window.location.hash = '/shop';
  };

  const purchaseShopItem = (item: ShopItem): boolean => {
    if (session.totalPoints < item.price) return false;
    setSession((previous) => previous.totalPoints >= item.price
      ? { ...previous, totalPoints: previous.totalPoints - item.price }
      : previous);
    setPurchasedItems((previous) => [...previous, item]);
    return true;
  };

  const useTicket = (item: ShopItem) => {
    setPurchasedItems((previous) => {
      const index = previous.findIndex((ownedItem) => ownedItem.id === item.id);
      if (index < 0) return previous;
      return [...previous.slice(0, index), ...previous.slice(index + 1)];
    });
  };

  const openItems = () => {
    setRoute({ page: 'items' });
    window.location.hash = '/items';
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
    <Box sx={{ height: route.page === 'shop' ? '100dvh' : 'auto', minHeight: '100vh', overflow: route.page === 'shop' ? 'hidden' : 'visible', pb: 'calc(76px + env(safe-area-inset-bottom))', bgcolor: '#fffafd', backgroundImage: route.page === 'shop' ? 'url(https://res.cloudinary.com/ifw9eftr/image/upload/v1792993306/moni-shop.png)' : route.page === 'recordings' ? 'url(https://res.cloudinary.com/ifw9eftr/image/upload/v1792994730/moni-recording.png)' : route.page === 'practice' ? 'url(https://res.cloudinary.com/ifw9eftr/image/upload/v1792994649/moni-lesson.png)' : 'none', backgroundSize: 'cover', backgroundPosition: 'center center', backgroundRepeat: 'no-repeat' }}>
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
        ) : route.page === 'shop' ? (
          <ShopPage totalPoints={session.totalPoints} onPurchase={purchaseShopItem} />
        ) : route.page === 'items' ? (
          <ItemsPage purchasedItems={purchasedItems} onUseTicket={useTicket} />
        ) : (
          <LessonMode session={session} onSessionChange={setSession} onNavigate={navigateToCompletion} onOpenRecordings={openRecordings} />
        )}
      </Container>
      {route.page !== 'teacher' && route.page !== 'admin' && (
        <Box
          component="nav"
          aria-label="メインメニュー"
          sx={{
            position: 'fixed',
            zIndex: (theme) => theme.zIndex.appBar,
            right: 0,
            bottom: 0,
            left: 0,
            bgcolor: 'rgba(255, 250, 253, 0.97)',
            borderTop: '1px solid #eaddec',
            boxShadow: '0 -3px 12px rgba(91, 55, 105, 0.08)',
            pb: 'env(safe-area-inset-bottom)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Container maxWidth="sm" sx={{ px: { xs: 1, sm: 2 } }}>
            <Stack direction="row" alignItems="stretch" justifyContent="space-between" sx={{ minHeight: 76 }}>
              {[
                { label: 'レッスン', icon: <MusicNoteRoundedIcon />, active: route.page === 'practice', onClick: returnToLesson },
                { label: '録音', icon: <MicRoundedIcon />, active: route.page === 'recordings', onClick: openRecordings },
                { label: 'ショップ', icon: <StorefrontRoundedIcon />, active: route.page === 'shop', onClick: openShop },
                { label: 'アイテム', icon: <CardGiftcardRoundedIcon />, active: route.page === 'items', onClick: openItems },
              ].map((item) => (
                <Box
                  key={item.label}
                  component="button"
                  onClick={item.onClick}
                  aria-current={item.active ? 'page' : undefined}
                  sx={{
                    appearance: 'none',
                    border: 0,
                    background: 'transparent',
                    color: item.active ? '#80509a' : '#8f8294',
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.25,
                    py: 1,
                    cursor: 'pointer',
                    font: 'inherit',
                    '& .MuiSvgIcon-root': { fontSize: 29 },
                    '&:focus-visible': { outline: '2px solid #b486c9', outlineOffset: -2, borderRadius: 2 },
                  }}
                >
                  {item.icon}
                  <Typography component="span" sx={{ fontSize: 11, lineHeight: 1.3, fontWeight: item.active ? 800 : 600, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
              <Box
                aria-label={`所持ポイント ${session.totalPoints}ポイント`}
                sx={{
                  minWidth: 84,
                  px: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#80509a',
                  borderLeft: '1px solid #eaddec',
                  ml: 0.5,
                }}
              >
                <Chip
                  icon={<AccountBalanceWalletRoundedIcon />}
                  label={`${session.totalPoints} pt`}
                  size="small"
                  sx={{
                    bgcolor: '#eee5f5',
                    color: '#80509a',
                    fontWeight: 800,
                    '& .MuiChip-icon': { color: '#80509a' },
                  }}
                />
              </Box>
            </Stack>
          </Container>
        </Box>
      )}
    </Box>
  );
}
