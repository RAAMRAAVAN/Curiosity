"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { setAuthUser } from "@/redux/features/authSlice";
import { setDefaultClass } from "@/redux/features/classSlice";

const LoginModal = ({ open, onClose, onSignupClick }) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!form.email || !form.password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        const authData = {
          email: form.email,
          user: data.data,
          loggedIn: true,
        };

        sessionStorage.setItem(
          "authDetails",
          JSON.stringify(authData)
        );

        dispatch(setAuthUser(authData.user));
        dispatch(setDefaultClass(authData.user.studyingClass || 1));

        onClose();

        router.push(
          `/courses/${authData.user.studyingClass || 1}/home`
        );
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 5,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,.25)",
          display: "flex",
          width: "100vw",
          margin: '10px',
        },
      }}
    >
      {/* Header */}

      <DialogTitle
        sx={{
          background:
            "linear-gradient(135deg,#4F46E5,#7C3AED,#EC4899)",
          color: "white",
          textAlign: "center",
          py: 4,
          position: "relative",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 10,
            top: 10,
            color: "white",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box
          sx={{
            width: 85,
            height: 85,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <SchoolRoundedIcon sx={{ fontSize: 42 }} />
        </Box>

        <Typography variant="h4" fontWeight={700}>
          Welcome Back
        </Typography>

        <Typography sx={{ opacity: .9, mt: 1 }}>
          Login to continue your learning
        </Typography>
      </DialogTitle>

      {/* Body */}

      <DialogContent sx={{ p: 4 }}>

        <Box display="flex" flexDirection="column" gap={2} mt={1}>

          <TextField
            label="Email Address"
            name="email"
            variant="filled"
            fullWidth
            value={form.email}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            sx={{
              "& .MuiFilledInput-root": {
                borderRadius: 3,
                bgcolor: "#F7F8FC",
              },
            }}
          />

          <TextField
            label="Password"
            name="password"
            variant="filled"
            type={showPassword ? "text" : "password"}
            fullWidth
            value={form.password}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiFilledInput-root": {
                borderRadius: 3,
                bgcolor: "#F7F8FC",
              },
            }}
          />

          <Box textAlign="right">
            <Button
              size="small"
              sx={{
                textTransform: "none",
              }}
            >
              Forgot Password?
            </Button>
          </Box>
        </Box>

        <Box
          display="flex"
          alignItems="center"
          my={3}
        >
          <Box flex={1} height={1} bgcolor="#E5E7EB" />

          <Typography
            mx={2}
            color="text.secondary"
            fontSize={13}
          >
            OR
          </Typography>

          <Box flex={1} height={1} bgcolor="#E5E7EB" />
        </Box>

        <Box
          sx={{
            bgcolor: "#F8FAFC",
            borderRadius: 3,
            p: 2.5,
            textAlign: "center",
          }}
        >
          <Typography variant="body2">
            Don't have an account?
          </Typography>

          <Button
            onClick={() => {
              onClose();
              onSignupClick?.();
            }}
            sx={{
              mt: 1,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Create Free Account
          </Button>
        </Box>

      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          onClick={handleSubmit}
          sx={{
            py: 1.5,
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 700,
            fontSize: 16,
            background:
              "linear-gradient(90deg,#4F46E5,#7C3AED,#EC4899)",
            boxShadow:
              "0 10px 25px rgba(79,70,229,.35)",
            transition: ".25s",

            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow:
                "0 15px 35px rgba(79,70,229,.45)",
            },
          }}
        >
          {loading ? (
            <CircularProgress
              size={24}
              sx={{ color: "white" }}
            />
          ) : (
            "Login"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginModal;