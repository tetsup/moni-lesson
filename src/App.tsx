import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Chip, Container, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';

type Stage = 'warmup' | 'part' | 'full';
type Exercise = { id: string; title: string; detail: string; points: number; icon: string };
const stages: { id: Stage; title: string; color: string; tint: string }[] = [
  { id: 'warmup', title: 'バーナム', color: '#a56cc1', tint: '#f2e5f8' },
  { id: 'part', title: 'パート練習', color: '#e58eae', tint: '#fff0f5' },
  { id: 'full', title: '通し練習', color: '#75aa9a', tint: '#eaf7f1' },
];
const exercises: Record<Stage, Exercise[]> = {
  warmup: [
    { id: 'b1', title: '指のたいそう', detail: 'ゆっくり 1・2・3・4', points: 2, icon: '🌷' },
    { id: 'b2', title: 'お花の階段', detail: '指を順番に動かそう', points: 2, icon: '🌼' },
    { id: 'b3', title: 'ちょうちょの羽', detail: '左右の手をそろえて', points: 3, icon: '🦋' },
  ],
  part: [
    { id: 'p1', title: '右手だけ', detail: 'メロディーを歌いながら', points: 3, icon: '🎵' },
    { id: 'p2', title: '左手だけ', detail: '音をよく聴いてみよう', points: 3, icon: '🎹' },
    { id: 'p3', title: 'ここをゆっくり', detail: '苦手な2小節をくり返そう', points: 4, icon: '✨' },
  ],
  full: [
    { id: 'f1', title: 'さいしょから', detail: '気持ちよく弾いてみよう', points: 5, icon: '🎶' },
    { id: 'f2', title: 'おさらい演奏', detail: '最後までつなげられるかな？', points: 5, icon: '🌟' },
  ],
};
type Progress = { points: number; reps: Record<string, number> };
const loadProgress = (): Progress => {
  try { return JSON.parse(localStorage.getItem('moni-lesson-progress') || '{"points":0,"reps":{}}'); }
  catch { return { points: 0, reps: {} }; }
};

