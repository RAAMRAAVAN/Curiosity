'use client'
import { Geist, Geist_Mono} from "next/font/google";
import { Providers } from "./providers";
import './globals.css';
import '../lib/font.css'; 
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';

const theme = createTheme({
  typography: {
    fontFamily: `'Montserrat', 'Roboto', 'Helvetica', 'Arial', sans-serif`,
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` antialiased`}
        style={{ backgroundColor: "#ffffff", color: "black" }}
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}