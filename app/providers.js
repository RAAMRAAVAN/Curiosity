"use client"; 
import { Provider, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { store } from "../redux/store";
import { setAuthUser } from "@/redux/features/authSlice";
import { fetchClasses } from "@/redux/features/classSlice";

function AuthHydrator({ children }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [dispatch]);

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
