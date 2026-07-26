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
  CircularProgress,
  MenuItem,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const fieldStyle = {
  "& .MuiFilledInput-root": {
    borderRadius: 3,
    bgcolor: "#F7F8FC",
  },
};

const SignupModal = ({
  open,
  onClose,
  onLoginClick,
}) => {
  const [loading, setLoading] = useState(false);

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

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      alert(
        "Please fill all required fields."
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
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
            schoolName:
              form.schoolName,
            studyingClass:
              form.studyingClass,
            userType: form.userType,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(
          "Registration Successful"
        );

        onClose();

        onLoginClick?.();
      } else {
        alert(
          data.message ||
            "Registration failed."
        );
      }
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 5,
          overflow: "hidden",
          boxShadow:
            "0 30px 80px rgba(0,0,0,.25)",
        },
      }}
    >
      {/* HEADER */}

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
            top: 10,
            right: 10,
            color: "white",
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box
          sx={{
            width: 85,
            height: 85,
            mx: "auto",
            mb: 2,
            borderRadius: "50%",
            bgcolor:
              "rgba(255,255,255,.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SchoolRoundedIcon
            sx={{
              fontSize: 42,
            }}
          />
        </Box>

        <Typography
          variant="h4"
          fontWeight={700}
        >
          Create Account
        </Typography>

        <Typography
          sx={{
            mt: 1,
            opacity: 0.9,
          }}
        >
          Start your learning journey
          today
        </Typography>
      </DialogTitle>

      {/* BODY */}

      <DialogContent
        sx={{
          p: 4,
        }}
      >
        <Box
          display="flex"
          flexDirection="column"
          gap={2}
          mt={1}
        >
          <TextField
            label="Full Name *"
            name="name"
            variant="filled"
            fullWidth
            value={form.name}
            onChange={handleChange}
            sx={fieldStyle}
          />

          <TextField
            label="Email Address *"
            name="email"
            type="email"
            variant="filled"
            fullWidth
            value={form.email}
            onChange={handleChange}
            sx={fieldStyle}
          />

          <TextField
            label="Date of Birth"
            name="dob"
            type="date"
            variant="filled"
            fullWidth
            value={form.dob}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            sx={fieldStyle}
          />

          <TextField
            select
            label="Gender"
            name="gender"
            variant="filled"
            fullWidth
            value={form.gender}
            onChange={handleChange}
            sx={fieldStyle}
          >
            <MenuItem value="">
              Select Gender
            </MenuItem>
            <MenuItem value="Male">
              Male
            </MenuItem>
            <MenuItem value="Female">
              Female
            </MenuItem>
            <MenuItem value="Other">
              Other
            </MenuItem>
            <MenuItem value="Prefer not to say">
              Prefer not to say
            </MenuItem>
          </TextField>

          <TextField
            label="Phone Number"
            name="phone"
            variant="filled"
            fullWidth
            value={form.phone}
            onChange={handleChange}
            sx={fieldStyle}
          />

          <TextField
            label="Address"
            name="address"
            variant="filled"
            fullWidth
            multiline
            rows={2}
            value={form.address}
            onChange={handleChange}
            sx={fieldStyle}
          />

          <TextField
            label="School Name"
            name="schoolName"
            variant="filled"
            fullWidth
            value={form.schoolName}
            onChange={handleChange}
            sx={fieldStyle}
          />

          <TextField
            label="Studying Class"
            name="studyingClass"
            variant="filled"
            fullWidth
            value={form.studyingClass}
            onChange={handleChange}
            sx={fieldStyle}
          />

          <TextField
            label="Password *"
            name="password"
            variant="filled"
            type={
              showPassword
                ? "text"
                : "password"
            }
            fullWidth
            value={form.password}
            onChange={handleChange}
            sx={fieldStyle}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
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
          />

          <TextField
            label="Confirm Password *"
            name="confirmPassword"
            variant="filled"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            fullWidth
            value={
              form.confirmPassword
            }
            onChange={handleChange}
            sx={fieldStyle}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          display="flex"
          alignItems="center"
          my={3}
        >
          <Box
            flex={1}
            height={1}
            bgcolor="#E5E7EB"
          />

          <Typography
            mx={2}
            color="text.secondary"
            fontSize={13}
          >
            OR
          </Typography>

          <Box
            flex={1}
            height={1}
            bgcolor="#E5E7EB"
          />
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
            Already have an account?
          </Typography>

          <Button
            onClick={() => {
              onClose();
              onLoginClick?.();
            }}
            sx={{
              mt: 1,
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            Login Now
          </Button>
        </Box>
      </DialogContent>

      {/* FOOTER */}

      <DialogActions
        sx={{
          px: 4,
          pb: 4,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          onClick={handleSubmit}
          sx={{
            py: 1.5,
            borderRadius: 3,
            fontSize: 16,
            fontWeight: 700,
            textTransform: "none",
            background:
              "linear-gradient(90deg,#4F46E5,#7C3AED,#EC4899)",
            boxShadow:
              "0 10px 25px rgba(79,70,229,.35)",

            "&:hover": {
              transform:
                "translateY(-2px)",
              boxShadow:
                "0 15px 35px rgba(79,70,229,.45)",
            },

            transition: ".25s",
          }}
        >
          {loading ? (
            <CircularProgress
              size={24}
              sx={{
                color: "white",
              }}
            />
          ) : (
            "Create Account"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignupModal;