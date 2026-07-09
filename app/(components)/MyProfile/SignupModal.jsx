"use client";

import { useState } from "react";
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

const SignupModal = ({ open, onClose, onLoginClick }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    gender: "",
    phone: "",
    address: "",
    schoolName: "",
    studyingClass: "",
    userType: "student",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          dob: form.dob,
          gender: form.gender,
          phone: form.phone,
          address: form.address,
          schoolName: form.schoolName,
          studyingClass: form.studyingClass,
          userType: form.userType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Registration Successful");
        onClose();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Something went wrong.");
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
        Create Account

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
            label="Full Name"
            name="name"
            fullWidth
            value={form.name}
            onChange={handleChange}
          />

          <TextField
            label="Email Address"
            name="email"
            type="email"
            fullWidth
            value={form.email}
            onChange={handleChange}
          />

          <TextField
            label="Date of Birth"
            name="dob"
            type="date"
            fullWidth
            value={form.dob}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Gender"
            name="gender"
            select
            fullWidth
            value={form.gender}
            onChange={handleChange}
            SelectProps={{ native: true }}
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </TextField>

          <TextField
            label="Phone Number"
            name="phone"
            fullWidth
            value={form.phone}
            onChange={handleChange}
          />

          <TextField
            label="Address"
            name="address"
            fullWidth
            multiline
            rows={2}
            value={form.address}
            onChange={handleChange}
          />

          <TextField
            label="School Name"
            name="schoolName"
            fullWidth
            value={form.schoolName}
            onChange={handleChange}
          />

          <TextField
            label="Studying Class"
            name="studyingClass"
            fullWidth
            value={form.studyingClass}
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
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Confirm Password"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            fullWidth
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </Box>

        <Typography mt={3} textAlign="center" variant="body2">
          Already have an account?{" "}
          <Button variant="text" onClick={onLoginClick}>
            Login
          </Button>
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button fullWidth variant="contained" size="large" onClick={handleSubmit}>
          Create Account
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignupModal;
