import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import { MONI_CHARACTER_IMAGES, type MoniExpression } from '../data/moni-character';
import { LESSON_CARD_BORDER_RADIUS } from '../data/lesson-style';

type Props = {
  message?: string;
  expression?: MoniExpression;
  variant?: 'default' | 'floating';
};

export default function MoniSupport({
  message = 'だいじょうぶ、ゆっくりでいいよ！',
  expression = 'normal',
  variant = 'default',
}: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        p: variant === 'floating' ? 0 : 1.5,
        borderRadius: variant === 'floating' ? 0 : LESSON_CARD_BORDER_RADIUS,
        border: variant === 'floating' ? 0 : '1px solid #f0d7e8',
        background: variant === 'floating' ? 'transparent' : 'linear-gradient(135deg, #fff8fc 0%, #fff0f7 100%)',
      }}
    >
      <Avatar
        src={MONI_CHARACTER_IMAGES[expression]}
        alt={expression === 'happy' ? '喜んでいるモニちゃん' : 'モニちゃん'}
        variant="rounded"
        imgProps={{ style: { objectFit: 'contain' } }}
        sx={{
          width: { xs: 88, sm: 104 },
          height: { xs: 88, sm: 104 },
          flexShrink: 0,
          bgcolor: 'transparent',
          '& img': { objectFit: 'contain' },
        }}
      />
      <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: -7,
            top: 20,
            width: 14,
            height: 14,
            bgcolor: '#fff',
            borderLeft: '1px solid #f0d7e8',
            borderBottom: '1px solid #f0d7e8',
            transform: 'rotate(45deg)',
          }}
        />
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            p: 1.5,
            borderRadius: LESSON_CARD_BORDER_RADIUS,
            border: '1px solid #f0d7e8',
            bgcolor: 'rgba(255,255,255,0.94)',
            boxShadow: '0 4px 18px rgba(91,55,105,0.12)',
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', mb: 0.4, color: '#b486c9', fontWeight: 900 }}>
            モニちゃん
          </Typography>
          <Typography sx={{ color: '#654575', fontWeight: 700, lineHeight: 1.5, minHeight: '3em' }}>
            {message}
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}
