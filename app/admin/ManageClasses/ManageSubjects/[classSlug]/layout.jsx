'use client';

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import { Inbox, Mail } from "@mui/icons-material";
import LoginModal from "@/app/(components)/MyProfile/LoginModal";
import SignupModal from "@/app/(components)/MyProfile/SignupModal";
import Logout from "@/app/(components)/MyProfile/Logout";
import { clearAuthUser } from "@/redux/features/authSlice";

export default function Layout({ children }) {
  const pathname = usePathname();
  const params = useParams();
  const classSlug = params?.classSlug;
  const [openLogin, setOpenLogin] = useState(false);
  const [openSignup, setOpenSignup] = useState(false);
  const [authDetails, setAuthDetails] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
  };

  const toggleCollapse = () => setCollapsed((c) => !c);

  const handleSignInClick = () => {
    setOpenSignup(false);
    setOpenLogin(true);
    setDrawerOpen(false);
  };

  const handleSignUpClick = () => {
    setOpenLogin(false);
    setOpenSignup(true);
    setDrawerOpen(false);
  };

  const refreshAuthDetails = () => {
    if (typeof window === "undefined") return;
    const auth = sessionStorage.getItem("authDetails");
    if (!auth) {
      setAuthDetails(null);
      return;
    }

    try {
      setAuthDetails(JSON.parse(auth));
    } catch {
      setAuthDetails(null);
    }
  };

  const isLoggedIn = Boolean(authDetails?.loggedIn);

  const handleLogoutClick = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (res.ok) {
        dispatch(clearAuthUser());
        sessionStorage.removeItem("authDetails");
        sessionStorage.clear();
        setAuthDetails(null);
        router.push("/");
      }
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    refreshAuthDetails();

    const handleStorage = (event) => {
      if (event.key === "authDetails") {
        refreshAuthDetails();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const pages = [
    { page: "View Subjects", link: `/admin/ManageClasses/ManageSubjects/${classSlug}/home`, disabled: true },
    { page: "Explore More Courses", link: `/admin/ManageClasses/ManageSubjects/${classSlug}/ExploreCources`, disabled: true },
    { page: "My Unattempted Tests", link: `/admin/ManageClasses/ManageSubjects/${classSlug}/tests`, disabled: false },
  ];

  const pages2 = [
    { page: "Pricing Plans", link: `/courses/${classSlug}/home`, disabled: false },
    { page: "Curiosity Store", link: `/courses/${classSlug}/home`, disabled: false },
    { page: "Emoney", link: `/courses/${classSlug}/home`, disabled: false },
    { page: "Upgrade to Infinity", link: `/courses/${classSlug}/home`, disabled: false },
  ];

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      {!isMdUp && (
        <Box sx={{ position: "fixed", top: 16, left: 16, zIndex: theme.zIndex.drawer + 10 }}>
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              bgcolor: "background.paper",
              width: 46,
              height: 46,
            }}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      )}

      <Drawer
        anchor="left"
        open={isMdUp ? true : drawerOpen}
        variant={isMdUp ? "permanent" : "temporary"}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: collapsed ? 80 : 260,
            bgcolor: "#fff",
            borderRight: "1px solid #e0e0e0",
            top: 0,
            height: "100%",
            transition: "width 200ms ease",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
          <Box px={3} pt={3} pb={2} display="flex" alignItems="center" justifyContent={collapsed ? "center" : "space-between"}>
            <Typography
              component={Link}
              href="/admin"
              fontWeight="bold"
              fontSize={{ xs: 16, sm: 18 }}
              display={collapsed ? "none" : "flex"}
              width="100%"
              marginLeft={{ xs:5, sm: 5, md:5, lg:0 }}
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              Curiosity Admin
            </Typography>

            {isMdUp && (
              <IconButton size="small" onClick={toggleCollapse} aria-label={collapsed ? "Expand" : "Compress"}>
                <ChevronLeftIcon sx={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
              </IconButton>
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <List>
              {pages.map((item, index) => (
                <ListItem key={item.page} disablePadding>
                  <ListItemButton
                    disabled={!item.disabled}
                    component={Link}
                    href={item.link}
                    selected={pathname === item.link}
                    sx={{
                      "&.Mui-selected": {
                        bgcolor: "#E3F2FD",
                        color: "primary.main",
                      },
                      "&.Mui-selected:hover": {
                        bgcolor: "#BBDEFB",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: pathname === item.link ? "primary.main" : "inherit",
                      }}
                    >
                      {index % 2 === 0 ? <Inbox /> : <Mail />}
                    </ListItemIcon>

                    <ListItemText
                      primary={item.page}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: pathname === item.link ? 600 : 400,
                      }}
                      sx={{ display: collapsed ? "none" : "block" }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Divider />

            <List>
              {pages2.map((item, index) => (
                <ListItem key={item.page} disablePadding>
                  <ListItemButton component={Link} href={item.link} disabled={!item.disabled}>
                    <ListItemIcon>
                      {index % 2 === 0 ? <Inbox /> : <Mail />}
                    </ListItemIcon>

                    <ListItemText
                      primary={item.page}
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          <Box sx={{ px: 1, pb: 2 }}>
            <Divider />
            <List>
              {isLoggedIn ? (
                <>
                  <ListItem disablePadding>
                    <ListItemButton disabled>
                      <ListItemIcon>
                        <AccountCircleIcon />
                      </ListItemIcon>
                      <ListItemText primary="Profile" primaryTypographyProps={{ fontSize: 14 }} />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton disabled>
                      <ListItemIcon>
                        <SettingsIcon />
                      </ListItemIcon>
                      <ListItemText primary="My Account" primaryTypographyProps={{ fontSize: 14 }} />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleLogoutClick}>
                      <ListItemIcon>
                        <LogoutIcon />
                      </ListItemIcon>
                      <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 14 }} />
                    </ListItemButton>
                  </ListItem>
                </>
              ) : (
                <>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleSignInClick}>
                      <ListItemIcon>
                        <AccountCircleIcon />
                      </ListItemIcon>
                      <ListItemText primary="Sign In" primaryTypographyProps={{ fontSize: 14 }} />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleSignUpClick}>
                      <ListItemIcon>
                        <PersonAddIcon />
                      </ListItemIcon>
                      <ListItemText primary="Sign Up" primaryTypographyProps={{ fontSize: 14 }} />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </List>
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          ml: isMdUp ? (collapsed ? "80px" : "260px") : 0,
          pt: isMdUp ? 0 : 8,
          px: { xs: 2, sm: 3, md: 4 },
          pb: 4,
          minHeight: "100vh",
        }}
      >
        {children}
        <Box position="fixed" top={40} right={20} sx={{ display: { xs: "none", lg: "block" } }}>
          <Logout />
        </Box>
      </Box>

      <LoginModal
        open={openLogin}
        onClose={() => setOpenLogin(false)}
        onSignupClick={handleSignUpClick}
      />
      <SignupModal
        open={openSignup}
        onClose={() => setOpenSignup(false)}
        onLoginClick={handleSignInClick}
      />
    </Box>
  );
}
