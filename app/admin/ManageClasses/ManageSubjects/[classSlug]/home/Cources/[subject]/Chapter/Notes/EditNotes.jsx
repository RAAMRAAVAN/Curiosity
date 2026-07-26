import { Close } from "@mui/icons-material"
import { Box, Button, CircularProgress, Fade, IconButton, Modal, TextField, Typography } from "@mui/material"

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


const EditNotes = ({ modalLoading, openEdit, handleCloseEdit, formData, handleChange, setModalLoading, setOpenEdit, fetchChapters }) => {

    const handleUpdate = async () => {

        try {

            setModalLoading(true);

            const response = await fetch(
                `/api/chapter-content/note/${formData.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: formData.title,
                        notes: formData.notes,
                        displayOrder: Number(formData.displayOrder)
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message);
            }

            await fetchChapters();

            setOpenEdit(false);

            alert("Note updated successfully!");

        }
        catch (err) {

            console.error(err);
            alert(err.message);

        }
        finally {

            setModalLoading(false);

        }
    };

    return (<><Modal
        open={openEdit}
        onClose={!modalLoading ? handleCloseEdit : undefined}
        closeAfterTransition
    >
        <Fade in={openEdit}>

            <Box
                sx={{
                    ...style,
                    position: "relative",
                }}
            >

                {/* Modal Loader */}

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
                    onClick={handleCloseEdit}
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
                        Edit Chapter Note
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
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    margin="normal"
                />

                <TextField
                    fullWidth
                    multiline
                    minRows={12}
                    label="Notes"
                    name="notes"
                    value={formData.notes}
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
                        onClick={handleCloseEdit}
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

    </Modal></>)
}

export default EditNotes