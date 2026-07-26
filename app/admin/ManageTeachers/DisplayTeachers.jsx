import { Button, CircularProgress, TableCell, TableRow } from "@mui/material";
import { useEffect, useState } from "react";
import TeacherSubjectDialog from "./TeacherSubjectDialog";

const DisplayTeachers = ({ teachers, setPageLoading, FetchTeachers }) => {

    const [subjects, setSubjects] = useState([]);
    const [subjectLoading, setSubjectsLoading] = useState(false);
    const [subjectDialog, setSubjectDialog] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);


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

                    <TableCell>{teacher.email}</TableCell>

                    <TableCell>{teacher.gender}</TableCell>

                    <TableCell>{teacher.phone}</TableCell>

                    <TableCell>{teacher.dob}</TableCell>


                    <TableCell>

                        {
                            subjectLoading ?

                                <Button
                                    variant="outlined"
                                    disabled
                                    startIcon={<CircularProgress size={16} />}
                                >
                                    Loading
                                </Button>

                                :

                                <Button onClick={() => {
                                    setSelectedTeacher(teacher.id);
                                    setSubjectDialog(true);
                                }}>
                                    Click Here
                                </Button>
                        }


                    </TableCell>


                    <TableCell>

                        <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTeacher(teacher.id)}
                        >
                            Delete
                        </Button>

                    </TableCell>


                </TableRow>

            ))}



            {teachers.length === 0 && (

                <TableRow>

                    <TableCell
                        colSpan={8}
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

        </>
    );
}


export default DisplayTeachers;