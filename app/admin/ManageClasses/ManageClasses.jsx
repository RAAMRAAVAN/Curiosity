'use client'
import { Paper, Typography, Box, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setDefaultClass } from "@/redux/features/classSlice";
import { buildClassSlug } from "@/lib/classSlug";
import { useDispatch } from "react-redux";


const ManageClasses = ({ loading, setLoading, setMessage, setAdminView }) => {
    const dispatch = useDispatch();
    const router = useRouter();
    const [classes, setClasses] = useState([]);
    const [openClassModal, setOpenClassModal] = useState(false);
    const [classForm, setClassForm] = useState({ className: "", icon: "" });
    const [editingClassId, setEditingClassId] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const [navigationPreference, setNavigationPreference] = useState("contents");

    const isAdminRole = String(authUser?.role || "").toUpperCase() === "ADMIN";

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
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Classes</Typography>
                {isAdminRole ? <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Default View</InputLabel>
                        <Select label="Default View" value={navigationPreference} onChange={handlePreferenceChange}>
                            <MenuItem value="contents">Class Content</MenuItem>
                            <MenuItem value="assessments">Assessments</MenuItem>
                        </Select>
                    </FormControl>
                    <Button variant="outlined" sx={{ mr: 1 }} onClick={async () => {
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
                    }}>Seed Classes</Button>
                    <Button variant="contained" onClick={() => {
                        const name = prompt("Class name (e.g. Class 1, BSc Computer Science, 4th sem):");
                        if (name) handleCreateClass(name);
                    }}>Create Class</Button>
                </Box> : null}
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Class Name</TableCell>
                            <TableCell>Icon</TableCell>
                            <TableCell>Edit</TableCell>
                            <TableCell>Delete</TableCell>
                            <TableCell>Open</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {classes.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell>{c.className}</TableCell>
                                <TableCell>{c.icon || "-"}</TableCell>
                                <TableCell>
                                    <Button size="small" onClick={() => openEditClass(c)} sx={{ mr: 1 }}>Edit</Button>

                                </TableCell>
                                <TableCell><Button size="small" color="error" onClick={() => handleDeleteClass(c.id)}>Delete</Button></TableCell>
                                <TableCell>
                                    <Button size="small" onClick={() => handleClassAction(c)}>
                                        View Class Contents
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog open={openClassModal} onClose={() => { setOpenClassModal(false); setEditingClassId(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>{editingClassId ? "Edit Class" : "Create Class"}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                        <TextField label="Class Name" value={classForm.className} onChange={(e) => setClassForm({ ...classForm, className: e.target.value })} fullWidth />
                        <TextField label="Icon URL" value={classForm.icon} onChange={(e) => setClassForm({ ...classForm, icon: e.target.value })} fullWidth />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenClassModal(false); setEditingClassId(null); }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveClass}>{editingClassId ? 'Save Changes' : 'Create'}</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    </>);
}
export default ManageClasses;