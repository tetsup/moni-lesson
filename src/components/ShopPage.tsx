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
import ChairRoundedIcon from '@mui/icons-material/ChairRounded';
import WallpaperRoundedIcon from '@mui/icons-material/WallpaperRounded';
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import MoniSupport from './MoniSupport';

export type ShopItemCategory = 'furniture' | 'room-skin' | 'clothing' | 'ticket';

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  category: ShopItemCategory;
  useMethod: 'slide-to-reveal';
  icon: 'hug' | 'steak';
};

export const SHOP_CATEGORIES: Array<{
  id: ShopItemCategory;
  label: string;
  description: string;
}> = [
  { id: 'furniture', label: '家具', description: 'おへやに置く家具' },
  { id: 'room-skin', label: '部屋スキン', description: 'おへやの模様替え' },
  { id: 'clothing', label: '衣服', description: 'モニちゃんのおしゃれ' },
  { id: 'ticket', label: 'チケット', description: 'ごほうびや引換券' },
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hug',
    name: 'だっこ',
    price: 1000,
    description: 'モニちゃんにぎゅーっと、だっこしてもらおう！',
    category: 'ticket',
    useMethod: 'slide-to-reveal',
    icon: 'hug',
  },
  {
    id: 'chateaubriand-ticket',
    name: 'シャトーブリアン引換券',
    price: 100000,
    description: '夢のごほうび！ 特別なお肉の引換券だよ。',
    category: 'ticket',
    useMethod: 'slide-to-reveal',
    icon: 'steak',
  },
];

type Props = {
  totalPoints: number;
  onPurchase: (item: ShopItem) => boolean;
};

export default function ShopPage({ totalPoints, onPurchase }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<ShopItemCategory>('ticket');
  const [message, setMessage] = useState('いらっしゃいませ〜！ 今日はどんなごほうびにする？');
  const [messageExpression, setMessageExpression] = useState<'normal' | 'happy'>('happy');
  const [notice, setNotice] = useState('');

  const visibleItems = SHOP_ITEMS.filter((item) => item.category === selectedCategory);

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

  const categoryIcon = (category: ShopItemCategory) => {
    switch (category) {
      case 'furniture': return <ChairRoundedIcon />;
      case 'room-skin': return <WallpaperRoundedIcon />;
      case 'clothing': return <CheckroomRoundedIcon />;
      case 'ticket': return <ConfirmationNumberRoundedIcon />;
    }
  };

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 184, sm: 220 },
          mx: -2,
          mt: -2,
          px: 2,
          py: 2,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          isolation: 'isolate',
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            zIndex: -2,
            inset: -12,
            background: `radial-gradient(ellipse at 18% 20%, rgba(255, 222, 239, .95) 0 9%, transparent 30%), radial-gradient(ellipse at 82% 25%, rgba(219, 198, 250, .9) 0 12%, transparent 34%), radial-gradient(ellipse at 70% 85%, rgba(255, 229, 196, .9) 0 12%, transparent 35%), linear-gradient(135deg, #fbe6f3, #e7dafa 48%, #fff0d9)`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            filter: 'blur(7px)',
            transform: 'scale(1.04)',
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            zIndex: -1,
            inset: 0,
            background: 'linear-gradient(90deg, rgba(255,247,253,.55), rgba(255,250,247,.35))',
          }}
        />
        <Box sx={{ width: '100%', maxWidth: 560, mx: 'auto' }}>
          <MoniSupport
            expression={messageExpression}
            message={message}
            variant="floating"
          />
        </Box>
      </Box>

      {notice && <Alert severity="error" onClose={() => setNotice('')}>{notice}</Alert>}

      <Typography variant="h6" fontWeight={900} sx={{ color: '#654575' }}>
        なにを買う？
      </Typography>

      <Box
        role="tablist"
        aria-label="ショップの商品カテゴリ"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 0.75,
        }}
      >
        {SHOP_CATEGORIES.map((category) => {
          const selected = category.id === selectedCategory;
          const count = SHOP_ITEMS.filter((item) => item.category === category.id).length;
          return (
            <Button
              key={category.id}
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setSelectedCategory(category.id);
                setNotice('');
              }}
              variant={selected ? 'contained' : 'outlined'}
              sx={{
                minWidth: 0,
                minHeight: 78,
                px: 0.5,
                py: 1,
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                lineHeight: 1.2,
                fontWeight: 800,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
                color: selected ? '#fff' : '#80509a',
                borderColor: '#dfcbe8',
                bgcolor: selected ? '#b486c9' : '#fff',
                '&:hover': {
                  bgcolor: selected ? '#9f6bb5' : '#fbf4ff',
                  borderColor: '#b486c9',
                },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ minWidth: 0 }}>
                {categoryIcon(category.id)}
                <Typography component="span" sx={{ minWidth: 0, fontSize: 'inherit', overflowWrap: 'anywhere' }}>
                  {category.label}
                </Typography>
              </Stack>
              <Typography component="span" sx={{ fontSize: 10, opacity: 0.8 }}>
                {count > 0 ? `${count}点` : '準備中'}
              </Typography>
            </Button>
          );
        })}
      </Box>

      {visibleItems.length === 0 ? (
        <Card sx={{ borderRadius: 3, border: '1px dashed #dfcbe8', bgcolor: '#fff' }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Box sx={{ color: '#b486c9', mb: 1 }}>
              {categoryIcon(selectedCategory)}
            </Box>
            <Typography fontWeight={900} sx={{ color: '#654575' }}>
              {SHOP_CATEGORIES.find((category) => category.id === selectedCategory)?.label}は準備中！
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              もう少し待っててね。すてきなアイテムを用意するよ！
            </Typography>
          </CardContent>
        </Card>
      ) : visibleItems.map((item) => (
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
