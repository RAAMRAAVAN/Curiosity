'use client';

import Loader from '@/app/(components)/Loader';
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
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Tooltip from '@mui/material/Tooltip';
import usePagedData from '../usePagedData';

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

  const paged = usePagedData({ endpoint: '/api/admin/roles' });
  const roles = paged.rows;
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const loading = paged.loading;
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

  const loadRoles = async ({ reloadList = true } = {}) => {
    if (reloadList) paged.reload();
    try {
      const permissionsResponse = await fetch('/api/admin/permissions', { credentials: 'include' });
      const permissionsData = await permissionsResponse.json();
      if (!permissionsResponse.ok || !permissionsData.success) {
        throw new Error(permissionsData.message || 'Unable to load permissions');
      }

      setPermissionCatalog(Array.isArray(permissionsData.data) ? permissionsData.data : []);
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Unable to load roles.');
    }
  };

  useEffect(() => {
    loadRoles({ reloadList: false });
  }, []);

  useEffect(() => {
    if (paged.error) setMessage(paged.error);
  }, [paged.error]);

  const permissionCountMap = useMemo(() => {
    const map = new Map();
    for (const role of roles) {
      map.set(role.id, Array.isArray(role.permissions) ? role.permissions.length : 0);
    }
    return map;
  }, [roles]);

  const permissionGroups = useMemo(() => {
    const groups = new Map();
    for (const permission of permissionCatalog) {
      const category = permission.category || 'Other';
      const group = groups.get(category) || [];
      group.push(permission);
      groups.set(category, group);
    }
    return Array.from(groups, ([title, permissions]) => ({ title, permissions }));
  }, [permissionCatalog]);

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
    <Box sx={{ width: '100%', minWidth: 0, p: { xs: 0, sm: 2, md: 3 } }}>
      {localMessage ? (
        <Alert severity={localMessage.severity} sx={{ mb: 2 }} onClose={() => setLocalMessage(null)}>
          {localMessage.message}
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 14, sm: 16 } }}>Manage Roles</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 11, sm: 13 } }}>
              Create custom management roles and configure exact permissions.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
            {teachersPresetRole ? (
              <Button variant="outlined" onClick={openTeachersPreset} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>Teachers Preset</Button>
            ) : null}
            {canCreateRoles ? (
              <Button variant="contained" onClick={startCreate} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' }, backgroundColor: '#0a336b', color: '#ffffff', '&:hover': { backgroundColor: '#082b57' } }}>Create Role</Button>
            ) : null}
          </Stack>
        </Box>

        <TextField size="small" label="Search roles" value={paged.search} onChange={(event) => paged.setSearch(event.target.value)} sx={{ mb: 2, width: { xs: '100%', sm: 320 }, maxWidth: '100%' }} />

        <TableContainer sx={{ maxWidth: '100%', overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' } }}>
          <Table sx={{ minWidth: { xs: 500, sm: 600 } }}>
            <TableHead sx={{ backgroundColor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff' } }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Role Name</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Description</TableCell>}
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Permissions</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 4 : 5} align="center" sx={{ py: 3 }}>
                    <Loader variant='section' label='Loading roles...' sx={{ minHeight: 'auto', py: 0 }} />
                  </TableCell>
                </TableRow>
              ) : roles.map((role) => (
                <TableRow key={role.id} sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, overflowWrap: 'anywhere', minWidth: 120 }}>{role.name}</TableCell>
                  {!isMobile && <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, overflowWrap: 'anywhere', minWidth: 160 }}>{role.description || '-'}</TableCell>}
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{permissionCountMap.get(role.id) || 0}</TableCell>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    <Chip label={role.status === false ? 'Disabled' : 'Active'} color={role.status === false ? 'default' : 'success'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'nowrap' }}>
                      {canEditRoles ? (
                        <Tooltip title="Edit role" arrow>
                          <IconButton size="small" aria-label={`Edit ${role.name}`} onClick={() => startEdit(role)} sx={{ backgroundColor: '#e0f2fe', color: '#0a336b', '&:hover': { backgroundColor: '#bae6fd' } }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {canDeleteRoles ? (
                        <Tooltip title="Delete role" arrow>
                          <IconButton size="small" aria-label={`Delete ${role.name}`} onClick={() => deleteRole(role)} sx={{ backgroundColor: '#fee2e2', color: '#b91c1c', '&:hover': { backgroundColor: '#fecaca' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
        <TablePagination {...paged.paginationProps} />
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={isMobile ? false : "md"}
        fullWidth
        scroll="paper"
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
                          key={permission.key}
                          control={
                            <Switch
                              size="small"
                              checked={form.permissions.includes(permission.key)}
                              onChange={() => togglePermission(permission.key)}
                            />
                          }
                          label={permission.label}
                          sx={{ overflowWrap: 'anywhere' }}
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
          <Button variant="contained" onClick={saveRole} disabled={saving} sx={{ minHeight: 40, backgroundColor: '#0a336b', color: '#ffffff', '&:hover': { backgroundColor: '#082b57' } }}>{editingRole ? 'Save Changes' : 'Create Role'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageRoles;
