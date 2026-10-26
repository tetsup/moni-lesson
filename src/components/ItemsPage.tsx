import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import { SHOP_ITEMS, type ShopItem } from './ShopPage';

type Props = {
  purchasedItems: ShopItem[];
  onUseTicket: (item: ShopItem) => void;
};

export default function ItemsPage({ purchasedItems, onUseTicket }: Props) {
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [ticketInUse, setTicketInUse] = useState<ShopItem | null>(null);
  const [sliderValue, setSliderValue] = useState(0);

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const item of purchasedItems) {
      result.set(item.id, (result.get(item.id) ?? 0) + 1);
    }
    return result;
  }, [purchasedItems]);

  const closeTicket = () => {
    setTicketInUse(null);
    setSliderValue(0);
  };

  const useTicket = (item: ShopItem) => {
    if ((counts.get(item.id) ?? 0) < 1) return;
    onUseTicket(item);
    setSelectedItem(null);
    setSliderValue(0);
    setTicketInUse(item);
  };

  const itemIcon = (item: ShopItem, size: number) => item.icon === 'hug'
    ? <FavoriteRoundedIcon sx={{ fontSize: size }} />
    : <RestaurantRoundedIcon sx={{ fontSize: size }} />;

  return (
    <Stack spacing={2} sx={{ pb: selectedItem ? '210px' : 1 }}>
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
            const selected = selectedItem?.id === item.id;
            return (
              <Card
                key={item.id}
                component="button"
                type="button"
                onClick={() => setSelectedItem(selected ? null : item)}
                aria-pressed={selected}
                sx={{
                  minWidth: 0,
                  p: 0,
                  textAlign: 'left',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: selected ? '2px solid #b486c9' : '1px solid #eadcf1',
                  bgcolor: count > 0 ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.72)',
                  opacity: count > 0 ? 1 : 0.58,
                  boxShadow: selected ? '0 0 0 2px rgba(180,134,201,0.18)' : 'none',
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
                    {itemIcon(item, 48)}
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1, minWidth: 0 }}>
                    <Typography
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

      <Box
        sx={{
          position: 'fixed',
          zIndex: (theme) => theme.zIndex.appBar - 1,
          left: 0,
          right: 0,
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          px: 2,
          pb: 1,
          pointerEvents: selectedItem ? 'auto' : 'none',
          transform: selectedItem ? 'translateY(0)' : 'translateY(calc(100% + 20px))',
          opacity: selectedItem ? 1 : 0,
          transition: 'transform 220ms ease, opacity 180ms ease',
        }}
      >
        {selectedItem && (
          <Card
            role="region"
            aria-label={`${selectedItem.name} の詳細`}
            sx={{
              maxWidth: 600,
              mx: 'auto',
              borderRadius: 4,
              border: '1px solid #e4cdea',
              bgcolor: 'rgba(255,255,255,0.98)',
              boxShadow: '0 -6px 28px rgba(91,55,105,0.2)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 3,
                    bgcolor: selectedItem.icon === 'hug' ? '#ffe5f0' : '#fff0cf',
                    color: selectedItem.icon === 'hug' ? '#d65d91' : '#b57b21',
                  }}
                >
                  {itemIcon(selectedItem, 38)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={900} sx={{ color: '#654575', overflowWrap: 'anywhere' }}>
                    {selectedItem.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={`×${counts.get(selectedItem.id) ?? 0}`}
                    aria-label={`所持数 ${counts.get(selectedItem.id) ?? 0}`}
                    sx={{ mt: 0.5, bgcolor: '#eee1f5', color: '#80509a', fontWeight: 900 }}
                  />
                </Box>
                <IconButton aria-label="詳細を閉じる" size="small" onClick={() => setSelectedItem(null)}>
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
              <Typography variant="body2" sx={{ mt: 1.5, color: '#665b6b', whiteSpace: 'pre-wrap' }}>
                {selectedItem.description}
              </Typography>

              {selectedItem.category === 'ticket' && (
                <Box sx={{ mt: 2, px: 1 }}>
                  <Typography fontWeight={900} sx={{ textAlign: 'center', color: '#80509a', mb: 0.5 }}>
                    このチケットをつかう
                  </Typography>
                  {(counts.get(selectedItem.id) ?? 0) > 0 ? (
                    <>
                      <Slider
                        aria-label="このチケットをつかう"
                        value={sliderValue}
                        min={0}
                        max={100}
                        onChange={(_, value) => {
                          const next = Array.isArray(value) ? value[0] : value;
                          setSliderValue(next);
                          if (next >= 95) useTicket(selectedItem);
                        }}
                        sx={{
                          color: '#b486c9',
                          '& .MuiSlider-thumb': { width: 28, height: 28 },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                        右までスライドしてね
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      このチケットはもうないよ
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      <Dialog
        open={ticketInUse !== null}
        onClose={closeTicket}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 5,
            overflow: 'visible',
            bgcolor: '#fffafd',
            border: '2px solid #d9b8e7',
            boxShadow: '0 16px 48px rgba(91,55,105,0.28)',
          },
        }}
      >
        {ticketInUse && (
          <DialogContent sx={{ p: 2.5 }}>
            <Stack alignItems="center" spacing={1.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                <Typography fontWeight={900} sx={{ color: '#80509a' }}>チケット</Typography>
                <IconButton aria-label="チケットを閉じる" onClick={closeTicket} size="small">
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'stretch',
                  borderRadius: 0,
                  border: '2px solid #c49bd7',
                  background: 'linear-gradient(145deg, #fff0f8 0%, #f5eaff 100%)',
                  overflow: 'hidden',
                  textAlign: 'center',
                }}
              >
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  spacing={0.75}
                  sx={{ flex: 1, minWidth: 0, p: 2 }}
                >
                  <ConfirmationNumberRoundedIcon sx={{ fontSize: 36, color: '#a56abe' }} />
                  <Typography variant="h5" fontWeight={900} sx={{ color: '#654575', overflowWrap: 'anywhere' }}>
                    {ticketInUse.name}
                  </Typography>
                  <Typography fontWeight={900} sx={{ color: '#b05287', fontSize: '1.05rem' }}>
                    おうちの人に見せてね！
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#654575' }}>
                    とじると きえちゃうよ！
                  </Typography>
                </Stack>
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  spacing={0.75}
                  sx={{
                    width: 68,
                    flexShrink: 0,
                    borderLeft: '2px dotted #c49bd7',
                    p: 1,
                    color: '#a56abe',
                    bgcolor: 'rgba(255,255,255,0.45)',
                  }}
                >
                  <ConfirmationNumberRoundedIcon sx={{ fontSize: 25 }} />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, writingMode: 'vertical-rl', letterSpacing: '0.12em' }}>
                    もぎり
                  </Typography>
                </Stack>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                この画面をおうちの人に見せてね
              </Typography>
            </Stack>
          </DialogContent>
        )}
      </Dialog>
    </Stack>
  );
}
