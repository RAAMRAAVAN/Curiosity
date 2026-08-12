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
  Security,
} from "@mui/icons-material";

const drawerWidth = 260;

const AdminDrawer = ({
  drawerOpen,
  adminView,
  setAdminView,
  setDrawerOpen,
  role,
  permissions = [],
}) => {
  const pathname = usePathname();

  const isTeacherRole = String(role || "").toUpperCase() === "TEACHER";
  const normalizedPermissions = Array.isArray(permissions)
    ? permissions.map((item) => String(item || '').toLowerCase())
    : [];

  const hasPermission = (permission) => {
    if (String(role || '').toUpperCase() === 'ADMIN') return true;
    if (!permission) return true;
    return normalizedPermissions.includes('*')
      || normalizedPermissions.includes(permission)
      || normalizedPermissions.some((item) => item.endsWith('.*') && permission.startsWith(`${item.slice(0, -2)}.`));
  };

  const menuItems = [
    {
      title: "Manage Users",
      value: "users",
      icon: <People />,
      permission: 'users.view',
    },
    {
      title: "Manage Classes",
      value: "classes",
      icon: <School />,
      permission: 'classes.view',
    },
    {
      title: "Manage Teachers",
      value: "teachers",
      icon: <Person />,
      permission: 'teachers.view',
    },
    {
      title: "Manage Centers",
      value: "centers",
      icon: <Apartment />,
      permission: 'centers.view',
    },
    {
      title: "Manage Students",
      value: "students",
      icon: <SchoolOutlined />,
      permission: 'students.view',
    },
    {
      title: 'Manage Roles',
      value: 'roles',
      icon: <Security />,
      permission: 'roles.view',
    },
    {
      title: "Assessment Results",
      value: "results",
      icon: <Assessment />,
      permission: 'results.view',
    },
  ];

  const visibleMenuItems = menuItems
    .filter((item) => hasPermission(item.permission))
    .filter((item) => {
      if (!isTeacherRole) return true;
      return ["classes", "teachers", "students", "results"].includes(item.value);
    });

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