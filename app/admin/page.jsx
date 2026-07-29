"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import AdminDrawyer from "./AdminDrawyer";
import ManageUsersPage from "./ManageUsers/ManageUsers";
import LoginPage from "./LoginPage";
import ManageClasses from "./ManageClasses/ManageClasses";
import { Menu } from "@mui/icons-material";
import ManageTeachersPage from "./ManageTeachers/ManageTeachers";
import AssessmentResultsDashboard from "./AssessmentResultsDashboard";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });


  const [drawerOpen, setDrawerOpen] = useState(true);
  const [adminView, setAdminView] = useState("users");


  const [message, setMessage] = useState(null);

  const refreshUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
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

  const handleLoginChange = (event) => {
    setLoginForm({
      ...loginForm,
      [event.target.name]: event.target.value,
    });
  };



  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
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
      <LoginPage
        loginForm={loginForm} loading={loading} setLoading={setLoading} setLoginForm={setLoginForm} setAdmin={setAdmin} setAuthorized={setAuthorized}
        handleLoginChange={handleLoginChange} message={message} setMessage={setMessage} refreshUsers={refreshUsers} />
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f8ff", py: 4, px: 3 }}>
      {drawerOpen ? <><AdminDrawyer drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} adminView={adminView} setAdminView={setAdminView} />
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
