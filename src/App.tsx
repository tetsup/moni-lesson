import { useEffect, useMemo, useState } from 'react';
import LessonMode from './components/LessonMode';
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
  const [teacherMode, setTeacherMode] = useState(() => {
    const initialDatabase = loadDatabase();
    return listSongs(initialDatabase).length === 0 || listTopics(initialDatabase).length === 0;
  });
  const [songTitle, setSongTitle] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [selectedSongId, setSelectedSongId] = useState(() => loadDatabase().currentSongId ?? '');

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

  const openLesson = () => {
    const setup = makeLessonSetup(database);
    if (setup.length === 0) return;
    const previous = loadLessonSession(window.localStorage);
    const next = createLessonSession(today(), setup, DEFAULT_DAILY_BONUS_POINTS, previous?.totalPoints ?? session.totalPoints);
    setSession(next);
    setTeacherMode(false);
  };



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
          <LessonMode session={session} onSessionChange={setSession} />
        )}
      </Container>
    </Box>
  );
}
