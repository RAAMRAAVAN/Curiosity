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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Delete, Edit, Add } from "@mui/icons-material";

export default function ManageCenters({ setMessage, role, permissions = [] }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 3, flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: 18, sm: 20, md: 24 } }}>Manage Centers</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 12, sm: 14 } }}>Create, view, and edit centers.</Typography>
        </Box>
        {canCreateCenters ? (
          <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Add Center
          </Button>
        ) : null}
      </Box>

      {alert ? (
        <Alert severity={alert.severity || "error"} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      ) : null}

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' } }}>
        <Table sx={{ minWidth: { xs: 500, sm: 600 } }}>
          <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Name</TableCell>
              {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Description</TableCell>}
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 3 : 4} align="center" sx={{ py: 4 }}>
                  Loading centers...
                </TableCell>
              </TableRow>
            ) : centers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 3 : 4} align="center" sx={{ py: 4 }}>
                  No centers found.
                </TableCell>
              </TableRow>
            ) : (
              centers.map((center) => (
                <TableRow key={center.id} hover sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{center.name}</TableCell>
                  {!isMobile && <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{center.slug}</TableCell>}
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    <Chip label={center.status ? "Active" : "Inactive"} color={center.status ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {canEditCenters ? (
                        <IconButton color="primary" onClick={() => openEditDialog(center)} size={isMobile ? "small" : "medium"}>
                          <Edit fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      ) : null}
                      {canDeleteCenters ? (
                        <IconButton color="error" onClick={() => handleDelete(center.id)} size={isMobile ? "small" : "medium"}>
                          <Delete fontSize={isMobile ? "small" : "medium"} />
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

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth={isMobile ? false : "sm"}
        fullWidth
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            // height: '80vh',
            // maxHeight: '80vh',
          },
        } : {}}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 16 } }}>{editingCenter ? "Edit Center" : "Create Center"}</DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Center Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              select
              label="Status"
              value={form.status ? "active" : "inactive"}
              onChange={(e) => setForm({ ...form, status: e.target.value === "active" })}
              SelectProps={{ native: true }}
              fullWidth
              size={isMobile ? "small" : "medium"}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ gap: 1, px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
          <Button onClick={() => setDialogOpen(false)} size={isMobile ? "small" : "medium"}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={(!canCreateCenters && !editingCenter) || (editingCenter && !canEditCenters)} size={isMobile ? "small" : "medium"}>
            {editingCenter ? "Save Changes" : "Create Center"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
