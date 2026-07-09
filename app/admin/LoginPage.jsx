import { Box, Button, Paper, TextField, Typography } from "@mui/material";

const LoginPage = ({ loginForm, refreshUsers, handleLoginChange, message, setMessage, loading, setLoading, setAdmin, setAuthorized, setLoginForm}) => {


  const checkAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/me");
      const data = await response.json();

      if (data.success) {
        setAdmin(data.data);
        setAuthorized(true);
        await refreshUsers();
        await refreshClasses();
      } else {
        setAuthorized(false);
      }
    } catch (error) {
      console.error(error);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Unable to login.");
        setAuthorized(false);
        return;
      }

      if (data.data.role !== "ADMIN") {
        setMessage("Only admin users can access this panel.");
        setAuthorized(false);
        return;
      }

      sessionStorage.setItem(
        "authDetails",
        JSON.stringify({ loggedIn: true, user: data.data })
      );
      setAdmin(data.data);
      setAuthorized(true);
      setLoginForm({ email: "", password: "" });
      await refreshUsers();
    } catch (error) {
      console.error(error);
      setMessage("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    sessionStorage.removeItem("authDetails");
    setAdmin(null);
    setAuthorized(false);
    setUsers([]);
    setMessage("Logged out.");
  };
  return (<>
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
          Access the user management console with your admin account.
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
          onClick={handleAdminLogin}
          fullWidth
          sx={{ py: 1.5 }}
        >
          Sign in
        </Button>

        {message ? (
          <Typography mt={3} color="error">
            {message}
          </Typography>
        ) : null}
      </Paper>
    </Box>
  </>);
}
export default LoginPage;