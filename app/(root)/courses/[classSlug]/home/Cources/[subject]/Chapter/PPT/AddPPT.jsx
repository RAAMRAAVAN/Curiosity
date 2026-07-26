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
    maxWidth: 900,
    height: "55vh",
    overflow: "auto",
    bgcolor: "background.paper",
    borderRadius: 3,
    boxShadow: 24,
    p: 4,
    outline: "none",
};

const AddPPT = ({
    openAddPPT,
    fetchChapters,
    setopenAddPPT,
    formData_AddPPT,
    setFormData_AddPPT,
    selectedChapter,
    setSelectedChapter,
}) => {

    const [loading, setLoading] = useState(false);
    const [pptFile, setPptFile] = useState(null);

    const resetForm = () => {
        setPptFile(null);

        setFormData_AddPPT({
            chapterNumber: "",
            title: "",
        });

        setSelectedChapter(null);
        setopenAddPPT(false);
    };

    const handleClose = () => {
        if (!loading) resetForm();
    };

    const handleChange = ({ target }) =>
        setFormData_AddPPT(prev => ({
            ...prev,
            [target.name]: target.value,
        }));

    const handleSubmit = async () => {

        if (!pptFile)
            return alert("Please select a PPT file.");

        try {

            setLoading(true);

            // Upload File
            const uploadForm = new FormData();
            uploadForm.append("file", pptFile);
            uploadForm.append("folder", "chapter-ppts");

            const upload = await fetch("/api/upload", {
                method: "POST",
                body: uploadForm,
            });

            const uploadResult = await upload.json();

            if (!upload.ok || !uploadResult.success)
                throw new Error(uploadResult.message);

            // Save PPT Details
            const response = await fetch("/api/chapter-content/ppt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chapterId: selectedChapter.id,
                    title: formData_AddPPT.title,
                    fileName: pptFile.name,
                    filePath: uploadResult.path,
                    fileSize: pptFile.size,
                    createdBy: "admin",
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success)
                throw new Error(result.message);

            await fetchChapters();

            resetForm();

            alert(result.message);

        } catch (err) {

            console.error(err);
            alert(err.message);

        } finally {

            setLoading(false);

        }

    };

    return (
        <Modal
            open={openAddPPT}
            onClose={loading ? undefined : handleClose}
            closeAfterTransition
        >
            <Fade in={openAddPPT}>
                <Box sx={{ ...style, position: "relative" }}>

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
                        Upload Chapter {formData_AddPPT.chapterNumber} PPT
                    </Typography>

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Enter PPT Title"
                        name="title"
                        value={formData_AddPPT.title}
                        onChange={handleChange}
                    />

                    <Button
                        variant="outlined"
                        component="label"
                        sx={{ mt: 2 }}
                    >
                        Select PPT
                        <input
                            hidden
                            type="file"
                            accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            onChange={(e) =>
                                setPptFile(e.target.files?.[0] || null)
                            }
                        />
                    </Button>

                    {pptFile && (
                        <Typography mt={1}>
                            {pptFile.name}
                        </Typography>
                    )}

                    <Box
                        display="flex"
                        justifyContent="flex-end"
                        gap={2}
                        mt={3}
                    >
                        <Button
                            variant="outlined"
                            disabled={loading}
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            disabled={loading}
                            onClick={handleSubmit}
                        >
                            {loading ? "Saving..." : "Submit"}
                        </Button>
                    </Box>

                </Box>
            </Fade>
        </Modal>
    );
};

export default AddPPT;