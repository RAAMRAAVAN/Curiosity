'use client'
import { Paper, Typography, Box, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setDefaultClass } from "@/redux/features/classSlice";
import { buildClassSlug } from "@/lib/classSlug";
import { useDispatch } from "react-redux";


const ManageClasses = ({ loading, setLoading, setMessage, setAdminView }) => {
    const dispatch = useDispatch();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    
    const [classes, setClasses] = useState([]);
    const [openClassModal, setOpenClassModal] = useState(false);
    const [classForm, setClassForm] = useState({ className: "", icon: "" });
    const [editingClassId, setEditingClassId] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const [navigationPreference, setNavigationPreference] = useState("contents");

    const hasPermission = (permission) => {
        if (String(authUser?.role || '').toUpperCase() === 'ADMIN') return true;
        if (!permission) return true;

        const normalized = Array.isArray(authUser?.permissions)
            ? authUser.permissions.map((item) => String(item || '').toLowerCase())
            : [];

        return normalized.includes('*')
            || normalized.includes(permission)
            || normalized.some((item) => item.endsWith('.*') && permission.startsWith(`${item.slice(0, -2)}.`));
    };

    const isAdminRole = String(authUser?.role || "").toUpperCase() === "ADMIN";
    const canCreateClasses = hasPermission('classes.create');
    const canEditClasses = hasPermission('classes.edit');
    const canDeleteClasses = hasPermission('classes.delete');

    const loadCurrentUser = async () => {
        try {
            const res = await fetch("/api/admin/me", { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                const currentUser = data.data || null;
                setAuthUser(currentUser);
                setNavigationPreference(currentUser?.classNavigationPreference || "contents");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const refreshClasses = async () => {
        try {
            const res = await fetch("/api/admin/classes", { credentials: "include" });
            const d = await res.json();
            if (d.success) setClasses(d.data);
        } catch (e) {
            console.error(e);
        }
    };
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedAuth = sessionStorage.getItem("authDetails");
            if (savedAuth) {
                try {
                    const parsed = JSON.parse(savedAuth);
                    const savedPreference = parsed?.user?.classNavigationPreference || "contents";
                    setNavigationPreference(savedPreference);
                } catch (error) {
                    console.error(error);
                }
            }
        }

        refreshClasses();
        loadCurrentUser();
    }, [])


    const startNewClass = () => {
        setMessage(null);
        setAdminView("classes");
        setDrawerOpen(true);
    };

    const openEditClass = (c) => {
        setEditingClassId(c.id);
        setClassForm({ className: c.className || "", icon: c.icon || "" });

        setOpenClassModal(true);
        setAdminView("classes");
    };

    const handleCreateClass = async (className) => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/classes", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ className }),
            });
            const d = await res.json();
            if (d.success) {
                setMessage(d.message || "Class created");
                await refreshClasses();
            } else setMessage(d.message || "Unable to create class");
        } catch (e) {
            console.error(e);
            setMessage("Unable to create class");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClass = async () => {
        if (!classForm.className) {
            setMessage("Class name is required");
            return;
        }
        setLoading(true);
        try {
            if (editingClassId) {
                const res = await fetch(`/api/admin/classes/${editingClassId}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(classForm),
                });
                const d = await res.json();
                if (d.success) {
                    setMessage(d.message || "Class updated");
                    await refreshClasses();
                    setOpenClassModal(false);
                    setEditingClassId(null);
                } else setMessage(d.message || "Unable to update class");
            } else {
                await handleCreateClass(classForm.className);
                setOpenClassModal(false);
            }
        } catch (e) {
            console.error(e);
            setMessage("Unable to save class");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClass = async (id) => {
        if (!confirm("Delete this class?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/classes/${id}`, { method: "DELETE", credentials: "include" });
            const d = await res.json();
            if (d.success) {
                setMessage(d.message || "Class deleted");
                await refreshClasses();
            } else setMessage(d.message || "Unable to delete class");
        } catch (e) {
            console.error(e);
            setMessage("Unable to delete class");
        } finally {
            setLoading(false);
        }
    };

    const handleNavigation = (url, c) => {
        if (url.startsWith("http")) {
            window.open(url, "_blank");
        } else {
            router.push(url);
        }
    };

    const handlePreferenceChange = async (event) => {
        const value = event.target.value;
        setNavigationPreference(value);

        try {
            await fetch("/api/admin/navigation-preference", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preference: value }),
            });

            if (typeof window !== "undefined") {
                const storedAuth = sessionStorage.getItem("authDetails");
                if (storedAuth) {
                    const parsed = JSON.parse(storedAuth);
                    sessionStorage.setItem("authDetails", JSON.stringify({
                        ...parsed,
                        user: {
                            ...(parsed.user || {}),
                            classNavigationPreference: value,
                        },
                    }));
                }
            }
        } catch (error) {
            console.error(error);
            setMessage("Unable to save the selected view.");
        }
    };

    const handleClassAction = async (c) => {
        dispatch(setDefaultClass(c.className));
        router.push(`/admin/ManageClasses/ManageSubjects/${c.id}/home`);
    };

    return (<>
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 2, flexDirection: { xs: "column", sm: "row" }, gap: { xs: 2, sm: 1 } }}>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 14, sm: 16 } }}>Classes</Typography>
                {isAdminRole || canCreateClasses ? <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", width: { xs: '100%', sm: 'auto' } }}>
                    {isAdminRole ? <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
                        <InputLabel>Default View</InputLabel>
                        <Select label="Default View" value={navigationPreference} onChange={handlePreferenceChange}>
                            <MenuItem value="contents">Class Content</MenuItem>
                            <MenuItem value="assessments">Assessments</MenuItem>
                        </Select>
                    </FormControl> : null}
                    {isAdminRole ? <Button variant="outlined" size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={async () => {
                        if (!confirm("Seed classes 1-12?")) return;
                        setLoading(true);
                        try {
                            const res = await fetch('/api/admin/classes/seed', { method: 'POST', credentials: 'include' });
                            const d = await res.json();
                            if (d.success) {
                                setMessage('Seeded classes 1-12');
                                await refreshClasses();
                            } else setMessage(d.message || 'Seed failed');
                        } catch (e) { console.error(e); setMessage('Seed failed'); }
                        setLoading(false);
                    }}>Seed Classes</Button> : null}
                    {canCreateClasses ? <Button variant="contained" size={isMobile ? "small" : "medium"} sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={() => {
                        const name = prompt("Class name (e.g. Class 1, BSc Computer Science, 4th sem):");
                        if (name) handleCreateClass(name);
                    }}>Create Class</Button> : null}
                </Box> : null}
            </Box>
            <TableContainer sx={{ borderRadius: 3, overflow: "auto", maxHeight: { xs: 'calc(100vh - 300px)', md: 'auto' } }}>
                <Table sx={{ minWidth: { xs: 500, sm: 600 } }}>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f5f8ff" }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Class Name</TableCell>
                            {/* {!isMobile && <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 } }}>Icon</TableCell>} */}
                            <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 }, }}>Edit</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 }, }}>Delete</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 14 }, }}>View Contents</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {classes.map((c) => (
                            <TableRow key={c.id} sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}>
                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{c.className}</TableCell>
                                {/* {!isMobile && <TableCell sx={{ fontSize: { xs: 12, sm: 14 } }}>{c.icon || "-"}</TableCell>} */}
                                <TableCell>
                                        {canEditClasses ? <Button size="small" onClick={() => openEditClass(c)} sx={{ fontSize: { xs: 10, sm: 12 } }}>Edit</Button> : null}
                                </TableCell>
                                <TableCell>
                                        {canDeleteClasses ? <Button size="small" color="error" onClick={() => handleDeleteClass(c.id)} sx={{ fontSize: { xs: 10, sm: 12 } }}>Delete</Button> : null}
                                </TableCell>
                                <TableCell>
                                        <Button size="small" onClick={() => handleClassAction(c)} sx={{ fontSize: { xs: 10, sm: 12 } }}>
                                            View Contents
                                        </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog open={openClassModal} onClose={() => { setOpenClassModal(false); setEditingClassId(null); }} maxWidth={isMobile ? "xs" : "sm"} fullWidth>
                <DialogTitle sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700 }}>{editingClassId ? "Edit Class" : "Create Class"}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <TextField 
                            label="Class Name" 
                            value={classForm.className} 
                            onChange={(e) => setClassForm({ ...classForm, className: e.target.value })} 
                            fullWidth 
                            size={isMobile ? "small" : "medium"}
                        />
                        <TextField 
                            label="Icon URL" 
                            value={classForm.icon} 
                            onChange={(e) => setClassForm({ ...classForm, icon: e.target.value })} 
                            fullWidth 
                            size={isMobile ? "small" : "medium"}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ gap: 1, px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
                    <Button onClick={() => { setOpenClassModal(false); setEditingClassId(null); }} size={isMobile ? "small" : "medium"}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveClass} size={isMobile ? "small" : "medium"}>{editingClassId ? 'Save Changes' : 'Create'}</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    </>);
}
export default ManageClasses;