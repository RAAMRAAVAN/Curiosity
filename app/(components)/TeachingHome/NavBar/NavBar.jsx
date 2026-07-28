import React, { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import { School } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import SignupModal from "@/app/(components)/MyProfile/SignupModal";
import LoginModal from "@/app/(components)/MyProfile/LoginModal";
// import { setAuthUser } from "@/redux/features/authSlice";
import { useSelector } from "react-redux";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";
import {
  setAuthUser,
  clearAuthUser,
} from "@/redux/features/authSlice";
import ComingSoon from "../../ComingSoon";
import {
  // School,
  Close,
  ChevronRight,
  MenuBook,
  Quiz,
  Psychology,
  AutoAwesome,
} from "@mui/icons-material";

const pages = [
  {
    title: "Entrance Exam",
    icon: <Quiz />,
  },
  {
    title: "School Exams",
    icon: <MenuBook />,
  },
  {
    title: "Curiosity App",
    icon: <Psychology />,
  },
  {
    title: "Features",
    icon: <AutoAwesome />,
  },
];

const NavBar = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const loggedIn = useSelector((state) => state.auth.loggedIn);
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const pathname = usePathname();
  // const [anchorElNav, setAnchorElNav] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openSignup, setOpenSignup] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);

  const handleClose = () => {
    setOpen(false);
  }
  const handleLogout = () => {
    sessionStorage.removeItem("authDetails");
    dispatch(clearAuthUser());
    router.refresh(); // refresh current page
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const auth = sessionStorage.getItem("authDetails");

    if (!auth) {
      dispatch(clearAuthUser());
      return;
    }

    try {
      const parsed = JSON.parse(auth);

      if (parsed?.loggedIn && parsed?.user) {
        dispatch(setAuthUser(parsed.user));
      } else {
        dispatch(clearAuthUser());
      }
    } catch (err) {
      dispatch(clearAuthUser());
    }
  }, [dispatch]);

  const handleOpenNavMenu = () => {
    setMobileDrawerOpen(true);
  };

  const handleCloseNavMenu = () => {
    setMobileDrawerOpen(false);
  };

  const handleLoginClick = () => {
    setMobileDrawerOpen(false);

    setTimeout(() => {
      setOpenLogin(true);
    }, 250);
  };

  const handleSignupClick = () => {
    setMobileDrawerOpen(false);

    setTimeout(() => {
      setOpenSignup(true);
    }, 250);
  };

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        bgcolor: "white",
        color: "black",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ py: 1 }}>
          {/* Mobile Menu Button */}
          {/* Mobile Menu Button */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
            }}
          >
            <IconButton onClick={handleOpenNavMenu}>
              <MenuIcon sx={{ color: "black" }} />
            </IconButton>
          </Box>

          <Drawer
            anchor="left"
            open={mobileDrawerOpen}
            onClose={handleCloseNavMenu}
            PaperProps={{
              sx: {
                width: "100%",
                bgcolor: "#F8FAFC",
              },
            }}
          >
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}

              <Box
                sx={{
                  background:
                    "linear-gradient(135deg,#111827 0%,#1E293B 60%,#2563EB 100%)",
                  color: "#fff",
                  borderBottomLeftRadius: 30,
                  borderBottomRightRadius: 30,
                  px: 3,
                  py: 4,
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center">
                    <Box
                      sx={{
                        bgcolor: "rgba(255,255,255,.15)",
                        p: 1,
                        borderRadius: 3,
                        mr: 2,
                      }}
                    >
                      <School sx={{ fontSize: 34 }} />
                    </Box>

                    <Box>
                      <Typography
                        fontWeight={800}
                        fontSize={28}
                        letterSpacing={0.5}
                      >
                        Curiosity
                      </Typography>

                      <Typography
                        fontSize={13}
                        sx={{
                          opacity: .8,
                        }}
                      >
                        Learn without limits
                      </Typography>
                    </Box>
                  </Box>

                  <IconButton
                    onClick={handleCloseNavMenu}
                    sx={{
                      bgcolor: "rgba(255,255,255,.12)",
                      color: "#fff",
                    }}
                  >
                    <Close />
                  </IconButton>
                </Box>
              </Box>

              {/* Navigation */}

              <Box
                sx={{
                  flex: 1,
                  px: 2,
                  py: 4,
                }}
              >
                {pages.map((page) => (
                  <Box
                    key={page.title}
                    onClick={() => {
                      handleCloseNavMenu();
                      setOpen(true);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: "#fff",
                      p: 2,
                      mb: 2,
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: ".25s",
                      boxShadow: "0 6px 18px rgba(0,0,0,.05)",

                      "&:hover": {
                        transform: "translateX(8px)",
                        boxShadow: "0 10px 28px rgba(37,99,235,.18)",
                      },
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          bgcolor: "#EEF4FF",
                          color: "#2563EB",
                          borderRadius: 3,
                          p: 1.3,
                          mr: 2,
                        }}
                      >
                        {page.icon}
                      </Box>

                      <Typography
                        fontWeight={700}
                        fontSize={18}
                      >
                        {page.title}
                      </Typography>
                    </Box>

                    <ChevronRight
                      sx={{
                        color: "#94A3B8",
                      }}
                    />
                  </Box>
                ))}
              </Box>

              {/* Bottom Buttons */}

              <Box
                sx={{
                  p: 3,
                  borderTop: "1px solid #E5E7EB",
                  bgcolor: "#fff",
                }}
              >
                {!loggedIn ? (
                  <>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleLoginClick}
                      sx={{
                        height: 52,
                        borderRadius: 3,
                        mb: 2,
                        textTransform: "none",
                        fontWeight: 700,
                        borderWidth: 2,
                      }}
                    >
                      Login
                    </Button>

                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSignupClick}
                      sx={{
                        height: 56,
                        borderRadius: 3,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: 16,
                        background:
                          "linear-gradient(135deg,#2563EB,#3B82F6)",

                        boxShadow:
                          "0 12px 30px rgba(37,99,235,.35)",

                        "&:hover": {
                          background:
                            "linear-gradient(135deg,#1D4ED8,#2563EB)",
                        },
                      }}
                    >
                      Create Free Account
                    </Button>
                  </>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    onClick={() => {
                      handleCloseNavMenu();
                      handleLogout();
                    }}
                    sx={{
                      height: 56,
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    Logout
                  </Button>
                )}
              </Box>
            </Box>
          </Drawer>

          {/* Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: { xs: 1, md: 0 },
              mr: { md: 5 },
            }}
          >
            <School sx={{ mr: 1, color: "black" }} />

            <Typography
              component="a"
              href="/"
              sx={{
                fontWeight: 700,
                letterSpacing: ".15rem",
                color: "black",
                textDecoration: "none",
                fontSize: {
                  xs: "1rem",
                  sm: "1.2rem",
                  md: "1.4rem",
                },
              }}
            >
              Curiosity
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexGrow: 1,
              justifyContent: "center",
              gap: {
                md: 1,
                lg: 2,
              },
            }}
          >
            {pages.map((page) => (
              <Button
                key={page.title}
                onClick={() => setOpen(true)}
                startIcon={page.icon}
                sx={{
                  color: "black",
                  textTransform: "none",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  px: {
                    md: 1,
                    lg: 2,
                  },
                  fontSize: {
                    md: "0.9rem",
                    lg: "1rem",
                  },
                }}
              >
                {page.title}
              </Button>
            ))}
          </Box>

          {/* Desktop Right Buttons */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 1,
            }}
          >
            {!loggedIn ? (
              <>
                <Button
                  onClick={() => setOpenLogin(true)}
                  sx={{
                    color: "black",
                    textTransform: "none",
                  }}
                >
                  Login
                </Button>

                <Button
                  variant="contained"
                  onClick={() => setOpenSignup(true)}
                  sx={{
                    bgcolor: "black",
                    color: "white",
                    textTransform: "none",
                    borderRadius: 2,
                    px: 3,
                    "&:hover": {
                      bgcolor: "#222",
                    },
                  }}
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={handleLogout}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                }}
              >
                Logout
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
      <ComingSoon open={open} handleClose={handleClose} />

      <LoginModal
        open={openLogin}
        onClose={() => setOpenLogin(false)}
        onSignupClick={() => {
          setOpenLogin(false);
          setOpenSignup(true);
        }}
      />

      <SignupModal
        open={openSignup}
        onClose={() => setOpenSignup(false)}
        onLoginClick={() => {
          setOpenSignup(false);
          setOpenLogin(true);
        }}
      />
    </AppBar>
  );
};

export default NavBar;