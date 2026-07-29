'use client';

import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSubject } from "@/redux/features/subjectSlice";
import {
    Box,
    Button,
    Chip,
    Typography,
} from "@mui/material";

import Image from "next/image";
import Chapter from "./Chapter/ChapterClient";
import AssessmentManager from "@/app/(components)/AssessmentManager";
import StudentAssessmentView from "@/app/(components)/StudentAssessmentView";
import { Quiz } from "@mui/icons-material";
import { useParams, useRouter } from "next/navigation";

const Subject = () => {

    const params = useParams();
    const router = useRouter();
    const selectedSubject = params?.subject;
    // const selectedSubject = useSelector(
    //     selectSelectedSubject
    // );

    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(false);

    const [chapters, setChapters] = useState([]);
    const [chaptersLoading, setChaptersLoading] = useState(false);

    const [showAssessments, setShowAssessments] = useState(false);

    const fetchChapters = useCallback(async () => {

        if (!selectedSubject) return;

        try {

            setChaptersLoading(true);

            const res = await fetch(
                `/api/admin/chapters?subjectId=${selectedSubject}`
            );

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            setChapters(result.data || []);

        } catch (error) {

            console.error(
                "Failed to fetch chapters:",
                error
            );

            setChapters([]);

        } finally {

            setChaptersLoading(false);

        }

    }, [selectedSubject]);

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
            setChapters([]);

            return;

        }

        sessionStorage.setItem('selectedSubject', JSON.stringify({ id: selectedSubject }));
        fetchSubject();
        fetchChapters();

    }, [
        selectedSubject,
        fetchSubject,
        fetchChapters
    ]);

    const handleOpenAssessments = () => {
        setShowAssessments(true);
    };

    if (!selectedSubject) {
        return <>No Subject Selected</>;
    }

    if (loading) {
        return <>Loading Subject...</>;
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
                            {subject?.subjectName} for Class{" "}
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
                            Total Chapters:{" "}
                            {chapters.length}
                        </Typography>
                    </Box>

                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button variant="outlined" onClick={() => setShowAssessments((prev) => !prev)}>
                            {showAssessments ? 'Show Chapters' : 'Show Assessments'}
                        </Button>
                        <Button variant="contained" startIcon={<Quiz />} onClick={handleOpenAssessments}>
                            View Assessments
                        </Button>
                    </Box>

                </Box>

                <Box
                    display="flex"
                    width="100%"
                    flexDirection="column"
                >
                    {showAssessments ? (
                        <Box sx={{ px: 3, pb: 3 }}>
                            <StudentAssessmentView subjectId={selectedSubject} />
                        </Box>
                    ) : (
                        <Chapter
                            chapters={chapters}
                            setChapters={setChapters}
                            loading={chaptersLoading}
                            subject={subject}
                            fetchChapters={fetchChapters}
                        />
                    )}
                </Box>

            </Box>

        </>
    );
};

export default Subject;