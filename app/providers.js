"use client"; 
import { Provider, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { store } from "../redux/store";
import { setAuthUser } from "@/redux/features/authSlice";
import { fetchClasses } from "@/redux/features/classSlice";

function ChunkLoadRecovery() {
  useEffect(() => {
    const retryKey = "curiosity:chunk-load-retry";
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
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    const checkDatabaseHealth = async () => {
      try {
        const response = await fetch("/api/health/db", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload?.success === false) {
          setDbError(payload?.message || "Database is unavailable.");
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("DB health check failed", error);
        setDbError("Database is unavailable. Please check the local DB or Neon connection.");
        setLoading(false);
        return;
      }

      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const auth = sessionStorage.getItem("authDetails");
      if (!auth) {
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(auth);
        if (parsed?.loggedIn && parsed.user) {
          dispatch(setAuthUser(parsed.user));
        }
      } catch (error) {
        console.error("Failed to restore auth from sessionStorage", error);
      } finally {
        dispatch(fetchClasses());
        setLoading(false);
      }
    };

    checkDatabaseHealth();
  }, [dispatch]);

  if (dbError) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "#fff5f5",
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 700, width: "100%" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Database unavailable
          </Typography>
          <Typography>
            {dbError}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(255,255,255,0.96)",
          p: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            px: 5,
            py: 4,
            minWidth: { xs: 220, sm: 300 },
            borderRadius: 4,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 28px 80px rgba(0,0,0,0.18)",
          }}
        >
          <Box
            component="img"
            src="/favicon.gif"
            alt="Loading"
            sx={{
              width: { xs: 140, sm: 180 },
              height: { xs: 140, sm: 180 },
              objectFit: "contain",
              borderRadius: 4,
              animation: "pulse 1.2s ease-in-out infinite",
              "@keyframes pulse": {
                "0%": { transform: "scale(0.96)", opacity: 0.75 },
                "50%": { transform: "scale(1.12)", opacity: 1 },
                "100%": { transform: "scale(0.96)", opacity: 0.75 },
              },
            }}
          />
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 20, sm: 26 },
              color: "#1f2937",
              letterSpacing: 0.5,
              textAlign: "center",
            }}
          >
            Verifying session...
          </Typography>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <>
        <ChunkLoadRecovery />
        <AuthHydrator>{children}</AuthHydrator>
      </>
    </Provider>
  );
}
