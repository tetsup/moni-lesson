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
      <Box
        aria-label="グランドピアノと流れる音符"
        role="img"
        sx={{
          position: 'relative',
          height: { xs: 250, sm: 270 },
          overflow: 'hidden',
          borderRadius: 5,
          background: 'linear-gradient(180deg,#fff4fa 0%,#f9e8f2 70%,#f0d4e6 70%,#e9c9df 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#fff8fc', opacity: .38 }} />
        <Box sx={{ position: 'absolute', top: 0, left: '6%', right: '6%', height: '70%', borderBottom: '3px solid #e7c5d9' }} />
        <Box sx={{ position: 'absolute', bottom: 24, width: '82%', height: 16, borderRadius: '50%', bgcolor: '#c9a3c0', opacity: .25 }} />

        {/* Piano sits behind the animated notes. */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            width: { xs: 285, sm: 320 },
            maxWidth: '100%',
            height: 220,
            mt: 3,
            animation: 'pianoBob 2.2s ease-in-out infinite',
            '@keyframes pianoBob': {
              '0%,100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-5px)' },
            },
          }}
        >
          <Box sx={{ position: 'absolute', top: 4, left: 20, width: '84%', height: 104, bgcolor: '#24212b', border: '3px solid #100f15', borderRadius: '10px 78% 8px 8px', transform: 'skewY(-5deg)', boxShadow: 'inset 0 6px 0 #494550, 0 6px 0 #111' }} />
          <Box sx={{ position: 'absolute', top: 20, left: 42, width: '70%', height: 70, bgcolor: '#393540', border: '3px solid #17151c', clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)', transform: 'rotate(-8deg)', transformOrigin: 'left center' }} />
          <Box sx={{ position: 'absolute', top: 84, left: 15, right: 9, height: 92, bgcolor: '#17151c', border: '3px solid #08070b', borderRadius: '20px 34px 13px 13px', boxShadow: 'inset 0 8px 0 #37333d, 0 9px 0 #09080c' }}>
            <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2.2 }}>
              {[0, 1].map((eye) => (
                <Box key={eye} sx={{ width: 14, height: 18, borderRadius: '50%', bgcolor: '#fff', border: '2px solid #d2c3d8', position: 'relative' }}>
                  <Box sx={{ position: 'absolute', width: 5, height: 7, borderRadius: '50%', bgcolor: '#282330', top: 4, left: 4 }} />
                </Box>
              ))}
            </Box>
            <Box sx={{ position: 'absolute', top: 41, left: '50%', transform: 'translateX(-50%)', width: 24, height: 12, borderBottom: '3px solid #f3a4c3', borderRadius: '0 0 50% 50%' }} />
            <Stack direction="row" sx={{ position: 'absolute', left: 9, right: 9, bottom: 7, height: 25, gap: '2px' }}>
              {Array.from({ length: 14 }, (_, i) => <Box key={i} sx={{ flex: 1, bgcolor: '#fffafc', borderRadius: '0 0 3px 3px', border: '1px solid #cfc6d2' }} />)}
            </Stack>
          </Box>
          {[-1, 0, 1].map((leg) => <Box key={leg} sx={{ position: 'absolute', top: 158, left: `${43 + leg * 26}%`, width: 13, height: 38, bgcolor: '#111015', borderRadius: 2 }} />)}
          <Box sx={{ position: 'absolute', bottom: 0, right: 12, width: 42, height: 23, borderRadius: '50%', bgcolor: '#17151c', border: '3px solid #08070b' }} />
        </Box>

        {/* Animated notes have a higher stacking order so they pass in front of the piano. */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
          {['♪', '♫', '♬'].map((note, i) => (
            <Typography
              key={note}
              aria-hidden="true"
              sx={{
                position: 'absolute',
                left: `${18 + i * 30}%`,
                bottom: 105,
                color: ['#a56cc1', '#e58eae', '#75aa9a'][i],
                fontSize: 38 + i * 5,
                animation: `noteRise 3.4s ease-out ${i * 1.05}s infinite`,
                '@keyframes noteRise': {
                  '0%': { transform: 'translateY(35px)', opacity: 0 },
                  '25%': { opacity: 1 },
                  '100%': { transform: 'translateY(-155px)', opacity: 0 },
                },
              }}
            >
              {note}
            </Typography>
          ))}
        </Box>
      </Box>
      <Button fullWidth size="large" variant="contained" onClick={completeCurrent}
        sx={{ minHeight: 58, borderRadius: 4, fontWeight: 900, bgcolor: '#b486c9' }}>できた！</Button>
      <Button fullWidth size="large" variant="outlined" disabled={!canAdvance} onClick={advance}
        sx={{ minHeight: 54, borderRadius: 4, fontWeight: 800, borderColor: '#b486c9', color: '#80509a' }}>{nextLabel}</Button>
    <Typography variant="caption" color="text.secondary" textAlign="center">練習できたら「できた！」を押して記録しよう。</Typography>
  </Stack>
  );
}
