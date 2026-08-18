"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
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

const ALL_CENTERS = "ALL";

export default function ManageStudents({ setMessage, role, permissions = [] }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [students, setStudents] = useState([]);
  const [centers, setCenters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(ALL_CENTERS);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    centerId: "",
    studyingClass: "",
    dob: "",
    gender: "",
    phone: "",
    address: "",
    schoolName: "",
    status: true,
  });

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

  const canViewStudents = hasPermission('students.view');
  const canCreateStudents = hasPermission('students.create');
  const canEditStudents = hasPermission('students.edit');
  const canDeleteStudents = hasPermission('students.delete');

  const classNameById = useMemo(() => {
    const entries = classes
      .filter((item) => item?.id)
      .map((item) => [item.id, item.className || item.id]);
    return Object.fromEntries(entries);
  }, [classes]);

  const classIdByName = useMemo(() => {
    const map = new Map();
    for (const item of classes) {
      if (!item?.className || !item?.id) continue;
      map.set(String(item.className).trim().toLowerCase(), item.id);
    }
    return map;
  }, [classes]);

  const resolveClassId = (value) => {
    if (!value) return "";
    const asString = String(value).trim();
    if (!asString) return "";

    if (!classes.length) return asString;

    const existsById = classes.some((item) => item?.id === asString);
    if (existsById) return asString;

    return classIdByName.get(asString.toLowerCase()) || "";
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, studentsRes, centersRes, classesRes] = await Promise.all([
        fetch("/api/admin/me", { credentials: "include" }),
        fetch("/api/admin/students", { credentials: "include" }),
        fetch("/api/admin/centers", { credentials: "include" }),
        fetch("/api/admin/classes", { credentials: "include" }),
      ]);

      const meData = await meRes.json();
      const studentsData = await studentsRes.json();
      const centersData = await centersRes.json();
      const classesData = await classesRes.json();

      if (meData.success) setAuthUser(meData.data || null);

      if (studentsData.success) setStudents(studentsData.data || []);
      else setMessage(studentsData.message || "Unable to load students.");

      if (centersData.success) setCenters(centersData.data || []);
      else setMessage(centersData.message || "Unable to load centers.");

      if (classesData.success) setClasses(classesData.data || []);
      else setMessage(classesData.message || "Unable to load classes.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to load student data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    if (!canCreateStudents) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    setEditingStudent(null);
    const lockedCenterId = authUser?.role === "TEACHER" ? authUser.centerId || "" : "";
    setForm({
      name: "",
      email: "",
      password: "",
      centerId: lockedCenterId,
      studyingClass: "",
      dob: "",
      gender: "",
      phone: "",
      address: "",
      schoolName: "",
      status: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = async (student) => {
    if (!canEditStudents) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${student.id}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success && data.data) {
        const latestStudent = data.data;
        setEditingStudent(latestStudent);
        setForm({
          name: latestStudent.name || "",
          email: latestStudent.email || "",
          password: "",
          centerId: latestStudent.centerId || "",
          studyingClass: latestStudent.studyingClass || "",
          dob: latestStudent.dob || "",
          gender: latestStudent.gender || "",
          phone: latestStudent.phone || "",
          address: latestStudent.address || "",
          schoolName: latestStudent.schoolName || "",
          status: latestStudent.status ?? true,
        });
      } else {
        setEditingStudent(student);
        setForm({
          name: student.name || "",
          email: student.email || "",
          password: "",
          centerId: student.centerId || "",
          studyingClass: student.studyingClass || "",
          dob: student.dob || "",
          gender: student.gender || "",
          phone: student.phone || "",
          address: student.address || "",
          schoolName: student.schoolName || "",
          status: student.status ?? true,
        });
        setMessage(data.message || "Unable to load latest student details.");
      }
      setDialogOpen(true);
    } catch (error) {
      console.error(error);
      setEditingStudent(student);
      setForm({
        name: student.name || "",
        email: student.email || "",
        password: "",
        centerId: student.centerId || "",
        studyingClass: student.studyingClass || "",
        dob: student.dob || "",
        gender: student.gender || "",
        phone: student.phone || "",
        address: student.address || "",
        schoolName: student.schoolName || "",
        status: student.status ?? true,
      });
      setDialogOpen(true);
      setMessage("Unable to load student details.");
    }
  };

  const handleSubmit = async () => {
    if (editingStudent && !canEditStudents) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    if (!editingStudent && !canCreateStudents) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    try {
      const method = editingStudent ? "PATCH" : "POST";
      const url = editingStudent ? `/api/admin/students/${editingStudent.id}` : "/api/admin/students";
      const isTeacherRole = authUser?.role === "TEACHER";

      const payload = {
        ...form,
        centerId: isTeacherRole ? authUser.centerId || null : form.centerId || null,
        studyingClass: form.studyingClass || null,
      };

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setDialogOpen(false);
        setMessage(data.message || "Student saved successfully.");
        await loadData();
      } else {
        setMessage(data.message || "Unable to save student.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to save student.");
    }
  };

  const handleDelete = async (studentId) => {
    if (!canDeleteStudents) {
      setMessage("You are not authorized to perform this operation.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setMessage(data.message || "Student deleted successfully.");
        await loadData();
      } else {
        setMessage(data.message || "Unable to delete student.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete student.");
    }
  };

  const handleDownloadStudents = async () => {
    try {
      setExporting(true);
      const response = await fetch("/api/admin/students/export", {
        credentials: "include",
      });

      if (!response.ok) {
        let message = "Unable to export students.";
        try {
          const errorData = await response.json();
          message = errorData?.message || message;
        } catch {
          // Ignore non-JSON error payload.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `students-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message || "Unable to export students.");
    } finally {
      setExporting(false);
    }
  };

  const classOptions = useMemo(
    () => {
      const teacherLocked = authUser?.role === "TEACHER";
      const selectedCenterId = teacherLocked ? authUser?.centerId : form.centerId;
      const base = classes.filter((item) => item && item.id);

      const filtered = !selectedCenterId
        ? base
        : base.filter((item) => item.centerId === selectedCenterId || item.centerId == null);

      const normalizedSelectedClassId = resolveClassId(form.studyingClass);
      const selectedClass = base.find((item) => item.id === normalizedSelectedClassId);

      if (selectedClass && !filtered.some((item) => item.id === selectedClass.id)) {
        return [selectedClass, ...filtered];
      }

      return filtered;
    },
    [classes, authUser, form.centerId]
  );

  const teacherLocked = authUser?.role === "TEACHER";
  const canUseCenterFilter = authUser?.role === "ADMIN" || authUser?.role === "MANAGEMENT";

  const centerFilterOptions = useMemo(() => {
    const knownCenters = centers
      .filter((center) => center?.id)
      .map((center) => ({ id: center.id, name: center.name || center.id }));

    const knownCenterIds = new Set(knownCenters.map((center) => center.id));
    const dynamicCenters = students
      .filter((student) => student?.centerId && !knownCenterIds.has(student.centerId))
      .map((student) => ({ id: student.centerId, name: student.centerName || student.centerId }));

    return [{ id: ALL_CENTERS, name: "All" }, ...knownCenters, ...dynamicCenters];
  }, [centers, students]);

  const filteredStudents = useMemo(() => {
    if (!canUseCenterFilter || selectedCenter === ALL_CENTERS) {
      return students;
    }

    return students.filter((student) => (student.centerId || "") === selectedCenter);
  }, [students, canUseCenterFilter, selectedCenter]);

  const centerOptions = useMemo(() => {
    if (!teacherLocked) return centers;
    return centers.filter((center) => center.id === authUser?.centerId);
  }, [centers, teacherLocked, authUser]);

  useEffect(() => {
    if (teacherLocked && authUser?.centerId) {
      setForm((prev) => ({ ...prev, centerId: authUser.centerId }));
    }
  }, [teacherLocked, authUser]);

  useEffect(() => {
    if (!canUseCenterFilter) {
      setSelectedCenter(ALL_CENTERS);
      return;
    }

    const availableCenterIds = new Set(centerFilterOptions.map((center) => center.id));
    if (!availableCenterIds.has(selectedCenter)) {
      setSelectedCenter(ALL_CENTERS);
    }
  }, [canUseCenterFilter, centerFilterOptions, selectedCenter]);

  useEffect(() => {
    if (!dialogOpen || !classes.length || !form.studyingClass) {
      return;
    }

    const normalized = resolveClassId(form.studyingClass);
    if (normalized && normalized !== form.studyingClass) {
      setForm((prev) => ({ ...prev, studyingClass: normalized }));
    }
  }, [dialogOpen, classes, form.studyingClass]);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 3, flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: 18, sm: 20, md: 24 } }}>Manage Students</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 12, sm: 14 } }}>Create and manage student accounts with center and class selection.</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {canUseCenterFilter ? (
            <TextField
              select
              size="small"
              label="Filter By Center"
              value={selectedCenter}
              onChange={(event) => setSelectedCenter(event.target.value)}
              sx={{ minWidth: 220, width: { xs: '100%', sm: 'auto' } }}
              InputLabelProps={{ shrink: true }}
            >
              {centerFilterOptions.map((center) => (
                <MenuItem key={center.id} value={center.id}>
                  {center.name}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <Button variant="outlined" onClick={handleDownloadStudents} disabled={exporting || loading} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {exporting ? "Exporting..." : "Download Excel"}
          </Button>
          {canCreateStudents ? (
            <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Add Student
            </Button>
          ) : null}
        </Stack>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' } }}>
        <Table sx={{ minWidth: { xs: 600, sm: 720 } }}>
          <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Name</TableCell>
              {/* <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Email</TableCell> */}
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Center</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : isTablet ? 5 : 6} align="center" sx={{ py: 4 }}>
                  Loading students...
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : isTablet ? 5 : 6} align="center" sx={{ py: 4 }}>
                  {students.length === 0 ? "No students found." : "No students found for the selected center."}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} hover sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{student.name}</TableCell>
                  {/* <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{student.email}</TableCell> */}
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{student.centerName || "—"}</TableCell>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{student.className || classNameById[student.studyingClass] || "—"}</TableCell>
                  <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    <Chip label={student.status ? "Active" : "Inactive"} color={student.status ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {canEditStudents ? (
                        <IconButton color="primary" onClick={() => openEditDialog(student)} size={isMobile ? "small" : "medium"}>
                          <Edit fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      ) : null}
                      {canDeleteStudents ? (
                        <IconButton color="error" onClick={() => handleDelete(student.id)} size={isMobile ? "small" : "medium"}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth={isMobile ? "xs" : "sm"} fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 16 } }}>{editingStudent ? "Edit Student" : "Create Student"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            />
            {!editingStudent ? null : (
              <>
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  fullWidth
                  size={isMobile ? "small" : "medium"}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  fullWidth
                  helperText="Leave blank to keep the current password"
                />
              </>
            )}
            <TextField
              select
              label="Center"
              value={form.centerId}
              onChange={(e) => setForm({ ...form, centerId: e.target.value })}
              fullWidth
              disabled={teacherLocked}
            >
              {!teacherLocked ? <MenuItem value="">None</MenuItem> : null}
              {centerOptions.map((center) => (
                <MenuItem key={center.id} value={center.id}>
                  {center.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Class"
              value={resolveClassId(form.studyingClass)}
              onChange={(e) => setForm({ ...form, studyingClass: e.target.value })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {classOptions.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.className}
                </MenuItem>
              ))}
            </TextField>
            {editingStudent ? (
              <>
                <TextField
                  label="Date of Birth"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  label="Gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                </TextField>
                <TextField
                  label="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="School Name"
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  fullWidth
                />
              </>
            ) : null}

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
          <Button variant="contained" onClick={handleSubmit} disabled={!canCreateStudents && !editingStudent || editingStudent && !canEditStudents}>
            {editingStudent ? "Save Changes" : "Create Student"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
