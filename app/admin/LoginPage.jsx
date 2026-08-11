'use client';

import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useEffect } from "react";

const LoginPage = ({
  loginForm,
  refreshUsers,
  handleLoginChange,
  message,
  setMessage,
  loading,
  setLoading,
  setAdmin,
  setAuthorized,
  setLoginForm,
}) => {

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    const auth = sessionStorage.getItem("authDetails");

    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        setAdmin(parsed.user);
        setAuthorized(true);
      } catch {
        sessionStorage.removeItem("authDetails");
      }
    }

    await checkAdmin();
  };

  const checkAdmin = async () => {
    try {
      const response = await fetch("/api/admin/me", {
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem(
          "authDetails",
          JSON.stringify({
            loggedIn: true,
            user: data.data,
          })
        );

        setAdmin(data.data);
        setAuthorized(true);

        await refreshUsers();
      } else {
        sessionStorage.removeItem("authDetails");
        setAdmin(null);
        setAuthorized(false);
      }
    } catch (error) {
      console.error(error);
      sessionStorage.removeItem("authDetails");
      setAdmin(null);
      setAuthorized(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!data.success) {
        setMessage(data.message || "Unable to login.");
        setAuthorized(false);
        return;
      }

      if (!["ADMIN", "MANAGEMENT"].includes(String(data.data?.role || "").toUpperCase())) {
        setMessage("Only admin or management users can access this panel.");
        setAuthorized(false);
        return;
      }

      sessionStorage.setItem(
        "authDetails",
        JSON.stringify({
          loggedIn: true,
          user: data.data,
        })
      );

      setAdmin(data.data);
      setAuthorized(true);

      setLoginForm({
        email: "",
        password: "",
      });

      await refreshUsers();
    } catch (error) {
      console.error(error);
      setMessage("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    }

    sessionStorage.removeItem("authDetails");

    setAdmin(null);
    setAuthorized(false);
    setMessage("Logged out.");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#eef4fb",
        p: 3,
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 520,
          p: 4,
          borderRadius: 4,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.12)",
          border: "1px solid rgba(15, 23, 42, 0.08)",
        }}
      >
        <Typography variant="h4" fontWeight={700} mb={1}>
          Admin Sign In
        </Typography>

        <Typography color="text.secondary" mb={4}>
          Access the user management console with your admin or management account.
        </Typography>

        <TextField
          label="Email"
          name="email"
          value={loginForm.email}
          onChange={handleLoginChange}
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          value={loginForm.password}
          onChange={handleLoginChange}
          fullWidth
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={loading}
          onClick={handleAdminLogin}
          sx={{ py: 1.5 }}
        >
          {loading ? "Signing In..." : "Sign In"}
        </Button>

        {message && (
          <Typography mt={3} color="error">
            {message}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default LoginPage;