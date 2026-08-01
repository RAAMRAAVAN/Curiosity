import {
    Box,
    Button,
    IconButton,
    Modal,
    Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";

const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",

    width: "95%",
    maxWidth: 1200,

    height: "90vh",
    maxHeight: "90vh",

    bgcolor: "background.paper",
    borderRadius: 2,
    boxShadow: 24,

    display: "flex",
    flexDirection: "column",

    overflow: "hidden",

    p: 2,
};

// Add this helper function above your component

const getYoutubeEmbedUrl = (url) => {

    if (!url) return "";

    try {

        const parsedUrl = new URL(url);

        // youtu.be format
        if (parsedUrl.hostname.includes("youtu.be")) {

            return `https://www.youtube.com/embed${parsedUrl.pathname}`;

        }


        // youtube.com/watch?v=
        if (
            parsedUrl.hostname.includes("youtube.com") &&
            parsedUrl.searchParams.get("v")
        ) {

            return `https://www.youtube.com/embed/${parsedUrl.searchParams.get("v")}`;

        }


        // youtube.com/shorts/
        if (
            parsedUrl.pathname.includes("/shorts/")
        ) {

            const id = parsedUrl.pathname.split("/shorts/")[1];

            return `https://www.youtube.com/embed/${id}`;

        }


        return url;

    }
    catch (error) {

        return "";

    }

};

const NoteViewer = ({ notes }) => {

    if (!notes) return null;

    const isHtml = /<\/?[a-z][\s\S]*>/i.test(notes);

    if (isHtml) {

        return (
            <Box
                dangerouslySetInnerHTML={{
                    __html: notes,
                }}
            />
        );

    }

    return (
        <Typography
            sx={{
                whiteSpace: "pre-wrap",
            }}
        >
            {notes}
        </Typography>
    );

};

const ViewContent = ({
    openView,
    setOpenView,
    content,
}) => {

    const handleClose = () => setOpenView(false);

    if (!content) return null;

    return (
        <Modal
            open={openView}
            onClose={handleClose}
        >
            <Box sx={style}>

                {/* Header */}

                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        pb: 2,
                        borderBottom: "1px solid #e0e0e0",
                        flexShrink: 0,
                    }}
                >

                    <Typography
                        variant="h6"
                        fontWeight="bold"
                    >
                        {content.title}
                    </Typography>

                    <IconButton onClick={handleClose}>
                        <Close />
                    </IconButton>

                </Box>

                {/* Body */}

                <Box
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        mt: 2,
                    }}
                >

                    {/* NOTE */}

                    {content.type === "NOTE" && (
                        <NoteViewer
                            notes={content.note?.notes}
                        />
                    )}

                    {/* VIDEO */}

                    {content.type === "VIDEO" && (

                        <Box display='flex' width='100%' height='100%'>

                            {content.video?.videoType === "YOUTUBE" ? (

                                content.video?.videoLink ? (

                                    <iframe
                                        width="100%"
                                        // height="65vh"
                                        src={getYoutubeEmbedUrl(
                                            content.video.videoLink
                                        )}
                                        title={content.title}
                                        allow="
                        accelerometer;
                        autoplay;
                        clipboard-write;
                        encrypted-media;
                        gyroscope;
                        picture-in-picture
                    "
                                        allowFullScreen
                                        style={{
                                            width: "100%",
                                            minHeight: "100%",
                                            border: 0,
                                            borderRadius: 8,
                                        }}
                                    />

                                ) : (

                                    <Typography color="error">
                                        YouTube link not available
                                    </Typography>

                                )


                            ) : (

                                content.video?.videoPath ? (

                                    <video
                                        controls
                                        width="100%"
                                        style={{
                                            borderRadius: 8,
                                            maxHeight: "75vh",
                                        }}
                                    >

                                        <source
                                            src={content.video.videoPath}
                                            type="video/mp4"
                                        />

                                        Your browser does not support video playback.

                                    </video>

                                ) : (

                                    <Typography color="error">
                                        Video file not available
                                    </Typography>

                                )

                            )}

                        </Box>

                    )}

                    {/* PDF */}

                    {content.type === "PDF" && (

                        <iframe
                            src={content.pdf?.filePath}
                            width="100%"
                            height="100%"
                            title={content.title}
                            style={{
                                border: "none",
                                minHeight: "75vh",
                            }}
                        />

                    )}

                    {/* PPT */}

                    {content.type === "PPT" && (

                        <Box
                            sx={{
                                height: "100%",
                                minHeight: "60vh",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 3,
                            }}
                        >

                            <Typography
                                variant="h6"
                                textAlign="center"
                            >
                                PowerPoint preview is not supported in the browser.
                            </Typography>

                            <Typography
                                color="text.secondary"
                                textAlign="center"
                            >
                                Download the presentation to view it in
                                Microsoft PowerPoint or LibreOffice Impress.
                            </Typography>

                            <Button
                                variant="contained"
                                href={content.ppt?.filePath}
                                download
                                sx={{
                                    minWidth: 250,
                                }}
                            >
                                Download PPT
                            </Button>

                        </Box>

                    )}

                    {/* PREVIOUS PAPER */}

                    {content.type === "PREVIOUS_PAPER" && (

                        <iframe
                            src={content.previousPaper?.path}
                            width="100%"
                            height="100%"
                            title={content.title}
                            style={{
                                border: "none",
                                minHeight: "75vh",
                            }}
                        />

                    )}

                </Box>

            </Box>
        </Modal>
    );

};

export default ViewContent;