'use client';

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

import {
  Menu,
  People,
  Person,
  School,
  SchoolOutlined,
  Assessment,
  Apartment,
  Logout,
  Security,
  LockReset,
  EventAvailable,
  ExpandLess,
  ExpandMore,
  Checklist,
  FactCheck,
  AssignmentTurnedIn,
  Summarize,
} from "@mui/icons-material";

const drawerWidth = 320;
const mobileDrawerWidth = "90vw";

const AdminDrawer = ({
  drawerOpen,
  adminView,
  setAdminView,
  setDrawerOpen,
  role,
  permissions = [],
  customRolePermissions = [],
  userName,
  centerName,
  customRoleName,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const normalizedPermissions = Array.isArray(permissions)
    ? permissions.map((item) => String(item || '').toLowerCase())
    : [];
  const normalizedCustomRolePermissions = Array.isArray(customRolePermissions)
    ? customRolePermissions.map((item) => String(item || '').toLowerCase())
    : [];
  const allPermissions = Array.from(new Set([...normalizedPermissions, ...normalizedCustomRolePermissions]));
  const panelRole = customRoleName || role || "Admin";
  const isAdminUser = String(role || '').toUpperCase() === 'ADMIN';

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (isAdminUser) return true;

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

  const routeMap = {
    users: '/admin/users',
    classes: '/admin/classes',
    teachers: '/admin/teachers',
    centers: '/admin/centers',
    students: '/admin/students',
    attendance: '/admin/attendance',
    roles: '/admin/roles',
    'reset-password': '/admin/reset-password',
    assessments: '/admin/view_assessments',
    'assessments-3-16': '/admin/assessments-3-16',
    results: '/admin/assessment-results',
    'results-3-16': '/admin/assessment-results-3-16',
  };

  const assessmentSubmenuItems = [
    {
      title: "View Assessment - A",
      value: "assessments",
      icon: <Checklist />,
      permission: 'assessments.view',
    },
    {
      title: "View Assessment - B",
      value: "assessments-3-16",
      icon: <AssignmentTurnedIn />,
      permission: 'assessments316.view',
    },
    {
      title: "Assessment Results - A",
      value: "results",
      icon: <FactCheck />,
      permission: 'results.view',
    },
    {
      title: "Assessment Results - B",
      value: "results-3-16",
      icon: <Summarize />,
      permission: 'results.view',
    },
  ];

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
      title: "Attendance",
      value: "attendance",
      icon: <EventAvailable />,
      permission: 'attendance.view',
    },
    {
      title: 'Manage Roles',
      value: 'roles',
      icon: <Security />,
      permission: 'roles.view',
    },
    {
      title: "Reset Password",
      value: "reset-password",
      icon: <LockReset />,
      permission: null,
    },
  ];

  const visibleAssessmentItems = assessmentSubmenuItems.filter((item) => hasPermission(item.permission));
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });
  const shouldShowAssessmentModule = visibleAssessmentItems.length > 0;
  const isAssessmentViewActive = visibleAssessmentItems.some((item) => item.value === adminView);
  const isAssessmentRouteActive = typeof pathname === 'string' && (
    pathname === '/admin/view_assessments' ||
    pathname === '/admin/assessments-3-16' ||
    pathname === '/admin/assessment-results' ||
    pathname === '/admin/assessment-results-3-16'
  );
  const [assessmentModuleOpen, setAssessmentModuleOpen] = useState(Boolean(isAssessmentViewActive || isAssessmentRouteActive));

  useEffect(() => {
    if (isAssessmentViewActive || isAssessmentRouteActive) {
      setAssessmentModuleOpen(true);
    }
  }, [adminView, pathname, isAssessmentViewActive, isAssessmentRouteActive]);

  const closeDrawer = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setDrawerOpen(false);
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      closeDrawer();
    }
  };

  const handleAssessmentNavigation = (value) => {
    const targetRoute = routeMap[value];

    if (targetRoute) {
      if (targetRoute !== pathname) {
        router.push(targetRoute, { scroll: false });
      }
      if (isMobile) {
        closeDrawer();
      }
      return;
    }

    setAdminView(value);
    handleMenuItemClick();
  };

  const handleMenuNavigation = (value) => {
    const targetRoute = routeMap[value];

    if (targetRoute) {
      if (targetRoute !== pathname) {
        router.push(targetRoute, { scroll: false });
      }
      if (isMobile) {
        closeDrawer();
      }
      return;
    }

    setAdminView(value);
    handleMenuItemClick();
  };

  return (
    <Drawer
      variant={isMobile ? "temporary" : "persistent"}
      open={drawerOpen}
      onClose={closeDrawer}
      sx={{
        width: isMobile ? mobileDrawerWidth : drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isMobile ? mobileDrawerWidth : drawerWidth,
          boxSizing: "border-box",
          marginTop: { xs: 0, md: 0 },
          backgroundColor: "#082b57",
          backgroundImage: "conic-gradient(from 30deg at 25% 25%, rgba(22,78,126,0.2) 0deg 60deg, rgba(2,23,49,0.24) 60deg 120deg, transparent 120deg 180deg, rgba(12,56,101,0.18) 180deg 240deg, transparent 240deg 360deg), conic-gradient(from 210deg at 75% 75%, rgba(35,98,145,0.13) 0deg 60deg, transparent 60deg 180deg, rgba(1,19,44,0.28) 180deg 240deg, transparent 240deg 360deg), linear-gradient(135deg, rgba(17,68,113,0.15) 0% 24%, transparent 24% 48%, rgba(2,27,58,0.26) 48% 72%, transparent 72%), linear-gradient(180deg, #041832 0%, #062a4a 52%, #083d63 100%)",
          backgroundSize: "150px 150px, 180px 180px, 210px 210px, 100% 100%",
          color: "#ffffff",
        },
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
        py={2}
        sx={{ color: "#ffffff" }}
      >
        <Typography fontWeight={700} fontSize={16} sx={{ color: "#ffffff" }}>
          {panelRole}'s Panel
        </Typography>

        <IconButton onClick={closeDrawer} sx={{ color: "#ffffff" }}>
          <Menu />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.18)" }} />

      <List>
        {visibleMenuItems.map((item) => (
          <ListItem key={item.value} disablePadding>
            <ListItemButton
              selected={adminView === item.value}
              onClick={() => handleMenuNavigation(item.value)}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: 2,
                color: "#ffffff",

                "&.Mui-selected": {
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                },

                "&.Mui-selected:hover": {
                  bgcolor: "rgba(255,255,255,0.18)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: "#ffffff",
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
                  color: "#ffffff",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}

        {shouldShowAssessmentModule ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => setAssessmentModuleOpen((prev) => !prev)}
                sx={{
                  mx: 1,
                  my: 0.25,
                  borderRadius: 2,
                  color: "#ffffff",
                  bgcolor: visibleAssessmentItems.some((item) => item.value === adminView) ? "rgba(255,255,255,0.08)" : "transparent",
                }}
              >
                <ListItemIcon sx={{ minWidth: 42, color: "#ffffff" }}>
                  <Assessment />
                </ListItemIcon>
                <ListItemText primary="Assessment module" primaryTypographyProps={{ fontSize: 14, fontWeight: 400, color: "#ffffff" }} />
                {assessmentModuleOpen ? <ExpandLess sx={{ color: "#ffffff" }} /> : <ExpandMore sx={{ color: "#ffffff" }} />}
              </ListItemButton>
            </ListItem>

            {assessmentModuleOpen ? (
              <Box sx={{ pl: 3, pr: 1, pb: 0.5 }}>
                {visibleAssessmentItems.map((item) => (
                  <ListItem key={item.value} disablePadding>
                    <ListItemButton
                      selected={adminView === item.value}
                      onClick={() => handleAssessmentNavigation(item.value)}
                      sx={{
                        mx: 0,
                        my: 0.25,
                        borderRadius: 2,
                        pl: 2,
                        color: "#ffffff",
                        "&.Mui-selected": {
                          bgcolor: "rgba(255,255,255,0.12)",
                          color: "#ffffff",
                        },
                        "&.Mui-selected:hover": {
                          bgcolor: "rgba(255,255,255,0.18)",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 24, color: "#ffffff" }}>
                        <Box
                          component="span"
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "#ffffff",
                            display: "inline-block",
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{
                          fontSize: 13,
                          fontWeight: adminView === item.value ? 600 : 400,
                          color: "#ffffff",
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </Box>
            ) : null}
          </>
        ) : null}
      </List>

      <Box sx={{ mt: "auto", p: 2 }}>
        <Box
          sx={{
            mx: 1,
            mb: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3, color: "#ffffff" }}>
            {userName || "User"}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.25, color: "rgba(255,255,255,0.8)" }}>
            <Box component="span" fontWeight={700}>Role:</Box> {customRoleName || role || "No custom role"}
          </Typography>
          {String(role || '').toUpperCase() === 'TEACHER' ? (
            <Typography variant="caption" sx={{ display: "block", mt: 0.25, color: "rgba(255,255,255,0.8)" }}>
              <Box component="span" fontWeight={700}>Centre:</Box> {centerName || "No center assigned"}
            </Typography>
          ) : null}
        </Box>

        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              sessionStorage.removeItem("authDetails");
              document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = "/";
            }}
            sx={{ mx: 1, borderRadius: 2, color: "#ffffff" }}
          >
            <ListItemIcon sx={{ minWidth: 42, color: "#ffffff" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ color: "#ffffff" }} />
          </ListItemButton>
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default AdminDrawer;