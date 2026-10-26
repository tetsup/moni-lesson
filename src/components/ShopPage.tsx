import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import MoniSupport from './MoniSupport';

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: 'hug' | 'steak';
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hug',
    name: 'だっこ',
    price: 1000,
    description: 'モニちゃんにぎゅーっと、だっこしてもらおう！',
    icon: 'hug',
  },
  {
    id: 'chateaubriand-ticket',
    name: 'シャトーブリアン引換券',
    price: 100000,
    description: '夢のごほうび！ 特別なお肉の引換券だよ。',
    icon: 'steak',
  },
];

type Props = {
  totalPoints: number;
  onPurchase: (item: ShopItem) => boolean;
};

export default function ShopPage({ totalPoints, onPurchase }: Props) {
  const [message, setMessage] = useState('いらっしゃいませ〜！ 今日はどんなごほうびにする？');
  const [messageExpression, setMessageExpression] = useState<'normal' | 'happy'>('happy');
  const [notice, setNotice] = useState('');

  const buy = (item: ShopItem) => {
    setNotice('');
    if (totalPoints < item.price) {
      setMessage(`あと ${(item.price - totalPoints).toLocaleString()} pt で「${item.name}」が買えるよ！`);
      setMessageExpression('normal');
      return;
    }
    if (!onPurchase(item)) {
      setNotice('購入できなかったよ。ポイントを確認して、もう一度ためしてね。');
      return;
    }
    setMessage(`お買い上げありがとう！「${item.name}」、楽しんでね〜！`);
    setMessageExpression('happy');
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ShoppingBagRoundedIcon sx={{ color: '#d18b3d', fontSize: 30 }} />
          <Typography variant="h5" fontWeight={900} sx={{ color: '#80509a' }}>
            モニちゃんのおみせ
          </Typography>
        </Stack>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          がんばってためたポイントで、ごほうびをゲットしよう！
        </Typography>
      </Box>

      <Card
        sx={{
          overflow: 'hidden',
          borderRadius: 4,
          border: '1px solid #f1d7a6',
          background: 'linear-gradient(135deg, #fff7d9 0%, #fff0e8 52%, #ffe4ef 100%)',
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <StarsRoundedIcon sx={{ color: '#d99a13' }} />
            <Typography fontWeight={900} sx={{ color: '#8d6821' }}>
              いらっしゃいませ！
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<ShoppingBagRoundedIcon />}
              label={`${totalPoints.toLocaleString()} pt`}
              size="small"
              sx={{ bgcolor: '#fff', color: '#80509a', fontWeight: 900 }}
            />
          </Stack>
          <MoniSupport expression={messageExpression} message={message} />
        </CardContent>
      </Card>

      {notice && <Alert severity="error" onClose={() => setNotice('')}>{notice}</Alert>}

      <Typography variant="h6" fontWeight={900} sx={{ color: '#654575' }}>
        なにを買う？
      </Typography>

      {SHOP_ITEMS.map((item) => (
        <Card
          key={item.id}
          sx={{
            borderRadius: 3,
            border: '1px solid #eadcf1',
            background: 'linear-gradient(135deg, #fff 0%, #fffafd 100%)',
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                aria-hidden="true"
                sx={{
                  width: 76,
                  height: 76,
                  flexShrink: 0,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: item.icon === 'hug' ? '#ffe5f0' : '#fff0cf',
                  color: item.icon === 'hug' ? '#d65d91' : '#b57b21',
                }}
              >
                {item.icon === 'hug'
                  ? <FavoriteRoundedIcon sx={{ fontSize: 42 }} />
                  : <RestaurantRoundedIcon sx={{ fontSize: 42 }} />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={900} sx={{ color: '#654575', overflowWrap: 'anywhere' }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                  {item.description}
                </Typography>
                <Typography fontWeight={900} sx={{ color: '#80509a', mt: 0.8 }}>
                  {item.price.toLocaleString()} pt
                </Typography>
              </Box>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              onClick={() => buy(item)}
              sx={{
                mt: 1.5,
                minHeight: 48,
                borderRadius: 3,
                fontWeight: 900,
                bgcolor: '#b486c9',
                '&:hover': { bgcolor: '#9f6bb5' },
              }}
            >
              {totalPoints >= item.price ? 'ポイントで買う！' : 'ポイントがたりないよ'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
