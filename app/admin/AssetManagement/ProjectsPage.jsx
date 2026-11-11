'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Block, Edit, Replay } from '@mui/icons-material';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../AdminAuthContext';
import { hasPermission } from './assetUi';
import usePagedData from '../usePagedData';

const ENDPOINT = '/api/admin/projects';

export default function ProjectsPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', suffix: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const paged = usePagedData({ endpoint: ENDPOINT, enabled: !authLoading && Boolean(admin) });
  const { rows, loading, search, setSearch } = paged;

  if (authLoading) return <Loader variant="page" size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  if (!admin) return null;

  const canCreate = hasPermission(admin, 'projects.create');
  const canEdit = hasPermission(admin, 'projects.edit');
  const canDelete = hasPermission(admin, 'projects.delete');

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', suffix: '' });
    setFeedback(null);
    setDialogOpen(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setForm({ name: project.name, suffix: project.suffix });
    setFeedback(null);
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      const response = await fetch(editing ? `${ENDPOINT}/${encodeURIComponent(editing.id)}` : ENDPOINT, {
        method: editing ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save project.');
      setDialogOpen(false);
      setFeedback({ severity: 'success', message: result.message || 'Project saved.' });
      paged.reload();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save project.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      const response = await fetch(`${ENDPOINT}/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to deactivate project.');
      setDeleteTarget(null);
      setFeedback({ severity: 'success', message: result.message || 'Project deactivated.' });
      paged.reload();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to deactivate project.' });
    } finally {
      setSaving(false);
    }
  };

  const reactivate = async (project) => {
    try {
      setSaving(true);
      const response = await fetch(`${ENDPOINT}/${encodeURIComponent(project.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: true }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to reactivate project.');
      setFeedback({ severity: 'success', message: result.message || 'Project reactivated.' });
      paged.reload();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to reactivate project.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#0a336b' }}>Projects</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Manage project names and suffixes.</Typography>
        </Box>
        {canCreate ? <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' } }}>Add Project</Button> : null}
      </Stack>

      {feedback ? <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert> : null}
      {paged.error ? <Alert severity="error" sx={{ mb: 2 }}>{paged.error}</Alert> : null}

      <TextField label="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} size="small" fullWidth sx={{ maxWidth: 420, mb: 2 }} />

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead sx={{ bgcolor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700 } }}>
            <TableRow>
              <TableCell>Project Name</TableCell>
              <TableCell>Suffix</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4}><Loader variant="section" label="Loading projects..." sx={{ minHeight: 100 }} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>{search ? 'No projects match your search.' : 'No projects yet.'}</TableCell></TableRow>
            ) : rows.map((project) => (
              <TableRow key={project.id} hover>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>{project.name}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>{project.suffix}</TableCell>
                <TableCell>{project.status ? 'Active' : 'Inactive'}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {canEdit ? <Tooltip title="Edit project"><IconButton size="small" aria-label={`Edit ${project.name}`} onClick={() => openEdit(project)}><Edit fontSize="small" /></IconButton></Tooltip> : null}
                  {project.status && canDelete ? <Tooltip title="Deactivate project"><IconButton size="small" color="error" aria-label={`Deactivate ${project.name}`} onClick={() => setDeleteTarget(project)}><Block fontSize="small" /></IconButton></Tooltip> : null}
                  {!project.status && canEdit ? <Tooltip title="Reactivate project"><IconButton size="small" aria-label={`Reactivate ${project.name}`} onClick={() => reactivate(project)} disabled={saving}><Replay fontSize="small" /></IconButton></Tooltip> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination {...paged.paginationProps} />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>{editing ? 'Edit Project' : 'Add Project'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Project Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} fullWidth size="small" required autoFocus />
            <TextField label="Suffix" value={form.suffix} onChange={(event) => setForm((current) => ({ ...current, suffix: event.target.value }))} fullWidth size="small" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.name.trim() || !form.suffix.trim()} sx={{ bgcolor: '#0a336b', '&:hover': { bgcolor: '#082b57' } }}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#0a336b', color: '#ffffff', fontWeight: 700 }}>Deactivate Project?</DialogTitle>
        <DialogContent dividers>
          <Typography>Deactivate <strong>{deleteTarget?.name}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Projects with assigned assets cannot be deactivated. The project record will be retained and can be reactivated later.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove} disabled={saving}>{saving ? 'Deactivating...' : 'Deactivate'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
