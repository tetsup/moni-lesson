import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#a56cc1', dark: '#80509a', light: '#ead8f2' },
    secondary: { main: '#f39ab7' },
    background: { default: '#fff8fc', paper: '#fff' },
    text: { primary: '#493c53', secondary: '#8b7d92' },
    success: { main: '#83b9a0' },
  },
  typography: {
    fontFamily: '"Hiragino Maru Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-.04em' },
    h5: { fontWeight: 800, letterSpacing: '-.03em' },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  // Keep a single restrained radius scale across cards, controls, and inputs.
  shape: { borderRadius: 16 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 16, boxShadow: 'none', minHeight: 46 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16, border: '1px solid #f2e7f4', boxShadow: '0 8px 28px rgba(112,76,126,.06)' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 16 } } },
  },
});