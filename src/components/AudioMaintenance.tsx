import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { calculateSpectrumAutocorrelation } from '../audio/spectrum-analysis';

const ENERGY_THRESHOLD = 0.008;
const INTERVAL_MS = 250;
const FEATURE_OPTIONS = { energyThreshold: 0 };

type AudioFrame = {
  energy: number;
  features: Float32Array | null;
};

const HISTORY_SIZE = 5;

export default function AudioMaintenance() {
  const [enabled, setEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [frame, setFrame] = useState<AudioFrame>({ energy: 0, features: null });
  const [history, setHistory] = useState<AudioFrame[]>([]);
  const [hold, setHold] = useState(false);
  const holdRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRecording(false);
      return;
    }

    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let samples: Float32Array | undefined;

    const stop = () => {
      if (timer) clearInterval(timer);
      source?.disconnect();
      analyser?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      if (context && context.state !== 'closed') void context.close();
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('このブラウザーではマイク入力を利用できません。');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        context = new AudioContext();
        await context.resume();
        source = context.createMediaStreamSource(stream);
        analyser = context.createAnalyser();
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        samples = new Float32Array(analyser.fftSize);
        setRecording(true);
        setError(null);

        timer = setInterval(() => {
          if (!analyser || !context || !samples) return;
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) sum += sample * sample;
          const energy = Math.sqrt(sum / samples.length);
          const features = calculateSpectrumAutocorrelation(samples, context.sampleRate, FEATURE_OPTIONS);
          const nextFrame = { energy, features };
          if (!holdRef.current) {
            setFrame(nextFrame);
            setHistory((current) => [...current, nextFrame].slice(-HISTORY_SIZE));
          }
        }, INTERVAL_MS);
      } catch (cause) {
        stop();
        if (!disposed) {
          setRecording(false);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    };

    void start();
    return () => {
      disposed = true;
      stop();
    };
  }, [enabled]);

  const features = frame.features;
  const averageEnergy = history.length ? history.reduce((sum, item) => sum + item.energy, 0) / history.length : 0;
  const featureCount = history.find((item) => item.features)?.features?.length ?? 0;
  const averageFeatures = featureCount > 0
    ? Array.from({ length: featureCount }, (_, index) => {
        const values = history.flatMap((item) => item.features && item.features.length === featureCount ? [item.features[index]] : []);
        return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      })
    : null;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={800}>音声認識メンテナンス</Typography>
        <Typography color="text.secondary">
          マイク入力のエネルギーと、自己相関・正規化後に類似度判定へ渡す特徴量をリアルタイム表示します。
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>マイク入力</Typography>
              <Typography variant="body2" color="text.secondary">
                {recording ? (hold ? '測定中・表示をホールド' : '約250msごとに更新中') : '停止中'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant={hold ? 'contained' : 'outlined'} color={hold ? 'secondary' : 'primary'} onClick={() => {
                const next = !holdRef.current;
                holdRef.current = next;
                setHold(next);
              }} sx={{ borderRadius: 2, minWidth: 96 }}>
                {hold ? 'ホールド中' : 'ホールド'}
              </Button>
              <Button variant="contained" onClick={() => {
                setError(null);
                setEnabled((current) => !current);
              }} sx={{ borderRadius: 2, minWidth: 112 }}>
                {enabled ? '停止' : '測定開始'}
              </Button>
            </Stack>
          </Stack>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
            <Chip label={features ? '特徴量あり' : '無音・しきい値以下'} color={features ? 'success' : 'default'} />
            <Chip label={`エネルギーしきい値: ${ENERGY_THRESHOLD.toFixed(3)} RMS`} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800}>入力エネルギー（RMS）</Typography>
          <Typography variant="h3" fontWeight={900} sx={{ color: frame.energy > ENERGY_THRESHOLD ? '#38845b' : '#80509a', my: 1 }}>
            {frame.energy.toFixed(6)}
          </Typography>
          <Box sx={{ height: 12, bgcolor: '#f1eaf4', borderRadius: 99, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%',
              width: `${Math.min(100, frame.energy / Math.max(ENERGY_THRESHOLD * 3, 0.000001) * 100)}%`,
              bgcolor: frame.energy > ENERGY_THRESHOLD ? '#6ab58b' : '#b486c9',
              transition: 'width 120ms linear',
            }} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            RMS がしきい値以下の場合、特徴量は null になります。値はマイク入力の振幅に依存します。
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>直近{HISTORY_SIZE}回のエネルギー</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {history.map((item, index) => <Chip key={index} size="small" variant="outlined" label={item.energy.toFixed(6)} />)}
            {history.length === 0 && <Typography variant="body2" color="text.secondary">まだ測定値がありません</Typography>}
          </Stack>
          <Typography variant="body1" fontWeight={800} sx={{ mt: 1 }}>直近{history.length}回の平均: {averageEnergy.toFixed(6)} RMS</Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, border: '1px solid #f0e6f2' }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800}>正規化済み自己相関特徴量</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            類似度計算に渡す {features?.length ?? 64} 要素（lag 0〜{(features?.length ?? 64) - 1}）。lag 0 は 1 に正規化されます。
          </Typography>
          {!features ? (
            <Alert severity="info">現在の入力はしきい値以下、または特徴量を計算できません。音を鳴らすと値が表示されます。</Alert>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${features.length}, minmax(0, 1fr))`, alignItems: 'end', gap: '2px', height: 150, borderBottom: '1px solid #d9cde0', pt: 1 }}>
                {Array.from(features, (value, index) => (
                  <Box key={index} title={`lag ${index}: ${value.toFixed(5)}`} sx={{
                    minWidth: 0,
                    height: `${Math.max(2, Math.min(100, Math.abs(value) * 100))}%`,
                    bgcolor: index === 0 ? '#80509a' : '#b486c9',
                    alignSelf: 'end',
                    borderRadius: '2px 2px 0 0',
                  }} />
                ))}
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>直近{HISTORY_SIZE}回の特徴量（lag 1）</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {history.map((item, index) => <Chip key={index} size="small" variant="outlined" label={item.features ? item.features[1]?.toFixed(6) : 'null'} />)}
              </Stack>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>直近{history.length}回の特徴量平均</Typography>
              {!averageFeatures ? <Typography variant="body2" color="text.secondary">平均を計算できる特徴量がありません</Typography> : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, mt: 1 }}>
                  {averageFeatures.map((value, index) => <Box key={index} sx={{ bgcolor: '#f3edf7', p: 1, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">lag {index}</Typography><Typography variant="body2" fontFamily="monospace">{value.toFixed(6)}</Typography></Box>)}
                </Box>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, mt: 2 }}>
                {Array.from(features, (value, index) => ({ value, index })).map(({ value, index }) => (
                  <Box key={index} sx={{ bgcolor: '#faf7fc', p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">lag {index}</Typography>
                    <Typography variant="body2" fontFamily="monospace">{value.toFixed(6)}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
