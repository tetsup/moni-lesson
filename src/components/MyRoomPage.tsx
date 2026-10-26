import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { RoomRenderer } from '../room/room-renderer';
import type { RoomSkinDefinition } from '../room/room-types';

const ROOM_IMAGE = 'https://res.cloudinary.com/ifw9eftr/image/upload/v1793001158/hxoy98kjsnq9kvbyp1mb.png';
const SOURCE_WIDTH = 1792;
const SOURCE_HEIGHT = 1344;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.2;

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type PointerPoint = Point & { pointerId: number };
type Gesture = {
  pointers: PointerPoint[];
  zoom: number;
  pan: Point;
  distance: number;
  midpoint: Point;
};

const SAMPLE_ROOM_SKIN: RoomSkinDefinition = {
  id: 'natural-simple-room',
  name: 'ナチュラルなシンプルルーム',
  backgroundImage: ROOM_IMAGE,
  anchor: { x: SOURCE_WIDTH / 2, y: SOURCE_HEIGHT / 4 },
  layoutId: 'sample-isometric-room',
};

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
const distanceBetween = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const midpointOf = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export default function MyRoomPage() {
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<PointerPoint[]>([]);
  const gestureRef = useRef<Gesture | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const baseScale = viewportSize.width > 0 && viewportSize.height > 0
    ? Math.min(viewportSize.width / SOURCE_WIDTH, viewportSize.height / SOURCE_HEIGHT)
    : 1;
  const scale = baseScale * zoom;
  const renderWidth = SOURCE_WIDTH * baseScale;
  const renderHeight = SOURCE_HEIGHT * baseScale;
  const centeredOffset = {
    x: (viewportSize.width - renderWidth) / 2,
    y: (viewportSize.height - renderHeight) / 2,
  };

  const getLocalPoint = (clientX: number, clientY: number): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  };

  const zoomAt = (nextZoom: number, focus: Point) => {
    const clampedZoom = clampZoom(nextZoom);
    const ratio = clampedZoom / zoom;
    setPan((currentPan) => ({
      x: focus.x - (focus.x - centeredOffset.x - currentPan.x - SAMPLE_ROOM_SKIN.anchor.x * baseScale * zoom) * ratio
        - centeredOffset.x - SAMPLE_ROOM_SKIN.anchor.x * baseScale * clampedZoom,
      y: focus.y - (focus.y - centeredOffset.y - currentPan.y - SAMPLE_ROOM_SKIN.anchor.y * baseScale * zoom) * ratio
        - centeredOffset.y - SAMPLE_ROOM_SKIN.anchor.y * baseScale * clampedZoom,
    }));
    setZoom(clampedZoom);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomAt(zoom * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), getLocalPoint(event.clientX, event.clientY));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { pointerId: event.pointerId, ...getLocalPoint(event.clientX, event.clientY) };
    const pointers = [...pointersRef.current.filter((p) => p.pointerId !== event.pointerId), point];
    pointersRef.current = pointers;
    gestureRef.current = {
      pointers,
      zoom,
      pan,
      distance: pointers.length >= 2 ? distanceBetween(pointers[0], pointers[1]) : 0,
      midpoint: pointers.length >= 2 ? midpointOf(pointers[0], pointers[1]) : point,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const currentPointers = pointersRef.current;
    if (!currentPointers.some((p) => p.pointerId === event.pointerId)) return;
    const point = { pointerId: event.pointerId, ...getLocalPoint(event.clientX, event.clientY) };
    const pointers = currentPointers.map((p) => p.pointerId === event.pointerId ? point : p);
    pointersRef.current = pointers;
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (pointers.length >= 2 && gesture.pointers.length >= 2 && gesture.distance > 0) {
      const midpoint = midpointOf(pointers[0], pointers[1]);
      const nextZoom = clampZoom(gesture.zoom * distanceBetween(pointers[0], pointers[1]) / gesture.distance);
      const ratio = nextZoom / gesture.zoom;
      setZoom(nextZoom);
      setPan({
        x: midpoint.x - (gesture.midpoint.x - centeredOffset.x - gesture.pan.x - SAMPLE_ROOM_SKIN.anchor.x * baseScale * gesture.zoom) * ratio
          - centeredOffset.x - SAMPLE_ROOM_SKIN.anchor.x * baseScale * nextZoom,
        y: midpoint.y - (gesture.midpoint.y - centeredOffset.y - gesture.pan.y - SAMPLE_ROOM_SKIN.anchor.y * baseScale * gesture.zoom) * ratio
          - centeredOffset.y - SAMPLE_ROOM_SKIN.anchor.y * baseScale * nextZoom,
      });
    } else if (pointers.length === 1 && gesture.pointers.length === 1) {
      setPan({
        x: gesture.pan.x + point.x - gesture.pointers[0].x,
        y: gesture.pan.y + point.y - gesture.pointers[0].y,
      });
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current = pointersRef.current.filter((p) => p.pointerId !== event.pointerId);
    const remaining = pointersRef.current;
    gestureRef.current = remaining.length > 0 ? {
      pointers: remaining,
      zoom,
      pan,
      distance: remaining.length >= 2 ? distanceBetween(remaining[0], remaining[1]) : 0,
      midpoint: remaining.length >= 2 ? midpointOf(remaining[0], remaining[1]) : remaining[0],
    } : null;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    pointersRef.current = [];
    gestureRef.current = null;
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#80509a' }}>
          マイルーム
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          お部屋を少しずつ自分らしくしていこう！
        </Typography>
      </Box>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        これは表示確認用のサンプルです。部屋画像のアンカー位置は仮設定のため、あとで調整します。
      </Alert>
      <Card sx={{ borderRadius: 3, border: '1px solid #eadcf1', overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
            <Typography fontWeight={800} sx={{ color: '#654575' }}>
              {SAMPLE_ROOM_SKIN.name}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Button size="small" aria-label="縮小" onClick={() => zoomAt(zoom / ZOOM_STEP, { x: viewportSize.width / 2, y: viewportSize.height / 2 })}>−</Button>
              <Typography variant="caption" sx={{ minWidth: 42, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </Typography>
              <Button size="small" aria-label="拡大" onClick={() => zoomAt(zoom * ZOOM_STEP, { x: viewportSize.width / 2, y: viewportSize.height / 2 })}>＋</Button>
              <Button size="small" onClick={resetView}>全体表示</Button>
            </Stack>
          </Stack>
          <Box
            ref={viewportRef}
            role="application"
            aria-label="部屋の表示。ホイールまたはピンチで拡大縮小、ドラッグで移動できます"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            sx={{
              width: '100%',
              height: 'min(65vh, 560px)',
              minHeight: 320,
              overflow: 'hidden',
              position: 'relative',
              touchAction: 'none',
              cursor: pointersRef.current.length ? 'grabbing' : 'grab',
              borderRadius: 1,
              backgroundColor: '#faf8fb',
              userSelect: 'none',
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <RoomRenderer
                skin={SAMPLE_ROOM_SKIN}
                furniture={[]}
                definitions={[]}
                projection={{
                  origin: {
                    x: centeredOffset.x + SAMPLE_ROOM_SKIN.anchor.x * scale + pan.x,
                    y: centeredOffset.y + SAMPLE_ROOM_SKIN.anchor.y * scale + pan.y,
                  },
                  unitWidth: 64 * scale,
                  unitDepth: 32 * scale,
                  unitHeight: 48 * scale,
                }}
                width={viewportSize.width}
                height={viewportSize.height}
                scale={scale}
              />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            ホイール／ピンチで拡大・縮小、ドラッグで移動できます。
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
