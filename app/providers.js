"use client"; 
import { useEffect } from "react";
import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { Provider, useDispatch } from "react-redux";
import { store } from "../redux/store";
import { setAuthUser } from "@/redux/features/authSlice";

const theme = createTheme({
  typography: {
    fontFamily: `'Montserrat', 'Roboto', 'Helvetica', 'Arial', sans-serif`,
  },
});

function ChunkLoadRecovery() {
  useEffect(() => {
    const retryKey = `curiosity:chunk-load-retry:${window.location.pathname}`;
    const retryWindow = 30 * 1000;

    const recoverFromChunkError = (event) => {
      const error = event?.reason || event?.error || event;
      const message = String(event?.message || error?.message || error || "");
      const isChunkError = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(message);

      if (!isChunkError || typeof window === "undefined") return;

      const previousRetry = Number(sessionStorage.getItem(retryKey) || 0);
      if (Date.now() - previousRetry < retryWindow) return;

      sessionStorage.setItem(retryKey, String(Date.now()));
      window.location.reload();
    };

    window.addEventListener("error", recoverFromChunkError);
    window.addEventListener("unhandledrejection", recoverFromChunkError);

    return () => {
      window.removeEventListener("error", recoverFromChunkError);
      window.removeEventListener("unhandledrejection", recoverFromChunkError);
    };
  }, []);

  return null;
}

function AuthHydrator({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const auth = sessionStorage.getItem("authDetails");
    if (!auth) return;

    try {
      const parsed = JSON.parse(auth);
      if (parsed?.loggedIn && parsed.user) {
        dispatch(setAuthUser(parsed.user));
      }
    } catch (error) {
      console.error("Failed to restore auth from sessionStorage", error);
    }
  }, [dispatch]);

  return children;
}

export function Providers({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <ChunkLoadRecovery />
        <AuthHydrator>{children}</AuthHydrator>
      </Provider>
    </ThemeProvider>
  );
}
