import { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Slider, Stack, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

type Meter = '2/4' | '3/4' | '4/4' | '3/8' | '6/8';
type Tone = 'wood' | 'beep' | 'bell' | 'click';

const METERS: Meter[] = ['2/4', '3/4', '4/4', '3/8', '6/8'];
const TONES: { value: Tone; label: string }[] = [
  { value: 'wood', label: '木琴' },
  { value: 'beep', label: '電子音' },
  { value: 'bell', label: 'ベル' },
  { value: 'click', label: 'クリック' },
];

function playTone(context: AudioContext, tone: Tone, isFirst: boolean, at: number) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.75, at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + (tone === 'bell' ? 0.28 : 0.11));
  gain.connect(context.destination);

  const makeOscillator = (frequency: number, type: OscillatorType, end: number, volume = 1) => {
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillatorGain.gain.value = volume;
    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(gain);
    oscillator.start(at);
    oscillator.stop(at + end);
  };

  const base = isFirst ? 1320 : 880;
  if (tone === 'wood') {
    makeOscillator(isFirst ? 1250 : 850, 'triangle', 0.07);
    makeOscillator(isFirst ? 1900 : 1350, 'sine', 0.035, 0.35);
  } else if (tone === 'beep') {
    makeOscillator(base, 'sine', 0.1);
  } else if (tone === 'bell') {
    makeOscillator(isFirst ? 1760 : 1175, 'sine', 0.26);
    makeOscillator(isFirst ? 2637 : 1760, 'sine', 0.22, 0.35);
  } else {
    makeOscillator(isFirst ? 1500 : 1050, 'square', 0.045, 0.35);
  }
}

export default function LessonMetronome() {
  const [meter, setMeter] = useState<Meter>('4/4');
  const [bpm, setBpm] = useState(100);
  const [tone, setTone] = useState<Tone>('wood');
  const [playing, setPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);
  const contextRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);
  const generationRef = useRef(0);
  const settingsRef = useRef({ bpm, tone, beatCount });
  settingsRef.current = { bpm, tone, beatCount };
  const beatCount = Number(meter.split('/')[0]);
  const beatUnit = meter.endsWith('/8') ? '♪（8分音符）' : '♩（4分音符）';

  const stop = () => {
    generationRef.current += 1;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setPlaying(false);
    setActiveBeat(-1);
  };

  useEffect(() => () => {
    generationRef.current += 1;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    void contextRef.current?.close();
    contextRef.current = null;
  }, []);

  const start = async () => {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    await context.resume();
    generationRef.current += 1;
    const generation = generationRef.current;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setPlaying(true);

    let beat = 0;
    const scheduleNext = () => {
      if (generationRef.current !== generation) return;
      const { bpm: currentBpm, tone: currentTone, beatCount: currentBeatCount } = settingsRef.current;
      const interval = 60 / currentBpm;
      const at = context.currentTime + 0.08;
      playTone(context, currentTone, beat % currentBeatCount === 0, at);
      const delay = Math.max(0, (at - context.currentTime) * 1000);
      const currentBeat = beat % currentBeatCount;
      timersRef.current.push(window.setTimeout(() => {
        if (generationRef.current === generation) setActiveBeat(currentBeat);
      }, delay));
      beat += 1;
      const nextDelay = Math.max(0, interval * 1000 - 80);
      timersRef.current.push(window.setTimeout(scheduleNext, nextDelay));
    };
    scheduleNext();
  };

  const adjustBpm = (amount: number) => setBpm((current) => Math.min(240, Math.max(30, current + amount)));

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid #eadcf1', bgcolor: '#fff' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" useFlexGap>
            {METERS.map((item) => (
              <Button key={item} size="small" variant={meter === item ? 'contained' : 'outlined'}
                onClick={() => { setMeter(item); setActiveBeat(-1); }}
                sx={{ minWidth: 0, px: 1.25, borderRadius: 2, fontWeight: 800,
                  ...(meter === item ? { bgcolor: '#b486c9' } : { borderColor: '#d9c1e5', color: '#80509a' }) }}>
                {item}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
            <Button aria-label="テンポを10下げる" onClick={() => adjustBpm(-10)} sx={{ minWidth: 38, px: 0.5 }}>−10</Button>
            <Button aria-label="テンポを1下げる" onClick={() => adjustBpm(-1)} sx={{ minWidth: 32, px: 0.5 }}>−1</Button>
            <Box sx={{ minWidth: 86, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={900} lineHeight={1.05} sx={{ color: '#80509a', fontVariantNumeric: 'tabular-nums' }}>{bpm}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>BPM・{beatUnit}</Typography>
            </Box>
            <Button aria-label="テンポを1上げる" onClick={() => adjustBpm(1)} sx={{ minWidth: 32, px: 0.5 }}>+1</Button>
            <Button aria-label="テンポを10上げる" onClick={() => adjustBpm(10)} sx={{ minWidth: 38, px: 0.5 }}>+10</Button>
          </Stack>

          <Box sx={{ px: 1.5 }}>
            <Slider aria-label="テンポ" min={30} max={240} step={1} value={bpm}
              onChange={(_, value) => setBpm(value as number)}
              sx={{ color: '#b486c9', py: 0.5 }} />
          </Box>

          <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.75}>
            {Array.from({ length: beatCount }, (_, index) => (
              <Box key={index} aria-label={activeBeat === index ? `拍 ${index + 1}` : undefined}
                sx={{
                  width: 30, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 1.5, color: activeBeat === index ? '#fff' : '#80509a',
                  bgcolor: activeBeat === index ? '#b486c9' : '#f3eaf7',
                  boxShadow: activeBeat === index ? '0 0 12px rgba(180,134,201,.8)' : 'none',
                  transform: activeBeat === index ? 'scale(1.08)' : 'scale(1)',
                  transition: 'background-color 60ms, box-shadow 60ms, transform 60ms',
                  fontWeight: 900, fontSize: '1.05rem',
                }}>{index + 1}</Box>
            ))}
          </Stack>

          <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" useFlexGap>
            {TONES.map((item) => (
              <Button key={item.value} size="small" variant={tone === item.value ? 'contained' : 'outlined'}
                onClick={() => setTone(item.value)}
                sx={{ minWidth: 0, px: 1.25, borderRadius: 2, fontWeight: 700,
                  ...(tone === item.value ? { bgcolor: '#b486c9' } : { borderColor: '#d9c1e5', color: '#80509a' }) }}>
                {item.label}
              </Button>
            ))}
          </Stack>

          <Button fullWidth size="large" variant="contained" startIcon={playing ? <StopRoundedIcon /> : <PlayArrowRoundedIcon />}
            onClick={() => { if (playing) stop(); else void start(); }}
            sx={{ minHeight: 42, borderRadius: 2, fontWeight: 900, bgcolor: playing ? '#80509a' : '#b486c9' }}>
            {playing ? 'ストップ' : 'スタート'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
