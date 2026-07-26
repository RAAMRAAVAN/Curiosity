'use client';

import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectSelectedSubject } from "@/redux/features/subjectSlice";
import {
    Box,
    Fab,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
} from "@mui/material";

import Image from "next/image";
import Chapter from "./Chapter/page";
import { Add } from "@mui/icons-material";
import { useParams } from "next/navigation";

const Subject = () => {

    const params = useParams();
    const selectedSubject = params?.subject;
    // const selectedSubject = useSelector(
    //     selectSelectedSubject
    // );

    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(false);

    const [chapters, setChapters] = useState([]);
    const [chaptersLoading, setChaptersLoading] = useState(false);

    const [open, setOpen] = useState(false);
    const [chapterName, setChapterName] = useState("");
    const [chapterNumber, setChapterNumber] = useState("");
    const [creating, setCreating] = useState(false);

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

        fetchSubject();
        fetchChapters();

    }, [
        selectedSubject,
        fetchSubject,
        fetchChapters
    ]);

    const createChapter = async () => {

        if (
            !chapterName.trim() ||
            !chapterNumber ||
            !selectedSubject
        ) {
            return;
        }

        try {

            setCreating(true);

            const res = await fetch(
                "/api/admin/chapters",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        chapterName: chapterName.trim(),
                        chapterNumber: Number(chapterNumber),
                        subjectId: selectedSubject,
                    }),
                }
            );

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            await fetchChapters();

            setOpen(false);
            setChapterName("");
            setChapterNumber("");

            console.log(
                "Chapter Created Successfully"
            );

        } catch (error) {

            console.error(
                "Create Chapter Error:",
                error
            );

            alert(
                error.message ||
                "Failed to create chapter"
            );

        } finally {

            setCreating(false);

        }

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

                    <Box
                        position="absolute"
                        right={30}
                        bottom={30}
                    >
                        <Fab
                            variant="extended"
                            onClick={() =>
                                setOpen(true)
                            }
                        >
                            <Add sx={{ mr: 1 }} />
                            Add New Chapter
                        </Fab>
                    </Box>

                </Box>

                <Box
                    display="flex"
                    width="100%"
                >
                    <Chapter
                        chapters={chapters}
                        setChapters={setChapters}
                        loading={chaptersLoading}
                        subject={subject}
                        fetchChapters={fetchChapters}
                    />
                </Box>

            </Box>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    Add New Chapter
                </DialogTitle>

                <DialogContent>

                    <TextField
                        margin="normal"
                        fullWidth
                        label="Chapter Name"
                        value={chapterName}
                        onChange={(e) =>
                            setChapterName(
                                e.target.value
                            )
                        }
                    />

                    <TextField
                        margin="normal"
                        fullWidth
                        type="number"
                        label="Chapter Number"
                        value={chapterNumber}
                        onChange={(e) =>
                            setChapterNumber(
                                e.target.value
                            )
                        }
                    />

                </DialogContent>

                <DialogActions>

                    <Button
                        onClick={() =>
                            setOpen(false)
                        }
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={createChapter}
                        disabled={creating}
                    >
                        {creating
                            ? "Creating..."
                            : "Create"}
                    </Button>

                </DialogActions>

            </Dialog>
        </>
    );
};

export default Subject;