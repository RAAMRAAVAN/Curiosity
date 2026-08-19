"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AdminDrawyer from "./AdminDrawyer";
import ManageUsersPage from "./ManageUsers/ManageUsers";
import ManageClasses from "./ManageClasses/ManageClasses";
import { Menu } from "@mui/icons-material";
import ManageTeachersPage from "./ManageTeachers/ManageTeachers";
import AssessmentResultsDashboard from "./AssessmentResultsDashboard";
import AdminAssessmentsPage from './AdminAssessmentsPage';
import ManageCenters from "./ManageCenters/ManageCenters";
import ManageStudents from "./ManageStudents/ManageStudents";
import ManageRoles from './ManageRoles/ManageRoles';
import ResetPassword from './ResetPassword';

const hasPermission = (permissions, permission, role) => {
  if (String(role || '').toUpperCase() === 'ADMIN') return true;
  if (!permission) return true;

  const normalized = Array.isArray(permissions)
    ? permissions.map((item) => String(item || '').toLowerCase())
    : [];

  return normalized.includes('*')
    || normalized.includes(permission)
    || normalized.some((item) => item.endsWith('.*') && permission.startsWith(`${item.slice(0, -2)}.`));
};

export default function AdminPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [users, setUsers] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [adminView, setAdminView] = useState("users");
  const [message, setMessage] = useState(null);
  const [hasAnyAdminPermission, setHasAnyAdminPermission] = useState(true);
  const router = useRouter();

  const getCombinedPermissions = (userData) => {
    const direct = Array.isArray(userData?.permissions) ? userData.permissions : [];
    const custom = Array.isArray(userData?.customRole?.permissions) ? userData.customRole.permissions : [];
    return Array.from(new Set([...direct, ...custom]));
  };

  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const response = await fetch("/api/admin/me", {
          credentials: "include",
        });
        const data = await response.json();

        if (data.success) {
          sessionStorage.setItem(
            "authDetails",
            JSON.stringify({
              loggedIn: true,
              user: data.data,
            })
          );

          const combinedPermissions = getCombinedPermissions(data.data);
          setAdmin({ ...data.data, permissions: combinedPermissions });
          setAuthorized(true);
          const availableViews = [
            { key: 'users', allowed: hasPermission(combinedPermissions, 'users.view', data.data?.role) },
            { key: 'classes', allowed: hasPermission(combinedPermissions, 'classes.view', data.data?.role) },
            { key: 'assessments', allowed: hasPermission(combinedPermissions, 'assessments.view', data.data?.role) },
            { key: 'teachers', allowed: hasPermission(combinedPermissions, 'teachers.view', data.data?.role) },
            { key: 'centers', allowed: hasPermission(combinedPermissions, 'centers.view', data.data?.role) },
            { key: 'students', allowed: hasPermission(combinedPermissions, 'students.view', data.data?.role) },
            { key: 'roles', allowed: hasPermission(combinedPermissions, 'roles.view', data.data?.role) },
            { key: 'results', allowed: hasPermission(combinedPermissions, 'results.view', data.data?.role) },
            { key: 'reset-password', allowed: true },
          ];
          const anyPermission = availableViews.some((item) => item.allowed);
          setHasAnyAdminPermission(anyPermission);

          const userRole = String(data.data?.role || '').toUpperCase();
          let defaultView;

          if (userRole === 'MANAGEMENT') {
            // For management users, prioritize Assessment Results
            defaultView =
              availableViews.find((item) => item.key === 'results' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'teachers' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'classes' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'assessments' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'roles' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'centers' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'students' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'users' && item.allowed)?.key ||
              'none';
          } else {
            defaultView =
              availableViews.find((item) => item.key === 'users' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'teachers' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'classes' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'assessments' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'results' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'roles' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'centers' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'students' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'reset-password' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'reset-password' && item.allowed)?.key ||
              'none';
          }

          if (defaultView === 'users') {
            setAdminView('users');
          } else {
            setUsers([]);
            setAdminView(defaultView);
          }
        } else {
          sessionStorage.removeItem("authDetails");
          setAdmin(null);
          setAuthorized(false);
          setMessage("Please sign in from the main site login first.");
        }
      } catch (error) {
        console.error(error);
        sessionStorage.removeItem("authDetails");
        setAdmin(null);
        setAuthorized(false);
        setMessage("Please sign in from the main site login first.");
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const refreshUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setMessage(data.message || "Could not load users.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to fetch users.");
    }
  };

  useEffect(() => {
    if (authorized && adminView === 'users') {
      refreshUsers();
    }
  }, [authorized, adminView]);

  const getAlertSeverity = (text) => {
    if (!text) return "error";
    return /successfully|success/i.test(text) ? "success" : "error";
  };



  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#eef4fb",
          p: 3,
        }}
      >
        <CircularProgress size={64} thickness={4} />
      </Box>
    );
  }

  if (!authorized) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#eef4fb",
          p: 3,
        }}
      >
        <Paper
          sx={{
            width: "100%",
            maxWidth: 520,
            p: 4,
            borderRadius: 4,
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.12)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          <Typography variant="h4" fontWeight={700} mb={1}>
            Admin access
          </Typography>
          <Typography color="text.secondary" mb={3}>
            Please sign in with the main site login using an admin account to access this panel.
          </Typography>
          {message ? (
            <Typography color="error" mb={3}>
              {message}
            </Typography>
          ) : null}
          <Button variant="contained" size="large" fullWidth onClick={() => router.push("/")}>
            Go to home
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f8ff" }}>
      {/* Responsive Header with Menu Button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          backgroundColor: '#fff',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          position: { xs: 'sticky', md: 'relative' },
          top: 0,
          zIndex: 100,
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: { xs: 16, sm: 18, md: 20 },
            flex: 1,
          }}
        >
          Admin Panel
        </Typography>
        {isMobile && (
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ color: 'inherit' }}
          >
            <Menu />
          </IconButton>
        )}
      </Box>

      {/* Drawer */}
      <AdminDrawyer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        adminView={adminView}
        setAdminView={setAdminView}
        role={admin?.role}
        permissions={admin?.permissions || []}
        customRolePermissions={admin?.customRole?.permissions || []}
        userName={admin?.name}
        centerName={admin?.centerName}
        customRoleName={admin?.customRole?.name || admin?.customRoleName || null}
      />

      {/* Main Content */}
      <Box
        sx={{
          ml: { xs: 0, md: drawerOpen ? 30 : 0 },
          transition: 'margin-left 0.3s ease-in-out',
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3, md: 4 },
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: "auto", width: '100%' }}>

        {adminView === 'none' || !hasAnyAdminPermission ? (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>No Permissions Assigned</Typography>
            <Typography color="text.secondary">
              This account does not have any admin permissions yet. Ask an ADMIN to assign a custom role and centers.
            </Typography>
          </Paper>
        ) : null}

        {adminView === "classes" ? (
          <><ManageClasses loading={loading} setLoading={setLoading} message={message} setMessage={setMessage} setAdminView={setAdminView} /></>
        ) : null}

        {adminView === "assessments" ? (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <AdminAssessmentsPage />
          </Paper>
        ) : null}



        {adminView === "users" ? (
          <>
            {message ? (
              <Alert severity={getAlertSeverity(message)} sx={{ mb: 4 }}>
                {message}
              </Alert>
            ) : null}
            <ManageUsersPage
              users={users}
              setUsers={setUsers}
              setLoading={setLoading}
              loading={loading}
              refreshUsers={refreshUsers}
              setMessage={setMessage}
              message={message}
              role={admin?.role}
              permissions={admin?.permissions || []}
            />
          </>
        ) : null}

        {adminView === "teachers" ? (<>
                  <>
                  {message ? (
              <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                <Typography color="text.primary">{message}</Typography>
              </Paper>
            ) : null}
                  <ManageTeachersPage
                    loading={loading}
                    setLoading={setLoading}
                    message={message}
                    setMessage={setMessage}
                    setAdminView={setAdminView}
                    users={users}
                    role={admin?.role}
                    permissions={admin?.permissions || []}
                  />
                  </>
        </>): null}

        {adminView === "centers" ? (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageCenters
              setMessage={setMessage}
              role={admin?.role}
              permissions={admin?.permissions || []}
            />
          </Paper>
        ) : null}

        {adminView === "students" ? (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageStudents
              setMessage={setMessage}
              role={admin?.role}
              permissions={admin?.permissions || []}
            />
          </Paper>
        ) : null}

        {adminView === "results" ? (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Assessment Results</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Review live submissions from students across subjects.</Typography>
            <AssessmentResultsDashboard assessmentId="" />
          </Paper>
        ) : null}

        {adminView === "reset-password" ? (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ResetPassword />
          </Paper>
        ) : null}

        {adminView === 'roles' ? (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageRoles
              setMessage={setMessage}
              role={admin?.role}
              permissions={admin?.permissions || []}
            />
          </Paper>
        ) : null}
        </Box>
      </Box>
    </Box>
  );
}
