'use client';

import { Box, Button, TextField, Typography } from "@mui/material";
import { useEffect } from "react";
import Image from "next/image";

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
      component="main"
      sx={{
        minHeight: "100vh",
        borderTop: "4px solid #8b3fe8",
        bgcolor: "#fff",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.65fr) minmax(360px, 0.85fr)" },
        px: { xs: 2, sm: 4, md: 5 },
        py: { xs: 4, sm: 6, md: 7 },
        gap: { xs: 5, md: 6 },
        alignItems: "center",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", md: "space-between" },
            gap: { xs: 2, sm: 4, md: 6 },
            width: "100%",
            mb: { xs: 4, md: 5 },
          }}
        >
          <Image
            src="/loginimage1.png"
            alt="The Hans Foundation"
            width={270}
            height={180}
            priority
            style={{ width: "clamp(115px, 15vw, 200px)", height: "auto", objectFit: "contain" }}
          />
          <Typography
            component="h1"
            sx={{
              color: "#202020",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: { xs: 28, sm: 42, md: "clamp(40px, 4.8vw, 76px)" },
              lineHeight: 1.05,
              whiteSpace: { xs: "normal", sm: "nowrap" },
            }}
          >
            Project Uttam Xikhya
          </Typography>
        </Box>

        <Box
          component="img"
          src="/loginimage1.png"
          alt="Project Uttam Xikhya campus"
          sx={{
            display: "block",
            width: "100%",
            aspectRatio: "1.95 / 1",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </Box>

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          handleAdminLogin();
        }}
        sx={{ width: "100%", maxWidth: 430, justifySelf: "center", px: { xs: 1, sm: 2, md: 0 } }}
      >
        <Typography
          component="h2"
          sx={{ fontSize: { xs: 28, sm: 32 }, lineHeight: 1.15, fontWeight: 800, mb: 4 }}
        >
          Welcome to CBLC<br />Management
        </Typography>

        <Typography component="label" htmlFor="admin-email" sx={{ display: "block", fontSize: 14, fontWeight: 700, mb: 1 }}>
          Username/ Email*
        </Typography>
        <TextField
          id="admin-email"
          name="email"
          type="email"
          value={loginForm.email}
          onChange={handleLoginChange}
          required
          fullWidth
          variant="outlined"
          inputProps={{ "aria-label": "Username or email" }}
          sx={{ mb: 3, "& .MuiOutlinedInput-root": { height: 40, borderRadius: 0 } }}
        />

        <Typography component="label" htmlFor="admin-password" sx={{ display: "block", fontSize: 14, fontWeight: 700, mb: 1 }}>
          Password
        </Typography>
        <TextField
          id="admin-password"
          name="password"
          type="password"
          value={loginForm.password}
          onChange={handleLoginChange}
          required
          fullWidth
          variant="outlined"
          inputProps={{ "aria-label": "Password" }}
          sx={{ mb: 3, "& .MuiOutlinedInput-root": { height: 40, borderRadius: 0 } }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{
            height: 43,
            borderRadius: 1.5,
            bgcolor: "#2b8c82",
            color: "#050505",
            fontSize: 14,
            fontWeight: 800,
            boxShadow: "none",
            "&:hover": { bgcolor: "#23786f", boxShadow: "none" },
          }}
        >
          {loading ? "SUBMITTING..." : "SUBMIT"}
        </Button>

        <Typography sx={{ mt: 2, textAlign: "center", fontSize: 10, color: "#777" }}>
          Your Canva profile name will be shared. Never submit passwords.
        </Typography>
        <Typography component="a" href="#" sx={{ display: "block", textAlign: "center", color: "#555", fontSize: 10, textDecoration: "underline" }}>
          Learn how we handle your data
        </Typography>

        {message && (
          <Typography mt={3} color="error" sx={{ textAlign: "center", fontSize: 13 }}>
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LoginPage;