'use client'

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from '@/app/(components)/Loader';
import AdminTablePagination from '../AdminTablePagination';
import usePagedData from '../usePagedData';
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { setDefaultClass } from "@/redux/features/classSlice";
import { useDispatch } from "react-redux";

const emptyClassForm = {
    className: "",
    icon: "",
};

const ManageClasses = ({ loading, setLoading, setMessage, setAdminView }) => {
    const dispatch = useDispatch();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const paged = usePagedData({ endpoint: '/api/admin/classes' });
    const classes = paged.rows;
    const [openClassModal, setOpenClassModal] = useState(false);
    const [classForm, setClassForm] = useState(emptyClassForm);
    const [editingClassId, setEditingClassId] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const [navigationPreference, setNavigationPreference] = useState("contents");
    const [classToDelete, setClassToDelete] = useState(null);
    const [deletingClassId, setDeletingClassId] = useState(null);
    const [formMessage, setFormMessage] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);

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
        paged.reload();
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

        loadCurrentUser();
    }, []);

    const startNewClass = () => {
        setMessage(null);
        setFormMessage(null);
        setEditingClassId(null);
        setClassForm(emptyClassForm);
        setOpenClassModal(true);
    };

    const openEditClass = (c) => {
        setEditingClassId(c.id);
        setClassForm({ className: c.className || "", icon: c.icon || "" });
        setFormMessage(null);
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
                setFormMessage({ severity: "success", message: d.message || "Class created" });
                await refreshClasses();
            } else {
                const message = d.message || "Unable to create class";
                setMessage(message);
                setFormMessage({ severity: "error", message });
            }
        } catch (e) {
            console.error(e);
            const message = "Unable to create class";
            setMessage(message);
            setFormMessage({ severity: "error", message });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClass = async () => {
        const trimmedName = classForm.className?.trim();
        if (!trimmedName) {
            const message = "Class name is required.";
            setMessage(message);
            setFormMessage({ severity: "error", message });
            return;
        }

        setLoading(true);
        setFormMessage(null);

        try {
            const payload = {
                ...classForm,
                className: trimmedName,
            };

            if (editingClassId) {
                const res = await fetch(`/api/admin/classes/${editingClassId}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const d = await res.json();
                if (d.success) {
                    const message = d.message || "Class updated";
                    setMessage(message);
                    setFormMessage({ severity: "success", message });
                    await refreshClasses();
                    setOpenClassModal(false);
                    setEditingClassId(null);
                    setClassForm(emptyClassForm);
                } else {
                    const message = d.message || "Unable to update class";
                    setMessage(message);
                    setFormMessage({ severity: "error", message });
                }
            } else {
                await handleCreateClass(trimmedName);
                setOpenClassModal(false);
                setClassForm(emptyClassForm);
                setEditingClassId(null);
            }
        } catch (e) {
            console.error(e);
            const message = "Unable to save class";
            setMessage(message);
            setFormMessage({ severity: "error", message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClass = async (id) => {
        if (!canDeleteClasses) {
            setMessage("You are not authorized to perform this operation.");
            return;
        }

        setClassToDelete(classes.find((item) => item.id === id) || null);
    };

    const confirmDeleteClass = async () => {
        if (!classToDelete) return;

        const id = classToDelete.id;
        setDeletingClassId(id);
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/admin/classes/${id}`, { method: "DELETE", credentials: "include" });
            const d = await res.json();
            if (d.success) {
                setMessage(d.message || "Class deleted");
                await refreshClasses();
            } else {
                setMessage(d.message || "Unable to delete class");
            }
        } catch (e) {
            console.error(e);
            setMessage("Unable to delete class");
        } finally {
            setLoading(false);
            setDeletingClassId(null);
            setClassToDelete(null);
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

    const handleRowAction = (action) => {
        const selectedClass = actionMenu?.classItem;
        setActionMenu(null);
        if (!selectedClass) return;

        if (action === 'edit') openEditClass(selectedClass);
        if (action === 'delete') handleDeleteClass(selectedClass.id);
        if (action === 'open') handleClassAction(selectedClass);
    };

    const renderRowActionItems = () => (
        <>
            {canEditClasses ? (
                <MenuItem onClick={() => handleRowAction('edit')} sx={{ minHeight: isMobile ? 56 : 42, gap: 1, borderRadius: 1.5, color: '#16436f' }}>
                    <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Edit class" />
                </MenuItem>
            ) : null}
            {canDeleteClasses ? (
                <MenuItem
                    onClick={() => handleRowAction('delete')}
                    disabled={loading || deletingClassId === actionMenu?.classItem?.id}
                    sx={{ minHeight: isMobile ? 56 : 42, gap: 1, borderRadius: 1.5, color: '#b91c1c' }}
                >
                    <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}><DeleteIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Delete class" />
                </MenuItem>
            ) : null}
            <MenuItem onClick={() => handleRowAction('open')} sx={{ minHeight: isMobile ? 56 : 42, gap: 1, borderRadius: 1.5, color: '#16436f' }}>
                <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}><VisibilityOutlinedIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Open class" />
            </MenuItem>
        </>
    );

    return (
        <Box sx={{ width: '100%', minWidth: 0, pb: { xs: 12, sm: 10 } }}>
            <Paper sx={{ p: { xs: 1, sm: 3 }, mb: 4, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: "0 20px 48px rgba(15, 23, 42, 0.08)" } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 2, flexDirection: { xs: "column", sm: "row" }, flexWrap: 'wrap', gap: { xs: 2, sm: 1 } }}>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: 0, sm: 16 } }}>Classes</Typography>
                    {isAdminRole || canCreateClasses ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", width: { xs: '100%', sm: 'auto' } }}>
                            {isAdminRole ? (
                                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
                                    <InputLabel>Default View</InputLabel>
                                    <Select label="Default View" value={navigationPreference} onChange={handlePreferenceChange}>
                                        <MenuItem value="contents">Class Content</MenuItem>
                                        <MenuItem value="assessments">Assessments</MenuItem>
                                    </Select>
                                </FormControl>
                            ) : null}
                            {canCreateClasses ? (
                                <Button
                                    variant="contained"
                                    size={isMobile ? "small" : "medium"}
                                    onClick={startNewClass}
                                    sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                        display: { xs: 'none', sm: 'inline-flex' },
                                        backgroundColor: '#0a336b',
                                        color: '#ffffff',
                                        '&:hover': { backgroundColor: '#082b57' },
                                    }}
                                >
                                    Create Class
                                </Button>
                            ) : null}
                        </Box>
                    ) : null}
                </Box>

                <TextField size="small" label="Search classes" value={paged.search} onChange={(event) => paged.setSearch(event.target.value)} sx={{ mb: 2, width: { xs: '100%', sm: 320 }, maxWidth: '100%' }} />

                <TableContainer sx={{ maxWidth: '100%', overflow: "auto", maxHeight: { xs: 'calc(100dvh - 300px)', md: 'calc(100dvh - 280px)' }, background: 'linear-gradient(180deg, #edf7ff 0%, #eef6ff 35%, #f4ecff 100%)', border: '1px solid rgba(59, 130, 246, 0.18)' }}>
                    <Table stickyHeader sx={{ width: '100%', minWidth: { xs: 0, sm: 700 }, tableLayout: 'fixed', backgroundColor: '#f5f9ff', whiteSpace: 'nowrap' }}>
                        <TableHead sx={{ '& .MuiTableCell-head': { position: 'sticky', top: 0, zIndex: 2, color: '#ffffff', backgroundColor: '#0a336b' } }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Class Name</TableCell>
                                {!isMobile && (
                                    <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Icon</TableCell>
                                )}
                                {!isTablet && (
                                    <TableCell sx={{ fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Default View</TableCell>
                                )}
                                <TableCell align="right" sx={{ width: { xs: 76, sm: 96 }, minWidth: { xs: 76, sm: 96 }, px: { xs: 1, sm: 1.5 }, pr: { xs: 1.5, sm: 3 }, fontWeight: 700, color: '#ffffff', fontSize: { xs: 12, sm: 14 } }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {classes.map((c, index) => {
                                const rowTint = index % 2 === 0 ? '#f8fbff' : '#eef6ff';
                                const rowActionsOpen = actionMenu?.classItem?.id === c.id;

                                return (
                                    <TableRow key={c.id} sx={{ backgroundColor: rowTint, '&:hover': { backgroundColor: '#eaf3ff' } }}>
                                            <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint, fontWeight: 600 }}>
                                                Class {c.className}
                                            </TableCell>
                                            {!isMobile && (
                                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint }}>
                                                    {c.icon ? (
                                                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 20, height: 20, display: 'grid', placeItems: 'center', borderRadius: '50%', backgroundColor: '#dbeafe', fontSize: 12 }}>
                                                                {String(c.icon).slice(0, 1).toUpperCase()}
                                                            </Box>
                                                            {c.icon}
                                                        </Box>
                                                    ) : '-'}
                                                </TableCell>
                                            )}
                                            {!isTablet && (
                                                <TableCell sx={{ fontSize: { xs: 12, sm: 14 }, backgroundColor: rowTint }}>
                                                    {navigationPreference === 'assessments' ? 'Assessments' : 'Class Content'}
                                                </TableCell>
                                            )}
                                            <TableCell align="right" sx={{ width: { xs: 76, sm: 96 }, minWidth: { xs: 76, sm: 96 }, px: { xs: 1, sm: 1.5 }, pr: { xs: 1.5, sm: 3 }, backgroundColor: rowTint }}>
                                                <Tooltip title={`Actions for Class ${c.className}`} arrow>
                                                    <IconButton
                                                        size="small"
                                                        aria-label={`Actions for Class ${c.className}`}
                                                        aria-haspopup={isMobile ? 'dialog' : 'menu'}
                                                        aria-expanded={rowActionsOpen}
                                                        aria-controls={rowActionsOpen && !isMobile ? `class-actions-menu-${c.id}` : undefined}
                                                        onClick={(event) => setActionMenu((current) => (
                                                            current?.classItem?.id === c.id
                                                                ? null
                                                                : { anchorEl: event.currentTarget, classItem: c }
                                                        ))}
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            color: '#16436f',
                                                            backgroundColor: rowActionsOpen ? '#dceeff' : 'transparent',
                                                            '&:hover': { backgroundColor: '#e5f1fc' },
                                                        }}
                                                    >
                                                        <EditOutlinedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                );
                            })}
                            {classes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isMobile ? 3 : isTablet ? 4 : 4} align="center" sx={{ py: 4 }}>
                                        No classes available yet.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>
                {isMobile ? (
                    <Drawer
                        anchor="bottom"
                        open={Boolean(actionMenu?.anchorEl)}
                        onClose={() => setActionMenu(null)}
                        sx={{
                            '& .MuiDrawer-paper': {
                                maxHeight: '70dvh',
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                boxShadow: '0 -12px 36px rgba(8, 43, 87, 0.18)',
                            },
                        }}
                    >
                        <Box sx={{ px: 2, pt: 1.5, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
                            <Box sx={{ width: 36, height: 4, mx: 'auto', mb: 1.5, borderRadius: 2, backgroundColor: '#cbd5e1' }} />
                            <Typography variant="subtitle1" fontWeight={700} sx={{ px: 1, pb: 1, color: '#102f4f' }}>
                                Class {actionMenu?.classItem?.className}
                            </Typography>
                            <Divider sx={{ mb: 1 }} />
                            {renderRowActionItems()}
                        </Box>
                    </Drawer>
                ) : (
                    <Menu
                        id={actionMenu?.classItem ? `class-actions-menu-${actionMenu.classItem.id}` : undefined}
                        anchorEl={actionMenu?.anchorEl}
                        open={Boolean(actionMenu?.anchorEl)}
                        onClose={() => setActionMenu(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{
                            paper: {
                                sx: {
                                    minWidth: 184,
                                    mt: 0.75,
                                    p: 0.5,
                                    overflow: 'hidden',
                                    border: '1px solid #bfd1e3',
                                    borderLeft: '4px solid #0a336b',
                                    borderRadius: 2,
                                    boxShadow: '0 18px 42px rgba(8, 43, 87, 0.24)',
                                    '& .MuiMenuItem-root': {
                                        minHeight: 42,
                                        mx: 0.25,
                                        px: 1.25,
                                        borderRadius: 1.25,
                                        transition: 'background-color 140ms ease',
                                        '&:hover': { backgroundColor: '#edf5fc' },
                                    },
                                },
                            },
                        }}
                    >
                        {renderRowActionItems()}
                    </Menu>
                )}
                <AdminTablePagination {...paged.paginationProps} />
            </Paper>

            <Dialog
                open={Boolean(classToDelete)}
                onClose={() => {
                    if (!deletingClassId) setClassToDelete(null);
                }}
                maxWidth="xs"
                fullWidth
                scroll="paper"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        border: '1px solid rgba(185, 28, 28, 0.16)',
                        boxShadow: '0 20px 54px rgba(127, 29, 29, 0.22)',
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, color: '#ffffff', bgcolor: '#b91c1c' }}>
                    Delete class?
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                        This action permanently removes the selected class and its content structure.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        {classToDelete ? `Class ${classToDelete.className}` : 'This class'} will be deleted.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setClassToDelete(null)} disabled={Boolean(deletingClassId)} color="inherit">
                        Keep Class
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDeleteClass}
                        disabled={Boolean(deletingClassId)}
                        startIcon={deletingClassId ? <Loader variant='inline' size={16} color='inherit' /> : <DeleteIcon />}
                    >
                        {deletingClassId ? 'Deleting...' : 'Delete Class'}
                    </Button>
                </DialogActions>
            </Dialog>

            {canCreateClasses ? (
                <Box
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: (theme) => theme.zIndex.fab,
                        pb: 'env(safe-area-inset-bottom)',
                    }}
                >
                    <Button
                        variant="contained"
                        onClick={startNewClass}
                        disabled={loading}
                        sx={{
                            width: '100%',
                            minHeight: 56,
                            borderRadius: 0,
                            backgroundColor: '#0a336b',
                            color: '#ffffff',
                            '&:hover': { backgroundColor: '#082b57' },
                        }}
                    >
                        Create Class
                    </Button>
                </Box>
            ) : null}

            <Dialog
                open={openClassModal}
                onClose={() => {
                    setOpenClassModal(false);
                    setEditingClassId(null);
                    setFormMessage(null);
                }}
                fullWidth
                scroll="paper"
                maxWidth={isMobile ? 'xs' : 'sm'}
                sx={{
                    '& .MuiDialog-paper': {
                        margin: { xs: 1, sm: 4 },
                        width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
                        borderRadius: isMobile ? 0 : 3,
                        border: '1px solid rgba(8, 43, 87, 0.16)',
                        boxShadow: '0 24px 70px rgba(2, 24, 54, 0.28)',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1.75, sm: 2.25 },
                    fontWeight: 700,
                    color: '#ffffff',
                    fontSize: { xs: 14, sm: 18 },
                    background: 'linear-gradient(135deg, #082b57 0%, #0d4678 100%)',
                    boxShadow: '0 4px 16px rgba(2, 24, 54, 0.2)',
                }}>
                    {editingClassId ? "Edit Class" : "Create Class"}
                    <IconButton aria-label="Close class dialog" onClick={() => {
                        setOpenClassModal(false);
                        setEditingClassId(null);
                        setFormMessage(null);
                    }} disabled={loading} sx={{ color: '#ffffff' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{
                    pt: 2.5,
                    backgroundColor: '#f8fbff',
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#ffffff',
                        transition: 'box-shadow 160ms ease, border-color 160ms ease',
                        '&:hover': { boxShadow: '0 4px 14px rgba(8, 43, 87, 0.08)' },
                        '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(13, 70, 120, 0.14)' },
                    },
                }}>
                    <Typography variant="body2" color="text.secondary" mb={2} sx={{ fontSize: { xs: 12, sm: 14 } }}>
                        {editingClassId ? 'Update class details and save your changes.' : 'Create a new class and define its default view.'}
                    </Typography>
                    {formMessage ? (
                        <Alert severity={formMessage.severity} sx={{ mb: 2 }}>
                            {formMessage.message}
                        </Alert>
                    ) : null}
                    <Box sx={{ display: 'grid', gap: 2 }}>
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
                            helperText="Optional icon or short label for this class."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1.5, sm: 2 },
                    gap: 1,
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid rgba(8, 43, 87, 0.1)',
                    boxShadow: '0 -5px 18px rgba(8, 43, 87, 0.06)',
                }}>
                    <Button
                        variant="contained"
                        onClick={handleSaveClass}
                        size={isMobile ? "small" : "medium"}
                        disabled={loading}
                        sx={{
                            minHeight: 40,
                            width: { xs: '100%', sm: 'auto' },
                            backgroundColor: '#0a336b',
                            color: '#ffffff',
                            '&:hover': { backgroundColor: '#082b57' },
                        }}
                    >
                        {loading ? <Loader variant='inline' size={20} color='inherit' /> : editingClassId ? 'Save Changes' : 'Create Class'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ManageClasses;