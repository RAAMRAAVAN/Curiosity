"use client"; 
import { Provider, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { store } from "../redux/store";
import { setAuthUser } from "@/redux/features/authSlice";
import { fetchClasses } from "@/redux/features/classSlice";

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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          color: "text.primary",
          p: 2,
        }}
      >
        <CircularProgress size={80} thickness={4} />
        <Typography mt={2} variant="h6" align="center">
          Verifying session...
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <AuthHydrator>{children}</AuthHydrator>
    </Provider>
  );
}
