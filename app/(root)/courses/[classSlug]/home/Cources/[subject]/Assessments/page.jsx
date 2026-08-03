'use client';

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useParams } from "next/navigation";
import StudentAssessmentView from "@/app/(components)/StudentAssessmentView";

const Assessments = () => {
    const params = useParams();
    const subjectSlug = params?.subject;

    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchSubject = useCallback(async () => {
        if (!subjectSlug) return;

        try {
            setLoading(true);

            const res = await fetch(`/api/subjects/${subjectSlug}`);
            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message || "Failed to fetch subject");
            }

            setSubject(result.data);
        } catch (error) {
            console.error("Failed to fetch subject:", error);
            setSubject(null);
        } finally {
            setLoading(false);
        }
    }, [subjectSlug]);

    useEffect(() => {
        fetchSubject();
    }, [fetchSubject]);

    if (!subjectSlug) {
        return (
            <Box p={4}>
                <Typography>No Subject Selected</Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box
                sx={{
                    width: "100%",
                    minHeight: "100vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <CircularProgress size={50} />
                <Typography color="text.secondary">
                    Loading Subject...
                </Typography>
            </Box>
        );
    }

    return (
        <Box display="flex" flexDirection="column" width="100%">
            <Box
                display="flex"
                alignItems="center"
                gap={3}
                // p={3}
                marginTop={2}
            >
                <Image
                    src={subject?.icon || "/Courses/OIP.webp"}
                    alt={subject?.subjectName || "Subject"}
                    width={120}
                    height={120}
                    style={{
                        borderRadius: 12,
                        objectFit: "cover",
                    }}
                />

                <Box flex={1}>
                    <Typography variant="h5" fontWeight={700}>
                        Assessments for {subject?.subjectName || "Subject"}
                        {subject?.class?.className
                            ? ` - Class ${subject.class.className}`
                            : ""}
                    </Typography>

                    {/* <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={1}
                    >
                        {subject?.description || "No description available."}
                    </Typography> */}

                    <Typography mt={2}>
                        👨‍🎓 100 Students Learning
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={0.5}
                    >
                        Total Assessments: {subject?.chapters?.length ?? 0}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ px: 3, pb: 3 }}>
                <StudentAssessmentView
                    subjectId={subject?.id ?? subjectSlug}
                />
            </Box>
        </Box>
    );
};

export default Assessments;