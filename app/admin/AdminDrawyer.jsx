'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@mui/material";

import {
  Menu,
  People,
  School,
  Person,
  Assessment,
  Apartment,
  SchoolOutlined,
  Logout,
} from "@mui/icons-material";

const drawerWidth = 260;

const AdminDrawer = ({
  drawerOpen,
  adminView,
  setAdminView,
  setDrawerOpen,
  role,
}) => {
  const pathname = usePathname();

  const isTeacherRole = String(role || "").toUpperCase() === "TEACHER";

  const menuItems = [
    {
      title: "Manage Users",
      value: "users",
      icon: <People />,
    },
    {
      title: "Manage Classes",
      value: "classes",
      icon: <School />,
    },
    {
      title: "Manage Teachers",
      value: "teachers",
      icon: <Person />,
    },
    {
      title: "Manage Centers",
      value: "centers",
      icon: <Apartment />,
    },
    {
      title: "Manage Students",
      value: "students",
      icon: <SchoolOutlined />,
    },
    {
      title: "Assessment Results",
      value: "results",
      icon: <Assessment />,
    },
  ];

  const visibleMenuItems = isTeacherRole
    ? menuItems.filter((item) => ["classes", "teachers", "students", "results"].includes(item.value))
    : menuItems;

  return (
    <Drawer
      variant="persistent"
      open={drawerOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
        py={2}
      >
        <Typography fontWeight={700} fontSize={20}>
          Admin Panel
        </Typography>

        <IconButton onClick={() => setDrawerOpen(false)}>
          <Menu />
        </IconButton>
      </Box>

      <Divider />

      <List>
        {visibleMenuItems.map((item) => (
          <ListItem key={item.value} disablePadding>
            <ListItemButton
              selected={adminView === item.value}
              onClick={() => setAdminView(item.value)}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 2,

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
                  color:
                    adminView === item.value
                      ? "primary.main"
                      : "text.secondary",
                  minWidth: 42,
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.title}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight:
                    adminView === item.value ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: "auto", p: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              sessionStorage.removeItem("authDetails");
              document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = "/";
            }}
            sx={{ mx: 1, borderRadius: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 42, color: "text.secondary" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default AdminDrawer;