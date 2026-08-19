'use client'

import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, ListItemText, MenuItem, OutlinedInput, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme } from "@mui/material"
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
    customRoleId: "",
    assignedCenterIds: [],
};

const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
const roleOptions = ["management"];




const ManageUsersPage = ({ users = [], setUsers, messgae, refreshUsers, setMessage, loading, setLoading, role, permissions = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [roles, setRoles] = useState([]);
  const [centers, setCenters] = useState([]);

  const hasPermission = (permission) => {
    if (String(role || '').toUpperCase() === 'ADMIN') return true;
    if (!permission) return true;

    const normalized = Array.isArray(permissions)
      ? permissions.map((item) => String(item || '').toLowerCase())
      : [];

    return normalized.includes('*')
      || normalized.includes(permission)
      || normalized.some((item) => item.endsWith('.*') && permission.startsWith(`${item.slice(0, -2)}.`));
  };

  const canCreateUsers = hasPermission('users.create');
  const canEditUsers = hasPermission('users.edit');
  const canDeleteUsers = hasPermission('users.delete');
    
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

    const loadRolesAndCenters = async () => {
      try {
        const [rolesRes, centersRes] = await Promise.all([
          fetch('/api/admin/roles', { credentials: 'include' }),
          fetch('/api/admin/centers', { credentials: 'include' }),
        ]);

        const rolesData = await rolesRes.json();
        const centersData = await centersRes.json();

        if (rolesData.success) {
          const filteredRoles = Array.isArray(rolesData.data)
            ? rolesData.data.filter((item) => item.status !== false && String(item.name || '').trim().toLowerCase() !== 'teachers')
            : [];

          setRoles(filteredRoles);
        }

        if (centersData.success) {
          setCenters(Array.isArray(centersData.data) ? centersData.data : []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    useEffect(() => {
      loadRolesAndCenters();
      if (typeof refreshUsers === 'function') {
        refreshUsers();
      }
    }, []);

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
      customRoleId: user.customRoleId || "",
      assignedCenterIds: Array.isArray(user.assignedCenterIds) ? user.assignedCenterIds : [],
    });
    setMessage(null);
    setOpenUserModal(true);
  };

  const handleSaveUser = async () => {
    if (selectedUserId && !canEditUsers) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    if (!selectedUserId && !canCreateUsers) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    const endpoint = selectedUserId
      ? `/api/admin/users/${selectedUserId}`
      : "/api/admin/users";
    const method = selectedUserId ? "PATCH" : "POST";
    const payload = {
      ...userForm,
      assignedCenterIds: Array.isArray(userForm.assignedCenterIds) ? userForm.assignedCenterIds : [],
    };

    if (String(payload.userType || '').toLowerCase() !== 'management') {
      payload.customRoleId = null;
      payload.assignedCenterIds = [];
    }

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
    if (!canDeleteUsers) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

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
    const visibleUsers = useMemo(() => {
        return users.filter((user) => String(user.role || "").toLowerCase() !== "student");
    }, [users]);

    const filteredUsers = useMemo(() => {
        return visibleUsers.filter((user) => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const fieldValue = String(user[key] || "").toLowerCase();
                return fieldValue.includes(value.toLowerCase());
            });
        });
    }, [visibleUsers, filters]);

    

  const userStats = useMemo(() => {
    return visibleUsers.reduce(
      (acc, user) => {
        const roleKey = user.role?.toLowerCase();
        if (roleKey && acc[roleKey] !== undefined) {
          acc[roleKey] += 1;
        }
        acc.total += 1;
        return acc;
      },
      { total: 0, student: 0, teacher: 0, admin: 0, management: 0, parent: 0 }
    );
  }, [users]);

  const centerNameById = useMemo(() => {
    return Object.fromEntries(centers.map((center) => [center.id, center.name || center.id]));
  }, [centers]);

  const managementRoleOptions = useMemo(() => {
    return roles.filter((item) => item.status !== false && String(item.name || '').trim().toLowerCase() !== 'teachers');
  }, [roles]);

    return (<Box>
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: { xs: 1, sm: 2 }, mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 14, sm: 16 } }}>
                    Users
                </Typography>
                {canCreateUsers ? (
                  <Button variant="contained" onClick={startNewUser} size={isMobile ? "small" : "medium"}>
                      Create New User
                  </Button>
                ) : null}
            </Box>

            <TableContainer sx={{ borderRadius: 3, overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' } }}>
                <Table sx={{ minWidth: { xs: 600, sm: 720 } }}>
                    <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Role</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Custom Role</TableCell>}
                            {!isTablet && <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Centers</TableCell>}
                            <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id} sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}>
                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{user.name}</TableCell>
                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{user.email}</TableCell>
                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{user.role}</TableCell>
                                {!isMobile && <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{user.customRoleName || '-'}</TableCell>}
                                {!isTablet && <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>
                                  {Array.isArray(user.assignedCenterIds) && user.assignedCenterIds.length
                                    ? user.assignedCenterIds.map((centerId) => centerNameById[centerId] || centerId).join(', ')
                                    : '-'}
                                </TableCell>}
                                
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {canEditUsers ? (
                                          <Button size="small" onClick={() => handleEditUser(user)} sx={{ mr: 0.5, fontSize: { xs: 10, sm: 12 } }}>
                                              Edit
                                          </Button>
                                        ) : null}
                                        {canDeleteUsers ? (
                                          <Button size="small" color="error" onClick={() => handleDeleteUser(user.id)} sx={{ fontSize: { xs: 10, sm: 12 } }}>
                                              Delete
                                          </Button>
                                        ) : null}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isMobile ? 4 : isTablet ? 5 : 6} align="center" sx={{ py: 4 }}>
                                    No users match the current filters.
                                </TableCell>
                            </TableRow>
                        ) : null}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>

        <Dialog 
            open={openUserModal} 
            onClose={() => setOpenUserModal(false)} 
            fullWidth 
            maxWidth={isMobile ? false : "lg"}
            sx={isMobile ? { 
                '& .MuiDialog-paper': {
                    margin: 0,
                    width: '100%',
                    maxWidth: '100%',
                    // height: '100%',
                    // maxHeight: '100%'
                }
            } : {}}
        >
            <DialogTitle sx={{ fontWeight: 700, pb: 0, fontSize: { xs: 14, sm: 18 } }}>
                {selectedUserId ? "Edit User" : "Create User"}
            </DialogTitle>
            <DialogContent sx={{ pt: 2, maxHeight: isMobile ? 'calc(100vh - 120px)' : 'auto', overflowY: 'auto' }}>
                <Typography variant="body2" color="text.secondary" mb={3} sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    {selectedUserId
                        ? "Update the user details and save changes."
                        : "Create a new user account with required profile details."}
                </Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(240px, 1fr))" } }}>
                    <TextField label="Name" name="name" value={userForm.name} onChange={handleUserFormChange} fullWidth size={isMobile ? "small" : "medium"} />
                    <TextField label="Email" name="email" value={userForm.email} onChange={handleUserFormChange} fullWidth size={isMobile ? "small" : "medium"} />
                    <TextField
                        label="Password"
                        name="password"
                        type="password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        fullWidth
                        size={isMobile ? "small" : "medium"}
                        helperText={selectedUserId ? "Leave blank to keep current password." : "Set a password for the new user."}
                    />
                    
                    <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                        <InputLabel>User Type</InputLabel>
                        <Select label="User Type" name="userType" value={userForm.userType} onChange={handleUserFormChange}>
                            {roleOptions.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {String(userForm.userType || '').toLowerCase() === 'management' ? (
                      <>
                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                          <InputLabel>Custom Role</InputLabel>
                          <Select
                            label="Custom Role"
                            name="customRoleId"
                            value={userForm.customRoleId || ''}
                            onChange={handleUserFormChange}
                          >
                            <MenuItem value="">None</MenuItem>
                            {managementRoleOptions.map((role) => (
                              <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                          <InputLabel>Assigned Centers</InputLabel>
                          <Select
                            multiple
                            name="assignedCenterIds"
                            value={Array.isArray(userForm.assignedCenterIds) ? userForm.assignedCenterIds : []}
                            onChange={(event) => {
                              const value = event.target.value;
                              setUserForm((prev) => ({
                                ...prev,
                                assignedCenterIds: typeof value === 'string' ? value.split(',') : value,
                              }));
                            }}
                            input={<OutlinedInput label="Assigned Centers" />}
                            renderValue={(selected) => selected.map((centerId) => centerNameById[centerId] || centerId).join(', ')}
                          >
                            {centers.map((center) => (
                              <MenuItem key={center.id} value={center.id}>
                                <Checkbox checked={Array.isArray(userForm.assignedCenterIds) && userForm.assignedCenterIds.indexOf(center.id) > -1} />
                                <ListItemText primary={center.name || center.id} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </>
                    ) : null}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, gap: 1, position: isMobile ? 'sticky' : 'relative', bottom: 0, backgroundColor: 'background.paper', borderTop: isMobile ? '1px solid rgba(15, 23, 42, 0.08)' : 'none' }}>
                <Button onClick={() => setOpenUserModal(false)} color="inherit" size={isMobile ? "small" : "medium"}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSaveUser} size={isMobile ? "small" : "medium"}>
                    {selectedUserId ? "Save Changes" : "Create User"}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>)
}

export default ManageUsersPage