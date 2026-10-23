import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Chip, Container, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';

type Stage = 'warmup' | 'part' | 'full';
type Exercise = { id: string; title: string; detail: string; points: number; icon: string };
const stages: { id: Stage; title: string; icon: string; color: string; tint: string }[] = [
  { id: 'warmup', title: 'バーナム', icon: '🌷', color: '#a56cc1', tint: '#f2e5f8' },
  { id: 'part', title: 'パート練習', icon: '🎵', color: '#e58eae', tint: '#fff0f5' },
  { id: 'full', title: '通し練習', icon: '🎶', color: '#75aa9a', tint: '#eaf7f1' },
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 2.5 }}>
          {stages.map((item) => <Button key={item.id} onClick={() => chooseStage(item.id)} variant={stage === item.id ? 'contained' : 'outlined'} sx={{
            width: '100%', aspectRatio: '1 / 1', minWidth: 0, p: .25, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: .65,
            fontSize: 'clamp(10px, 3.25vw, 14px)', lineHeight: 1, fontWeight: 900, whiteSpace: 'nowrap',
            bgcolor: stage === item.id ? item.color : '#fff', color: stage === item.id ? '#fff' : item.color,
            borderColor: item.color, borderWidth: stage === item.id ? 2 : 1,
            '&:hover': { bgcolor: stage === item.id ? item.color : item.tint },
          }}><Typography component="span" sx={{ fontSize: 'clamp(32px, 9vw, 46px)', lineHeight: 1 }}>{item.icon}</Typography><Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', whiteSpace: 'nowrap' }}>{item.title}</Typography></Button>)}
        </Box>
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
        <Box sx={{ position: 'relative', height: { xs: 350, sm: 420 }, overflow: 'hidden', borderRadius: 5, mb: 2,
          background: 'linear-gradient(180deg,#fff4fa 0%,#f9e8f2 70%,#f0d4e6 70%,#e9c9df 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Empty, softly colorful girl's room */}
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#fff8fc', opacity: .38 }} />
          <Box sx={{ position: 'absolute', top: 0, left: '6%', right: '6%', height: '70%', borderBottom: '3px solid #e7c5d9' }} />
          <Box sx={{ position: 'absolute', bottom: 24, width: '82%', height: 16, borderRadius: '50%', bgcolor: '#c9a3c0', opacity: .25 }} />
          {/* Music notes float up continuously */}
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {['♪','♫','♬'].map((note, i) => <Typography key={i} sx={{ position: 'absolute', left: `${18 + i * 30}%`, bottom: 110, color: ['#a56cc1','#e58eae','#75aa9a'][i], fontSize: 38 + i * 5, animation: `noteRise 3.4s ease-out ${i * 1.05}s infinite`, '@keyframes noteRise': { '0%': { transform: 'translateY(35px)', opacity: 0 }, '25%': { opacity: 1 }, '100%': { transform: 'translateY(-155px)', opacity: 0 } } }}>{note}</Typography>)}
          </Box>
          {/* Black grand piano, with its eyes and smile drawn directly on its front */}
          <Box sx={{ position: 'relative', zIndex: 1, width: { xs: 285, sm: 320 }, height: 220, mt: 3, animation: 'pianoBob 2.2s ease-in-out infinite', '@keyframes pianoBob': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } }}}>
            <Box sx={{ position: 'absolute', top: 4, left: 20, width: '84%', height: 104, bgcolor: '#24212b', border: '3px solid #100f15', borderRadius: '10px 78% 8px 8px', transform: 'skewY(-5deg)', boxShadow: 'inset 0 6px 0 #494550, 0 6px 0 #111' }} />
            <Box sx={{ position: 'absolute', top: 20, left: 42, width: '70%', height: 70, bgcolor: '#393540', border: '3px solid #17151c', clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0 100%)', transform: 'rotate(-8deg)', transformOrigin: 'left center' }} />
            <Box sx={{ position: 'absolute', top: 84, left: 15, right: 9, height: 92, bgcolor: '#17151c', border: '3px solid #08070b', borderRadius: '20px 34px 13px 13px', boxShadow: 'inset 0 8px 0 #37333d, 0 9px 0 #09080c' }}>
              <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2.2 }}>
                <Box sx={{ width: 14, height: 18, borderRadius: '50%', bgcolor: '#fff', border: '2px solid #d2c3d8', position: 'relative' }}><Box sx={{ position: 'absolute', width: 5, height: 7, borderRadius: '50%', bgcolor: '#282330', top: 4, left: 4 }} /></Box>
                <Box sx={{ width: 14, height: 18, borderRadius: '50%', bgcolor: '#fff', border: '2px solid #d2c3d8', position: 'relative' }}><Box sx={{ position: 'absolute', width: 5, height: 7, borderRadius: '50%', bgcolor: '#282330', top: 4, left: 4 }} /></Box>
              </Box>
              <Box sx={{ position: 'absolute', top: 41, left: '50%', transform: 'translateX(-50%)', width: 24, height: 12, borderBottom: '3px solid #f3a4c3', borderRadius: '0 0 50% 50%' }} />
              <Stack direction="row" sx={{ position: 'absolute', left: 9, right: 9, bottom: 7, height: 25, gap: '2px' }}>
                {Array.from({ length: 14 }, (_, i) => <Box key={i} sx={{ flex: 1, bgcolor: '#fffafc', borderRadius: '0 0 3px 3px', border: '1px solid #cfc6d2' }} />)}
              </Stack>
            </Box>
            {[-1, 0, 1].map((leg) => <Box key={leg} sx={{ position: 'absolute', top: 158, left: `${43 + leg * 26}%`, width: 13, height: 38, bgcolor: '#111015', borderRadius: 2 }} />)}
            <Box sx={{ position: 'absolute', bottom: 0, right: 12, width: 42, height: 23, borderRadius: '50%', bgcolor: '#17151c', border: '3px solid #08070b' }} />
          </Box>
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
