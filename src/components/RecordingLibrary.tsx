import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import {
  Alert, Box, Button, Card, CardContent, IconButton, Slider, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { getLessonRecordingFile, listLessonRecordings, type LessonRecording } from '../data/lesson-recordings';

type Props = { onBack: () => void };

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

const formatDate = (value: string): string => new Date(value).toLocaleString('ja-JP', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});

export default function RecordingLibrary({ onBack }: Props) {
  const [recordings, setRecordings] = useState<LessonRecording[]>([]);
  const [query, setQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadingIdRef = useRef<string | null>(null);

  const reload = async () => {
    try {
      const items = await listLessonRecordings();
      setRecordings(items.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '録音一覧を読み込めませんでした');
    }
  };

  useEffect(() => { void reload(); }, []);
  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return recordings;
    return recordings.filter((item) =>
      item.songTitle.toLocaleLowerCase().includes(normalized) ||
      item.topicTitle.toLocaleLowerCase().includes(normalized));
  }, [recordings, query]);

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setPlayingId(null);
    setCurrentTime(0);
    setDuration(0);
    loadingIdRef.current = null;
  };

  const togglePlayback = async (recording: LessonRecording) => {
    if (playingId === recording.id && audioRef.current) {
      stopPlayback();
      return;
    }
    stopPlayback();
    setError('');
    loadingIdRef.current = recording.id;
    try {
      const file = await getLessonRecordingFile(recording.filePath);
      if (loadingIdRef.current !== recording.id) return;
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setPlayingId(recording.id);
      window.setTimeout(() => {
        const audio = audioRef.current;
        if (!audio || loadingIdRef.current !== recording.id) return;
        void audio.play().catch(() => {
          setError('録音を再生できませんでした');
          stopPlayback();
        });
      }, 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '録音ファイルを開けませんでした');
      setPlayingId(null);
      loadingIdRef.current = null;
    }
  };

  const download = async (recording: LessonRecording) => {
    setError('');
    try {
      const file = await getLessonRecordingFile(recording.filePath);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${recording.songTitle}_${recording.topicTitle}_${recording.attemptNumber}回目.${recording.mimeType.includes('mp4') ? 'm4a' : 'webm'}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '録音をダウンロードできませんでした');
    }
  };

  const seek = (_event: Event | SyntheticEvent, value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    if (audioRef.current) audioRef.current.currentTime = next;
    setCurrentTime(next);
  };

  return (
    <Stack spacing={2}>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ alignSelf: 'flex-start' }}>
        戻る
      </Button>
      <Box>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#80509a' }}>録音を聴こう</Typography>
        <Typography color="text.secondary" variant="body2">曲名やお題名で検索できるよ。</Typography>
      </Box>
      <TextField
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="曲名・お題名で検索"
        inputProps={{ 'aria-label': '曲名・お題名で録音を検索' }}
        size="small"
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary">{filtered.length} 件の録音</Typography>
      {filtered.length === 0 ? (
        <Card sx={{ borderRadius: 3, border: '1px solid #eadcf1' }}>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              {recordings.length === 0 ? '録音データはまだないよ。' : '一致する録音が見つからなかったよ。'}
            </Typography>
          </CardContent>
        </Card>
      ) : filtered.map((recording) => {
        const isPlaying = playingId === recording.id;
        return (
          <Card key={recording.id} sx={{ borderRadius: 3, border: '1px solid #eadcf1' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack spacing={1}>
                <Box>
                  <Typography fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>{recording.topicTitle}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{recording.songTitle}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(recording.recordedAt)} ・ {recording.attemptNumber}回目 ・ {formatDuration(recording.durationMs)}
                  </Typography>
                </Box>
                {isPlaying && (
                  <Stack spacing={0}>
                    <Slider
                      aria-label={`${recording.topicTitle} 再生位置`}
                      min={0}
                      max={Math.max(duration, 0.1)}
                      step={0.1}
                      value={Math.min(currentTime, duration || currentTime)}
                      onChange={seek}
                      size="small"
                    />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">{formatDuration(currentTime * 1000)}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDuration((duration || recording.durationMs / 1000) * 1000)}</Typography>
                    </Stack>
                  </Stack>
                )}
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                    onClick={() => void togglePlayback(recording)}
                    sx={{ flex: 1, bgcolor: '#b486c9', borderRadius: 2, fontWeight: 800 }}
                  >
                    {isPlaying ? '停止' : '再生'}
                  </Button>
                  <IconButton aria-label={`${recording.topicTitle} をダウンロード`} onClick={() => void download(recording)} sx={{ border: '1px solid #d9c1e5', borderRadius: 2 }}>
                    <DownloadRoundedIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={stopPlayback}
        onError={() => { if (audioUrl) setError('この録音を再生できませんでした'); }}
        hidden
      />
    </Stack>
  );
}
