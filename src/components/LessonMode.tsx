import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { recordExerciseCompletion, type LessonSession } from '../data/lesson-session';
import { getLessonPrimaryAction, resolveLessonAction } from '../data/lesson-routing';

type Props = {
  session: LessonSession;
  onSessionChange: (update: (previous: LessonSession) => LessonSession) => void;
  onNavigate: (route: 'complete') => void;
};

export default function LessonMode({ session, onSessionChange, onNavigate }: Props) {
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
  const progress = {
    songs: songs.map((song) => ({ songId: song.songId, topicIds: song.exercises.map((exercise) => exercise.topicId) })),
    currentSongIndex: songIndex,
    currentTopicIndex: topicIndex,
  };
  const primaryAction = getLessonPrimaryAction(progress);
  const canAdvance = Boolean(nextExercise || nextSongFirstExercise) || primaryAction.action === 'finish';

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
    const result = resolveLessonAction(progress, primaryAction.action);
    if (result.type === 'navigate') {
      onNavigate(result.route);
      return;
    }
    if (result.type !== 'advance') return;
    const targetSong = songs[result.songIndex];
    const targetExercise = targetSong?.exercises[result.topicIndex];
    if (!targetSong || !targetExercise) return;
    setSelectedSongId(targetSong.songId);
    setCurrentTopicId(targetExercise.topicId);
  };

  if (mode === 'selection') {
    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>曲とお題を選ぼう</Typography>
          <Typography color="text.secondary">曲を選ぶと、その曲のお題が表示されるよ。</Typography>
        </Box>
        <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
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
        <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
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
      <Card sx={{ borderRadius: 2, bgcolor: '#f7eefb', border: '1px solid #eadcf1' }}>
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

        {/* The piano is an inline SVG; animated notes remain a separate overlay. */}
        <Box
          component="svg"
          viewBox="0 0 900 700"
          role="img"
          aria-label="笑顔のグランドピアノ"
          sx={{
            position: 'relative',
            zIndex: 1,
            width: { xs: '100%', sm: 390 },
            maxWidth: '100%',
            height: '100%',
            overflow: 'visible',
            mt: 1,
            animation: 'pianoBob 2.2s ease-in-out infinite',
            '@keyframes pianoBob': {
              '0%,100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-4px)' },
            },
          }}
        >
          <defs>
            <linearGradient id="pianoBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#514e59" />
              <stop offset=".48" stopColor="#302e38" />
              <stop offset="1" stopColor="#1b1a21" />
            </linearGradient>
            <linearGradient id="pianoLid" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#504d58" />
              <stop offset=".55" stopColor="#2b2933" />
              <stop offset="1" stopColor="#17151c" />
            </linearGradient>
            <linearGradient id="pianoGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f8dda0" />
              <stop offset=".5" stopColor="#d8b56c" />
              <stop offset="1" stopColor="#b28a4e" />
            </linearGradient>
            <linearGradient id="pianoKey" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fffdfd" />
              <stop offset="1" stopColor="#e9e5e9" />
            </linearGradient>
          </defs>
          <ellipse cx="438" cy="621" rx="286" ry="17" fill="#d8c9df" opacity=".32" />
          <g transform="translate(8 0) skewX(-3)">
            <path d="M167 318 L604 83 Q624 72 640 88 L658 108 Q665 119 651 130 L287 345 Z" fill="url(#pianoLid)" stroke="#111117" strokeWidth="5" strokeLinejoin="round" />
            <path d="M184 314 L612 88 Q625 83 638 98 L643 104 L278 322 Z" fill="none" stroke="url(#pianoGold)" strokeWidth="6" strokeLinejoin="round" />
            <path d="M584 130 L647 330 L631 333 L566 143 Z" fill="#17161d" stroke="#09090d" strokeWidth="4" />
            <path d="M153 326 Q166 310 195 309 L666 309 Q691 310 706 330 L735 407 L716 466 L150 466 L129 402 Z" fill="url(#pianoBody)" stroke="#111117" strokeWidth="5" strokeLinejoin="round" />
            <path d="M186 450 L247 450 L235 541 Q231 565 219 588 L181 588 Q174 564 177 540 Z" fill="url(#pianoBody)" stroke="#111117" strokeWidth="5" />
            <path d="M633 450 L694 450 L704 540 Q707 564 696 588 L658 588 Q646 565 645 541 Z" fill="url(#pianoBody)" stroke="#111117" strokeWidth="5" />
            <path d="M430 451 L457 451 L453 515 Q451 528 444 536 L433 536 Q426 527 428 515 Z" fill="#25232c" stroke="#111117" strokeWidth="5" />
            <path d="M178 583 Q199 595 223 585 L224 601 Q220 614 200 614 Q180 614 176 601 Z M654 583 Q678 596 699 584 L701 601 Q697 614 678 614 Q659 614 653 601 Z" fill="url(#pianoGold)" stroke="#9b7024" strokeWidth="4" />
            <path d="M131 365 Q132 337 162 329 L680 329 Q710 331 720 356 L744 430 Q750 454 728 470 L151 470 Q125 464 124 440 Z" fill="url(#pianoBody)" stroke="#111117" strokeWidth="5" strokeLinejoin="round" />
            <path d="M144 365 Q148 346 169 344 L679 344 Q696 346 701 364 L714 414 L143 414 Z" fill="#2b2932" stroke="#111117" strokeWidth="3" />
            <g>
              <ellipse cx="334" cy="378" rx="20" ry="25" fill="#fffdfd" stroke="#d7cbdc" strokeWidth="3" />
              <ellipse cx="339" cy="381" rx="10" ry="15" fill="#24212b" />
              <circle cx="343" cy="373" r="5" fill="#fff" />
              <ellipse cx="518" cy="378" rx="20" ry="25" fill="#fffdfd" stroke="#d7cbdc" strokeWidth="3" />
              <ellipse cx="523" cy="381" rx="10" ry="15" fill="#24212b" />
              <circle cx="527" cy="373" r="5" fill="#fff" />
              <ellipse cx="294" cy="400" rx="15" ry="9" fill="#ff8ca8" opacity=".95" />
              <ellipse cx="558" cy="400" rx="15" ry="9" fill="#ff8ca8" opacity=".95" />
              <path d="M405 389 Q426 409 447 389 Q445 414 426 416 Q407 414 405 389Z" fill="#ff6f91" stroke="#17151c" strokeWidth="3" strokeLinejoin="round" />
            </g>
            <path d="M156 420 L706 420 L721 448 Q724 456 712 459 L155 459 Q144 456 148 447 Z" fill="#0c0b10" stroke="#08070b" strokeWidth="3" />
            {Array.from({ length: 21 }, (_, i) => (
              <rect key={i} x={160 + i * 26} y="422" width="26" height="34" rx="1" fill="url(#pianoKey)" stroke="#bcb6c2" strokeWidth="1.4" />
            ))}
            {Array.from({ length: 21 }, (_, i) => {
              const key = i % 7;
              return [0, 1, 3, 4, 5].includes(key) ? (
                <path key={i} d={`M${178 + i * 26} 422 h16 v18 q0 3 -3 3 h-10 q-3 0 -3 -3 z`} fill="#17161d" stroke="#08070b" strokeWidth="1.5" />
              ) : null;
            })}
          </g>
        </Box>

        {/* Animated notes are deliberately outside the SVG and pass in front of it. */}
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
        sx={{ minHeight: 58, borderRadius: 2, fontWeight: 900, bgcolor: '#b486c9' }}>できた！</Button>
      <Button fullWidth size="large" variant="outlined" disabled={!canAdvance} onClick={advance}
        sx={{ minHeight: 54, borderRadius: 2, fontWeight: 800, borderColor: '#b486c9', color: '#80509a' }}>{primaryAction.label}</Button>
    <Typography variant="caption" color="text.secondary" textAlign="center">練習できたら「できた！」を押して記録しよう。</Typography>
  </Stack>
  );
}
