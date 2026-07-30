'use client';

import { useEffect, useState, useCallback } from "react";
import AssessmentManager from "@/app/(components)/AssessmentManager";
import {
    Box,
    Fab,
    Typography,
    CircularProgress,
} from "@mui/material";

import Image from "next/image";
import { Add } from "@mui/icons-material";
import { useParams } from "next/navigation";

const Assessments = () => {

    const params = useParams();
    const selectedSubject = params?.subject;
    const classId = params?.classSlugAssessment;

    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(false);

    const emptyQuestion = () => ({
        questionText: '',
        correctOptionIndex: 0,
        options: ['', '', '', ''],
    });

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('ASSESSMENT');
    const [questions, setQuestions] = useState([emptyQuestion()]);
    const [feedback, setFeedback] = useState(null);
    const [editingAssessment, setEditingAssessment] = useState(null);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [assessments, setAssessments] = useState([]);
    // const [loading, setLoading] = useState(false);

    const addQuestion = () => {
        setQuestions((prev) => [...prev, emptyQuestion()]);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setType('ASSESSMENT');
        setQuestions([emptyQuestion()]);
        setEditingAssessment(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setOpen(true);
    };

    const fetchAssessments = async (chapterId) => {
        if (!classId) return;

        try {
            setLoading(true);

            const params = new URLSearchParams();
            if (selectedSubject) params.append('subjectId', selectedSubject);
            if (chapterId) params.append('chapterId', chapterId);

            const res = await fetch(
                `/api/assessments/class/${classId}?${params.toString()}`
            );

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message || "Unable to load assessments");
            }

            setAssessments(result.data || []);

        } catch (error) {
            console.error(error);
            setAssessments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubject = useCallback(async () => {

        if (!selectedSubject) return;

        try {

            setLoading(true);

            const res = await fetch(
                `/api/subjects/${selectedSubject}`
            );

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            setSubject(result.data);

        } catch (error) {

            console.error(
                "Failed to fetch subject:",
                error
            );

            setSubject(null);

        } finally {

            setLoading(false);

        }

    }, [selectedSubject]);

    useEffect(() => {

        if (!selectedSubject) {

            setSubject(null);

            return;

        }

        fetchSubject();

    }, [
        selectedSubject,
        fetchSubject,
    ]);

    useEffect(() => {
        if (classId) {
            fetchAssessments();
        }
    }, [classId, selectedSubject]);

    if (!selectedSubject) {
        return <>No Subject Selected</>;
    }

    if (loading) {
        return <><Box
            sx={{
                width: "100%",
                height: "100%",
                minHeight: "100vh", // Remove if parent already has a fixed height
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                gap: 2,
            }}
        >
            <CircularProgress size={50} />
            <Typography variant="body1" color="text.secondary">
                Loading Subject...
            </Typography>
        </Box></>;
    }


    return (
        <>
            <Box
                display="flex"
                width="100%"
                mt={3}
                flexDirection="column"
            >

                <Box
                    display="flex"
                    alignItems="center"
                    position="relative"
                    p={3}
                    width="100%"
                >

                    <Image
                        src={
                            subject?.icon ||
                            "/Courses/OIP.webp"
                        }
                        width={120}
                        height={120}
                        alt={
                            subject?.subjectName ||
                            "Subject Icon"
                        }
                    />

                    <Box
                        display="flex"
                        flexDirection="column"
                        marginLeft={3}
                    >
                        <Typography
                            fontSize={18}
                            fontWeight="bold"
                        >
                            Assessments for {subject?.subjectName}
                            {
                                subject?.class
                                    ?.className
                            }
                        </Typography>

                        <Typography>
                            100 Students Learning
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Total Assessments:{" "}
                            {assessments.length}
                        </Typography>
                    </Box>

                    <Box
                        position="absolute"
                        right={50}
                        bottom={30}
                    >
                        <Fab
                            variant="extended"
                            onClick={openCreateDialog}
                        >
                            <Add sx={{ mr: 1 }} />
                            Add New Assessment
                        </Fab>
                    </Box>

                </Box>

                <Box
                    display="flex"
                    width="96%"
                    padding={2}
                    // border='1px black solid'
                    flexDirection="column"
                >
                    <AssessmentManager resetForm={resetForm} fetchAssessments={fetchAssessments} emptyQuestion={emptyQuestion} assessments={assessments} loading={loading} addQuestion={addQuestion} subjectId={selectedSubject} classId={classId} title={title} setTitle={setTitle} description={description} setDescription={setDescription} type={type} setType={setType} questions={questions} setQuestions={setQuestions} feedback={feedback} setFeedback={setFeedback} editingAssessment={editingAssessment} setEditingAssessment={setEditingAssessment} open={open} setOpen={setOpen} saving={saving} setSaving={setSaving} />
                </Box>

            </Box>
        </>
    );
};

export default Assessments;