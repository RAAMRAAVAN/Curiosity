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
  customRolePermissions = [],
  userName,
  customRoleName,
}) => {
  const pathname = usePathname();

  const normalizedPermissions = Array.isArray(permissions)
    ? permissions.map((item) => String(item || '').toLowerCase())
    : [];
  const normalizedCustomRolePermissions = Array.isArray(customRolePermissions)
    ? customRolePermissions.map((item) => String(item || '').toLowerCase())
    : [];
  const allPermissions = Array.from(new Set([...normalizedPermissions, ...normalizedCustomRolePermissions]));

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (String(role || '').toUpperCase() === 'ADMIN') return true;

    if (allPermissions.includes('*')) return true;
    if (allPermissions.includes(permission)) return true;

    return allPermissions.some((item) => {
      if (item === '*') return true;
      if (item === permission) return true;
      if (item.endsWith('.*') && permission.startsWith(`${item.slice(0, -2)}.`)) return true;
      if (permission.endsWith('.*') && item.startsWith(`${permission.slice(0, -2)}.`)) return true;
      return false;
    });
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

  const visibleMenuItems = menuItems.filter((item) => hasPermission(item.permission));

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
        <Box
          sx={{
            mx: 1,
            mb: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            backgroundColor: "#f3f7ff",
            border: "1px solid rgba(25, 118, 210, 0.12)",
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {userName || "User"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {customRoleName || role || "No custom role"}
          </Typography>
        </Box>

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