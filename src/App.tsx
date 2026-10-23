import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Chip, Container, IconButton, Stack, Typography } from '@mui/material';
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

function PianoRoom() {
  const notes = ['♪', '♫', '♬', '♪'];
  return <Box sx={{
    position: 'relative', width: '100%', minHeight: { xs: 330, sm: 390 }, overflow: 'hidden',
    borderRadius: 5, background: 'linear-gradient(180deg,#fff2f8 0%,#f4efff 62%,#f7eadf 62%,#f7eadf 100%)',
    '@keyframes noteDrift': {
      '0%': { opacity: 0, transform: 'translate(0, 24px) rotate(-12deg) scale(.7)' },
      '18%': { opacity: 1 },
      '78%': { opacity: .9 },
      '100%': { opacity: 0, transform: 'translate(28px, -150px) rotate(18deg) scale(1.2)' },
    },
    '@keyframes pianoBounce': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' },
    },
    '@keyframes keyTap': { '0%, 100%': { transform: 'scaleY(1)' }, '50%': { transform: 'scaleY(.94)' } },
  }}>
    <Box sx={{ position: 'absolute', top: 28, left: 24, width: 76, height: 58, bgcolor: '#fff', border: '5px solid #e8d5eb', borderRadius: 2, boxShadow: 'inset 0 -8px #f5eaf6' }}>
      <Box sx={{ position: 'absolute', left: 10, top: 12, width: 10, height: 10, bgcolor: '#9dc9bc', borderRadius: '50%' }} />
      <Box sx={{ position: 'absolute', right: 10, top: 12, width: 10, height: 10, bgcolor: '#9dc9bc', borderRadius: '50%' }} />
      <Box sx={{ position: 'absolute', left: 22, bottom: 10, width: 22, height: 12, borderBottom: '3px solid #d99ab8', borderRadius: '0 0 50% 50%' }} />
    </Box>
    <Box sx={{ position: 'absolute', right: 24, top: 26, width: 66, height: 76, borderRadius: '34px 34px 8px 8px', bgcolor: '#d6eadc', border: '4px solid #fff', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', pb: 1 }}>
      <Box sx={{ display: 'flex', gap: 1 }}><Box sx={{ width: 7, height: 7, bgcolor: '#8ab7a1', borderRadius: '50%' }} /><Box sx={{ width: 7, height: 7, bgcolor: '#8ab7a1', borderRadius: '50%' }} /></Box>
    </Box>
    <Typography sx={{ position: 'absolute', top: 105, left: '18%', color: '#c49bd2', fontSize: 27, animation: 'noteDrift 2.8s ease-in-out infinite' }}>♪</Typography>
    <Typography sx={{ position: 'absolute', top: 130, left: '48%', color: '#e49dbb', fontSize: 34, animation: 'noteDrift 3.2s ease-in-out .7s infinite' }}>♫</Typography>
    <Typography sx={{ position: 'absolute', top: 90, right: '18%', color: '#8ebcaf', fontSize: 25, animation: 'noteDrift 2.6s ease-in-out 1.3s infinite' }}>♬</Typography>
    <Box sx={{ position: 'absolute', left: '50%', bottom: 62, width: { xs: 250, sm: 330 }, maxWidth: '88%', transform: 'translateX(-50%)', animation: 'pianoBounce 1.2s ease-in-out infinite' }}>
      <Box sx={{ height: 24, bgcolor: '#a979b4', borderRadius: '12px 12px 3px 3px', boxShadow: '0 7px 0 #8f639d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: .8 }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#fce8a9' }} />
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#fce8a9' }} />
        <Box sx={{ width: 24, height: 10, borderBottom: '3px solid #fce8a9', borderRadius: '0 0 50% 50%' }} />
      </Box>
      <Box sx={{ height: 72, bgcolor: '#bd91c8', borderRadius: '3px 3px 8px 8px', p: '7px 8px 8px', boxShadow: '0 8px 0 #9d75a8' }}>
        <Box sx={{ display: 'flex', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 1 }}>
          {Array.from({ length: 14 }, (_, i) => <Box key={i} sx={{ flex: 1, bgcolor: '#fffdfb', border: '1px solid #d7cbd9', borderRadius: '0 0 3px 3px', transformOrigin: 'top', animation: `keyTap 1.2s ease-in-out ${(i % 4) * .12}s infinite` }} />)}
          {Array.from({ length: 10 }, (_, i) => <Box key={i} sx={{ position: 'absolute', top: 0, left: `${(i + .5) * 7.14 - 1.4}%`, width: '4.4%', height: '43%', bgcolor: '#6c526f', borderRadius: '0 0 3px 3px', boxShadow: '0 2px 1px #4d3a50' }} />)}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, mt: 1.2 }}>
        <Box sx={{ width: 12, height: 28, bgcolor: '#a979b4', borderRadius: 1 }} /><Box sx={{ width: 12, height: 28, bgcolor: '#a979b4', borderRadius: 1 }} />
      </Box>
    </Box>
    <Typography sx={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: '#9c829f', fontWeight: 800, fontSize: 13 }}>ぽろん♪ ぽろん♪</Typography>
  </Box>;
}

