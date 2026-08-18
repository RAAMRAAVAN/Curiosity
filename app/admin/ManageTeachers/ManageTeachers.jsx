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
    useMediaQuery,
    useTheme,
} from "@mui/material";

import { useEffect, useMemo, useState } from "react";
import DisplayTeachers from "./DisplayTeachers";
import TeacherSubjectDialog from "./TeacherSubjectDialog";

const ALL_CENTERS = "ALL";

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

const ManageTeachersPage = ({ users, role, permissions = [] }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    
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
    const [selectedCenter, setSelectedCenter] = useState(ALL_CENTERS);

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

    const canViewTeachers = hasPermission('teachers.view');
    const canCreateTeachers = hasPermission('teachers.create');
    const canEditTeachers = hasPermission('teachers.edit');
    const canDeleteTeachers = hasPermission('teachers.delete');
    const canMapSubjects = hasPermission('teachers.edit');

    const teacherLocked = authUser?.role === "TEACHER";

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

    const canUseCenterFilter = authUser?.role === "ADMIN" || authUser?.role === "MANAGEMENT";
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

    const centerFilterOptions = useMemo(() => {
        const knownCenters = centers
            .filter((center) => center?.id)
            .map((center) => ({ id: center.id, name: center.name || center.id }));

        const knownCenterIds = new Set(knownCenters.map((center) => center.id));
        const dynamicCenters = teachers
            .filter((teacher) => teacher?.centerId && !knownCenterIds.has(teacher.centerId))
            .map((teacher) => ({ id: teacher.centerId, name: teacher.centerName || teacher.centerId }));

        return [{ id: ALL_CENTERS, name: "All" }, ...knownCenters, ...dynamicCenters];
    }, [centers, teachers]);

    const filteredTeachers = useMemo(() => {
        if (!canUseCenterFilter || selectedCenter === ALL_CENTERS) {
            return teachers;
        }

        return teachers.filter((teacher) => (teacher.centerId || "") === selectedCenter);
    }, [teachers, canUseCenterFilter, selectedCenter]);

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

    return (
        <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', p: { xs: 2, sm: 3 }, borderRadius: 3, backgroundColor: 'white', boxShadow: 3 }}>
                <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Typography fontWeight='bold' sx={{ fontSize: { xs: 14, sm: 16 } }}>Teachers</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
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
                                    <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>
                                ))}
                            </TextField>
                        ) : null}
                        <Button variant='outlined' onClick={handleDownloadTeachers} disabled={exporting || pageLoading} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                            {exporting ? "Exporting..." : "Download Excel"}
                        </Button>
                        {canCreateTeachers ? (
                            <Button variant='contained' onClick={openCreateDialog} size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }}>Add New Teacher</Button>
                        ) : null}
                    </Stack>
                </Box>
                <Box sx={{ marginTop: 2, overflow: 'auto' }}>
                    <TableContainer sx={{ borderRadius: 3, overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' } }}>
                        <Table sx={{ minWidth: { xs: 600, sm: 720 } }}>
                            <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Center</TableCell>
                                    {/* {!isTablet && <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Classes</TableCell>}
                                    {!isTablet && <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Gender</TableCell>}
                                    {!isMobile && <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Phone</TableCell>}
                                    {!isMobile && <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>DOB</TableCell>} */}
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Map Subjects</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Edit / Delete</TableCell>
                                    {/* <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: { xs: 12, sm: 14 } }}>Delete</TableCell> */}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <DisplayTeachers
                                teachers={filteredTeachers}
                                setPageLoading={setPageLoading}
                                FetchTeachers={FetchTeachers}
                                onEditTeacher={openEditDialog}
                                canEditTeachers={canEditTeachers}
                                canDeleteTeachers={canDeleteTeachers}
                                canMapSubjects={canMapSubjects}
                            />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth={isMobile ? "xs" : "md"}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 16 } }}>{editingTeacher ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
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
                        <TextField
                            select
                            label="Center"
                            value={form.centerId}
                            onChange={(e) => setForm({ ...form, centerId: e.target.value })}
                            fullWidth
                            disabled={teacherLocked}
                            size={isMobile ? "small" : "medium"}
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
                                    size={isMobile ? "small" : "medium"}
                                    helperText="Leave blank to keep the current email"
                                />
                                <TextField
                                    label="Password"
                                    type="password"
                                    value={form.password || ""}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    fullWidth
                                    size={isMobile ? "small" : "medium"}
                                    helperText="Leave blank to keep the current password"
                                />
                                <TextField 
                                    label="Date of Birth" 
                                    type="date" 
                                    value={form.dob} 
                                    onChange={(e) => setForm({ ...form, dob: e.target.value })} 
                                    fullWidth 
                                    size={isMobile ? "small" : "medium"}
                                    InputLabelProps={{ shrink: true }} 
                                />
                                <TextField 
                                    select 
                                    label="Gender" 
                                    value={form.gender} 
                                    onChange={(e) => setForm({ ...form, gender: e.target.value })} 
                                    fullWidth
                                    size={isMobile ? "small" : "medium"}
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
                                    size={isMobile ? "small" : "medium"}
                                />
                                <TextField 
                                    label="Address" 
                                    value={form.address} 
                                    onChange={(e) => setForm({ ...form, address: e.target.value })} 
                                    fullWidth 
                                    multiline 
                                    rows={2}
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
                                {canMapSubjects ? (
                                    <Button 
                                        variant="outlined" 
                                        onClick={() => { setSelectedTeacherId(editingTeacher.id); setSubjectDialogOpen(true); }}
                                        size={isMobile ? "small" : "medium"}
                                        fullWidth
                                    >
                                        Manage Subjects
                                    </Button>
                                ) : null}
                            </>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ gap: 1, px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
                    <Button onClick={() => setOpen(false)} size={isMobile ? "small" : "medium"}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={pageLoading} size={isMobile ? "small" : "medium"}>{editingTeacher ? "Save Changes" : "Create Teacher"}</Button>
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