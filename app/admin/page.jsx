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
} from "@mui/material";
import AdminDrawyer from "./AdminDrawyer";
import ManageUsersPage from "./ManageUsers/ManageUsers";
import ManageClasses from "./ManageClasses/ManageClasses";
import { Menu } from "@mui/icons-material";
import ManageTeachersPage from "./ManageTeachers/ManageTeachers";
import AssessmentResultsDashboard from "./AssessmentResultsDashboard";
import ManageCenters from "./ManageCenters/ManageCenters";
import ManageStudents from "./ManageStudents/ManageStudents";
import ManageRoles from './ManageRoles/ManageRoles';

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
  const [users, setUsers] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [adminView, setAdminView] = useState("users");
  const [message, setMessage] = useState(null);
  const [hasAnyAdminPermission, setHasAnyAdminPermission] = useState(true);

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
            { key: 'teachers', allowed: hasPermission(combinedPermissions, 'teachers.view', data.data?.role) },
            { key: 'centers', allowed: hasPermission(combinedPermissions, 'centers.view', data.data?.role) },
            { key: 'students', allowed: hasPermission(combinedPermissions, 'students.view', data.data?.role) },
            { key: 'roles', allowed: hasPermission(combinedPermissions, 'roles.view', data.data?.role) },
            { key: 'results', allowed: hasPermission(combinedPermissions, 'results.view', data.data?.role) },
          ];
          const anyPermission = availableViews.some((item) => item.allowed);
          setHasAnyAdminPermission(anyPermission);

          const firstAvailableView = availableViews.find((item) => item.allowed)?.key || 'none';

          if (firstAvailableView === 'users') {
            await refreshUsers();
            setAdminView('users');
          } else {
            setUsers([]);
            const defaultView =
              availableViews.find((item) => item.key === 'teachers' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'classes' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'results' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'roles' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'centers' && item.allowed)?.key ||
              availableViews.find((item) => item.key === 'students' && item.allowed)?.key ||
              'none';

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
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f8ff", py: 4, px: 3 }}>
      {drawerOpen ? <><AdminDrawyer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        adminView={adminView}
        setAdminView={setAdminView}
        role={admin?.role}
        permissions={admin?.permissions || []}
        customRolePermissions={admin?.customRole?.permissions || []}
        userName={admin?.name}
        customRoleName={admin?.customRole?.name || admin?.customRoleName || null}
      />
      </> : <>
      
        <IconButton
          onClick={()=>{setDrawerOpen(true)}}
          color="inherit"
          sx={{marginBottom:2}}
        >
          <Menu/>
        </IconButton>
      </>}
      <Box sx={{ maxWidth: 1400, mx: "auto", ml: drawerOpen ? "250px" : 0 }}>

        {adminView === 'none' || !hasAnyAdminPermission ? (
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>No Permissions Assigned</Typography>
            <Typography color="text.secondary">
              This account does not have any admin permissions yet. Ask an ADMIN to assign a custom role and centers.
            </Typography>
          </Paper>
        ) : null}

        {adminView === "classes" ? (
          <><ManageClasses loading={loading} setLoading={setLoading} message={message} setMessage={setMessage} setAdminView={setAdminView} /></>
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
              <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
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
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageCenters
              setMessage={setMessage}
              role={admin?.role}
              permissions={admin?.permissions || []}
            />
          </Paper>
        ) : null}

        {adminView === "students" ? (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageStudents
              setMessage={setMessage}
              role={admin?.role}
              permissions={admin?.permissions || []}
            />
          </Paper>
        ) : null}

        {adminView === "results" ? (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Assessment Results</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Review live submissions from students across subjects.</Typography>
            <AssessmentResultsDashboard assessmentId="" />
          </Paper>
        ) : null}

        {adminView === 'roles' ? (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageRoles
              setMessage={setMessage}
              role={admin?.role}
              permissions={admin?.permissions || []}
            />
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