export default function App() {
  const [stage, setStage] = useState<Stage>('part');
  const [exerciseId, setExerciseId] = useState('p1');
  const [isLesson, setIsLesson] = useState(false);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const list = exercises[stage];
  const selected = list.find((item) => item.id === exerciseId) ?? list[0];
  const reps = progress.reps[selected.id] ?? 0;
  useEffect(() => { localStorage.setItem('moni-lesson-progress', JSON.stringify(progress)); }, [progress]);

  const chooseStage = (next: Stage) => { setStage(next); setExerciseId(exercises[next][0].id); };
  const addRep = () => setProgress((p) => ({
    ...p, points: p.points + selected.points, reps: { ...p.reps, [selected.id]: (p.reps[selected.id] ?? 0) + 1 },
  }));

  return <Box sx={{ minHeight: '100vh', pb: 4, background: 'linear-gradient(180deg,#fffafd,#f9f4fc)' }}>
    <Container maxWidth="md" sx={{ pt: { xs: 1.5, sm: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {isLesson && <IconButton onClick={() => setIsLesson(false)} aria-label="お題選択に戻る" sx={{ bgcolor: '#fff', border: '1px solid #f0e4f3' }}><ArrowBackRoundedIcon /></IconButton>}
          <Avatar sx={{ bgcolor: '#f4dce9', color: '#a56cc1', width: 42, height: 42 }}><MusicNoteRoundedIcon /></Avatar>
          <Box><Typography variant="h5" sx={{ color: '#80509a', lineHeight: 1.1 }}>moni lesson</Typography><Typography variant="caption" color="text.secondary">{isLesson ? 'ピアノといっしょに、たのしく練習♪' : 'きょうも、音楽と仲よくなろう ♡'}</Typography></Box>
        </Stack>
        <Chip icon={<StarsRoundedIcon />} label={`${progress.points} pt`} sx={{ bgcolor: '#fff0c9', color: '#8d6821', fontWeight: 800, px: 1, height: 40, '& .MuiChip-icon': { color: '#e0a32c' }} />
      </Stack>

      {!isLesson ? <>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#80509a', mb: 1.5 }}>どの練習にする？</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 2.5 }}>
          {stages.map((item, i) => <Card key={item.id} onClick={() => chooseStage(item.id)} sx={{ aspectRatio: '1 / .86', cursor: 'pointer', bgcolor: stage === item.id ? item.tint : '#fff', borderColor: stage === item.id ? item.color : '#f2e7f4', borderWidth: stage === item.id ? 2 : 1, borderStyle: 'solid', transition: 'transform .15s', '&:active': { transform: 'scale(.97)' } }}>
            <CardContent sx={{ p: { xs: 1, sm: 1.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: .5, '&:last-child': { pb: 1 } }}>
              <Avatar sx={{ bgcolor: item.color, color: '#fff', fontWeight: 900, width: { xs: 34, sm: 42 }, height: { xs: 34, sm: 42 } }}>{i + 1}</Avatar>
              <Typography textAlign="center" fontWeight={900} sx={{ color: stage === item.id ? item.color : '#5f5265', fontSize: { xs: 13, sm: 17 }, lineHeight: 1.25 }}>{item.title}</Typography>
            </CardContent>
          </Card>)}
        </Box>
        <Card sx={{ borderRadius: 4, mb: 2 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="h6" fontWeight={900} sx={{ color: '#80509a' }}>お題を選ぼう</Typography>
              <Chip size="small" label={`${list.length}つ`} sx={{ bgcolor: '#f5edf8', color: '#a56cc1', fontWeight: 800 }} />
            </Stack>
            <Stack spacing={1}>
              {list.map((item) => <Box key={item.id} onClick={() => setExerciseId(item.id)} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2, borderRadius: 3, cursor: 'pointer', bgcolor: exerciseId === item.id ? '#f8effb' : '#fff', border: exerciseId === item.id ? '1.5px solid #c59bd4' : '1.5px solid #f4edf5', '&:active': { bgcolor: '#f8effb' } }}>
                <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: exerciseId === item.id ? '#ead8f2' : '#f8f3f8', fontSize: 24 }}>{item.icon}</Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={900}>{item.title}</Typography><Typography variant="caption" color="text.secondary">{item.detail}</Typography></Box>
                <Chip size="small" label={`+${item.points}pt`} sx={{ bgcolor: '#fff0c9', color: '#936c22', fontWeight: 800 }} />
              </Box>)}
            </Stack>
          </CardContent>
        </Card>
        <Button fullWidth variant="contained" size="large" onClick={() => setIsLesson(true)} startIcon={<FavoriteRoundedIcon />} sx={{ minHeight: 64, borderRadius: 4, fontSize: 19, fontWeight: 900, background: 'linear-gradient(100deg,#b486c9,#e59ab9)', '&:hover': { background: 'linear-gradient(100deg,#9d6bb4,#d989aa)' } }}>レッスンをはじめる</Button>
      </> : <>
        <Stack alignItems="center" sx={{ mb: 1.5, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={900} sx={{ color: '#80509a' }}>{selected.title}</Typography>
          <Typography color="text.secondary" variant="body2">{selected.detail}</Typography>
        </Stack>
        <PianoRoom />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1.5, mb: 2 }}>
          <Chip label={`${reps} 回できた！`} sx={{ bgcolor: '#f4e9fa', color: '#9361a9', fontWeight: 900 }} />
          <Chip label={`+${selected.points} pt`} sx={{ bgcolor: '#fff0c9', color: '#936c22', fontWeight: 900 }} />
        </Box>
        <Button fullWidth variant="contained" size="large" onClick={addRep} startIcon={<FavoriteRoundedIcon />} sx={{ minHeight: { xs: 86, sm: 96 }, borderRadius: 5, fontSize: { xs: 25, sm: 29 }, fontWeight: 900, background: 'linear-gradient(100deg,#b486c9,#e59ab9)', boxShadow: '0 7px 0 #d9b2d7', '&:hover': { background: 'linear-gradient(100deg,#9d6bb4,#d989aa)' }, '&:active': { transform: 'translateY(4px)', boxShadow: '0 3px 0 #d9b2d7' } }}>できた！ +{selected.points}ポイント</Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>自分のペースで、ていねいにね ♡</Typography>
      </>}
    </Container>
  </Box>;
}
