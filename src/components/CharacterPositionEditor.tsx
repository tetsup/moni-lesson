import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { ImageLayerRenderer, type ImageRenderItem } from './ImageLayerRenderer';
import ImageViewport from './ImageViewport';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 768;

type CharacterLayer = {
  id: string;
  url: string;
  file: string;
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
};

const getFileName = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? url);
  } catch {
    return url;
  }
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function CharacterPositionEditor() {
  const [bodyUrl, setBodyUrl] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [layers, setLayers] = useState<CharacterLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [bodySize, setBodySize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ layerId: string; pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!bodyUrl || !isHttpUrl(bodyUrl)) { setBodySize({ width: 0, height: 0 }); return; }
    const image = new Image();
    image.onload = () => setBodySize({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => setError('胴体画像を読み込めませんでした。URLを確認してください。');
    image.src = bodyUrl;
  }, [bodyUrl]);

  useEffect(() => {
    layers.filter((layer) => layer.width === 0 || layer.height === 0).forEach((layer) => {
      const image = new Image();
      image.onload = () => setLayers((current) => current.map((item) => item.id === layer.id
        ? { ...item, width: image.naturalWidth, height: image.naturalHeight } : item));
      image.onerror = () => setError(`画像を読み込めませんでした: ${layer.file}`);
      image.src = layer.url;
    });
  }, [layers]);

  const selected = layers.find((layer) => layer.id === selectedId) ?? null;
  const output = useMemo(() => {
    const entries = [
      ...(bodyUrl.trim() ? [{ file: getFileName(bodyUrl), url: bodyUrl.trim(), x: 0, y: 0, scale: 1 }] : []),
      ...layers.map(({ file, url, x, y, scale }) => ({ file, url, x, y, scale })),
    ];
    return `const characterParts = ${JSON.stringify(entries, null, 2)};\n`;
  }, [bodyUrl, layers]);

  const addLayer = () => {
    const url = urlDraft.trim();
    if (!isHttpUrl(url)) {
      setError('画像のHTTP/HTTPS URLを入力してください。');
      return;
    }
    const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const file = getFileName(url);
    setLayers((current) => [...current, { id, url, file, x: 0, y: 0, scale: 1, width: 0, height: 0 }]);
    setSelectedId(id);
    setUrlDraft('');
    setError('');
    setCopied(false);
  };

  const updateSelected = (patch: Partial<Pick<CharacterLayer, 'x' | 'y' | 'scale'>>) => {
    if (!selectedId) return;
    setLayers((current) => current.map((layer) => layer.id === selectedId ? { ...layer, ...patch } : layer));
    setCopied(false);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const index = layers.findIndex((layer) => layer.id === selectedId);
    const next = layers.filter((layer) => layer.id !== selectedId);
    setLayers(next);
    setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
    setCopied(false);
  };

  const beginDrag = (event: PointerEvent<HTMLDivElement>, layer: CharacterLayer, displayScale: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(layer.id);
    dragRef.current = {
      layerId: layer.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: layer.x,
      originY: layer.y,
    };
    (event.currentTarget as HTMLDivElement).dataset.canvasScale = String(displayScale);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const displayScale = Number(event.currentTarget.dataset.canvasScale) || 1;
    const dx = (event.clientX - drag.startX) / displayScale;
    const dy = (event.clientY - drag.startY) / displayScale;
    setLayers((current) => current.map((layer) => layer.id === drag.layerId
      ? { ...layer, x: Math.round(drag.originX + dx), y: Math.round(drag.originY + dy) }
      : layer));
    setCopied(false);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      setError('クリップボードにコピーできませんでした。コード欄からコピーしてください。');
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={800}>キャラクター位置合わせ</Typography>
        <Typography variant="body2" color="text.secondary">
          胴体の中心を (0, 0) として、画像を重ねて配置します。座標はキャンバス上のpxで、倍率を変えても変化しません。
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
        <Stack spacing={1}>
          <Typography fontWeight={800}>基準となる胴体画像</Typography>
          <TextField
            size="small"
            fullWidth
            label="胴体画像URL"
            placeholder="https://res.cloudinary.com/..."
            value={bodyUrl}
            onChange={(event) => setBodyUrl(event.target.value)}
          />
          {bodyUrl && !isHttpUrl(bodyUrl) && <Alert severity="warning">HTTP/HTTPS形式のURLを入力してください。</Alert>}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
        <Stack spacing={1}>
          <Typography fontWeight={800}>画像を追加</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="画像URL"
              placeholder="Cloudinaryなどの画像URL"
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') addLayer(); }}
            />
            <Button variant="contained" startIcon={<AddPhotoAlternateRoundedIcon />} onClick={addLayer} disabled={!urlDraft.trim()}>
              追加
            </Button>
          </Stack>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        </Stack>
      </Paper>

      <Box>
        <Typography fontWeight={800} sx={{ mb: 1 }}>配置プレビュー（512 × 768）</Typography>
        <ImageViewport
          contentWidth={CANVAS_WIDTH}
          contentHeight={CANVAS_HEIGHT}
          height="auto"
          minHeight={240}
          backgroundColor="#f4eef4"
          ariaLabel="キャラクター配置キャンバス。選択した画像をドラッグ、未選択時はドラッグで移動、ホイールやピンチで拡大縮小できます"
          onPanRequest={(_nextPan, applyDefault) => { if (!selectedId) applyDefault(); }}
        >
          {(viewport) => {
            const items: ImageRenderItem[] = [];
            if (bodySize.width > 0 && bodySize.height > 0) items.push({
              src: bodyUrl, x: CANVAS_WIDTH / 2 - bodySize.width / 2,
              y: CANVAS_HEIGHT / 2 - bodySize.height / 2,
              width: bodySize.width, height: bodySize.height,
            });
            layers.forEach((layer) => {
              if (layer.width <= 0 || layer.height <= 0) return;
              const width = layer.width * layer.scale;
              const height = layer.height * layer.scale;
              items.push({
                src: layer.url, x: CANVAS_WIDTH / 2 + layer.x - width / 2,
                y: CANVAS_HEIGHT / 2 + layer.y - height / 2, width, height,
              });
            });
            return (
              <Box
                ref={canvasRef}
                sx={{
                  position: 'absolute', width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
                  left: viewport.centeredOffset.x + viewport.pan.x,
                  top: viewport.centeredOffset.y + viewport.pan.y,
                  transform: `scale(${viewport.scale})`, transformOrigin: 'top left',
                  backgroundImage: 'linear-gradient(45deg, #e8e0e9 25%, transparent 25%), linear-gradient(-45deg, #e8e0e9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e0e9 75%), linear-gradient(-45deg, transparent 75%, #e8e0e9 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
                }}
              >
                <ImageLayerRenderer items={items} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
                <Box sx={{ position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, borderRadius: '50%', bgcolor: '#d65d8b', transform: 'translate(-50%, -50%)', zIndex: 5, pointerEvents: 'none' }} />
                {layers.map((layer, index) => (
                  <Box
                    key={layer.id}
                    onPointerDown={(event) => beginDrag(event, layer, viewport.scale)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    sx={{
                      position: 'absolute', left: `calc(50% + ${layer.x}px)`,
                      top: `calc(50% + ${layer.y}px)`,
                      width: Math.max(24, layer.width * layer.scale),
                      height: Math.max(24, layer.height * layer.scale),
                      transform: 'translate(-50%, -50%)', cursor: 'grab',
                      touchAction: 'none',
                      outline: selectedId === layer.id ? '1px dashed #d65d8b' : 'none',
                      zIndex: index + 6,
                    }}
                  />
                ))}
              </Box>
            );
          }}
        </ImageViewport>
        <Typography variant="caption" color="text.secondary">
          市松模様は透明部分の確認用です。画像はURLから直接読み込みます。
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
        <Typography fontWeight={800} sx={{ mb: 1 }}>追加済み画像</Typography>
        {layers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">まだ画像がありません。</Typography>
        ) : (
          <List dense disablePadding>
            {layers.map((layer) => (
              <ListItem
                key={layer.id}
                disablePadding
                secondaryAction={
                  <IconButton edge="end" aria-label={`${layer.file}を削除`} onClick={() => {
                    const index = layers.findIndex((item) => item.id === layer.id);
                    const next = layers.filter((item) => item.id !== layer.id);
                    setLayers(next);
                    if (selectedId === layer.id) setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
                  }}>
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                }
              >
                <ListItemButton selected={selectedId === layer.id} onClick={() => setSelectedId(layer.id)} sx={{ borderRadius: 2, pr: 6 }}>
                  <ListItemText primary={layer.file} secondary={`x: ${layer.x}px / y: ${layer.y}px / ${Math.round(layer.scale * 100)}%`} primaryTypographyProps={{ noWrap: true }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {selected && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography fontWeight={800} sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.file}</Typography>
              <Button color="error" size="small" startIcon={<DeleteOutlineRoundedIcon />} onClick={removeSelected}>削除</Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField size="small" type="number" fullWidth label="Xオフセット (px)" value={selected.x} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} />
              <TextField size="small" type="number" fullWidth label="Yオフセット (px)" value={selected.y} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} />
            </Stack>
            <Box>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">拡大縮小</Typography>
                <Typography variant="body2" fontWeight={800}>{Math.round(selected.scale * 100)}%</Typography>
              </Stack>
              <Slider min={0.1} max={3} step={0.01} value={selected.scale} onChange={(_, value) => updateSelected({ scale: value as number })} />
            </Box>
            <Typography variant="caption" color="text.secondary">ドラッグでも移動できます。拡大縮小してもオフセット値は変わりません。</Typography>
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={800}>JavaScript出力</Typography>
          <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={copyOutput} disabled={!bodyUrl.trim() && layers.length === 0}>
            {copied ? 'コピー済み' : 'コピー'}
          </Button>
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={5}
          maxRows={14}
          value={output}
          InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 12 } }}
        />
      </Paper>
    </Stack>
  );
}
