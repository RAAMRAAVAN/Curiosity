'use client'

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material"
import { useEffect, useMemo, useState } from "react";

const emptyUserForm = {
    name: "",
    email: "",
    password: "",
    dob: "",
    gender: "",
    phone: "",
    address: "",
    schoolName: "",
    studyingClass: "",
    userType: "student",
};

const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
const roleOptions = ["student", "teacher", "admin", "parent"];




const ManageUsersPage = ({users, setUsers, messgae, refreshUsers, setMessage, loading, setLoading}) => {
    
    const [filters, setFilters] = useState({
        name: "",
        email: "",
        role: "",
        gender: "",
        phone: "",
        schoolName: "",
        studyingClass: "",
    });

    const startNewUser = () => {
        setSelectedUserId(null);
        setUserForm(emptyUserForm);
        setMessage(null);
        setOpenUserModal(true);
    };

    const handleUserFormChange = (event) => {
        setUserForm({
            ...userForm,
            [event.target.name]: event.target.value,
        });
    };
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [openUserModal, setOpenUserModal] = useState(false);

    

  const handleEditUser = (user) => {
    setSelectedUserId(user.id);
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      dob: user.dob ? user.dob.slice(0, 10) : "",
      gender: user.gender || "",
      phone: user.phone || "",
      address: user.address || "",
      schoolName: user.schoolName || "",
      studyingClass: user.studyingClass || "",
      userType: user.role.toLowerCase(),
    });
    setMessage(null);
    setOpenUserModal(true);
  };

  const handleSaveUser = async () => {
    const endpoint = selectedUserId
      ? `/api/admin/users/${selectedUserId}`
      : "/api/admin/users";
    const method = selectedUserId ? "PATCH" : "POST";
    const payload = { ...userForm };

    if (selectedUserId && !payload.password) {
      delete payload.password;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!data.success) {
        setMessage(data.message || "Unable to save user.");
        return;
      }

      setMessage(data.message);
      await refreshUsers();
      setSelectedUserId(null);
      setUserForm(emptyUserForm);
    } catch (error) {
      console.error(error);
      setMessage("Unable to save user.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Delete this user permanently?")) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();

      if (!data.success) {
        setMessage(data.message || "Unable to delete user.");
        return;
      }

      setMessage(data.message);
      await refreshUsers();
      if (selectedUserId === id) {
        setSelectedUserId(null);
        setUserForm(emptyUserForm);
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete user.");
    } finally {
      setLoading(false);
    }
  };
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const fieldValue = String(user[key] || "").toLowerCase();
                return fieldValue.includes(value.toLowerCase());
            });
        });
    }, [users, filters]);

    

  const userStats = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const roleKey = user.role?.toLowerCase();
        if (roleKey && acc[roleKey] !== undefined) {
          acc[roleKey] += 1;
        }
        acc.total += 1;
        return acc;
      },
      { total: 0, student: 0, teacher: 0, admin: 0, parent: 0 }
    );
  }, [users]);

    return (<Box>
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                    Users
                </Typography>
                <Button variant="contained" onClick={startNewUser}>
                    Create New User
                </Button>
            </Box>

            <TableContainer sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Table sx={{ minWidth: 720 }}>
                    <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Role</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Gender</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Phone</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>School</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Class</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id} sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>{user.gender}</TableCell>
                                <TableCell>{user.phone}</TableCell>
                                <TableCell>{user.schoolName}</TableCell>
                                <TableCell>{user.studyingClass}</TableCell>
                                <TableCell>
                                    <Button size="small" onClick={() => handleEditUser(user)} sx={{ mr: 1 }}>
                                        Edit
                                    </Button>
                                    <Button size="small" color="error" onClick={() => handleDeleteUser(user.id)}>
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    No users match the current filters.
                                </TableCell>
                            </TableRow>
                        ) : null}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>

        <Dialog open={openUserModal} onClose={() => setOpenUserModal(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
                {selectedUserId ? "Edit User" : "Create User"}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    {selectedUserId
                        ? "Update the user details and save changes."
                        : "Create a new user account with required profile details."}
                </Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                    <TextField label="Name" name="name" value={userForm.name} onChange={handleUserFormChange} fullWidth />
                    <TextField label="Email" name="email" value={userForm.email} onChange={handleUserFormChange} fullWidth />
                    <TextField
                        label="Password"
                        name="password"
                        type="password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        fullWidth
                        helperText={selectedUserId ? "Leave blank to keep current password." : "Set a password for the new user."}
                    />
                    <TextField
                        label="Date of Birth"
                        name="dob"
                        type="date"
                        value={userForm.dob}
                        onChange={handleUserFormChange}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                    <FormControl fullWidth>
                        <InputLabel>Gender</InputLabel>
                        <Select label="Gender" name="gender" value={userForm.gender} onChange={handleUserFormChange}>
                            <MenuItem value="">None</MenuItem>
                            {genderOptions.map((gender) => (
                                <MenuItem key={gender} value={gender}>
                                    {gender}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField label="Phone" name="phone" value={userForm.phone} onChange={handleUserFormChange} fullWidth />
                    <TextField label="Address" name="address" value={userForm.address} onChange={handleUserFormChange} fullWidth multiline rows={2} />
                    <TextField label="School Name" name="schoolName" value={userForm.schoolName} onChange={handleUserFormChange} fullWidth />
                    <TextField label="Class" name="studyingClass" value={userForm.studyingClass} onChange={handleUserFormChange} fullWidth />
                    <FormControl fullWidth>
                        <InputLabel>User Type</InputLabel>
                        <Select label="User Type" name="userType" value={userForm.userType} onChange={handleUserFormChange}>
                            {roleOptions.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={() => setOpenUserModal(false)} color="inherit">
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSaveUser}>
                    {selectedUserId ? "Save Changes" : "Create User"}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>)
}

export default ManageUsersPage