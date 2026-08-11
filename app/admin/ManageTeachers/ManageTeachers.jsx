'use client'

import {
    Backdrop,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
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

import { useEffect, useMemo, useState } from "react";
import DisplayTeachers from "./DisplayTeachers";
import TeacherSubjectDialog from "./TeacherSubjectDialog";

const emptyForm = {
    name: "",
    email: "",
    password: "",
    centerId: "",
    gender: "",
    phone: "",
    address: "",
    dob: "",
    status: true,
};

const ManageTeachersPage = ({ users }) => {
    const [open, setOpen] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [centers, setCenters] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const [exporting, setExporting] = useState(false);

    const ensureCentersLoaded = async () => {
        if (centers.length > 0) return;

        try {
            const centersRes = await fetch("/api/admin/centers", { credentials: "include" });
            const centersData = await centersRes.json();
            if (centersData.success) {
                setCenters(centersData.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        const lockedCenterId = authUser?.role === "TEACHER" ? authUser.centerId || "" : "";
        setForm({ ...emptyForm, centerId: lockedCenterId });
    };

    const openCreateDialog = () => {
        setEditingTeacher(null);
        resetForm();
        ensureCentersLoaded();
        setOpen(true);
    };

    const openEditDialog = async (teacher) => {
        try {
            setPageLoading(true);
            const response = await fetch(`/api/admin/teachers/${teacher.id}`, { credentials: "include" });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to load teacher details.");
            }

            const details = data.data || {};
            setEditingTeacher(details);

            await ensureCentersLoaded();

            if (details.centerId && details.centerName) {
                setCenters((prev) => {
                    const exists = prev.some((center) => center.id === details.centerId);
                    if (exists) return prev;
                    return [...prev, { id: details.centerId, name: details.centerName }];
                });
            }

            setForm({
                name: details.name || "",
                email: details.email || "",
                password: "",
                centerId: details.centerId || "",
                gender: details.gender || "",
                phone: details.phone || "",
                address: details.address || "",
                dob: details.dob || "",
                status: details.status ?? true,
            });
            setOpen(true);
        } catch (error) {
            console.error(error);
            setEditingTeacher(teacher);

            await ensureCentersLoaded();

            if (teacher.centerId && teacher.centerName) {
                setCenters((prev) => {
                    const exists = prev.some((center) => center.id === teacher.centerId);
                    if (exists) return prev;
                    return [...prev, { id: teacher.centerId, name: teacher.centerName }];
                });
            }

            setForm({
                name: teacher.name || "",
                email: teacher.email || "",
                password: "",
                centerId: teacher.centerId || "",
                gender: teacher.gender || "",
                phone: teacher.phone || "",
                address: teacher.address || "",
                dob: teacher.dob || "",
                status: teacher.status ?? true,
            });
            setOpen(true);
            alert(error.message || "Unable to load full teacher details. Showing available data.");
        } finally {
            setPageLoading(false);
        }
    };

    const FetchTeachers = async (showLoader = true) => {
        if (showLoader) setPageLoading(true);

        try {
            const res = await fetch("/api/admin/teachers", {
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message);
            }

            setTeachers(data.data);
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            if (showLoader) {
                setPageLoading(false);
            }
        }
    };

    const fetchMeta = async () => {
        try {
            const [meRes, centersRes] = await Promise.all([
                fetch("/api/admin/me", { credentials: "include" }),
                fetch("/api/admin/centers", { credentials: "include" }),
            ]);

            const meData = await meRes.json();
            const centersData = await centersRes.json();

            if (meData.success) setAuthUser(meData.data || null);
            if (centersData.success) setCenters(centersData.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        if (!form.name) {
            alert("Name is required.");
            return;
        }

        setPageLoading(true);

        try {
            const isTeacherRole = authUser?.role === "TEACHER";
            const payload = editingTeacher
                ? {
                    ...form,
                    centerId: isTeacherRole ? authUser.centerId || null : form.centerId || null,
                }
                : {
                    name: form.name,
                    centerId: isTeacherRole ? authUser.centerId || null : form.centerId || null,
                };

            const method = editingTeacher ? "PATCH" : "POST";
            const url = editingTeacher ? `/api/admin/teachers/${editingTeacher.id}` : "/api/admin/teachers";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message);
            }

            setOpen(false);
            setEditingTeacher(null);
            resetForm();
            await FetchTeachers(false);
            alert(data.message || "Teacher saved successfully.");
        } catch (err) {
            alert(err.message);
        } finally {
            setPageLoading(false);
        }
    };

    const handleDownloadTeachers = async () => {
        try {
            setExporting(true);
            const res = await fetch("/api/admin/teachers/export", {
                credentials: "include",
            });

            if (!res.ok) {
                let message = "Unable to export teachers.";
                try {
                    const errorData = await res.json();
                    message = errorData?.message || message;
                } catch {
                    // Ignore non-JSON error payload.
                }
                throw new Error(message);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `teachers-${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(error.message || "Unable to export teachers.");
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        FetchTeachers();
        fetchMeta();
    }, []);

    useEffect(() => {
        if (authUser?.role === "TEACHER" && authUser.centerId) {
            setForm((prev) => ({ ...prev, centerId: authUser.centerId }));
        }
    }, [authUser]);

    const teacherLocked = authUser?.role === "TEACHER";
    const lockedCenterId = authUser?.centerId || "";
    const centerOptions = useMemo(() => {
        const available = teacherLocked
            ? centers.filter((center) => center.id === lockedCenterId)
            : centers;

        if (!form.centerId) return available;

        const hasSelectedCenter = available.some((center) => center.id === form.centerId);
        if (hasSelectedCenter) return available;

        return [...available, { id: form.centerId, name: editingTeacher?.centerName || form.centerId }];
    }, [centers, teacherLocked, lockedCenterId, form.centerId, editingTeacher]);
    return (
        <Box display='flex' width='100%' padding={3}>
            <Box display='flex' flexDirection='column' width='100%' padding={3} borderRadius={3} backgroundColor='white' boxShadow={3}>
                <Box display='flex' width='100%' justifyContent='space-between' alignItems='center'>
                    <Typography fontWeight='bold'>Teachers</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button variant='outlined' onClick={handleDownloadTeachers} disabled={exporting || pageLoading}>
                            {exporting ? "Exporting..." : "Download Excel"}
                        </Button>
                        <Button variant='contained' onClick={openCreateDialog}>Add New Teacher</Button>
                    </Stack>
                </Box>
                <Box marginTop={1}>
                    <TableContainer sx={{ borderRadius: 3, overflow: "hidden" }}>
                        <Table sx={{ minWidth: 720 }}>
                            <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Center</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Classes</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Gender</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Phone</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>DOB</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Map Subjects</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <DisplayTeachers teachers={teachers} setPageLoading={setPageLoading} FetchTeachers={FetchTeachers} onEditTeacher={openEditDialog} />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
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
                                <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>
                            ))}
                        </TextField>
                        {editingTeacher ? (
                            <>
                                <TextField
                                    label="Email"
                                    type="email"
                                    value={form.email || ""}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    fullWidth
                                    helperText="Leave blank to keep the current email"
                                />
                                <TextField
                                    label="Password"
                                    type="password"
                                    value={form.password || ""}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    fullWidth
                                    helperText="Leave blank to keep the current password"
                                />
                                <TextField label="Date of Birth" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
                                <TextField select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} fullWidth>
                                    <MenuItem value="">None</MenuItem>
                                    <MenuItem value="Male">Male</MenuItem>
                                    <MenuItem value="Female">Female</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                    <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                                </TextField>
                                <TextField label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
                                <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth multiline rows={2} />
                                <TextField select label="Status" value={form.status ? "active" : "inactive"} onChange={(e) => setForm({ ...form, status: e.target.value === "active" })} SelectProps={{ native: true }} fullWidth>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </TextField>
                                <Button variant="outlined" onClick={() => { setSelectedTeacherId(editingTeacher.id); setSubjectDialogOpen(true); }}>
                                    Manage Subjects
                                </Button>
                            </>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={pageLoading}>{editingTeacher ? "Save Changes" : "Create Teacher"}</Button>
                </DialogActions>
            </Dialog>

            <TeacherSubjectDialog open={subjectDialogOpen} setOpen={setSubjectDialogOpen} teacherId={selectedTeacherId} setPageLoading={setPageLoading} />

            <Backdrop
                open={pageLoading}
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 9999,
                    backgroundColor: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(4px)",
                }}
            >
                <CircularProgress size={100} thickness={4} />
            </Backdrop>
        </Box>
    );
};

export default ManageTeachersPage