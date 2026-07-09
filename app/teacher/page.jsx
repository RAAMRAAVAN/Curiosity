"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
} from "@mui/material";

const contentTypes = [
  { value: "PPT", label: "PPT" },
  { value: "PDF", label: "PDF" },
  { value: "VIDEO", label: "Video" },
  { value: "MEETING_LINK", label: "Meeting Link" },
  { value: "QUESTION_PAPER", label: "Question Paper" },
];

const emptyClass = { name: "" };
const emptySubject = { name: "" };
const emptyContent = {
  title: "",
  description: "",
  type: "PDF",
  resourceUrl: "",
  fileName: "",
  fileSize: "",
  mimeType: "",
};

export default function TeacherPage() {
  const [teacher, setTeacher] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [contents, setContents] = useState([]);
  const [message, setMessage] = useState(null);
  const [openClassModal, setOpenClassModal] = useState(false);
  const [openSubjectModal, setOpenSubjectModal] = useState(false);
  const [openContentModal, setOpenContentModal] = useState(false);
  const [classForm, setClassForm] = useState(emptyClass);
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [contentForm, setContentForm] = useState(emptyContent);
  const [editContentId, setEditContentId] = useState(null);

  useEffect(() => {
    loadTeacher();
  }, []);

  const loadTeacher = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/me", { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setTeacher(data.data);
        setAuthorized(true);
        await loadClasses();
      } else {
        setAuthorized(false);
      }
    } catch (error) {
      console.error(error);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    const response = await fetch("/api/teacher/classes", { credentials: "include" });
    const data = await response.json();
    if (data.success) {
      setClasses(data.data);
    }
  };

  const loadSubjects = async (classId) => {
    const response = await fetch(`/api/teacher/classes/${classId}/subjects`, { credentials: "include" });
    const data = await response.json();
    if (data.success) {
      setSubjects(data.data);
    }
  };

  const loadContents = async (subjectId) => {
    const response = await fetch(`/api/teacher/subjects/${subjectId}/contents`, { credentials: "include" });
    const data = await response.json();
    if (data.success) {
      setContents(data.data);
    }
  };

  const handleClassCreate = async () => {
    const response = await fetch("/api/teacher/classes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(classForm),
    });
    const data = await response.json();
    if (data.success) {
      setClasses([data.data, ...classes]);
      setClassForm(emptyClass);
      setOpenClassModal(false);
    } else {
      setMessage(data.message);
    }
  };

  const handleSubjectCreate = async () => {
    const response = await fetch(`/api/teacher/classes/${selectedClass.id}/subjects`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subjectForm),
    });
    const data = await response.json();
    if (data.success) {
      setSubjects([data.data, ...subjects]);
      setSubjectForm(emptySubject);
      setOpenSubjectModal(false);
    } else {
      setMessage(data.message);
    }
  };

  const handleContentCreate = async () => {
    const response = await fetch(`/api/teacher/subjects/${selectedSubject.id}/contents`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contentForm),
    });
    const data = await response.json();
    if (data.success) {
      setContents([data.data, ...contents]);
      setContentForm(emptyContent);
      setOpenContentModal(false);
      setEditContentId(null);
    } else {
      setMessage(data.message);
    }
  };

  const handleContentEdit = async () => {
    const response = await fetch(`/api/teacher/subjects/${selectedSubject.id}/contents/${editContentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contentForm),
    });
    const data = await response.json();
    if (data.success) {
      setContents(contents.map((item) => (item.id === editContentId ? data.data : item)));
      setContentForm(emptyContent);
      setOpenContentModal(false);
      setEditContentId(null);
    } else {
      setMessage(data.message);
    }
  };

  const handleContentDelete = async (contentId) => {
    if (!confirm("Delete this content?")) return;
    const response = await fetch(`/api/teacher/subjects/${selectedSubject.id}/contents/${contentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json();
    if (data.success) {
      setContents(contents.filter((item) => item.id !== contentId));
    } else {
      setMessage(data.message);
    }
  };

  const openEditContent = (item) => {
    setEditContentId(item.id);
    setContentForm({
      title: item.title,
      description: item.description || "",
      type: item.type,
      resourceUrl: item.resourceUrl || "",
      fileName: item.fileName || "",
      fileSize: item.fileSize || 0,
      mimeType: item.mimeType || "",
    });
    setOpenContentModal(true);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!authorized) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", p: 3 }}>
        <Paper sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 480 }}>
          <Typography variant="h5" mb={2}>
            Teacher content portal
          </Typography>
          <Typography mb={3}>Please login through the regular teacher auth flow to access content management.</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f7fc", py: 4, px: 3 }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Paper sx={{ p: 4, mb: 4, borderRadius: 4, boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)" }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Teacher Content Portal
          </Typography>
          <Typography color="text.secondary" mb={3}>
            Create class groups, subjects, and upload lesson resources for your students.
          </Typography>

          <Button variant="contained" onClick={() => setOpenClassModal(true)} sx={{ mr: 2 }}>
            Create Class
          </Button>
          <Button variant="outlined" disabled={!selectedClass} onClick={() => setOpenSubjectModal(true)}>
            Create Subject
          </Button>
        </Paper>

        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "280px 1fr" }}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Classes
            </Typography>
            <List>
              {classes.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    selected={selectedClass?.id === item.id}
                    onClick={async () => {
                      setSelectedClass(item);
                      setSelectedSubject(null);
                      setContents([]);
                      await loadSubjects(item.id);
                    }}
                  >
                    <ListItemText primary={item.name} secondary={new Date(item.createdAt).toLocaleDateString()} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {selectedClass ? `Subjects for ${selectedClass.name}` : "Select a class"}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {selectedClass ? "Add subjects to organize content." : "Choose a class to continue."}
                </Typography>
              </Box>
              <Chip label={`${subjects.length} subjects`} color="primary" />
            </Box>
            <List>
              {subjects.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    selected={selectedSubject?.id === item.id}
                    onClick={async () => {
                      setSelectedSubject(item);
                      await loadContents(item.id);
                    }}
                  >
                    <ListItemText primary={item.name} secondary={new Date(item.createdAt).toLocaleDateString()} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        <Paper sx={{ p: 3, mt: 3, borderRadius: 3, boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {selectedSubject ? `${selectedSubject.name} content` : "Content"}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {selectedSubject ? "Upload PPT/PDF/video, links and question papers for this subject." : "Select a subject to add content."}
              </Typography>
            </Box>
            <Button variant="contained" disabled={!selectedSubject} onClick={() => setOpenContentModal(true)}>
              Add Content
            </Button>
          </Box>

          {selectedSubject ? (
            <Box>
              {contents.length === 0 ? (
                <Typography color="text.secondary">No content uploaded yet.</Typography>
              ) : (
                <Box sx={{ display: "grid", gap: 2 }}>
                  {contents.map((item) => (
                    <Card key={item.id} sx={{ borderRadius: 3 }}>
                      <CardContent sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {item.title}
                          </Typography>
                          <Typography color="text.secondary" sx={{ mb: 1 }}>
                            {item.type.replace("_", " ")}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.description || "No description."}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                          <Button size="small" onClick={() => openEditContent(item)}>
                            Edit
                          </Button>
                          <Button size="small" color="error" onClick={() => handleContentDelete(item.id)}>
                            Delete
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          ) : null}
        </Paper>
      </Box>

      <Dialog open={openClassModal} onClose={() => setOpenClassModal(false)}>
        <DialogTitle>Create Class</DialogTitle>
        <DialogContent>
          <TextField
            label="Class Name"
            value={classForm.name}
            onChange={(e) => setClassForm({ name: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClassModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleClassCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openSubjectModal} onClose={() => setOpenSubjectModal(false)}>
        <DialogTitle>Create Subject</DialogTitle>
        <DialogContent>
          <TextField
            label="Subject Name"
            value={subjectForm.name}
            onChange={(e) => setSubjectForm({ name: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSubjectModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubjectCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openContentModal} onClose={() => setOpenContentModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editContentId ? "Edit Content" : "Add Content"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={contentForm.title}
              onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={contentForm.description}
              onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Content Type</InputLabel>
              <Select
                value={contentForm.type}
                label="Content Type"
                onChange={(e) => setContentForm({ ...contentForm, type: e.target.value })}
              >
                {contentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Resource URL"
              value={contentForm.resourceUrl}
              onChange={(e) => setContentForm({ ...contentForm, resourceUrl: e.target.value })}
              fullWidth
            />
            <TextField
              label="File Name"
              value={contentForm.fileName}
              onChange={(e) => setContentForm({ ...contentForm, fileName: e.target.value })}
              fullWidth
            />
            <TextField
              label="File Size"
              value={contentForm.fileSize}
              onChange={(e) => setContentForm({ ...contentForm, fileSize: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              label="MIME Type"
              value={contentForm.mimeType}
              onChange={(e) => setContentForm({ ...contentForm, mimeType: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenContentModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={editContentId ? handleContentEdit : handleContentCreate}>
            {editContentId ? "Save Changes" : "Add Content"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
