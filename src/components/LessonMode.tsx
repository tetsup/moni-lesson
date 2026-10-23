import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { recordExerciseCompletion, type LessonSession } from '../data/lesson-session';

type Props = {
  session: LessonSession;
  onSessionChange: (update: (previous: LessonSession) => LessonSession) => void;
};

export default function LessonMode({ session, onSessionChange }: Props) {
  const [mode, setMode] = useState<'selection' | 'lesson'>('selection');
  const [selectedSongId, setSelectedSongId] = useState(session.songs[0]?.songId ?? '');
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const songs = session.songs;
  const selectedSong = songs.find((song) => song.songId === selectedSongId) ?? songs[0];
  // Resolve the current exercise inside the selected song. Topic IDs can be shared
  // across songs, so a global topic lookup can accidentally keep the previous song.
  const currentSong = songs.find((song) => song.songId === selectedSongId);
  const currentExercise = currentSong?.exercises.find((exercise) => exercise.topicId === currentTopicId);
  const songIndex = songs.findIndex((song) => song.songId === currentSong?.songId);
  const topicIndex = currentSong?.exercises.findIndex((exercise) => exercise.topicId === currentTopicId) ?? -1;
  const nextExercise = currentSong?.exercises[topicIndex + 1];
  const nextSong = songs[songIndex + 1];
  const nextSongFirstExercise = nextSong?.exercises[0];
  const nextLabel = !nextExercise && nextSongFirstExercise ? '次の曲' : '次のお題へ';
  const canAdvance = Boolean(nextExercise || nextSongFirstExercise);

  const openTopic = (songId: string, topicId: string) => {
    setSelectedSongId(songId);
    setCurrentTopicId(topicId);
    setMode('lesson');
  };

  const completeCurrent = () => {
    if (!currentSong || !currentExercise) return;
    onSessionChange((previous) => recordExerciseCompletion(previous, currentSong.songId, currentExercise.topicId));
  };

  const advance = () => {
    if (nextExercise && currentSong) {
      setCurrentTopicId(nextExercise.topicId);
      return;
    }
    if (nextSong && nextSongFirstExercise) {
      setSelectedSongId(nextSong.songId);
      setCurrentTopicId(nextSongFirstExercise.topicId);
    }
  };

  if (mode === 'selection') {
    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>曲とお題を選ぼう</Typography>
          <Typography color="text.secondary">曲を選ぶと、その曲のお題が表示されるよ。</Typography>
        </Box>
        <Card sx={{ borderRadius: 4, border: '1px solid #f0e6f2' }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>曲</Typography>
            <Stack spacing={1}>
              {songs.map((song) => (
                <Button key={song.songId} fullWidth variant={song.songId === selectedSongId ? 'contained' : 'outlined'}
                  onClick={() => setSelectedSongId(song.songId)} sx={{ justifyContent: 'flex-start', borderRadius: 3 }}>
                  {song.songTitle}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 4, border: '1px solid #f0e6f2' }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{selectedSong?.songTitle ?? 'お題'}</Typography>
            {!selectedSong || selectedSong.exercises.length === 0 ? (
              <Typography color="text.secondary">この曲には、まだお題がないよ。</Typography>
            ) : (
              <Stack spacing={1}>
                {selectedSong.exercises.map((exercise) => (
                  <Button key={exercise.topicId} fullWidth variant="outlined"
                    onClick={() => openTopic(selectedSong.songId, exercise.topicId)}
                    sx={{ justifyContent: 'flex-start', borderRadius: 3, borderColor: '#d9c1e5', color: '#80509a' }}>
                    {exercise.topicTitle}
                  </Button>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    );
  }

  if (!currentSong || !currentExercise) {
    return <Button variant="outlined" onClick={() => setMode('selection')}>戻る</Button>;
  }

  return (
    <Stack spacing={2}>
      <Button variant="text" onClick={() => setMode('selection')} sx={{ alignSelf: 'flex-start' }}>← 戻る</Button>
      <Card sx={{ borderRadius: 4, bgcolor: '#f7eefb', border: '1px solid #eadcf1' }}>
        <CardContent>
          <Typography color="text.secondary" fontWeight={700}>{currentSong.songTitle}</Typography>
          <Typography variant="h4" fontWeight={900} sx={{ mt: 1, color: '#80509a' }}>{currentExercise.topicTitle}</Typography>
          <Typography sx={{ mt: 2 }}>できた回数：{currentExercise.completionCount} / {currentExercise.targetCount}</Typography>
        </CardContent>
      </Card>
      <Button fullWidth size="large" variant="contained" onClick={completeCurrent}
        sx={{ minHeight: 58, borderRadius: 4, fontWeight: 900, bgcolor: '#b486c9' }}>できた！</Button>
      <Button fullWidth size="large" variant="outlined" disabled={!canAdvance} onClick={advance}
        sx={{ minHeight: 54, borderRadius: 4, fontWeight: 800, borderColor: '#b486c9', color: '#80509a' }}>{nextLabel}</Button>
    <Typography variant="caption" color="text.secondary" textAlign="center">練習できたら「できた！」を押して記録しよう。</Typography>
  </Stack>
  );
}
