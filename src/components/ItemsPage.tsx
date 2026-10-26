import { useMemo } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { SHOP_ITEMS, type ShopItem } from './ShopPage';

type Props = {
  purchasedItems: ShopItem[];
};

export default function ItemsPage({ purchasedItems }: Props) {
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const item of purchasedItems) {
      result.set(item.id, (result.get(item.id) ?? 0) + 1);
    }
    return result;
  }, [purchasedItems]);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#80509a' }}>
          アイテム
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          あつめたアイテムを見てみよう！
        </Typography>
      </Box>

      {SHOP_ITEMS.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Inventory2RoundedIcon sx={{ fontSize: 40, color: '#b486c9', mb: 1 }} />
            <Typography fontWeight={800} sx={{ color: '#654575' }}>
              アイテムはまだないよ
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              ショップでお気に入りを見つけてね。
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 1,
          }}
        >
          {SHOP_ITEMS.map((item) => {
            const count = counts.get(item.id) ?? 0;
            return (
              <Card
                key={item.id}
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  bgcolor: count > 0 ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.72)',
                  opacity: count > 0 ? 1 : 0.58,
                  borderColor: count > 0 ? '#eadcf1' : '#eee5f1',
                }}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: item.icon === 'hug' ? '#ffe5f0' : '#fff0cf',
                      color: item.icon === 'hug' ? '#d65d91' : '#b57b21',
                    }}
                  >
                    {item.icon === 'hug'
                      ? <FavoriteRoundedIcon sx={{ fontSize: { xs: 44, sm: 56 }, maxWidth: '75%', maxHeight: '75%' }} />
                      : <RestaurantRoundedIcon sx={{ fontSize: { xs: 44, sm: 56 }, maxWidth: '75%', maxHeight: '75%' }} />}
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1, minWidth: 0, height: 24 }}>
                    <Typography
                      title={item.name}
                      fontWeight={800}
                      sx={{
                        color: '#654575',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={`×${count}`}
                      aria-label={`${item.name} 所持数 ${count}`}
                      sx={{
                        height: 20,
                        flexShrink: 0,
                        bgcolor: count > 0 ? '#eee1f5' : '#eee9f0',
                        color: count > 0 ? '#80509a' : '#8f8294',
                        fontSize: 11,
                        fontWeight: 900,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
