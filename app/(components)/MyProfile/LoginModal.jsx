"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setAuthUser } from "@/redux/features/authSlice";
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
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { setDefaultClass } from "@/redux/features/classSlice";

const LoginModal = ({ open, onClose, onSignupClick }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const authData = {
          email: form.email,
          user: data.data,
          loggedIn: true,
        };

        sessionStorage.setItem("authDetails", JSON.stringify(authData));
        dispatch(setAuthUser(authData.user));
        dispatch(setDefaultClass(authData.user.studyingClass || 1));
        alert("Login successful");
        onClose();
        router.push(`/courses/${authData.user.studyingClass || 1}/home/`);
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle>
        Login

        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box mt={1} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Email Address"
            name="email"
            type="email"
            fullWidth
            value={form.email}
            onChange={handleChange}
          />

          <TextField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            fullWidth
            value={form.password}
            onChange={handleChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography mt={3} textAlign="center" variant="body2">
          Don&apos;t have an account? {" "}
          <Button variant="text" onClick={onSignupClick}>
            Sign Up
          </Button>
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button fullWidth variant="contained" size="large" onClick={handleSubmit}>
          Login
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginModal;
