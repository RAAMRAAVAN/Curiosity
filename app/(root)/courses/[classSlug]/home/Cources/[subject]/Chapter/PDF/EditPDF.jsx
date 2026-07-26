import { useState } from "react";
import { Close } from "@mui/icons-material";
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

const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "95%",
    maxWidth: 900,
    height: "60vh",
    overflow: "auto",
    bgcolor: "background.paper",
    borderRadius: 3,
    boxShadow: 24,
    p: 4,
    outline: "none",
};

const EditPDF = ({
    modalLoading,
    openEditPDF,
    handleCloseEditPDF,
    formData,
    setFormData,
    setModalLoading,
    fetchChapters,
}) => {

    const [pdfFile, setPdfFile] = useState(null);

    const handleChange = ({ target }) =>
        setFormData(prev => ({
            ...prev,
            [target.name]: target.value,
        }));

    const handleUpdate = async () => {

        try {

            setModalLoading(true);

            let fileName = formData.fileName;
            let filePath = formData.filePath;
            let fileSize = formData.fileSize;

            // Upload new PDF (optional)

            if (pdfFile) {

                const uploadForm = new FormData();

                uploadForm.append("file", pdfFile);
                uploadForm.append("folder", "chapter-pdfs");

                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadForm,
                });

                const uploadResult = await uploadResponse.json();

                if (!uploadResponse.ok || !uploadResult.success) {
                    throw new Error(uploadResult.message);
                }

                fileName = pdfFile.name;
                filePath = uploadResult.path;
                fileSize = pdfFile.size;
            }

            // Update PDF

            const response = await fetch(

                `/api/chapter-content/pdf/${formData.id}`,

                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({

                        title: formData.title,

                        displayOrder: Number(formData.displayOrder),

                        fileName,

                        filePath,

                        fileSize,

                        modifiedBy: "admin",

                    }),

                }

            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message);
            }

            await fetchChapters();

            setPdfFile(null);

            handleCloseEditPDF();

            alert(result.message);

        }
        catch (err) {

            console.error(err);

            alert(err.message);

        }
        finally {

            setModalLoading(false);

        }

    };

    return (

        <Modal
            open={openEditPDF}
            onClose={!modalLoading ? handleCloseEditPDF : undefined}
            closeAfterTransition
        >

            <Fade in={openEditPDF}>

                <Box
                    sx={{
                        ...style,
                        position: "relative",
                    }}
                >

                    {modalLoading && (
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
                        onClick={handleCloseEditPDF}
                        disabled={modalLoading}
                        sx={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                        }}
                    >
                        <Close />
                    </IconButton>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={3}
                    >

                        <Typography
                            variant="h5"
                            fontWeight="bold"
                        >
                            Edit PDF
                        </Typography>

                        <TextField
                            type="number"
                            name="displayOrder"
                            label="Display Order"
                            value={formData.displayOrder}
                            onChange={handleChange}
                            inputProps={{ min: 1 }}
                            sx={{ width: 180 }}
                        />

                    </Box>

                    <TextField
                        fullWidth
                        label="PDF Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        margin="normal"
                    />

                    <Button
                        variant="outlined"
                        component="label"
                        sx={{ mt: 2 }}
                    >
                        Replace PDF

                        <input
                            hidden
                            type="file"
                            accept="application/pdf"
                            onChange={(e) =>
                                setPdfFile(e.target.files?.[0] || null)
                            }
                        />

                    </Button>

                    <Typography mt={1} color="text.secondary">

                        {pdfFile
                            ? pdfFile.name
                            : formData.fileName}

                    </Typography>

                    <Box
                        display="flex"
                        justifyContent="flex-end"
                        gap={2}
                        mt={4}
                    >

                        <Button
                            variant="outlined"
                            onClick={handleCloseEditPDF}
                            disabled={modalLoading}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleUpdate}
                            disabled={modalLoading}
                        >
                            {modalLoading ? "Updating..." : "Update"}
                        </Button>

                    </Box>

                </Box>

            </Fade>

        </Modal>

    );
};

export default EditPDF;