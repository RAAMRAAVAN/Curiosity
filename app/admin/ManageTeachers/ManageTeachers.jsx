'use client'

import {
    Autocomplete,
    Backdrop,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import AddTeacher from "./AddTeacher";
import DisplayTeachers from "./DisplayTeachers";

const ManageTeachersPage = ({ users }) => {
    const [open, setOpen] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);

    const [form, setForm] = useState({
        user: null,
    });

    const [teachers, setTeachers] = useState([]);

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

    useEffect(() => {
        FetchTeachers();
    }, [])

    return (<Box display='flex' width='100%' padding={3}>
        <Box display='flex' flexDirection='column' width='100%' padding={3} borderRadius={3} backgroundColor='white' boxShadow={3}>
            <Box display='flex' width='100%' justifyContent='space-between'>
                <Typography fontWeight='bold'>Teachers</Typography>
                <Button variant='contained' onClick={() => setOpen(true)}>  Add New Teacher  </Button>
            </Box>
            <Box marginTop={1}>
                <TableContainer sx={{ borderRadius: 3, overflow: "hidden" }}>
                    <Table sx={{ minWidth: 720 }}>
                        <TableHead sx={{ backgroundColor: "#f5f8ff" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Email</TableCell>
                                {/* <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Role</TableCell> */}
                                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Gender</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>DOB</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Map Subjects</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <DisplayTeachers teachers={teachers} setPageLoading={setPageLoading} FetchTeachers={FetchTeachers} />
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
        <AddTeacher open={open} setOpen={setOpen} teachers={teachers} form={form} setForm={setForm} users={users}  pageLoading={pageLoading} setPageLoading={setPageLoading} FetchTeachers={FetchTeachers}/>
        {/* Loader */}
        <Backdrop
            open={pageLoading}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 9999,
                backgroundColor: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(4px)",
            }}
        >
            <CircularProgress
                size={100}
                thickness={4}
            />
        </Backdrop>
    </Box>)
}

export default ManageTeachersPage