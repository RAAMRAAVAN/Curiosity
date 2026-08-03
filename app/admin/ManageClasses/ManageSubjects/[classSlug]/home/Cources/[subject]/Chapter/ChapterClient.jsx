'use client'
import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import { Avatar, Box, Fade, Fab, IconButton, Menu, MenuItem, Modal, TextField, Tooltip, ListItemIcon, ListItemText } from '@mui/material';
import Image from 'next/image';
import { useEffect } from 'react';
import { Add, Close, Edit, NoteAdd, PictureAsPdf, Slideshow, VideoLibrary } from '@mui/icons-material';
import { useState } from 'react';
import EditChapter from './EditChapter';
import Notes from './Notes/Notes';
import AddNotes from './Notes/AddNotes';
import AddPDF from './PDF/AddPDF';
import AddPPT from './PPT/AddPPT';
import AddVideo from './Video/AddVideo';
// import AddNotes from './Notes/AddNotes';

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 550 },
  bgcolor: "background.paper",
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
  outline: "none",
};

const Chapter = ({ chapters, setChapters, loading, subject, fetchChapters }) => {
  const id = React.useId();
  const [openEdit, setOpenEdit] = useState(false);
  const [openAddNotes, setopenAddNotes] = useState(false);
  const [openAddPDF, setopenAddPDF] = useState(false);
  const [openAddPPT, setopenAddPPT] = useState(false);
  const [openAddVideo, setopenAddVideo] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [expandedChapterId, setExpandedChapterId] = useState(null);
  const [formData, setFormData] = useState({
    chapterNumber: "",
    chapterName: "",
    chapterID: ""
  });

  const [formData_AddNotes, setFormData_AddNotes] = useState({
    chapterNumber: "",
    chapterName: "",
    chapterID: ""
  })

  const [formData_AddPDF, setFormData_AddPDF] = useState({
    chapterNumber: "",
    chapterName: "",
    chapterID: ""
  })

  const [formData_AddPPT, setFormData_AddPPT] = useState({
    chapterNumber: "",
    chapterName: "",
    chapterID: ""
  })

  const [formData_AddVideo, setFormData_AddVideo] = useState({
    chapterNumber: "",
    chapterName: "",
    chapterID: ""
  })

  const handleOpenEdit = (chapter) => {
    setSelectedChapter(chapter);

    setFormData({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id
    });

    setOpenEdit(true);
  };

  const handleopenAddNotes = (chapter = selectedChapter) => {
    if (!chapter) return;
    setSelectedChapter(chapter);

    setFormData_AddNotes({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id,
    });

    setopenAddNotes(true);
    setActionMenuAnchor(null);
  };

  const handleopenAddPDF = (chapter = selectedChapter) => {
    if (!chapter) return;
    setSelectedChapter(chapter);

    setFormData_AddPDF({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id,
    });

    setopenAddPDF(true);
    setActionMenuAnchor(null);
  };

  const handleopenAddPPT = (chapter = selectedChapter) => {
    if (!chapter) return;
    setSelectedChapter(chapter);

    setFormData_AddPPT({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id,
    });

    setopenAddPPT(true);
    setActionMenuAnchor(null);
  };

  const handleopenAddVideo = (chapter = selectedChapter) => {
    if (!chapter) return;
    setSelectedChapter(chapter);

    setFormData_AddVideo({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id,
    });

    setopenAddVideo(true);
    setActionMenuAnchor(null);
  };

  const handleActionButtonClick = (event, chapter) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedChapter(chapter);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionMenuClose = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setActionMenuAnchor(null);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedChapter(null);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    console.log(formData);

    try {
      const res = await fetch(`/api/admin/chapters/${formData.chapterID}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }
      )

      fetchChapters();
    } catch (error) {
      alert(error);
    }

    setOpenEdit(false);
  };

  useEffect(() => {
    console.log("Chapters = ", chapters);
  }, [chapters])

  const EditSubject = () => {

  }

  return (
    <>
      <Box width='100%' marginY={5}>
        {chapters.map((chapter) => (
          <Accordion
            expanded={expandedChapterId === chapter.id}
            onChange={(event, isExpanded) => {
              if (actionMenuAnchor) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              setExpandedChapterId(isExpanded ? chapter.id : null);
              if (isExpanded) {
                setSelectedChapter(chapter);
              }
            }}
            sx={{ boxShadow: 3, position: 'relative', width: '100%', margin: '0 auto' }}
            key={chapter.id}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              onClick={(e) => {
                if (actionMenuAnchor) {
                  e.preventDefault();
                  e.stopPropagation();
                  setActionMenuAnchor(null);
                }
              }}
              aria-controls={`${id}-panel1-content`}
              id={`${id}-panel1-header`}
              sx={{
                ":hover": { backgroundColor: '#fbfbfb' },
                borderRadius: 2,
                minHeight: 90,
                '.MuiAccordionSummary-content': {
                  alignItems: 'center',
                },
                '.MuiAccordionSummary-expandIconWrapper': {
                  display: { xs: 'none', sm: 'none', md: 'none', lg: 'flex' },
                },
              }}
            >
              <Box display='flex' width='100%' justifyContent='space-between' position='relative'>
                <Box display='flex'>
                  <Avatar sx={{ bgcolor: '#fbfbfb', color: 'black', padding: '5px', display: 'flex', height: '70px', width: '70px', flexDirection: 'column', border: '4px lightGray solid' }}>
                    <Typography fontSize={12} marginTop={1} fontWeight='bold'>Chapter</Typography>
                    <Typography fontSize={12} fontWeight='bold'>{chapter.displayOrder}</Typography>
                  </Avatar>

                  <Box
                    marginLeft={2}
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                  >
                    <Typography fontSize={18} fontWeight="bold">
                      {chapter.chapterName}
                    </Typography>
                    <Typography fontSize={13} marginTop={1} color="gray">
                      {[
                        chapter.content_count?.notes > 0 &&
                        `${chapter.content_count.notes} notes`,
                        chapter.content_count?.pdfs > 0 &&
                        `${chapter.content_count.pdfs} PDFs`,
                        chapter.content_count?.videos > 0 &&
                        `${chapter.content_count.videos} videos`,
                        chapter.content_count?.ppts > 0 &&
                        `${chapter.content_count.ppts} PPTs`,
                        chapter.content_count?.previousPapers > 0 &&
                        `${chapter.content_count.previousPapers} tests`,
                      ]
                        .filter(Boolean)
                        .join(" | ") || "No content available"}
                    </Typography>
                  </Box>

                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(chapter);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    marginLeft={1}
                  >
                    <Fab
                      color="secondary"
                      size="small"
                      aria-label="edit"
                      sx={{
                        width: 32,
                        marginTop: 1,
                        height: 32,
                        minHeight: 32,
                      }}
                    >
                      <Edit sx={{ fontSize: 18 }} />
                    </Fab>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" justifyContent="center" sx={{ minWidth: 140 }} position="absolute" right={{ xs: -55, sm: 16, md: -30 }} top={{ xs: 26, sm: 18, md: 15 }}>
                  <Tooltip title="Add Content" arrow>
                    <IconButton
                      size="large"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionButtonClick(e, chapter);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      sx={{
                        bgcolor: "primary.main",
                        color: "#fff",
                        boxShadow: 3,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                      aria-label="add content"
                    >
                      <Add />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <Notes chapterContents={chapter.contents} fetchChapters={fetchChapters} />
          </Accordion>
        ))}

        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          keepMounted
          PaperProps={{ sx: { minWidth: 200, borderRadius: 3, boxShadow: 5 } }}
        >
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleopenAddNotes();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
              <NoteAdd fontSize="medium" />
            </ListItemIcon>
            <ListItemText primary="Add Notes" primaryTypographyProps={{ fontWeight: 600 }} />
          </MenuItem>
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleopenAddPDF();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
              <PictureAsPdf fontSize="medium" />
            </ListItemIcon>
            <ListItemText primary="Add PDF" primaryTypographyProps={{ fontWeight: 600 }} />
          </MenuItem>
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleopenAddPPT();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'secondary.main' }}>
              <Slideshow fontSize="medium" />
            </ListItemIcon>
            <ListItemText primary="Add PPT" primaryTypographyProps={{ fontWeight: 600 }} />
          </MenuItem>
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleopenAddVideo();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'success.main' }}>
              <VideoLibrary fontSize="medium" />
            </ListItemIcon>
            <ListItemText primary="Add Video" primaryTypographyProps={{ fontWeight: 600 }} />
          </MenuItem>
        </Menu>
      </Box>
      {/* <EditChapter openEdit={openEdit} setOpenEdit={setOpenEdit}/> */}
    <Modal
      open={openEdit}
      onClose={handleCloseEdit}
      closeAfterTransition
    >
      <Fade in={openEdit}>
        <Box sx={style}>
          <IconButton
            onClick={handleCloseEdit}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
            }}
          >
            <Close />
          </IconButton>

          <Typography variant="h5" fontWeight="bold" mb={3}>
            Edit Chapter
          </Typography>

          <TextField
            fullWidth
            label="Chapter Number"
            name="chapterNumber"
            type="number"
            value={formData.chapterNumber}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Chapter Name"
            name="chapterName"
            value={formData.chapterName}
            onChange={handleChange}
            margin="normal"
          />

          <Box
            display="flex"
            justifyContent="flex-end"
            gap={2}
            mt={4}
          >
            <Button
              variant="outlined"
              onClick={handleCloseEdit}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleSubmit}
            >
              Submit
            </Button>
          </Box>
        </Box>
      </Fade>
    </Modal>

    {/* Notes Model */}
    <AddNotes openAddNotes={openAddNotes} formData_AddNotes={formData_AddNotes} setFormData_AddNotes={setFormData_AddNotes} handleopenAddNotes={handleopenAddNotes} setopenAddNotes={setopenAddNotes} selectedChapter={selectedChapter} setSelectedChapter={setSelectedChapter} fetchChapters={fetchChapters} />
    <AddPDF openAddPDF={openAddPDF} formData_AddPDF={formData_AddPDF} setFormData_AddPDF={setFormData_AddPDF} handleopenAddPDF={handleopenAddPDF} setopenAddPDF={setopenAddPDF} selectedChapter={selectedChapter} setSelectedChapter={setSelectedChapter} fetchChapters={fetchChapters} />
    <AddPPT openAddPPT={openAddPPT} formData_AddPPT={formData_AddPPT} setFormData_AddPPT={setFormData_AddPPT} handleopenAddPPT={handleopenAddPPT} setopenAddPPT={setopenAddPPT} selectedChapter={selectedChapter} setSelectedChapter={setSelectedChapter} fetchChapters={fetchChapters} />
    <AddVideo openAddVideo={openAddVideo} formData_AddVideo={formData_AddVideo} setFormData_AddVideo={setFormData_AddVideo} handleopenAddVideo={handleopenAddVideo} setopenAddVideo={setopenAddVideo} selectedChapter={selectedChapter} setSelectedChapter={setSelectedChapter} fetchChapters={fetchChapters} />
  </>
  );
}
export default Chapter;