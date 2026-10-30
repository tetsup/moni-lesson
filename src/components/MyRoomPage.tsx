import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import ImageViewport from './ImageViewport';
import { RoomRenderer } from '../room/room-renderer';
import type { RoomSkinDefinition } from '../room/room-types';

const ROOM_IMAGE = 'https://res.cloudinary.com/ifw9eftr/image/upload/v1793003543/room-simple-natural.png';
type Size = { width: number; height: number };

const SAMPLE_ROOM_SKIN: RoomSkinDefinition = {
  id: 'natural-simple-room',
  name: 'ナチュラルなシンプルルーム',
  backgroundImage: ROOM_IMAGE,
  anchor: { x: 512, y: 274 },
  layoutId: 'sample-isometric-room',
};

export default function MyRoomPage() {
  const [imageSize, setImageSize] = useState<Size | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => { if (!cancelled) setImageSize(null); };
    image.src = ROOM_IMAGE;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, []);

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
          <ImageViewport
            contentWidth={imageSize?.width ?? 1}
            contentHeight={imageSize?.height ?? 1}
            anchor={SAMPLE_ROOM_SKIN.anchor}
          >
            {(viewport) => (
              <>
                {imageSize && (
                  <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <RoomRenderer
                      skin={SAMPLE_ROOM_SKIN}
                      skinSize={imageSize}
                      furniture={[]}
                      definitions={[]}
                      projection={{
                        origin: {
                          x: viewport.centeredOffset.x + SAMPLE_ROOM_SKIN.anchor.x * viewport.scale + viewport.pan.x,
                          y: viewport.centeredOffset.y + SAMPLE_ROOM_SKIN.anchor.y * viewport.scale + viewport.pan.y,
                        },
                        unitWidth: 64 * viewport.scale,
                        unitDepth: 32 * viewport.scale,
                        unitHeight: 48 * viewport.scale,
                      }}
                      width={viewport.width}
                      height={viewport.height}
                      scale={viewport.scale}
                    />
                  </Box>
                )}
              </>
            )}
          </ImageViewport>
        </CardContent>
      </Card>
    </Stack>
  );
}
