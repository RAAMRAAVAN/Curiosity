"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Delete, Edit, Add } from "@mui/icons-material";

export default function ManageCenters({ setMessage, role, permissions = [] }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", status: true });
  const [alert, setAlert] = useState(null);

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

  const canCreateCenters = hasPermission('centers.create');
  const canEditCenters = hasPermission('centers.edit');
  const canDeleteCenters = hasPermission('centers.delete');

  const loadCenters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/centers", { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setCenters(data.data || []);
      } else {
        const message = data.message || "Unable to load centers.";
        setAlert({ severity: "error", message });
        setMessage(message);
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load centers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

  const openCreateDialog = () => {
    if (!canCreateCenters) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    setEditingCenter(null);
    setForm({ name: "", slug: "", status: true });
    setDialogOpen(true);
  };

  const openEditDialog = (center) => {
    if (!canEditCenters) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    setEditingCenter(center);
    setForm({
      name: center.name || "",
      slug: center.slug || "",
      status: center.status ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingCenter && !canEditCenters) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    if (!editingCenter && !canCreateCenters) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    try {
      const method = editingCenter ? "PATCH" : "POST";
      const url = editingCenter ? `/api/admin/centers/${editingCenter.id}` : "/api/admin/centers";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (data.success) {
        setAlert(null);
        setDialogOpen(false);
        setMessage(data.message || "Center saved successfully.");
        await loadCenters();
      } else {
        const message = data.message || "Unable to save center.";
        setAlert({ severity: "error", message });
        setDialogOpen(false);
        setMessage(message);
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to save center.");
    }
  };

  const handleDelete = async (centerId) => {
    if (!canDeleteCenters) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/centers/${centerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setAlert(null);
        setMessage(data.message || "Center deleted successfully.");
        await loadCenters();
      } else {
        const message = data.message || "Unable to delete center.";
        setAlert({ severity: "error", message });
        setMessage(message);
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete center.");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Manage Centers</Typography>
          <Typography color="text.secondary">Create, view, and edit centers.</Typography>
        </Box>
        {canCreateCenters ? (
          <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
            Add Center
          </Button>
        ) : null}
      </Box>

      {alert ? (
        <Alert severity={alert.severity || "error"} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      ) : null}

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  Loading centers...
                </TableCell>
              </TableRow>
            ) : centers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  No centers found.
                </TableCell>
              </TableRow>
            ) : (
              centers.map((center) => (
                <TableRow key={center.id} hover>
                  <TableCell>{center.name}</TableCell>
                  <TableCell>{center.slug}</TableCell>
                  <TableCell>
                    <Chip label={center.status ? "Active" : "Inactive"} color={center.status ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {canEditCenters ? (
                        <IconButton color="primary" onClick={() => openEditDialog(center)}>
                          <Edit />
                        </IconButton>
                      ) : null}
                      {canDeleteCenters ? (
                        <IconButton color="error" onClick={() => handleDelete(center.id)}>
                          <Delete />
                        </IconButton>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCenter ? "Edit Center" : "Create Center"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Center Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label="Status"
              value={form.status ? "active" : "inactive"}
              onChange={(e) => setForm({ ...form, status: e.target.value === "active" })}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={(!canCreateCenters && !editingCenter) || (editingCenter && !canEditCenters)}>
            {editingCenter ? "Save Changes" : "Create Center"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
