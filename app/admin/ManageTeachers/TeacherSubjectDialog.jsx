"use client";

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
    Typography
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import {
    useEffect,
    useState
} from "react";

const TeacherSubjectDialog = ({
    open,
    setOpen,
    teacherId,
    setPageLoading
}) => {


    const [classes, setClasses] = useState([]);

    const [expanded, setExpanded] = useState([]);

    const [selected, setSelected] = useState([]);
    const [subjectLoading, setSubjectsLoading] = useState(false);

    const [alert, setAlert] = useState({
        open: false,
        message: "",
        severity: "success",
    });
    useEffect(() => {

    if(open && teacherId){
        initializeDialog();
    }

}, [open, teacherId]);
    const fetchClasses = async () => {

    try {

        const res = await fetch(
            "/api/classes-with-subjects"
        );
        const data = await res.json();
        if(data.success){

            setClasses(data.data);


            setExpanded(
                data.data.map(
                    item=>item.id
                )
            );
            return data.data;
        }
        return [];
    }
    catch(error){

        console.error(
            "Fetch classes error:",
            error
        );

        return [];

    }

};
    // Expand / Collapse All

    const expandAll = () => {

        setExpanded(
            classes.map(
                item => item.id
            )
        );

    };
    const collapseAll = () => {

        setExpanded([]);

    };
    // Subject selection

    const toggleSubject = (id) => {

        setSelected(prev =>

            prev.includes(id)

                ?
                prev.filter(x => x !== id)

                :
                [
                    ...prev,
                    id
                ]

        );

    };
    // Class wise selection

    const toggleClass = (cls) => {
        const ids = cls.subjects.map(
            x => x.id
        );


        const allSelected =
            ids.every(
                id => selected.includes(id)
            );

        if (allSelected) {

            setSelected(prev =>

                prev.filter(
                    id => !ids.includes(id)
                )

            );

        }
        else {
            setSelected(prev =>

                [
                    ...new Set([
                        ...prev,
                        ...ids
                    ])
                ]

            );

        }


    };

    const selectAll = () => {

        setSelected(

            classes.flatMap(
                cls =>
                    cls.subjects.map(
                        s => s.id
                    )
            )

        );

    };

    const deselectAll = () => {

        setSelected([]);

    };

    const save = async () => {
        try {
            if (!teacherId) {
                setAlert({
                    open: true,
                    message: "Teacher is required",
                    severity: "error",
                });
                return;
            }

            const payload = {
                teacherId,
                subjectIds: selected,
            };

            // console.log("Payload:", payload);

            setPageLoading(true);

            const req = await fetch("/api/admin/teacher-subject", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const response = await req.json();

            if (!req.ok) {
                throw new Error(
                    response.message || "Failed to assign subjects"
                );
            }

            setAlert({
                open: true,
                message: response.message || "Subjects assigned successfully",
                severity: "success",
            });

            setOpen(false);

        } catch (error) {
            console.error("Save Error:", error);

            setAlert({
                open: true,
                message: error.message || "Something went wrong",
                severity: "error",
            });
        } finally {
            setPageLoading(false);
        }
    };


    const loadAssignedSubjects = async (teacherId) => {


    if(!teacherId){

        setSelected([]);

        return;

    }


    try {


        const res = await fetch(
            `/api/admin/teacher-subject?teacherId=${teacherId}`
        );


        const data = await res.json();



        if(!res.ok || !data.success){

            throw new Error(
                data.message || "Unable to load assigned subjects"
            );

        }



        const selectedIds = data.data.subjects.map(
            subject=>subject.id
        );



        setSelected(selectedIds);



    }
    catch(error){


        console.error(
            "Load assigned subjects error:",
            error
        );


        setSelected([]);


    }


};


    const initializeDialog = async () => {

    try {

        setPageLoading(true);


        // Load classes and assigned subjects together
        await Promise.all([
            fetchClasses(),
            loadAssignedSubjects(teacherId)
        ]);


    } catch(error){

        console.error(
            "Dialog initialization error:",
            error
        );

    }
    finally{

        setPageLoading(false);

    }

};


    return (<>

        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth
            maxWidth="md"
        >


            <DialogTitle>
                Assign Subjects
            </DialogTitle>



            <DialogContent>


                <Box
                    display="flex"
                    gap={2}
                    mb={2}
                >


                    <Button
                        variant="outlined"
                        onClick={expandAll}
                    >
                        Expand All
                    </Button>


                    <Button
                        variant="outlined"
                        onClick={collapseAll}
                    >
                        Collapse All
                    </Button>


                    <Button
                        variant="outlined"
                        onClick={selectAll}
                    >
                        Select All
                    </Button>


                    <Button
                        variant="outlined"
                        onClick={deselectAll}
                    >
                        Deselect All
                    </Button>


                </Box>




                {
                    classes.map(cls => (


                        <Accordion

                            key={cls.id}

                            expanded={
                                expanded.includes(cls.id)
                            }

                            onChange={() => {

                                setExpanded(prev =>

                                    prev.includes(cls.id)

                                        ?
                                        prev.filter(
                                            x => x !== cls.id
                                        )

                                        :
                                        [
                                            ...prev,
                                            cls.id
                                        ]

                                )

                            }}

                        >


                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                            >


                                <FormControlLabel

                                    control={

                                        <Checkbox

                                            checked={
                                                cls.subjects.every(
                                                    s => selected.includes(s.id)
                                                )
                                            }

                                            indeterminate={

                                                cls.subjects.some(
                                                    s => selected.includes(s.id)
                                                )
                                                &&
                                                !cls.subjects.every(
                                                    s => selected.includes(s.id)
                                                )

                                            }

                                            onClick={
                                                e => e.stopPropagation()
                                            }

                                            onChange={
                                                () => toggleClass(cls)
                                            }

                                        />

                                    }


                                    label={
                                        <Typography fontWeight="bold">
                                            {cls.className}
                                        </Typography>
                                    }

                                />


                            </AccordionSummary>



                            <AccordionDetails>


                                {
                                    cls.subjects.map(subject => (


                                        <FormControlLabel

                                            key={subject.id}

                                            control={

                                                <Checkbox

                                                    checked={
                                                        selected.includes(
                                                            subject.id
                                                        )
                                                    }

                                                    onChange={() =>
                                                        toggleSubject(subject.id)
                                                    }

                                                />

                                            }

                                            label={subject.subjectName}

                                        />


                                    ))

                                }



                            </AccordionDetails>


                        </Accordion>


                    ))

                }



            </DialogContent>



            <DialogActions>


                <Button
                    onClick={() => setOpen(false)}
                >
                    Cancel
                </Button>


                <Button
                    variant="contained"
                    onClick={save}
                    // disabled={
                    //     selected.length === 0
                    // }
                >
                    Assign
                </Button>


            </DialogActions>

        </Dialog>
        <Snackbar
            open={alert.open}
            autoHideDuration={3000}
            onClose={() =>
                setAlert({ ...alert, open: false })
            }
            anchorOrigin={{
                vertical: "top",
                horizontal: "right",
            }}
        >
            <Alert
                severity={alert.severity}
                onClose={() =>
                    setAlert({ ...alert, open: false })
                }
            >
                {alert.message}
            </Alert>
        </Snackbar>
    </>
    )

}

export default TeacherSubjectDialog;