'use client';

import { useMemo } from 'react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import portalThemeOptions from '@/lib/portalTheme';

export default function PortalTheme({ children }) {
  const outerTheme = useTheme();
  const theme = useMemo(() => createTheme(outerTheme, portalThemeOptions), [outerTheme]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