export default function App() {
  const [stage, setStage] = useState<Stage>('part');
  const [exerciseId, setExerciseId] = useState('p1');
  const [inLesson, setInLesson] = useState(false);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const list = exercises[stage];
  const selected = list.find((item) => item.id === exerciseId) ?? list[0];
  const reps = progress.reps[selected.id] ?? 0;
  useEffect(() => { localStorage.setItem('moni-lesson-progress', JSON.stringify(progress)); }, [progress]);

  const chooseStage = (next: Stage) => { setStage(next); setExerciseId(exercises[next][0].id); };
  const startLesson = (id: string) => { setExerciseId(id); setInLesson(true); };
  const addRep = () => setProgress((p) => ({
    ...p, points: p.points + selected.points, reps: { ...p.reps, [selected.id]: (p.reps[selected.id] ?? 0) + 1 },
  }));

  return <Box sx={{ minHeight: '100vh', pb: 4 }}>
    <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {inLesson && <IconButton aria-label="お題選択に戻る" onClick={() => setInLesson(false)} sx={{ bgcolor: '#fff', border: '1px solid #f2e7f4' }}><ArrowBackRoundedIcon /></IconButton>}
          <Avatar sx={{ bgcolor: '#f4dce9', color: '#a56cc1' }}><MusicNoteRoundedIcon /></Avatar>
          <Box><Typography variant="h5" sx={{ color: '#80509a', lineHeight: 1.1 }}>moni lesson</Typography><Typography variant="caption" color="text.secondary">きょうも、音楽と仲よくなろう ♡</Typography></Box>
        </Stack>
        <Chip icon={<StarsRoundedIcon />} label={`${progress.points} pt`} sx={{ bgcolor: '#fff0c9', color: '#8d6821', fontWeight: 800, height: 40 }} />
      </Stack>

      {!inLesson ? <>
        <Typography variant="h5" fontWeight={800} sx={{ mb: .5 }}>きょうのお題を選ぼう</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>練習の種類を選んで、やってみたいお題をタップしてね。</Typography>
        <Stack direction="column" spacing={1} sx={{ mb: 2.5 }}>
          {stages.map((item) => <Button key={item.id} onClick={() => chooseStage(item.id)} variant={stage === item.id ? 'contained' : 'outlined'} sx={{
            justifyContent: 'flex-start', textAlign: 'left', minHeight: 58, borderRadius: 3, fontSize: 17, fontWeight: 800,
            bgcolor: stage === item.id ? item.color : '#fff', color: stage === item.id ? '#fff' : item.color,
            borderColor: item.color, '&:hover': { bgcolor: stage === item.id ? item.color : item.tint },
          }}>{item.title}</Button>)}
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.2 }}>{stages.find((item) => item.id === stage)?.title}のお題</Typography>
        <Stack spacing={1.2}>{list.map((item) => <Card key={item.id} sx={{ borderRadius: 3, border: '1px solid #f0e6f2' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '14px !important' }}>
            <Avatar variant="rounded" sx={{ width: 50, height: 50, bgcolor: '#f8f0fa', fontSize: 26 }}>{item.icon}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={800}>{item.title}</Typography><Typography variant="body2" color="text.secondary">{item.detail}</Typography></Box>
            <Button variant="contained" onClick={() => startLesson(item.id)} sx={{ borderRadius: 3, bgcolor: '#b486c9', minWidth: 76, '&:hover': { bgcolor: '#9d6bb4' } }}>やる！</Button>
          </CardContent>
        </Card>)}</Stack>
      </> : <>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box><Typography variant="caption" color="text.secondary">{stages.find((item) => item.id === stage)?.title}</Typography><Typography variant="h5" fontWeight={800}>{selected.title}</Typography></Box>
          <Chip label={`${reps} 回できた`} sx={{ bgcolor: '#f4e9fa', color: '#9361a9', fontWeight: 800 }} />
        </Stack>
        <Box sx={{ position: 'relative', height: { xs: 350, sm: 420 }, overflow: 'hidden', borderRadius: 5, background: 'linear-gradient(180deg,#fff0f7 0%,#f3efff 55%,#eaf8f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Box sx={{ position: 'absolute', bottom: 28, width: '84%', height: 12, borderRadius: '50%', bgcolor: 'rgba(150,115,160,.12)' }} />
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', '@keyframes floatNote': { '0%': { transform: 'translateY(35px) rotate(-8deg)', opacity: 0 }, '20%': { opacity: 1 }, '100%': { transform: 'translateY(-150px) rotate(12deg)', opacity: 0 } } }}>
            {['♪','♫','♬'].map((note, i) => <Typography key={i} sx={{ position: 'absolute', left: `${25 + i * 24}%`, bottom: 100, color: ['#b486c9','#e58eae','#75aa9a'][i], fontSize: 34 + i * 5, animation: `floatNote 2.8s ease-out ${i * .9}s infinite` }}>{note}</Typography>)}
          </Box>
          <Stack alignItems="center" sx={{ zIndex: 1, width: '100%', px: 2 }}>
            <Box sx={{ animation: 'pianoBounce 1.8s ease-in-out infinite', '@keyframes pianoBounce': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } } }}>
              <Box sx={{ width: { xs: 245, sm: 290 }, height: 115, position: 'relative', borderRadius: '18px 18px 8px 8px', bgcolor: '#c58aab', border: '5px solid #a66e91', boxShadow: '0 12px 0 #95617f, 0 22px 30px rgba(113,75,117,.18)' }}>
                <Box sx={{ position: 'absolute', top: 12, left: 18, right: 18, height: 18, borderRadius: 2, bgcolor: '#e9b8d0' }} />
                <Stack direction="row" sx={{ position: 'absolute', left: 12, right: 12, bottom: 0, height: 57, gap: '2px' }}>
                  {Array.from({ length: 14 }, (_, i) => <Box key={i} sx={{ flex: 1, bgcolor: '#fffdfd', borderRadius: '0 0 4px 4px', border: '1px solid #d8cbd8' }} />)}
                </Stack>
                <Box sx={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', width: 52, height: 38, borderRadius: '50%', bgcolor: '#ffe8a9', border: '3px solid #fff7d7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }}>☺</Box>
              </Box>
            </Box>
            <Typography sx={{ mt: 5, bgcolor: '#fff', borderRadius: 4, px: 2, py: 1, color: '#80509a', fontWeight: 800, textAlign: 'center', boxShadow: '0 4px 14px #d9c8e533' }}>ピアノがニコニコ演奏中 ♫</Typography>
          </Stack>
        </Box>
        <Box sx={{ bgcolor: '#fff', borderRadius: 4, p: 2, mb: 1.5, border: '1px solid #f0e6f2' }}>
          <Typography fontWeight={800} sx={{ mb: .5 }}>「{stage === 'warmup' ? '指をぽかぽかにするのだ！' : stage === 'part' ? 'むずかしいところは、ゆっくりで大丈夫♪' : '最後まで楽しく弾くのだ〜！'}」</Typography>
          <Typography variant="body2" color="text.secondary">{selected.detail}</Typography>
          <LinearProgress variant="determinate" value={Math.min(reps * 20, 100)} sx={{ mt: 1.5, height: 8, borderRadius: 5, bgcolor: '#eee3f2', '& .MuiLinearProgress-bar': { bgcolor: '#b48ac8', borderRadius: 5 } }} />
        </Box>
        <Button fullWidth variant="contained" size="large" onClick={addRep} startIcon={<FavoriteRoundedIcon />} sx={{ minHeight: 82, fontSize: 24, borderRadius: 4, fontWeight: 900, background: 'linear-gradient(100deg,#b486c9,#e59ab9)', '&:hover': { background: 'linear-gradient(100deg,#9d6bb4,#d989aa)' } }}>できた！</Button>
      </>}
    </Container>
  </Box>;
}
