// lib/theme.js
import { createTheme } from '@mui/material/styles';
import '@fontsource/inter'; // Import Inter font

const theme = createTheme({
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
});

export default theme;