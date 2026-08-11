"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
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

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [adminView, setAdminView] = useState("users");
  const [message, setMessage] = useState(null);

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

          setAdmin(data.data);
          setAuthorized(true);
          if (["ADMIN", "MANAGEMENT"].includes(String(data.data?.role || "").toUpperCase())) {
            await refreshUsers();
          } else {
            setUsers([]);
            setAdminView("teachers");
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
      {drawerOpen ? <><AdminDrawyer drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} adminView={adminView} setAdminView={setAdminView} role={admin?.role} />
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

        {adminView === "classes" ? (
          <><ManageClasses loading={loading} setLoading={setLoading} message={message} setMessage={setMessage} setAdminView={setAdminView} /></>
        ) : null}



        {adminView === "users" ? (
          <>
            {message ? (
              <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                <Typography color="text.primary">{message}</Typography>
              </Paper>
            ) : null}
            <ManageUsersPage users={users} setUsers={setUsers} setLoading={setLoading} loading={loading} refreshUsers={refreshUsers} setMessage={setMessage} message={message} />
          </>
        ) : null}

        {adminView === "teachers" ? (<>
                  <>
                  {message ? (
              <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                <Typography color="text.primary">{message}</Typography>
              </Paper>
            ) : null}
                  <ManageTeachersPage loading={loading} setLoading={setLoading} message={message} setMessage={setMessage} setAdminView={setAdminView} users={users}/></>
        </>): null}

        {adminView === "centers" ? (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageCenters setMessage={setMessage} />
          </Paper>
        ) : null}

        {adminView === "students" ? (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <ManageStudents setMessage={setMessage} />
          </Paper>
        ) : null}

        {adminView === "results" ? (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Assessment Results</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Review live submissions from students across subjects.</Typography>
            <AssessmentResultsDashboard assessmentId="" />
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
