import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { RoomRenderer } from '../room/room-renderer';
import type { RoomSkinDefinition } from '../room/room-types';

const ROOM_IMAGE = 'https://res.cloudinary.com/ifw9eftr/image/upload/v1793001158/hxoy98kjsnq9kvbyp1mb.png';
const SOURCE_WIDTH = 1792;
const SOURCE_HEIGHT = 1344;
const MAX_RENDER_WIDTH = 560;

const SAMPLE_ROOM_SKIN: RoomSkinDefinition = {
  id: 'natural-simple-room',
  name: 'ナチュラルなシンプルルーム',
  backgroundImage: ROOM_IMAGE,
  anchor: { x: SOURCE_WIDTH / 2, y: SOURCE_HEIGHT / 4 },
  layoutId: 'sample-isometric-room',
};

export default function MyRoomPage() {
  const [renderWidth, setRenderWidth] = useState(() =>
    Math.min(MAX_RENDER_WIDTH, Math.max(240, window.innerWidth - 48)),
  );

  useEffect(() => {
    const updateWidth = () => setRenderWidth(
      Math.min(MAX_RENDER_WIDTH, Math.max(240, window.innerWidth - 48)),
    );
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const scale = renderWidth / SOURCE_WIDTH;
  const renderHeight = SOURCE_HEIGHT * scale;

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
          <Typography fontWeight={800} sx={{ color: '#654575', mb: 1 }}>
            {SAMPLE_ROOM_SKIN.name}
          </Typography>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            <RoomRenderer
              skin={SAMPLE_ROOM_SKIN}
              furniture={[]}
              definitions={[]}
              projection={{
                origin: { x: SAMPLE_ROOM_SKIN.anchor.x * scale, y: SAMPLE_ROOM_SKIN.anchor.y * scale },
                unitWidth: 64 * scale,
                unitDepth: 32 * scale,
                unitHeight: 48 * scale,
              }}
              width={renderWidth}
              height={renderHeight}
              scale={scale}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
