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
import {
  setAuthUser,
  clearAuthUser,
} from "@/redux/features/authSlice";
import ComingSoon from "../../ComingSoon";

const pages = [
  "Entrance Exam",
  "School Exams",
  "Curiosity App",
  "Features",
];

const NavBar = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const loggedIn = useSelector((state) => state.auth.loggedIn);
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const pathname = usePathname();
  const [anchorElNav, setAnchorElNav] = useState(null);
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

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  return (
    <AppBar position="static" elevation={1} sx={{ backgroundColor: 'white' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Desktop Logo */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              flex: 1,
              marginLeft: 5
            }}
          >
            <School sx={{ mr: 1, color: 'black' }} />

            <Typography
              variant="h6"
              component="a"
              href="/"
              sx={{
                fontWeight: 700,
                letterSpacing: ".2rem",
                color: "black",
                textDecoration: "none",
              }}
            >
              Curiosity
            </Typography>
          </Box>

          {/* Mobile Menu */}
          {!loggedIn ? (
            <>
              <MenuItem
                onClick={() => {
                  handleCloseNavMenu();
                  setOpenLogin(true);
                }}
              >
                Login
              </MenuItem>

              <MenuItem
                onClick={() => {
                  handleCloseNavMenu();
                  setOpenSignup(true);
                }}
              >
                Sign Up
              </MenuItem>
            </>
          ) : (
            <MenuItem
              onClick={() => {
                handleCloseNavMenu();
                handleLogout();
              }}
            >
              Logout
            </MenuItem>
          )}

          {/* Mobile Logo */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              justifyContent: "center",
              flex: 1,

            }}
          >
            <School sx={{ mr: 1 }} />

            <Typography
              variant="h6"
              component="a"
              href="/"
              sx={{
                fontWeight: 700,
                letterSpacing: ".2rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              Curiosity
            </Typography>
          </Box>

          {/* Center Navigation */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              alignItems: "center",
              flex: 2,
              gap: 2,

            }}
          >
            {pages.map((page) => (
              <Button
                key={page}
                sx={{
                  color: "black",
                  textTransform: "none",
                  fontWeight: 'bold'
                }}
                onClick={()=>{setOpen(!open)}}
              >
                {page}
              </Button>
            ))}
          </Box>

          {/* Right Buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              flex: 1,
              gap: 1,
            }}
          >
            {!loggedIn ? (
              <>
                <Button
                  sx={{
                    color: "black",
                    textTransform: "none",
                  }}
                  onClick={() => setOpenLogin(true)}
                >
                  Login
                </Button>

                <Button
                  variant="contained"
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    color: "white",
                    backgroundColor: "black",
                  }}
                  onClick={() => setOpenSignup(true)}
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                color="error"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                }}
                onClick={handleLogout}
              >
                Logout
              </Button>
            )}
          </Box>
          <SignupModal
            open={openSignup}
            onClose={() => setOpenSignup(false)}
            onLoginClick={() => {
              setOpenSignup(false);
              setOpenLogin(true);
            }}
          />
          <LoginModal
            open={openLogin}
            onClose={() => setOpenLogin(false)}
            onSignupClick={() => {
              setOpenLogin(false);
              setOpenSignup(true);
            }}
          />
        </Toolbar>
      </Container>
      <ComingSoon open={open} handleClose={handleClose}/>
    </AppBar>
  );
};

export default NavBar;