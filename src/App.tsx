import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Chip, Container, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';

type Stage = 'warmup' | 'part' | 'full';
type Exercise = { id: string; title: string; detail: string; points: number; icon: string };
const stages: { id: Stage; title: string; subtitle: string; color: string; tint: string }[] = [
  { id: 'warmup', title: 'バーナム', subtitle: '指をほぐそう', color: '#a56cc1', tint: '#f2e5f8' },
  { id: 'part', title: 'パート練習', subtitle: 'むずかしい所を', color: '#e58eae', tint: '#fff0f5' },
  { id: 'full', title: '通し練習', subtitle: '曲をつなげよう', color: '#75aa9a', tint: '#eaf7f1' },
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
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const list = exercises[stage];
  const selected = list.find((item) => item.id === exerciseId) ?? list[0];
  const reps = progress.reps[selected.id] ?? 0;
  useEffect(() => { localStorage.setItem('moni-lesson-progress', JSON.stringify(progress)); }, [progress]);

  const chooseStage = (next: Stage) => { setStage(next); setExerciseId(exercises[next][0].id); };
  const addRep = () => setProgress((p) => ({
    ...p, points: p.points + selected.points, reps: { ...p.reps, [selected.id]: (p.reps[selected.id] ?? 0) + 1 },
  }));
  const resetReps = () => setProgress((p) => ({ ...p, reps: {} }));

  return <Box sx={{ minHeight: '100vh', pb: 5 }}>
    <Container maxWidth="xl" sx={{ pt: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: '#f4dce9', color: '#a56cc1', width: 48, height: 48 }}><MusicNoteRoundedIcon fontSize="large" /></Avatar>
          <Box><Typography variant="h5" sx={{ color: '#80509a', lineHeight: 1.1 }}>moni lesson</Typography><Typography variant="caption" color="text.secondary">きょうも、音楽と仲よくなろう ♡</Typography></Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip icon={<StarsRoundedIcon />} label={`${progress.points} pt`} sx={{ bgcolor: '#fff0c9', color: '#8d6821', fontWeight: 800, px: 1, height: 42, '& .MuiChip-icon': { color: '#e0a32c' }} />
          <IconButton aria-label="設定（準備中）" sx={{ bgcolor: '#fff', border: '1px solid #f2e7f4' }}><SettingsRoundedIcon sx={{ color: '#a58eae' }} /></IconButton>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
        {stages.map((item, i) => <Card key={item.id} onClick={() => chooseStage(item.id)} sx={{ flex: 1, cursor: 'pointer', bgcolor: stage === item.id ? item.tint : '#fff', borderColor: stage === item.id ? item.color : '#f2e7f4', borderWidth: stage === item.id ? 2 : 1, transition: 'all .18s', '&:hover': { transform: 'translateY(-2px)' } }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '16px !important' }}>
            <Avatar sx={{ bgcolor: item.color, color: '#fff', fontWeight: 800 }}>{i + 1}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={800} color={stage === item.id ? item.color : 'text.primary'}>{item.title}</Typography><Typography variant="caption" color="text.secondary">{item.subtitle}</Typography></Box>
            {stage === item.id && <Chip size="small" label="いまここ" sx={{ bgcolor: '#fff', color: item.color, fontWeight: 800 }} />}
          </CardContent>
        </Card>)}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(250px,.92fr) minmax(280px,1.05fr) minmax(300px,1.1fr)' }, gap: 2 }}>
        <Card sx={{ minHeight: 400 }}><CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}><Box><Typography variant="h6" fontWeight={800}>今日のお題</Typography><Typography variant="caption" color="text.secondary">好きな練習を選んでね</Typography></Box><Chip label={`${list.length}つ`} size="small" sx={{ bgcolor: '#f5edf8', color: '#a56cc1', fontWeight: 800 }} /></Stack>
          <Stack spacing={1}>{list.map((item) => <Box key={item.id} onClick={() => setExerciseId(item.id)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 3, cursor: 'pointer', bgcolor: selected.id === item.id ? '#f8effb' : '#fff', border: selected.id === item.id ? '1.5px solid #c59bd4' : '1.5px solid #f4edf5', '&:hover': { bgcolor: '#fbf5fd' } }}>
            <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: selected.id === item.id ? '#ead8f2' : '#f8f3f8', fontSize: 25 }}>{item.icon}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={800}>{item.title}</Typography><Typography variant="caption" color="text.secondary">{item.detail}</Typography></Box><Chip size="small" label={`+${item.points}pt`} sx={{ bgcolor: '#fff0c9', color: '#936c22', fontWeight: 800 }} />
          </Box>)}</Stack>
        </CardContent></Card>

        <Card sx={{ overflow: 'hidden', minHeight: 400 }}><CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between"><Chip label="✦ きょうのレッスン" sx={{ bgcolor: '#f4e9fa', color: '#9361a9', fontWeight: 800 }} /><IconButton size="small" aria-label="アドバイスをもう一度聞く"><ReplayRoundedIcon /></IconButton></Stack>
          <Box sx={{ flex: 1, minHeight: 210, my: 1.5, borderRadius: 4, background: 'linear-gradient(145deg,#fff3f8 0%,#f5efff 58%,#eef9f4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <Typography sx={{ position: 'absolute', top: 18, left: 22, color: '#d4a4cb', fontSize: 24 }}>✦</Typography><Typography sx={{ position: 'absolute', top: 45, right: 28, color: '#e8b2c9' }}>♫</Typography>
            <Stack alignItems="center" spacing={1}>
              <Avatar sx={{ width: 132, height: 132, bgcolor: '#f6d8e5', fontSize: 70, border: '5px solid rgba(255,255,255,.8)', boxShadow: '0 12px 24px rgba(166,119,166,.16)' }}>🐰</Avatar>
              <Box sx={{ bgcolor: '#fff', borderRadius: 4, px: 2.5, py: 1.2, boxShadow: '0 5px 18px rgba(145,109,159,.08)', textAlign: 'center' }}>
                <Typography fontWeight={800} sx={{ color: '#80509a' }}>「{stage === 'warmup' ? '指をぽかぽかにするのだ！' : stage === 'part' ? 'むずかしいところは、ゆっくりで大丈夫♪' : '最後まで楽しく弾くのだ〜！'}」</Typography><Typography variant="caption" color="text.secondary">モニからのワンポイント</Typography>
              </Box>
            </Stack>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 'auto' }}><Avatar sx={{ bgcolor: '#f4e7f7', color: '#a56cc1' }}><HeadphonesRoundedIcon /></Avatar><Box sx={{ flex: 1 }}><Typography fontWeight={800} variant="body2">お手本を聞いてみよう</Typography><Typography variant="caption" color="text.secondary">音声アドバイスは準備中です</Typography></Box><Button variant="outlined" disabled>聞く</Button></Stack>
        </CardContent></Card>

        <Card sx={{ minHeight: 400 }}><CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}><Box><Typography variant="h6" fontWeight={800}>できた！カウント</Typography><Typography variant="caption" color="text.secondary">弾けたらボタンをタップしよう</Typography></Box><Chip icon={<StarsRoundedIcon />} label={`+${selected.points} pt`} sx={{ bgcolor: '#fff0c9', color: '#936c22', fontWeight: 800 }} /></Stack>
          <Box sx={{ bgcolor: '#fcf8fd', borderRadius: 4, p: 2, mb: 1.5 }}><Typography variant="caption" color="text.secondary">いま練習していること</Typography><Typography variant="h5" sx={{ mt: .3, mb: 1 }}>{selected.title}</Typography><Stack direction="row" alignItems="center" spacing={1}><Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={Math.min(reps * 20, 100)} sx={{ height: 9, borderRadius: 8, bgcolor: '#eee3f2', '& .MuiLinearProgress-bar': { bgcolor: '#b48ac8', borderRadius: 8 } }} /></Box><Typography fontWeight={800} sx={{ color: '#a56cc1', minWidth: 60, textAlign: 'right' }}>{reps} 回</Typography></Stack></Box>
          <Button variant="contained" size="large" onClick={addRep} startIcon={<FavoriteRoundedIcon />} sx={{ minHeight: 72, fontSize: 20, background: 'linear-gradient(100deg,#b486c9,#e59ab9)', '&:hover': { background: 'linear-gradient(100deg,#9d6bb4,#d989aa)' } }}>できた！ +{selected.points}ポイント</Button>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5, mb: 1 }}><Typography variant="caption" color="text.secondary">自分のペースで、ていねいにね</Typography><Button size="small" color="inherit" onClick={resetReps} startIcon={<ReplayRoundedIcon />} sx={{ color: '#9b8aa3' }}>回数リセット</Button></Stack>
          <Box sx={{ mt: 'auto', bgcolor: '#f1faf5', borderRadius: 3, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.2 }}><Avatar sx={{ bgcolor: '#d8f0e4', color: '#5c9d82' }}><StarsRoundedIcon /></Avatar><Box><Typography fontWeight={800} variant="body2">練習のごほうび</Typography><Typography variant="caption" color="text.secondary">ポイントをためて、お部屋をかわいくしよう！</Typography></Box></Box>
        </CardContent></Card>
      </Box>
    </Container>
  </Box>;
}
