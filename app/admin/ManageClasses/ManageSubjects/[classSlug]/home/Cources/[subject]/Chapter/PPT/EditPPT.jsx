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

const EditPPT = ({
    modalLoading,
    openEditPPT,
    handleCloseEditPPT,
    formData,
    setFormData,
    setModalLoading,
    fetchChapters,
}) => {

    const [pptFile, setPptFile] = useState(null);

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

            // Upload new PPT (optional)

            if (pptFile) {

                const uploadForm = new FormData();

                uploadForm.append("file", pptFile);
                uploadForm.append("folder", "chapter-ppts");

                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadForm,
                });

                const uploadResult = await uploadResponse.json();

                if (!uploadResponse.ok || !uploadResult.success) {
                    throw new Error(uploadResult.message);
                }

                fileName = pptFile.name;
                filePath = uploadResult.path;
                fileSize = pptFile.size;

            }

            // Update PPT

            const response = await fetch(

                `/api/chapter-content/ppt/${formData.id}`,

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

            setPptFile(null);

            handleCloseEditPPT();

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
            open={openEditPPT}
            onClose={!modalLoading ? handleCloseEditPPT : undefined}
            closeAfterTransition
        >

            <Fade in={openEditPPT}>

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
                        onClick={handleCloseEditPPT}
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
                            Edit PPT
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
                        label="PPT Title"
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
                        Replace PPT

                        <input
                            hidden
                            type="file"
                            accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            onChange={(e) =>
                                setPptFile(e.target.files?.[0] || null)
                            }
                        />

                    </Button>

                    <Typography mt={1} color="text.secondary">

                        {pptFile
                            ? pptFile.name
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
                            onClick={handleCloseEditPPT}
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

export default EditPPT;