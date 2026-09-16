"use client";

import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Snackbar,
    Typography,
} from "@mui/material";

import { useEffect, useState } from "react";

const TeacherClassDialog = ({ open, setOpen, teacherId, setPageLoading }) => {
    const [classes, setClasses] = useState([]);
    const [selected, setSelected] = useState([]);
    const [alert, setAlert] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        if (open && teacherId) {
            initializeDialog();
        }
    }, [open, teacherId]);

    const fetchClasses = async () => {
        try {
            const res = await fetch("/api/admin/classes", { credentials: "include" });
            const data = await res.json();
            if (data.success) {
                setClasses(data.data || []);
                return data.data || [];
            }
            return [];
        } catch (error) {
            console.error("Fetch classes error:", error);
            return [];
        }
    };

    const loadAssignedClasses = async (teacherId) => {
        if (!teacherId) {
            setSelected([]);
            return;
        }

        try {
            const res = await fetch(`/api/admin/teachers/${teacherId}`, { credentials: "include" });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Unable to load assigned classes");
            }

            setSelected(Array.isArray(data.data?.classIds) ? data.data.classIds : []);
        } catch (error) {
            console.error("Load assigned classes error:", error);
            setSelected([]);
        }
    };

    const initializeDialog = async () => {
        try {
            setPageLoading(true);
            await Promise.all([fetchClasses(), loadAssignedClasses(teacherId)]);
        } catch (error) {
            console.error("Dialog initialization error:", error);
        } finally {
            setPageLoading(false);
        }
    };

    const toggleClass = (classId) => {
        setSelected((prev) =>
            prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
        );
    };

    const selectAll = () => setSelected(classes.map((item) => item.id));
    const deselectAll = () => setSelected([]);

    const save = async () => {
        try {
            if (!teacherId) {
                setAlert({ open: true, message: "Teacher is required", severity: "error" });
                return;
            }

            setPageLoading(true);

            const res = await fetch(`/api/admin/teachers/${teacherId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ classIds: selected }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to map classes");
            }

            setAlert({ open: true, message: data.message || "Classes mapped successfully", severity: "success" });
            setOpen(false);
        } catch (error) {
            console.error("Save Error:", error);
            setAlert({ open: true, message: error.message || "Something went wrong", severity: "error" });
        } finally {
            setPageLoading(false);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Map Classes</DialogTitle>
                <DialogContent dividers sx={{ overflowY: "auto" }}>
                    <Box display="flex" gap={2} mb={2}>
                        <Button variant="outlined" onClick={selectAll}>Select All</Button>
                        <Button variant="outlined" onClick={deselectAll}>Deselect All</Button>
                    </Box>

                    {classes.length === 0 ? (
                        <Typography color="text.secondary">No classes available.</Typography>
                    ) : (
                        classes.map((item) => (
                            <FormControlLabel
                                key={item.id}
                                sx={{ display: "flex", ml: 0 }}
                                control={
                                    <Checkbox
                                        checked={selected.includes(item.id)}
                                        onChange={() => toggleClass(item.id)}
                                    />
                                }
                                label={item.className}
                            />
                        ))
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={save}>Save</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={alert.open}
                autoHideDuration={4000}
                onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
            >
                <Alert severity={alert.severity} onClose={() => setAlert((prev) => ({ ...prev, open: false }))}>
                    {alert.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default TeacherClassDialog;
