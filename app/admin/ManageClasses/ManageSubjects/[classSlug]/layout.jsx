'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
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
import Logout from "@/app/(components)/MyProfile/Logout";

export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const classSlug = params?.classSlug;
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const auth = sessionStorage.getItem("authDetails");
    if (!auth) {
      router.replace("/admin");
      return;
    }

    try {
      const parsed = JSON.parse(auth);
      if (!parsed?.loggedIn) {
        router.replace("/admin");
        return;
      }
    } catch (error) {
      sessionStorage.removeItem("authDetails");
      router.replace("/admin");
      return;
    }

    setAuthChecked(true);
  }, [router]);

  const pages = [
    { page: "View Subjects", link: `/admin/ManageClasses/ManageSubjects/${classSlug}/home`, disabled: false  },
    { page: "Explore More Courses", link: `/admin/ManageClasses/ManageSubjects/${classSlug}/ExploreCources`, disabled: false },
    { page: "My Unattempted Tests", link: `/admin/ManageClasses/ManageSubjects/${classSlug}/tests`, disabled: true },
  ];

  const pages2 = [
    { page: "Pricing Plans", link: `/courses/${classSlug}/home`, disabled: true },
    { page: "Curiosity Store", link: `/courses/${classSlug}/home`, disabled: true },
    { page: "Emoney", link: `/courses/${classSlug}/home`, disabled: true },
    { page: "Upgrade to Infinity", link: `/courses/${classSlug}/home`, disabled: true },
  ];

  if (!authChecked) {
    return null;
  }

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
              href="/admin"
              fontWeight="bold"
              fontSize={24}
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              Curiosity Admin
            </Typography>
          </Box>

          <List>
            {pages.map((item, index) => (
              <ListItem key={item.page} disablePadding>
                <ListItemButton
                  disabled={item.disabled}
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
                <ListItemButton component={Link} href={item.link} disabled={item.disabled}>
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
    </Box>
  );
}
