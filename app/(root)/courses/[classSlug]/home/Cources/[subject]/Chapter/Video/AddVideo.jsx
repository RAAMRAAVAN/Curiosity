'use client';

import { useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Fade,
    IconButton,
    MenuItem,
    Modal,
    TextField,
    Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { LinearProgress } from "@mui/material";

const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "95%",
    maxWidth: 900,
    height: "70vh",
    overflow: "auto",
    bgcolor: "background.paper",
    borderRadius: 3,
    boxShadow: 24,
    p: 4,
    outline: "none",
};

const AddVideo = ({
    openAddVideo,
    fetchChapters,
    setopenAddVideo,
    formData_AddVideo,
    setFormData_AddVideo,
    selectedChapter,
    setSelectedChapter,
}) => {

    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [videoFile, setVideoFile] = useState(null);

    const resetForm = () => {

        setVideoFile(null);
        setUploadProgress(0);

        setFormData_AddVideo({
            chapterNumber: "",
            title: "",
            videoType: "YOUTUBE",
            videoLink: "",
        });

        setSelectedChapter(null);
        setopenAddVideo(false);
    };

    const handleClose = () => {

        if (!loading)
            resetForm();

    };

    const handleChange = ({ target }) => {

        setFormData_AddVideo(prev => ({
            ...prev,
            [target.name]: target.value,
        }));

    };

    const handleSubmit = async () => {

        try {

            setLoading(true);

            let videoPath = null;

            // Upload only for ON_SITE videos
            if (formData_AddVideo.videoType === "ON_SITE") {

                if (!videoFile)
                    throw new Error("Please select a video.");

                const uploadForm = new FormData();

                uploadForm.append("file", videoFile);
                uploadForm.append("folder", "chapter-videos");

                // const upload = await fetch("/api/upload", {
                //     method: "POST",
                //     body: uploadForm,
                // });

                // const uploadResult = await upload.json();

                const uploadResult = await new Promise((resolve, reject) => {
                    setUploadProgress(0);

                    const xhr = new XMLHttpRequest();

                    xhr.open("POST", "/api/upload");

                    xhr.upload.onprogress = (event) => {

                        if (event.lengthComputable) {

                            const percent = Math.round(
                                (event.loaded * 100) / event.total
                            );

                            setUploadProgress(percent);

                        }

                    };

                    xhr.onload = () => {

                        if (xhr.status >= 200 && xhr.status < 300) {

                            resolve(JSON.parse(xhr.responseText));

                        } else {

                            reject(
                                new Error(
                                    JSON.parse(xhr.responseText)?.message ||
                                    "Upload failed."
                                )
                            );

                        }

                    };

                    xhr.onerror = () => reject(new Error("Network Error"));

                    xhr.send(uploadForm);

                });

                if (!uploadResult.success)
                    throw new Error(uploadResult.message);

                videoPath = uploadResult.path;

                setUploadProgress(100);

            }

            const response = await fetch("/api/chapter-content/video", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({

                    chapterId: selectedChapter.id,

                    title: formData_AddVideo.title,

                    videoType: formData_AddVideo.videoType,

                    videoLink:
                        formData_AddVideo.videoType === "YOUTUBE"
                            ? formData_AddVideo.videoLink
                            : null,

                    videoPath,

                    thumbnail: null,

                    duration: null,

                    createdBy: "admin",

                }),

            });

            const result = await response.json();

            if (!response.ok || !result.success)
                throw new Error(result.message);

            await fetchChapters();

            alert(result.message);

            resetForm();

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
            open={openAddVideo}
            onClose={loading ? undefined : handleClose}
            closeAfterTransition
        >
            <Fade in={openAddVideo}>
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
                        Upload Chapter {formData_AddVideo.chapterNumber} Video
                    </Typography>

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Video Title"
                        name="title"
                        value={formData_AddVideo.title}
                        onChange={handleChange}
                    />

                    <TextField
                        fullWidth
                        select
                        margin="normal"
                        label="Video Type"
                        name="videoType"
                        value={formData_AddVideo.videoType}
                        onChange={handleChange}
                    >
                        <MenuItem value="YOUTUBE">
                            YouTube
                        </MenuItem>

                        <MenuItem value="ON_SITE">
                            Upload Video
                        </MenuItem>

                    </TextField>

                    {formData_AddVideo.videoType === "YOUTUBE" && (

                        <TextField
                            fullWidth
                            margin="normal"
                            label="YouTube Link"
                            name="videoLink"
                            value={formData_AddVideo.videoLink}
                            onChange={handleChange}
                        />

                    )}

                    {formData_AddVideo.videoType === "ON_SITE" && (
                        <>
                            <Button
                                variant="outlined"
                                component="label"
                                sx={{ mt: 2 }}
                            >
                                Select Video

                                <input
                                    hidden
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) =>
                                        setVideoFile(
                                            e.target.files?.[0] || null
                                        )
                                    }
                                />

                            </Button>
                            {loading &&
                                formData_AddVideo.videoType === "ON_SITE" && (
                                    <Box mt={2}>

                                        <Typography variant="body2" mb={1}>
                                            {uploadProgress < 100
                                                ? `Uploading Video... ${uploadProgress}%`
                                                : "Saving video details..."}
                                        </Typography>

                                        <LinearProgress
                                            variant="determinate"
                                            value={uploadProgress}
                                        />

                                    </Box>
                                )}

                            {videoFile && (
                                <Typography mt={1}>
                                    {videoFile.name}
                                </Typography>
                            )}
                        </>
                    )}

                    <Box
                        display="flex"
                        justifyContent="flex-end"
                        gap={2}
                        mt={4}
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

export default AddVideo;