"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import Image from "next/image";

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

const LoginModal = ({
  open,
  onClose,
  onSignupClick,
  fullScreen = false,
  showSignup = true,
  showForgotPassword = true,
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const useFullScreenLayout = fullScreen;

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

        const userRole = (authData.user?.role || authData.user?.userType || "")
          .toString()
          .toUpperCase();
        const redirectPath =
          userRole === "ADMIN"
            ? "/admin/users"
            : userRole === "TEACHER" || userRole === "MANAGEMENT"
              ? "/admin/attendance"
              : `/courses/${authData.user.studyingClass || 1}/home`;

        router.replace(redirectPath);
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
      onClose={(event, reason) => {
        if (fullScreen && (reason === "backdropClick" || reason === "escapeKeyDown")) {
          return;
        }

        onClose();
      }}
      disableEscapeKeyDown={fullScreen}
      fullScreen={useFullScreenLayout}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: useFullScreenLayout ? 0 : 5,
          overflow: "hidden",
          boxShadow: useFullScreenLayout ? "none" : "0 30px 80px rgba(0,0,0,.25)",
          display: useFullScreenLayout ? "grid" : "flex",
          gridTemplateColumns: useFullScreenLayout ? { xs: "1fr", md: "minmax(0, 1.85fr) minmax(320px, 0.85fr)" } : undefined,
          gridTemplateRows: useFullScreenLayout ? { xs: "auto auto auto auto auto", md: "auto minmax(0, 1fr) auto" } : undefined,
          height: fullScreen ? "100vh" : "auto",
          maxHeight: fullScreen ? "100vh" : "calc(100% - 64px)",
          width: useFullScreenLayout ? "100%" : "100vw",
          margin: fullScreen ? 0 : "10px",
          borderTop: useFullScreenLayout ? "4px solid #8b3fe8" : undefined,
        },
      }}
    >
      <DialogTitle
        component={useFullScreenLayout ? "div" : "h2"}
        sx={{
          ...(useFullScreenLayout ? {
            gridColumn: "1 / -1",
            gridRow: "1",
            color: "#202020",
            p: { xs: 2, sm: 4, md: 5 },
            display: "flex",
            alignItems: "center",
          } : {
            background: "linear-gradient(135deg,#4F46E5,#7C3AED,#EC4899)",
            color: "white",
            textAlign: "center",
            py: 4,
          }),
          position: "relative",
        }}
      >
        {!fullScreen && (
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
        )}

        {useFullScreenLayout ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2, sm: 4, md: 6 }, justifyContent: { xs: "center", md: "space-between" }, width: "100%", marginX: { xs: "auto", md: '100px' }}}>
              <Image
                src="/loginimage1.png"
                alt="Curiosity logo"
                width={270}
                height={180}
                priority
                style={{ width: "clamp(115px, 15vw, 200px)", height: "auto", objectFit: "contain" }}
              />
              <Typography component="h1" sx={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: { xs: 24, sm: 38, md: 64 },
                lineHeight: 1.05,
                fontWeight: 400,
                whiteSpace: { xs: "normal", sm: "nowrap" },
                '@media (min-width: 900px)': {
                  fontSize: 'clamp(72px, 5vw, 110px)',
                },
              }}>
                Project Uttam Xikhya
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ width: 85, height: 85, borderRadius: "50%", bgcolor: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
              <SchoolRoundedIcon sx={{ fontSize: 42 }} />
            </Box>
            <Typography variant="h4" fontWeight={700}>Welcome Back</Typography>
            <Typography sx={{ opacity: .9, mt: 1 }}>Login to continue your learning</Typography>
          </>
        )}
      </DialogTitle>

      {useFullScreenLayout ? (
        <Box
          sx={{
            gridColumn: { xs: "1", md: "1" },
            gridRow: "2",
            alignSelf: "center",
            width: { xs: "calc(100% - 32px)", md: "calc(100% - 220px)" },
            mx: { xs: 2, md: 5 },
            aspectRatio: "1.95 / 1",
            borderRadius: 4,
            backgroundImage: "url('/LoginBackground.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
            position: "relative",
            overflow: "hidden",
            transform: { xs: "none", md: "translateY(-24px)" },
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(79,70,229,0.12), rgba(45,212,191,0.1), rgba(15,23,42,0.12))",
            },
          }}
        />
      ) : null}

      {useFullScreenLayout ? (
        <Typography
          sx={{
            gridColumn: "1",
            gridRow: "3",
            alignSelf: "start",
            width: { xs: "calc(100% - 32px)", md: "calc(100% - 220px)" },
            mx: { xs: 2, md: 5 },
            mt: { xs: 1, md: -1 },
            textAlign: "center",
            color: "#555",
            fontSize: { xs: 11, md: 13 },
          }}
        >
          Maintained &amp; developed by Curiosity
        </Typography>
      ) : null}

      <DialogContent sx={{ gridColumn: useFullScreenLayout ? { xs: "1", md: "2" } : undefined, gridRow: useFullScreenLayout ? { xs: "4", md: "2" } : undefined, alignSelf: "stretch", display: useFullScreenLayout ? "flex" : undefined, flexDirection: useFullScreenLayout ? "column" : undefined, justifyContent: useFullScreenLayout ? "center" : undefined, transform: useFullScreenLayout ? { xs: "none", md: "translateX(-80px)" } : undefined, p: useFullScreenLayout ? { xs: 3, sm: 5, md: 4 } : 4, width: "100%" }}>
        {useFullScreenLayout ? (
          <Typography component="h2" sx={{ fontSize: { xs: 28, sm: 32 }, lineHeight: 1.15, fontWeight: 800, mb: 4 }}>
            Welcome to CBLC<br />Management
          </Typography>
        ) : null}

        <Box display="flex" flexDirection="column" gap={2} mt={1}>

          <TextField
            label="Email Address"
            name="email"
            type="email"
            required={useFullScreenLayout}
            variant={useFullScreenLayout ? "outlined" : "filled"}
            fullWidth
            value={form.email}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            sx={{
              ...(useFullScreenLayout
                ? {
                    "& .MuiOutlinedInput-root": {
                      height: 56,
                      borderRadius: 2,
                      background: "#ffffff",
                      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: "0 12px 26px rgba(15, 23, 42, 0.10)",
                      },
                      "& fieldset": {
                        borderColor: "rgba(148, 163, 184, 0.8)",
                        borderWidth: "1.2px",
                      },
                      "&:hover fieldset": {
                        borderColor: "#7c3aed",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#2b8c82",
                        borderWidth: "1.6px",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      fontWeight: 600,
                      color: "#475569",
                    },
                    "& .Mui-focused .MuiInputLabel-root": {
                      color: "#2b8c82",
                    },
                  }
                : {
                    "& .MuiFilledInput-root": {
                      borderRadius: 3,
                      bgcolor: "#F7F8FC",
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                      boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.15)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: "#F3F6FB",
                      },
                    },
                    "& .MuiFilledInput-underline:before": {
                      borderBottomColor: "rgba(148,163,184,0.5)",
                    },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#4F46E5",
                    },
                  })
            }}
          />

          <TextField
            label="Password"
            name="password"
            required={useFullScreenLayout}
            variant={useFullScreenLayout ? "outlined" : "filled"}
            type={showPassword ? "text" : "password"}
            fullWidth
            value={form.password}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{
                      color: "#475569",
                      "&:hover": { backgroundColor: "rgba(124, 58, 237, 0.08)" },
                    }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              ...(useFullScreenLayout
                ? {
                    "& .MuiOutlinedInput-root": {
                      height: 56,
                      borderRadius: 2,
                      background: "#ffffff",
                      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: "0 12px 26px rgba(15, 23, 42, 0.10)",
                      },
                      "& fieldset": {
                        borderColor: "rgba(148, 163, 184, 0.8)",
                        borderWidth: "1.2px",
                      },
                      "&:hover fieldset": {
                        borderColor: "#7c3aed",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#2b8c82",
                        borderWidth: "1.6px",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      fontWeight: 600,
                      color: "#475569",
                    },
                    "& .Mui-focused .MuiInputLabel-root": {
                      color: "#2b8c82",
                    },
                  }
                : {
                    "& .MuiFilledInput-root": {
                      borderRadius: 3,
                      bgcolor: "#F7F8FC",
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                      boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.15)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: "#F3F6FB",
                      },
                    },
                    "& .MuiFilledInput-underline:before": {
                      borderBottomColor: "rgba(148,163,184,0.5)",
                    },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#4F46E5",
                    },
                  })
            }}
          />

          {showForgotPassword && (
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
          )}
        </Box>

        {showSignup && (
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
        )}

        {showSignup && (
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
        )}

        {useFullScreenLayout ? (
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            onClick={handleSubmit}
            sx={{
              mt: 5,
              py: 1.5,
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 700,
              fontSize: 16,
              background: "#2b8c82",
              color: "#050505",
              boxShadow: "none",
              transition: ".25s",
              "&:hover": { transform: "translateY(-2px)", background: "#23786f", boxShadow: "none" },
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Login"}
          </Button>
        ) : null}

      </DialogContent>

      <DialogActions sx={{ display: useFullScreenLayout ? "none" : "flex", gridColumn: useFullScreenLayout ? { xs: "1", md: "2" } : undefined, gridRow: useFullScreenLayout ? { xs: "5", md: "3" } : undefined, alignSelf: "start", px: useFullScreenLayout ? { xs: 3, sm: 5, md: 4 } : 4, pb: useFullScreenLayout ? { xs: 3, md: 4 } : 4 }}>
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
            background: useFullScreenLayout ? "#2b8c82" : "linear-gradient(90deg,#4F46E5,#7C3AED,#EC4899)",
            color: useFullScreenLayout ? "#050505" : "white",
            boxShadow: useFullScreenLayout ? "none" : "0 10px 25px rgba(79,70,229,.35)",
            transition: ".25s",

            "&:hover": {
              transform: "translateY(-2px)",
              background: useFullScreenLayout ? "#23786f" : "linear-gradient(90deg,#4F46E5,#7C3AED,#EC4899)",
              boxShadow: useFullScreenLayout ? "none" : "0 15px 35px rgba(79,70,229,.45)",
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

      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10, 14, 26, 0.5)",
            backdropFilter: "blur(4px)",
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
              minWidth: { xs: 200, sm: 260 },
              borderRadius: 4,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 28px 80px rgba(0,0,0,0.22)",
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
              }}
            >
              Signing you in...
            </Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default LoginModal;