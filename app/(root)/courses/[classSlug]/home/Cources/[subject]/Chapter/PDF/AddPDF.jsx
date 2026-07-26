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

const AddPDF = ({
    openAddPDF,
    fetchChapters,
    setopenAddPDF,
    formData_AddPDF,
    setFormData_AddPDF,
    selectedChapter,
    setSelectedChapter,
}) => {

    const [loading, setLoading] = useState(false);
    const [pdfFile, setPdfFile] = useState(null);

    const resetForm = () => {
        setPdfFile(null);
        setFormData_AddPDF({
            chapterNumber: "",
            title: "",
        });
        setSelectedChapter(null);
        setopenAddPDF(false);
    };

    const handleClose = () => {
        if (!loading) resetForm();
    };

    const handleChange = ({ target }) =>
        setFormData_AddPDF(prev => ({
            ...prev,
            [target.name]: target.value,
        }));

    const handleSubmit = async () => {

        if (!pdfFile)
            return alert("Please select a PDF.");

        try {

            setLoading(true);

            const uploadForm = new FormData();
            uploadForm.append("file", pdfFile);
            uploadForm.append("folder", "chapter-pdfs");

            const upload = await fetch("/api/upload", {
                method: "POST",
                body: uploadForm,
            });

            const uploadResult = await upload.json();

            if (!upload.ok || !uploadResult.success)
                throw new Error(uploadResult.message);

            const response = await fetch("/api/chapter-content/pdf", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({

                    chapterId: selectedChapter.id,
                    title: formData_AddPDF.title,
                    fileName: pdfFile.name,
                    filePath: uploadResult.path,
                    fileSize: pdfFile.size,
                    createdBy: "admin",

                }),

            });

            const result = await response.json();

            if (!response.ok || !result.success)
                throw new Error(result.message);

            await fetchChapters();

            resetForm();

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
            open={openAddPDF}
            onClose={loading ? undefined : handleClose}
            closeAfterTransition
        >
            <Fade in={openAddPDF}>

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
                        Upload Chapter {formData_AddPDF.chapterNumber} PDF
                    </Typography>

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Enter PDF Title"
                        name="title"
                        value={formData_AddPDF.title}
                        onChange={handleChange}
                    />

                    <Button
                        variant="outlined"
                        component="label"
                        sx={{ mt: 2 }}
                    >
                        Select PDF
                        <input
                            hidden
                            type="file"
                            accept="application/pdf"
                            onChange={(e) =>
                                setPdfFile(e.target.files?.[0] || null)
                            }
                        />
                    </Button>

                    {pdfFile && (
                        <Typography mt={1}>
                            {pdfFile.name}
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

export default AddPDF;