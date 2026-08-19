'use client';

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

const permissionGroups = [
  {
    title: 'Users',
    permissions: ['users.view', 'users.create', 'users.edit', 'users.delete'],
  },
  {
    title: 'Roles',
    permissions: ['roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign'],
  },
  {
    title: 'Centers',
    permissions: ['centers.view', 'centers.create', 'centers.edit', 'centers.delete'],
  },
  {
    title: 'Classes',
    permissions: ['classes.view', 'classes.create', 'classes.edit', 'classes.delete', 'class_content.edit'],
  },
  {
    title: 'Subjects',
    permissions: ['subjects.view', 'subjects.create', 'subjects.edit', 'subjects.delete'],
  },
  {
    title: 'Assessments',
    permissions: [
      'assessments.view',
      'assessments.create',
      'assessments.edit',
      'assessments.delete',
      'assessments.pending.view',
      'assessments.appeared.view',
      'assessments.pending.appear',
      'assessments.appeared.reappear',
    ],
  },
  {
    title: 'Teachers',
    permissions: ['teachers.view', 'teachers.create', 'teachers.edit', 'teachers.delete', 'teachers.export'],
  },
  {
    title: 'Students',
    permissions: ['students.view', 'students.create', 'students.edit', 'students.delete', 'students.export'],
  },
  {
    title: 'Assessment Results',
    permissions: ['results.view', 'results.export'],
  },
  {
    title: 'Admin Navigation',
    permissions: ['navigation.edit'],
  },
];

const emptyForm = {
  name: '',
  description: '',
  status: true,
  permissions: [],
};

const ManageRoles = ({ setMessage, role, permissions = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [localMessage, setLocalMessage] = useState(null);

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

  const canCreateRoles = hasPermission('roles.create');
  const canEditRoles = hasPermission('roles.edit');
  const canDeleteRoles = hasPermission('roles.delete');

  const teachersPresetRole = useMemo(() => {
    return roles.find((item) => String(item.name || '').trim().toLowerCase() === 'teachers');
  }, [roles]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/roles', { credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Unable to load roles');
      }

      setRoles(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Unable to load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const permissionCountMap = useMemo(() => {
    const map = new Map();
    for (const role of roles) {
      map.set(role.id, Array.isArray(role.permissions) ? role.permissions.length : 0);
    }
    return map;
  }, [roles]);

  const startCreate = () => {
    if (!canCreateRoles) {
      setMessage('You are not authorized to perform this operation.');
      return;
    }

    setEditingRole(null);
    setForm(emptyForm);
    setOpen(true);
    setLocalMessage(null);
  };

  const startEdit = (role) => {
    if (!canEditRoles) {
      setMessage('You are not authorized to perform this operation.');
      return;
    }

    setEditingRole(role);
    setForm({
      name: role.name || '',
      description: role.description || '',
      status: role.status !== false,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setOpen(true);
    setLocalMessage(null);
  };

  const openTeachersPreset = () => {
    if (!teachersPresetRole) {
      setMessage('Teachers role is not available yet. Please create it first.');
      return;
    }

    startEdit(teachersPresetRole);
  };

  const togglePermission = (permission) => {
    setForm((prev) => {
      const hasPermission = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: hasPermission
          ? prev.permissions.filter((item) => item !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const saveRole = async () => {
    if (editingRole && !canEditRoles) {
      setMessage('You are not authorized to perform this operation.');
      return;
    }

    if (!editingRole && !canCreateRoles) {
      setMessage('You are not authorized to perform this operation.');
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingRole ? `/api/admin/roles/${editingRole.id}` : '/api/admin/roles';
      const method = editingRole ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Unable to save role');
      }

      setLocalMessage({
        severity: 'success',
        message: data.message || 'Role saved successfully.',
      });
      setOpen(false);
      await loadRoles();
    } catch (error) {
      console.error(error);
      setLocalMessage({
        severity: 'error',
        message: error.message || 'Unable to save role.',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role) => {
    if (!canDeleteRoles) {
      setMessage('You are not authorized to perform this operation.');
      return;
    }

    if (!window.confirm(`Delete role "${role.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Unable to delete role');
      }

      setMessage(data.message || 'Role deleted successfully.');
      await loadRoles();
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Unable to delete role.');
    }
  };

  return (
    <Box>
      {localMessage ? (
        <Alert severity={localMessage.severity} sx={{ mb: 2 }} onClose={() => setLocalMessage(null)}>
          {localMessage.message}
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 14, sm: 16 } }}>Manage Roles</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 11, sm: 13 } }}>
              Create custom management roles and configure exact permissions.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {teachersPresetRole ? (
              <Button variant="outlined" onClick={openTeachersPreset} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>Teachers Preset</Button>
            ) : null}
            {canCreateRoles ? (
              <Button variant="contained" onClick={startCreate} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>Create Role</Button>
            ) : null}
          </Stack>
        </Box>

        <TableContainer sx={{ overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' } }}>
          <Table sx={{ minWidth: { xs: 500, sm: 600 } }}>
            <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Role Name</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Description</TableCell>}
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Permissions</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Edit / Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{role.name}</TableCell>
                  {!isMobile && <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{role.description || '-'}</TableCell>}
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{permissionCountMap.get(role.id) || 0}</TableCell>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    <Chip label={role.status === false ? 'Disabled' : 'Active'} color={role.status === false ? 'default' : 'success'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {canEditRoles ? (
                        <Button size={isMobile ? "small" : "medium"} onClick={() => startEdit(role)} sx={{ fontSize: { xs: 10, sm: 12 } }}>Edit</Button>
                      ) : null}
                      {canDeleteRoles ? (
                        <Button size={isMobile ? "small" : "medium"} color="error" onClick={() => deleteRole(role)} sx={{ fontSize: { xs: 10, sm: 12 } }}>Delete</Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 4 : 5} align="center" sx={{ py: 3 }}>No custom roles found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={isMobile ? false : "md"}
        fullWidth
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '80vh',
            maxHeight: '80vh',
          },
        } : {}}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 16 } }}>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent sx={{ overflowY: 'auto' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Role Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              size={isMobile ? "small" : "medium"}
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.status)}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.checked }))}
                />
              }
              label="Role active"
            />

            <Typography variant="subtitle2" fontWeight={700}>Permissions</Typography>
            <Grid container spacing={2}>
              {permissionGroups.map((group) => (
                <Grid item xs={12} md={6} key={group.title}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{group.title}</Typography>
                    <Stack spacing={0.5}>
                      {group.permissions.map((permission) => (
                        <FormControlLabel
                          key={permission}
                          control={
                            <Switch
                              size="small"
                              checked={form.permissions.includes(permission)}
                              onChange={() => togglePermission(permission)}
                            />
                          }
                          label={permission}
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={saveRole} disabled={saving}>{editingRole ? 'Save Changes' : 'Create Role'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageRoles;
