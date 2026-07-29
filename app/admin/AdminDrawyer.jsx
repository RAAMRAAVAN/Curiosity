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
} from "@mui/icons-material";

const drawerWidth = 260;

const AdminDrawer = ({
  drawerOpen,
  adminView,
  setAdminView,
  setDrawerOpen,
}) => {
  const pathname = usePathname();

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
      title: "Assessment Results",
      value: "results",
      icon: <Assessment />,
    },
  ];

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
        {menuItems.map((item) => (
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
    </Drawer>
  );
};

export default AdminDrawer;