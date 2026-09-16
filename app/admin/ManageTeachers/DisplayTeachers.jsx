import { Delete, Edit, MenuBook, School } from "@mui/icons-material";
import { Button, CircularProgress, Typography, IconButton, Stack, TableCell, TableRow, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import TeacherSubjectDialog from "./TeacherSubjectDialog";
import TeacherClassDialog from "./TeacherClassDialog";

const DisplayTeachers = ({ teachers, setPageLoading, FetchTeachers, onEditTeacher, canEditTeachers = false, canDeleteTeachers = false, canMapSubjects = false, canMapClasses = false }) => {

    const [subjects, setSubjects] = useState([]);
    const [subjectLoading, setSubjectsLoading] = useState(false);
    const [subjectDialog, setSubjectDialog] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [classDialog, setClassDialog] = useState(false);
    const [selectedClassTeacher, setSelectedClassTeacher] = useState(null);


    const FetchAllSubjects = async () => {

        setSubjectsLoading(true);

        try {

            const res = await fetch("/api/subjects", {
                method: "GET",
                credentials: "include",
            });


            const data = await res.json();


            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load subjects");
            }


            setSubjects(data.data);


        } catch (error) {

            alert(error.message);

        } finally {

            setSubjectsLoading(false);

        }
    }



    const handleDeleteTeacher = async (teacherId) => {

        if (!canDeleteTeachers) {
            alert("You are not authorized to perform this operation.");
            return;
        }

        if (!confirm("Are you sure you want to remove this teacher?")) {
            return;
        }


        setPageLoading(true);


        try {

            const res = await fetch(`/api/admin/teachers/${teacherId}`, {
                method: "DELETE",
                credentials: "include",
            });


            const data = await res.json();


            if (!res.ok || !data.success) {
                throw new Error(data.message);
            }


            alert(data.message);

            await FetchTeachers(false);


        } catch (error) {

            alert(error.message);

        } finally {

            setPageLoading(false);

        }
    };



    useEffect(() => {

        FetchAllSubjects();

    }, []);



    return (
        <>
            {teachers.map((teacher) => (

                <TableRow
                    key={teacher.id}
                    sx={{ '&:hover': { backgroundColor: '#f8fbff' } }}
                >

                    <TableCell>{teacher.name}</TableCell>

                    <TableCell>{teacher.centerName || "—"}</TableCell>

                    {/* <TableCell>{teacher.classNames?.join(", ") || "—"}</TableCell>

                    <TableCell>{teacher.gender || "—"}</TableCell>

                    <TableCell>{teacher.phone || "—"}</TableCell>

                    <TableCell>{teacher.dob || "—"}</TableCell> */}


                    <TableCell>

                        {canMapClasses ? (
                            <Tooltip title="Map classes" arrow>
                                <IconButton
                                    color="primary"
                                    size="small"
                                    aria-label={`Map classes for ${teacher.name}`}
                                    onClick={() => {
                                        setSelectedClassTeacher(teacher.id);
                                        setClassDialog(true);
                                    }}
                                >
                                    <School fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                        )}

                    </TableCell>

                    <TableCell>

                        {canMapSubjects ? (
                            subjectLoading ?

                                <IconButton
                                    color="primary"
                                    size="small"
                                    disabled
                                >
                                    <CircularProgress size={18} />
                                </IconButton>

                                :

                                <Tooltip title="Map subjects" arrow>
                                    <IconButton
                                        color="primary"
                                        size="small"
                                        aria-label={`Map subjects for ${teacher.name}`}
                                        onClick={() => {
                                            setSelectedTeacher(teacher.id);
                                            setSubjectDialog(true);
                                        }}
                                    >
                                        <MenuBook fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                        ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                        )}


                    </TableCell>

                    <TableCell>{teacher.email}</TableCell>


                    <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {canEditTeachers ? (
                                <IconButton color="primary" onClick={() => onEditTeacher(teacher)}>
                                    <Edit />
                                </IconButton>
                            ) : null}
                            {canDeleteTeachers ? (
                                <Button size="small" color="error" onClick={() => handleDeleteTeacher(teacher.id)}>
                                    Delete
                                </Button>
                            ) : null}
                        </Stack>
                    </TableCell>


                </TableRow>

            ))}



            {teachers.length === 0 && (

                <TableRow>

                    <TableCell
                        colSpan={9}
                        align="center"
                        sx={{ py: 4 }}
                    >
                        No teachers available.
                    </TableCell>

                </TableRow>

            )}

            <TeacherSubjectDialog

                open={subjectDialog}

                setOpen={setSubjectDialog}

                teacherId={selectedTeacher}

                setPageLoading={setPageLoading}


            />

            <TeacherClassDialog
                open={classDialog}
                setOpen={setClassDialog}
                teacherId={selectedClassTeacher}
                setPageLoading={setPageLoading}
            />

        </>
    );
}


export default DisplayTeachers;