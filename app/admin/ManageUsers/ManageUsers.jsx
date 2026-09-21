'use client'

import { Alert, Autocomplete, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Fab, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

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
    userType: "",
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
      setUserForm({ ...emptyUserForm, email: "" });
        setMessage(null);
      setFormMessage(null);
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
    const [formMessage, setFormMessage] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deletingUserId, setDeletingUserId] = useState(null);

    

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
    setFormMessage(null);
    setOpenUserModal(true);
  };

  const handleSaveUser = async () => {
    setFormMessage(null);

    if (selectedUserId && !canEditUsers) {
      const message = "You are not authorized to perform this operation.";
      setMessage(message);
      setFormMessage({ severity: "error", message });
      return;
    }

    if (!selectedUserId && !canCreateUsers) {
      const message = "You are not authorized to perform this operation.";
      setMessage(message);
      setFormMessage({ severity: "error", message });
      return;
    }

    if (
      !userForm.name?.trim()
      || !userForm.email?.trim()
      || !userForm.userType?.trim()
      || !userForm.customRoleId?.trim()
      || !userForm.assignedCenterIds?.length
      || (!selectedUserId && !userForm.password?.trim())
    ) {
      const message = "Name, email, user type, role, center, and password are required.";
      setMessage(message);
      setFormMessage({ severity: "error", message });
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
        const message = data.message || "Unable to save user.";
        setMessage(message);
        setFormMessage({ severity: "error", message });
        return;
      }

      const message = data.message || (selectedUserId ? "User updated successfully." : "User created successfully.");
      setMessage(message);
      setFormMessage({ severity: "success", message });
      await refreshUsers();
      setSelectedUserId(null);
      setUserForm(emptyUserForm);
    } catch (error) {
      console.error(error);
      const message = "Unable to save user.";
      setMessage(message);
      setFormMessage({ severity: "error", message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user) => {
    if (!canDeleteUsers) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    const id = userToDelete.id;
    setDeletingUserId(id);

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
      setDeletingUserId(null);
      setUserToDelete(null);
    }
  };
    const visibleUsers = useMemo(() => {
      return users.filter((user) => String(user.role || "").toUpperCase() === "MANAGEMENT");
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

  const canSubmitUserForm = Boolean(
    userForm.name?.trim()
      && userForm.email?.trim()
      && userForm.userType?.trim()
      && userForm.customRoleId?.trim()
      && userForm.assignedCenterIds?.length
      && (selectedUserId || userForm.password?.trim())
  );

    return (<Box sx={{ width: { xs: 'calc(100% + 32px)', sm: '100%' }, ml: { xs: -2, sm: 0 } }}>
        <Paper sx={{ p: { xs: 2, sm: 0 }, mb: 4, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Box padding={1} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 14, sm: 16 } }}>
                    Management Users
                </Typography>
                {canCreateUsers ? (
                  <Button
                    variant="contained"
                    onClick={startNewUser}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      backgroundColor: '#0a336b',
                      color: '#ffffff',
                      '&:hover': { backgroundColor: '#082b57' },
                    }}
                  >
                      Create New User
                  </Button>
                ) : null}
            </Box>

            <TableContainer sx={{ borderRadius: 3, overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' }, background: 'linear-gradient(180deg, #edf7ff 0%, #eef6ff 35%, #f4ecff 100%)', border: '1px solid rgba(59, 130, 246, 0.18)' }}>
                <Table sx={{ minWidth: { xs: 600, sm: 720 }, backgroundColor: '#f5f9ff', whiteSpace: 'nowrap' }}>
                    <TableHead sx={{ background: '#0a336b' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Name</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Role</TableCell>}
                            <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Custom Role</TableCell>
                            {!isTablet && <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Centers</TableCell>}
                            <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.map((user, index) => {
                          const rowTint = index % 2 === 0 ? '#f8fbff' : '#eef6ff';

                          return (
                            <TableRow
                              key={user.id}
                              sx={{
                                backgroundColor: rowTint,
                                '&:hover': { backgroundColor: '#eaf3ff' },
                              }}
                            >
                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint }}>{user.name}</TableCell>
                                {!isMobile && <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint }}>{user.role}</TableCell>}
                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint }}>{user.customRoleName || '-'}</TableCell>
                                {!isTablet && <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint }}>
                                  {Array.isArray(user.assignedCenterIds) && user.assignedCenterIds.length
                                    ? user.assignedCenterIds.map((centerId) => centerNameById[centerId] || centerId).join(', ')
                                    : '-'}
                                </TableCell>}
                                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint }}>{user.email}</TableCell>
                                
                                <TableCell sx={{ backgroundColor: rowTint }}>
                                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'nowrap', alignItems: 'center' }}>
                                        {canEditUsers ? (
                                          <Tooltip title="Edit user" arrow>
                                            <IconButton
                                              size="small"
                                              onClick={() => handleEditUser(user)}
                                              sx={{
                                                backgroundColor: '#e0f2fe',
                                                color: '#0a336b',
                                                '&:hover': { backgroundColor: '#bae6fd' },
                                              }}
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        ) : null}
                                        {canDeleteUsers ? (
                                          <Tooltip title="Delete user" arrow>
                                            <IconButton
                                              size="small"
                                              onClick={() => handleDeleteUser(user)}
                                              disabled={loading || deletingUserId === user.id}
                                              sx={{
                                                backgroundColor: '#fee2e2',
                                                color: '#b91c1c',
                                                '&:hover': { backgroundColor: '#fecaca' },
                                              }}
                                            >
                                              {deletingUserId === user.id ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon fontSize="small" />}
                                            </IconButton>
                                          </Tooltip>
                                        ) : null}
                                    </Box>
                                </TableCell>
                            </TableRow>
                          );
                        })}
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
          open={Boolean(userToDelete)}
          onClose={() => {
            if (!deletingUserId) setUserToDelete(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              border: '1px solid rgba(185, 28, 28, 0.16)',
              boxShadow: '0 20px 54px rgba(127, 29, 29, 0.22)',
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, color: '#7f1d1d' }}>
            Delete user?
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              This action permanently removes the selected user account.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {userToDelete?.name || userToDelete?.email || 'This user'} will be deleted.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button
              onClick={() => setUserToDelete(null)}
              disabled={Boolean(deletingUserId)}
              color="inherit"
            >
              Keep User
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={confirmDeleteUser}
              disabled={Boolean(deletingUserId)}
              startIcon={deletingUserId ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            >
              {deletingUserId ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogActions>
        </Dialog>

        {canCreateUsers ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'fixed',
              right: 16,
              bottom: 12,
              zIndex: (theme) => theme.zIndex.fab,
            }}
          >
            <Tooltip title="Create new user" arrow>
              <Fab
                aria-label="Create new user"
                onClick={startNewUser}
                disabled={loading}
                sx={{
                  backgroundColor: '#0a336b',
                  color: '#ffffff',
                  '&:hover': { backgroundColor: '#082b57' },
                }}
              >
                <AddIcon />
              </Fab>
            </Tooltip>
            <Typography
              variant="caption"
              sx={{ mt: 0.5, fontWeight: 700, color: '#64748B' }}
            >
              Create New User
            </Typography>
          </Box>
        ) : null}

        <Dialog 
            open={openUserModal} 
            onClose={() => setOpenUserModal(false)} 
            fullWidth 
            maxWidth={isMobile ? false : "xl"}
            slotProps={{
              paper: {
                component: 'form',
                autoComplete: 'off',
                onSubmit: (event) => event.preventDefault(),
              },
            }}
            sx={{
              '& .MuiDialog-paper': {
                margin: isMobile ? 0 : 8,
                width: isMobile ? '100%' : 'calc(100% - 16px)',
                maxWidth: isMobile ? '100%' : 'none',
                height: isMobile ? '100dvh' : 'auto',
                maxHeight: isMobile ? '100dvh' : 'none',
                display: isMobile ? 'flex' : 'block',
                flexDirection: isMobile ? 'column' : 'row',
                borderRadius: isMobile ? 0 : 3,
                overflow: 'hidden',
                border: '1px solid rgba(8, 43, 87, 0.16)',
                boxShadow: '0 24px 70px rgba(2, 24, 54, 0.28)',
              },
            }}
        >
            <DialogTitle sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 2, sm: 3 },
              py: { xs: 1.75, sm: 2.25 },
              fontWeight: 700,
              color: '#ffffff',
              fontSize: { xs: 14, sm: 18 },
              background: 'linear-gradient(135deg, #082b57 0%, #0d4678 100%)',
              boxShadow: '0 4px 16px rgba(2, 24, 54, 0.2)',
            }}>
                {selectedUserId ? "Edit User" : "Create User"}
                <IconButton
                  aria-label="Close user dialog"
                  onClick={() => setOpenUserModal(false)}
                  disabled={loading}
                  sx={{ color: '#ffffff' }}
                >
                  <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{
              pt: 2.5,
              flex: isMobile ? '1 1 auto' : '0 1 auto',
              minHeight: 0,
              maxHeight: isMobile ? 'none' : '70vh',
              overflowY: 'auto',
              backgroundColor: '#f8fbff',
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#ffffff',
                transition: 'box-shadow 160ms ease, border-color 160ms ease',
                '&:hover': { boxShadow: '0 4px 14px rgba(8, 43, 87, 0.08)' },
                '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(13, 70, 120, 0.14)' },
              },
            }}>
                <Typography variant="body2" color="text.secondary" mb={3} sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    {selectedUserId
                        ? "Update the user details and save changes."
                        : "Create a new user account with required profile details."}
                </Typography>
                {formMessage ? (
                  <Alert severity={formMessage.severity} sx={{ mb: 2 }}>
                    {formMessage.message}
                  </Alert>
                ) : null}
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(6, minmax(0, 1fr))" } }}>
                  <TextField label="Name" name="name" value={userForm.name} onChange={handleUserFormChange} fullWidth required sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }} size={isMobile ? "small" : "medium"} />
                  <TextField label="Email" name="email" value={userForm.email} onChange={handleUserFormChange} fullWidth required autoComplete="new-email" inputProps={{ autoComplete: 'new-email' }} sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }} size={isMobile ? "small" : "medium"} />
                    <TextField
                        label="Password"
                        name="password"
                        type="password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        fullWidth
                        required={!selectedUserId}
                      autoComplete="new-password"
                      inputProps={{ autoComplete: 'new-password' }}
                        sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }}
                        size={isMobile ? "small" : "medium"}
                        helperText={selectedUserId ? "Leave blank to keep current password." : "Set a password for the new user."}
                    />
                    
                    <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', sm: 'span 3' } }} size={isMobile ? "small" : "medium"}>
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
                        <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', sm: 'span 3' } }} size={isMobile ? "small" : "medium"}>
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

                        <Autocomplete
                          multiple
                          fullWidth
                          sx={{
                            width: '100%',
                            minWidth: 0,
                            gridColumn: { xs: '1', sm: '1 / -1' },
                            '& .MuiAutocomplete-inputRoot': {
                              flexWrap: 'nowrap',
                              overflowX: 'auto',
                              '& .MuiAutocomplete-tag': {
                                flexShrink: 0,
                              },
                              '& .MuiAutocomplete-input': {
                                minWidth: 80,
                              },
                            },
                          }}
                          options={centers}
                          value={centers.filter((center) => (
                            Array.isArray(userForm.assignedCenterIds)
                              && userForm.assignedCenterIds.some((centerId) => String(centerId) === String(center.id))
                          ))}
                          getOptionLabel={(center) => {
                            const centerName = center.name || center.id || '';
                            return center.slug ? `${center.slug} : ${centerName}` : centerName;
                          }}
                          renderOption={(props, center, state) => {
                            const centerName = center.name || center.id || '';

                            return (
                              <li {...props}>
                                <Checkbox
                                  checked={state.selected}
                                  disableRipple
                                  sx={{
                                    p: 0.5,
                                    mr: 1,
                                    color: '#0d4678',
                                    '&.Mui-checked': { color: '#0a336b' },
                                  }}
                                />
                                <Box component="span">
                                  {center.slug ? (
                                    <Typography component="span" fontWeight={700}>
                                      {center.slug}
                                    </Typography>
                                  ) : null}
                                  {center.slug ? ' : ' : ''}
                                  {centerName}
                                </Box>
                              </li>
                            );
                          }}
                          isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                          onChange={(_, selectedCenters) => {
                            setUserForm((prev) => ({
                              ...prev,
                              assignedCenterIds: selectedCenters.map((center) => center.id),
                            }));
                          }}
                          disableCloseOnSelect
                          slotProps={{
                            paper: {
                              sx: {
                                mt: 1,
                                minWidth: { xs: '100%', sm: 420 },
                                maxWidth: 'calc(100vw - 48px)',
                                borderRadius: 2.5,
                                backgroundColor: '#f8fbff',
                                border: '1px solid rgba(8, 43, 87, 0.14)',
                                boxShadow: '0 20px 52px rgba(2, 24, 54, 0.3)',
                                overflow: 'hidden',
                              },
                            },
                            listbox: {
                              sx: {
                                maxHeight: 168,
                                overflowY: 'auto',
                                py: 0.75,
                                '& .MuiAutocomplete-option': {
                                  borderRadius: 1.5,
                                  mx: 0.75,
                                  my: 0.25,
                                },
                              },
                            },
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Assigned Centers"
                              required
                              size={isMobile ? "small" : "medium"}
                            />
                          )}
                        />
                      </>
                    ) : null}
                </Box>
            </DialogContent>
            <DialogActions sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 1.5, sm: 2 },
              gap: 1,
              position: isMobile ? 'sticky' : 'relative',
              bottom: 0,
              flexShrink: 0,
              backgroundColor: '#ffffff',
              borderTop: '1px solid rgba(8, 43, 87, 0.1)',
              boxShadow: '0 -5px 18px rgba(8, 43, 87, 0.06)',
            }}>
              <Button
                variant="contained"
                onClick={handleSaveUser}
                size={isMobile ? "small" : "medium"}
                disabled={loading || !canSubmitUserForm}
                sx={{
                  backgroundColor: '#0a336b',
                  color: '#ffffff',
                  '&:hover': { backgroundColor: '#082b57' },
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : selectedUserId ? "Save Changes" : "Create User"}
              </Button>
            </DialogActions>
        </Dialog>
    </Box>)
}

export default ManageUsersPage