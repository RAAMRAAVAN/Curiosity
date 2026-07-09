'use client';

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { Inbox, Mail } from "@mui/icons-material";
import LoginModal from "@/app/(components)/MyProfile/LoginModal";
import Logout from "@/app/(components)/MyProfile/Logout";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const classSlug = params?.classSlug as string | undefined;
  const [openLogin, setOpenLogin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAuth = () => {
      const auth = sessionStorage.getItem("authDetails");
      if (!auth) {
        setOpenLogin(true);
        return false;
      }

      const parsed = JSON.parse(auth);
      if (!parsed?.loggedIn) {
        setOpenLogin(true);
        return false;
      }

      return true;
    };

    checkAuth();

    const intervalId = window.setInterval(() => {
      if (!checkAuth()) {
        setOpenLogin(true);
      }
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const pages = [
    { page: "Home", link: `/courses/${classSlug}/home` },
    { page: "Explore Courses", link: `/courses/${classSlug}/ExploreCources` },
    { page: "My Unattempted Tests", link: `/courses/${classSlug}/tests` },
  ];

  const pages2 = [
    { page: "Pricing Plans", link: `/courses/${classSlug}/home` },
    { page: "Curiosity Store", link: `/courses/${classSlug}/home` },
    { page: "Emoney", link: `/courses/${classSlug}/home` },
    { page: "Upgrade to Infinity", link: `/courses/${classSlug}/home` },
  ];

  return (
    <Box display="flex" width="100vw">
      <Box width="25.7%">
        <Box
          sx={{
            width: 260,
            height: "100vh",
            borderRight: "1px solid #e0e0e0",
            bgcolor: "#fff",
            position: "fixed",
            left: 0,
            top: 0,
          }}
        >
          <Box px={3} pt={3} pb={2}>
            <Typography
              component={Link}
              href="/"
              fontWeight="bold"
              fontSize={24}
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              Curiosity
            </Typography>
          </Box>

          <List>
            {pages.map((item, index) => (
              <ListItem key={item.page} disablePadding>
                <ListItemButton
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
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider />

          <List>
            {pages2.map((item, index) => (
              <ListItem key={item.page} disablePadding>
                <ListItemButton component={Link} href={item.link}>
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
      </Box>

      <Box width="100%" display="flex" position="relative">
        {children}
        <Box position="absolute" top={40} right={20}>
          <Logout />
        </Box>
      </Box>
      <LoginModal open={openLogin} onClose={() => setOpenLogin(false)} onSignupClick={() => setOpenLogin(false)} />
    </Box>
  );
}
