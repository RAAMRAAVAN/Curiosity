'use client';

import { useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Fade,
    IconButton,
    Modal,
    TextField,
    Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";

const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "95%",
    maxWidth: 1400,
    height: "90vh",
    overflow: "auto",
    bgcolor: "background.paper",
    borderRadius: 3,
    boxShadow: 24,
    p: 4,
    outline: "none",
};

const AddNotes = ({
    openAddNotes,
    fetchChapters,
    setopenAddNotes,
    formData_AddNotes,
    setFormData_AddNotes,
    selectedChapter,
    setSelectedChapter,
}) => {

    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        if (loading) return;
        setopenAddNotes(false);
        setSelectedChapter(null);
    };

    const handleChange = ({ target: { name, value } }) =>
        setFormData_AddNotes(prev => ({
            ...prev,
            [name]: value,
        }));

    const handleSubmit = async () => {

        try {

            setLoading(true);

            const response = await fetch("/api/chapter-content/note", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chapterId: selectedChapter.id,
                    title: formData_AddNotes.title,
                    notes: formData_AddNotes.notes,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message);
            }

            await fetchChapters();

            setFormData_AddNotes({
                chapterNumber: "",
                title: "",
                notes: "",
            });

            setopenAddNotes(false);
            setSelectedChapter(null);

            alert(result.message);

        }
        catch (err) {

            console.error(err);
            alert(err.message);

        }
        finally {

            setLoading(false);

        }
    };

    return (
        <Modal
            open={openAddNotes}
            onClose={loading ? undefined : handleClose}
            closeAfterTransition
        >
            <Fade in={openAddNotes}>

                <Box
                    sx={{
                        ...style,
                        position: "relative",
                    }}
                >

                    {loading && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                bgcolor: "rgba(255,255,255,.75)",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                zIndex: 9999,
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}

                    <IconButton
                        onClick={handleClose}
                        disabled={loading}
                        sx={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                        }}
                    >
                        <Close />
                    </IconButton>

                    <Typography
                        variant="h5"
                        fontWeight="bold"
                        mb={3}
                    >
                        Create Chapter {formData_AddNotes.chapterNumber} Notes
                    </Typography>

                    <TextField
                        fullWidth
                        label="Title"
                        name="title"
                        value={formData_AddNotes.title}
                        onChange={handleChange}
                        margin="normal"
                    />

                    <TextField
                        fullWidth
                        multiline
                        minRows={12}
                        label="Notes"
                        name="notes"
                        value={formData_AddNotes.notes}
                        onChange={handleChange}
                        margin="normal"
                    />

                    <Box
                        display="flex"
                        justifyContent="flex-end"
                        gap={2}
                        mt={3}
                    >
                        <Button
                            variant="outlined"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Submit"}
                        </Button>
                    </Box>

                </Box>

            </Fade>
        </Modal>
    );
};

export default AddNotes;