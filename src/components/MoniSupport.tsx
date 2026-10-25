import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';

type Props = {
  message?: string;
};

export default function MoniSupport({ message = 'だいじょうぶ、ゆっくりでいいよ！' }: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        p: 1.5,
        borderRadius: 4,
        border: '1px solid #f0d7e8',
        background: 'linear-gradient(135deg, #fff8fc 0%, #fff0f7 100%)',
      }}
    >
      <Avatar
        src="/moni-chan.png"
        alt="モニちゃん"
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
            borderRadius: 3,
            border: '1px solid #f0d7e8',
            bgcolor: '#fff',
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', mb: 0.4, color: '#b486c9', fontWeight: 900 }}>
            モニちゃん
          </Typography>
          <Typography sx={{ color: '#654575', fontWeight: 700, lineHeight: 1.5 }}>
            {message}
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}
