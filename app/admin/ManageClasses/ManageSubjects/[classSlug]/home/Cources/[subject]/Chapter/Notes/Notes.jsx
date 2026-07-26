'use client';

import { useState } from "react";
import {
    AccordionDetails,
    Box,
    Button,
    CircularProgress,
    Fade,
    Fab,
    IconButton,
    Modal,
    TextField,
    Typography,
} from "@mui/material";

import {
    Close,
    Delete,
    Edit,
} from "@mui/icons-material";

import Image from "next/image";
import EditNotes from "./EditNotes";
import EditPDF from "../PDF/EditPDF";
import ViewNotes from "./ViewNotes";
import EditPPT from "../PPT/EditPPT";
import EditVideo from "../Video/EditVideo";

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

const contentTypeConfig = {
    NOTE: {
        image: "/ContentIcon/Notes.png",
        label: "Note",
    },
    VIDEO: {
        image: "/ContentIcon/Videos.webp",
        label: "Video",
    },
    PDF: {
        image: "/ContentIcon/PDF.webp",
        label: "PDF",
    },
    PPT: {
        image: "/ppt2.gif",
        label: "Presentation",
    },
    PREVIOUS_PAPER: {
        image: "/ContentIcon/question-paper.png",
        label: "Previous Paper",
    },
};
const Notes = ({ chapterContents, fetchChapters }) => {

    // Loader for page (Delete)
    const [pageLoading, setPageLoading] = useState(false);
    const [selectedContent, setSelectedContent] = useState({});

    // Loader for Modal (Update)
    const [modalLoading, setModalLoading] = useState(false);

    const [openEdit, setOpenEdit] = useState(false);

    const [openView, setOpenView] = useState(false);

    const [openEditPDF, setOpenEditPDF] = useState(false);

    const [openEditPPT, setOpenEditPPT] = useState(false);

    const [openEditVideo, setOpenEditVideo] = useState(false);

    const [formData, setFormData] = useState({
        id: "",
        title: "",
        notes: "",
        displayOrder: "",
    });

    const handleChange = ({ target: { name, value } }) =>
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

    const handleOpenEdit = ({ id, title, note, displayOrder }) => {
        setFormData({
            id,
            title,
            notes: note.notes,
            displayOrder,
        });

        setOpenEdit(true);
    };

    const handleOpenEditPDF = ({ id, title, note, displayOrder }) => {
        setFormData({
            id,
            title,
            notes: note,
            displayOrder,
        });

        setOpenEditPDF(true);
    };

    const handleOpenEditPPT = ({ id, title, note, displayOrder }) => {
        setFormData({
            id,
            title,
            notes: note,
            displayOrder,
        });

        setOpenEditPPT(true);
    };

    const handleOpenEditVideo = ({ id, title, note, displayOrder }) => {
        setFormData({
            id,
            title,
            notes: note,
            displayOrder,
        });

        setOpenEditVideo(true);
    };

    const handleCloseEdit = () => setOpenEdit(false);
    const handleCloseEditPDF = () => setOpenEditPDF(false);
    const handleCloseEditPPT = () => setOpenEditPPT(false);
    const handleCloseEditVideo = () => setOpenEditVideo(false); 

    const handleOpenDelete = async ({ id, type }) => {

        try {

            setPageLoading(true);

            let endpoint = "";

            switch (type) {

                case "NOTE":
                    endpoint = "note";
                    break;

                case "VIDEO":
                    endpoint = "video";
                    break;

                case "PDF":
                    endpoint = "pdf";
                    break;

                case "PPT":
                    endpoint = "ppt";
                    break;

                case "PREVIOUS_PAPER":
                    endpoint = "previous-paper";
                    break;

                default:
                    throw new Error("Invalid content type.");
            }

            const response = await fetch(
                `/api/chapter-content/${endpoint}/${id}`,
                {
                    method: "DELETE",
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message);
            }

            await fetchChapters();

            alert(`${type.replaceAll("_", " ")} deleted successfully!`);

        }
        catch (err) {

            console.error(err);
            alert(err.message);

        }
        finally {

            setPageLoading(false);

        }
    };

    return (
        <Box sx={{ position: "relative", minHeight: 150 }}>

            {/* Page Loader */}
            {pageLoading && (
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        bgcolor: "rgba(255,255,255,.7)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 999,
                    }}
                >
                    <CircularProgress />
                </Box>
            )}

            {chapterContents.map((note) => {

                const config =
                    contentTypeConfig[note.type] || {
                        image: "/images/content/default.png",
                        label: note.type,
                    };

                return (

                    <AccordionDetails
                        key={note.id}
                        sx={{
                            backgroundColor: "white",
                            position: "relative",
                        }}

                    >

                        <Box display="flex" onClick={() => {
                            setSelectedContent(note);
                            setOpenView(true);
                        }}>

                            <Image
                                src={config.image}
                                alt={config.label}
                                width={60}
                                height={60}
                                style={{
                                    borderRadius: 8,
                                    objectFit: "cover",
                                }}
                            />

                            <Box
                                ml={2}
                                display="flex"
                                flexDirection="column"
                                justifyContent="center"
                            >

                                <Typography
                                    fontSize={18}
                                    fontWeight="bold"
                                >
                                    {note.title}
                                </Typography>

                                <Typography
                                    fontSize={15}
                                    color="gray"
                                >
                                    {config.label}
                                </Typography>

                            </Box>

                        </Box>

                        <Box
                            onClick={(e) => {
                                e.stopPropagation();
                                switch (note.type) {
                                    case 'NOTE': handleOpenEdit(note);
                                        break;
                                    case 'PDF': handleOpenEditPDF(note);
                                        break;
                                    case 'PPT': handleOpenEditPPT(note);
                                        break;
                                    case 'VIDEO': handleOpenEditVideo(note);
                                        break;
                                }

                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            sx={{
                                position: "absolute",
                                top: "20%",
                                right: "12%",
                            }}
                        >
                            <Fab
                                color="secondary"
                                size="small"
                            >
                                <Edit />
                            </Fab>
                        </Box>

                        <Box
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDelete(note);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            sx={{
                                position: "absolute",
                                top: "20%",
                                right: "6%",
                            }}
                        >
                            <Fab
                                size="small"
                                sx={{
                                    bgcolor: "red",
                                    color: "#fff",
                                }}
                            >
                                <Delete />
                            </Fab>
                        </Box>

                    </AccordionDetails>

                );

            })}

            {/* View Content */}
            <ViewNotes openView={openView} setOpenView={setOpenView} content={selectedContent} />

            {/* Edit Modal */}
            <EditNotes modalLoading={modalLoading} openEdit={openEdit} handleCloseEdit={handleCloseEdit} formData={formData} setModalLoading={setModalLoading} setOpenEdit={setOpenEdit} fetchChapters={fetchChapters} handleChange={handleChange} />
            <EditPDF modalLoading={modalLoading}
                setModalLoading={setModalLoading}
                openEditPDF={openEditPDF}
                handleCloseEditPDF={handleCloseEditPDF}
                setOpenEditPDF={setOpenEditPDF}
                formData={formData}
                setFormData={setFormData}
                fetchChapters={fetchChapters}
            />

            <EditPPT modalLoading={modalLoading}
                setModalLoading={setModalLoading}
                openEditPPT={openEditPPT}
                handleCloseEditPPT={handleCloseEditPPT}
                setOpenEditPPT={setOpenEditPPT}
                formData={formData}
                setFormData={setFormData}
                fetchChapters={fetchChapters}
            />

            <EditVideo modalLoading={modalLoading}
                setModalLoading={setModalLoading}
                openEditVideo={openEditVideo}
                handleCloseEditVideo={handleCloseEditVideo}
                setOpenEditVideo={setOpenEditVideo}
                formData={formData}
                setFormData={setFormData}
                fetchChapters={fetchChapters}
            />

        </Box>
    );
};

export default Notes;