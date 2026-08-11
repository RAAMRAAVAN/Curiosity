"use client";

import { useEffect, useState } from "react";
import {
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

export default function ManageCenters({ setMessage }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", status: true });

  const loadCenters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/centers", { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setCenters(data.data || []);
      } else {
        setMessage(data.message || "Unable to load centers.");
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
    setEditingCenter(null);
    setForm({ name: "", slug: "", status: true });
    setDialogOpen(true);
  };

  const openEditDialog = (center) => {
    setEditingCenter(center);
    setForm({
      name: center.name || "",
      slug: center.slug || "",
      status: center.status ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
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
        setDialogOpen(false);
        setMessage(data.message || "Center saved successfully.");
        await loadCenters();
      } else {
        setMessage(data.message || "Unable to save center.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to save center.");
    }
  };

  const handleDelete = async (centerId) => {
    try {
      const response = await fetch(`/api/admin/centers/${centerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setMessage(data.message || "Center deleted successfully.");
        await loadCenters();
      } else {
        setMessage(data.message || "Unable to delete center.");
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
        <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
          Add Center
        </Button>
      </Box>

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
                      <IconButton color="primary" onClick={() => openEditDialog(center)}>
                        <Edit />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(center.id)}>
                        <Delete />
                      </IconButton>
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
          <Button variant="contained" onClick={handleSubmit}>
            {editingCenter ? "Save Changes" : "Create Center"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
