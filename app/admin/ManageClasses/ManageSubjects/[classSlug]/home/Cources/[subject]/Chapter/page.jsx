import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import { Avatar, Box, Fab, Fade, IconButton, Modal, TextField } from '@mui/material';
import { deepOrange } from '@mui/material/colors';
import Image from 'next/image';
import { useEffect } from 'react';
import { Close, Edit, NotesOutlined, PictureAsPdf, VideoSettings } from '@mui/icons-material';
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

  const handleopenAddNotes = (chapter) => {
    setSelectedChapter(chapter);

    setFormData_AddNotes({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id
    });

    setopenAddNotes(true);
  };

  const handleopenAddPDF = (chapter) => {
    setSelectedChapter(chapter);

    setFormData_AddPDF({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id
    });

    setopenAddPDF(true);
  };

  const handleopenAddPPT = (chapter) => {
    setSelectedChapter(chapter);

    setFormData_AddPDF({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id
    });

    setopenAddPPT(true);
  };

  const handleopenAddVideo = (chapter) => {
    setSelectedChapter(chapter);

    setFormData_AddPDF({
      chapterNumber: chapter.displayOrder,
      chapterName: chapter.chapterName,
      chapterID: chapter.id
    });

    setopenAddVideo(true);
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

  return (<>
    <Box width='100%' margin={5}>
      {chapters.map((chapter) => {
        return (
          <Accordion sx={{ boxShadow: 3, position: 'relative' }} key={chapter.id} sx={{ marginBottom: '10px' }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              onClick={() => { setSelectedChapter(chapter) }}
              aria-controls={`${id}-panel1-content`}
              id={`${id}-panel1-header`}
              sx={{ ":hover": { backgroundColor: '#fbfbfb' }, borderRadius: 2 }}
            >
              <Box display='flex' width='100%' justifyContent='space-between' >
                <Box display='flex'>
                  <Avatar sx={{ bgcolor: '#fbfbfb', color: 'black', padding: '5px', display: 'flex', height: '70px', width: '70px', flexDirection: 'column', border: '4px lightGray solid' }}> <Typography fontSize={12} marginTop={1} fontWeight='bold'>Chapter</Typography>
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
                {/* Notes */}
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    handleopenAddNotes(chapter);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{ position: 'absolute', top: '20%', right: '6%' }}
                >
                  <Fab sx={{
                    bgcolor: "orange",
                    color: "#fff",
                    "&:hover": {
                      bgcolor: "#f57c00", // Darker orange on hover
                    },
                  }} aria-label="edit">
                    <NotesOutlined />
                  </Fab>
                </Box>

                {/* PDF */}
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    handleopenAddPDF(chapter);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{ position: 'absolute', top: '20%', right: '14%' }}
                >
                  <Fab sx={{
                    bgcolor: "#863232",
                    color: "#fff",
                    "&:hover": {
                      bgcolor: "#8B2F2F", // Darker orange on hover
                    },
                  }} aria-label="edit">
                    <PictureAsPdf />
                  </Fab>
                </Box>

                {/* PPT */}
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    handleopenAddPPT(chapter);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{ position: 'absolute', top: '20%', right: '22%' }}
                >
                  <Fab sx={{
                    bgcolor: "#863232",
                    color: "#fff",
                    "&:hover": {
                      bgcolor: "#8B2F2F", // Darker orange on hover
                    },
                  }} aria-label="edit">
                    {/* <PictureAsPdf /> */}
                    <Box display='flex' width={30} height={30} sx={{ borderRadius: '50%' }}><Image src='/ppt2.gif' width={30} display='flex' sx={{ borderRadius: '50%' }} height={30} /></Box>
                  </Fab>
                </Box>


                {/* Videos */}
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    handleopenAddVideo(chapter);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{ position: 'absolute', top: '20%', right: '30%' }}
                >
                  <Fab sx={{
                    bgcolor: "#863232",
                    color: "#fff",
                    "&:hover": {
                      bgcolor: "#8B2F2F", // Darker orange on hover
                    },
                  }} aria-label="edit">
                    <VideoSettings />
                  </Fab>
                </Box>
              </Box>
            </AccordionSummary>
            {/* Notes */}
            <Notes chapterContents={chapter.contents} fetchChapters={fetchChapters} />
          </Accordion>)
      })}

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