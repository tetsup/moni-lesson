import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import AudioMaintenance from './AudioMaintenance';
import CharacterPositionEditor from './CharacterPositionEditor';

type AdminPage = 'audio' | 'character';

export default function AdminMode() {
  const [page, setPage] = useState<AdminPage>('audio');

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          fullWidth
          variant={page === 'audio' ? 'contained' : 'outlined'}
          onClick={() => setPage('audio')}
        >
          音声認識メンテナンス
        </Button>
        <Button
          fullWidth
          variant={page === 'character' ? 'contained' : 'outlined'}
          onClick={() => setPage('character')}
        >
          キャラクター位置合わせ
        </Button>
      </Stack>
      {page === 'audio' ? <AudioMaintenance /> : <CharacterPositionEditor />}
    </Stack>
  );
}
