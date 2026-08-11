'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AddCircleOutline, CheckCircleOutline, DeleteOutline, RadioButtonUnchecked, Quiz, SaveOutlined } from '@mui/icons-material';

const AssessmentManager = ({ resetForm, fetchAssessments, emptyQuestion, assessments, loading, addQuestion, subjectId, classId, chapterId, title, setTitle, description, setDescription, type, setType, questions, setQuestions, feedback, setFeedback, editingAssessment, setEditingAssessment, open, setOpen, saving, setSaving }) => {
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [appearedDialogOpen, setAppearedDialogOpen] = useState(false);
  const [appearedStudents, setAppearedStudents] = useState([]);
  const [appearedLoading, setAppearedLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [studentAssessmentOpen, setStudentAssessmentOpen] = useState(false);
  const [studentAssessmentContext, setStudentAssessmentContext] = useState(null);

  useEffect(() => {
    const handleAssessmentMessage = (event) => {
      if (!event?.data || typeof event.data !== 'object') return;

      if (event.data.type === 'assessment:completed' || event.data.type === 'assessment:closed') {
        setStudentAssessmentOpen(false);
        setStudentAssessmentContext(null);

        if (event.data.type === 'assessment:completed' && typeof fetchAssessments === 'function') {
          fetchAssessments();
        }
      }
    };

    window.addEventListener('message', handleAssessmentMessage);
    return () => window.removeEventListener('message', handleAssessmentMessage);
  }, [fetchAssessments]);

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((question, itemIndex) => (itemIndex === index ? { ...question, [field]: value } : question))
    );
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setQuestions((prev) =>
      prev.map((question, itemIndex) => {
        if (itemIndex !== questionIndex) return question;
        const nextOptions = [...question.options];
        nextOptions[optionIndex] = value;
        return { ...question, options: nextOptions };
      })
    );
  };

  const openEditDialog = (assessment) => {
    const normalizedQuestions = (assessment.questions || []).map((question) => {
      const correctOptionIndex = question.options?.findIndex((option) => option.isCorrect) ?? 0;
      return {
        questionText: question.questionText || '',
        correctOptionIndex: correctOptionIndex >= 0 ? correctOptionIndex : 0,
        options: (question.options || []).map((option) => option.optionText || ''),
      };
    });

    setEditingAssessment(assessment);
    setTitle(assessment.title || '');
    setDescription(assessment.description || '');
    setType(assessment.type || 'ASSESSMENT');
    setQuestions(normalizedQuestions.length ? normalizedQuestions : [emptyQuestion()]);
    setOpen(true);
  };

  const handleOpenPendingDialog = async (assessment) => {
    if (!assessment?.id) return;

    try {
      setPendingLoading(true);
      const res = await fetch(`/api/assessments/${assessment.id}/pending-students`, {
        credentials: 'include',
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Unable to load pending students');
      }

      setPendingStudents(result.data || []);
      setSelectedAssessment(assessment);
      setPendingDialogOpen(true);
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to load pending students' });
    } finally {
      setPendingLoading(false);
    }
  };

  const handleOpenPendingStudentAttempt = (student) => {
    if (!student?.id || !selectedAssessment?.id) return;

    setPendingDialogOpen(false);
    setStudentAssessmentContext({
      assessmentId: selectedAssessment.id,
      subjectId: subjectId || '',
      studentId: student.id,
      editMode: false,
      studentName: student.name,
      studentEmail: student.email,
    });
    setStudentAssessmentOpen(true);
  };

  const handleOpenAppearedStudentAttempt = (student) => {
    if (!student?.id || !selectedAssessment?.id) return;

    setAppearedDialogOpen(false);
    setStudentAssessmentContext({
      assessmentId: selectedAssessment.id,
      subjectId: subjectId || '',
      studentId: student.id,
      editMode: true,
      studentName: student.name,
      studentEmail: student.email,
    });
    setStudentAssessmentOpen(true);
  };

  const handleOpenAppearedDialog = async (assessment) => {
    if (!assessment?.id) return;

    try {
      setAppearedLoading(true);
      const res = await fetch(`/api/assessments/${assessment.id}/appeared-students`, {
        credentials: 'include',
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Unable to load appeared students');
      }

      setAppearedStudents(result.data || []);
      setSelectedAssessment(assessment);
      setAppearedDialogOpen(true);
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to load appeared students' });
    } finally {
      setAppearedLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!subjectId && !classId) {
      alert('Class or subject is required to save assessment.');
      return;
    }

    const validQuestions = questions
      .filter((question) => question.questionText.trim())
      .map((question) => ({
        questionText: question.questionText.trim(),
        correctOptionIndex: Number(question.correctOptionIndex) || 0,
        options: question.options.map((option, index) => ({
          optionText: option.trim(),
          isCorrect: index === (Number(question.correctOptionIndex) || 0),
          displayOrder: index + 1,
        })),
      }));

    if (validQuestions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    const hasValidOptions = validQuestions.every((question) =>
      question.options.every((option) => option.optionText)
    );

    if (!hasValidOptions) {
      alert('Each question must have all 4 options filled.');
      return;
    }

    try {
      setSaving(true);
      const endpoint = classId ? '/api/assessments' : `/api/subjects/${subjectId}/assessments`;
      const res = await fetch(endpoint, {
        method: editingAssessment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: editingAssessment?.id,
          classId: classId || undefined,
          subjectId: subjectId || null,
          chapterId: chapterId || null,
          title: title.trim(),
          description: description.trim() || null,
          type,
          resolvedSubjectId: subjectId || null,
          questions: validQuestions,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Unable to save assessment');

      setFeedback({
        severity: 'success',
        message: editingAssessment ? 'Assessment updated successfully.' : 'Assessment created successfully.',
      });
      resetForm();
      setOpen(false);
      await fetchAssessments();
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to save assessment' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 4, px: { xs: 2, sm: 3, md: 4 }, width: '100%', maxWidth: 1400, mx: 'auto' }}>

      {feedback ? (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      ) : null}

      {loading ? (
        <Box
          sx={{
            width: "100%",
            minHeight: "400px", // Adjust as needed
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary">
            Loading assessments...
          </Typography>
        </Box>
      ) : (<>
        <Stack spacing={2}>
          {assessments.map((assessment) => (
            <Card key={assessment.id} variant="outlined" border='1px solid black' sx={{ backgroundColor: '#f9f9f9' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Box>
                    <Typography fontWeight="bold">{assessment.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{assessment.description || 'No description'}</Typography>
                  </Box>
                  <Chip label={`View ${assessment.type}`} color="primary" variant="outlined" onClick={() => openEditDialog(assessment)} sx={{ fontWeight: 600 }} />
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                  <Chip label={`Questions: ${assessment.questions?.length || 0}`} variant="outlined" />
                  {/* <Chip label={`Appeared: ${assessment.attempts || 0}`} color="success" variant="outlined" /> */}
                  <Chip
                    label={`Pending: ${assessment.pending || 0}`}
                    color="warning"
                    variant="outlined"
                    onClick={() => handleOpenPendingDialog(assessment)}
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                  <Chip
                    label={`Appeared: ${assessment.attempts || 0}`}
                    color="success"
                    variant="outlined"
                    onClick={() => handleOpenAppearedDialog(assessment)}
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                </Stack>
                {/* <Button size="small" onClick={() => openEditDialog(assessment)}>
                  Edit
                </Button> */}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </>
      )}

      <Dialog open={pendingDialogOpen} onClose={() => setPendingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pending Students</DialogTitle>
        <DialogContent dividers>
          {pendingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : pendingStudents.length === 0 ? (
            <Typography color="text.secondary">No pending students found for this assessment.</Typography>
          ) : (
            <Stack spacing={2}>
              {pendingStudents.map((group) => (
                <Box key={group.className}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Class {group.className}
                  </Typography>
                  <List dense disablePadding>
                    {group.students.map((student) => (
                      <ListItem key={student.id} disablePadding>
                        <ListItemButton onClick={() => handleOpenPendingStudentAttempt(student)}>
                          <ListItemText primary={student.name} secondary={student.email} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={appearedDialogOpen} onClose={() => setAppearedDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Appeared Students</DialogTitle>
        <DialogContent dividers>
          {appearedLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : appearedStudents.length === 0 ? (
            <Typography color="text.secondary">No appeared students found for this assessment.</Typography>
          ) : (
            <Stack spacing={2}>
              {appearedStudents.map((group) => (
                <Box key={group.className}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Class {group.className}
                  </Typography>
                  <List dense disablePadding>
                    {group.students.map((student) => (
                      <ListItem key={student.id} disablePadding>
                        <ListItemButton onClick={() => handleOpenAppearedStudentAttempt(student)}>
                          <ListItemText primary={student.name} secondary={student.email} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAppearedDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={studentAssessmentOpen} onClose={() => setStudentAssessmentOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Student Assessment</DialogTitle>
        <DialogContent dividers>
          {studentAssessmentContext ? (
            <Box sx={{ py: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {studentAssessmentContext.studentName || 'Student assessment'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {studentAssessmentContext.studentEmail || 'Opening assessment for this student.'}
              </Typography>
              <iframe
                src={`/assessment?assessmentId=${studentAssessmentContext.assessmentId}&subjectId=${studentAssessmentContext.subjectId || ''}&studentId=${studentAssessmentContext.studentId}&editMode=${studentAssessmentContext.editMode}&returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                title="Student assessment"
                style={{ width: '100%', minHeight: '70vh', border: '1px solid #d0d7de', borderRadius: 8 }}
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentAssessmentOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: 620, borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
          <Quiz sx={{ fontSize: 28, color: '#1a73e8' }} />
          {editingAssessment ? 'Edit Assessment / Assignment' : 'Create Assessment'}
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3.5, md: 4 } }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Assessment Title"
              fullWidth
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={type} label="Type" onChange={(event) => setType(event.target.value)}>
                <MenuItem value="ASSESSMENT">Assessment</MenuItem>
                {/* <MenuItem value="ASSIGNMENT">Assignment</MenuItem> */}
              </Select>
            </FormControl>

            {questions.map((question, questionIndex) => (
              <Box
                key={questionIndex}
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 4,
                  boxShadow: "0 2px 10px rgba(0,0,0,.08)",
                  borderLeft: "6px solid #673ab7",
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  transition: ".25s",
                  "&:hover": {
                    boxShadow: "0 6px 18px rgba(0,0,0,.12)",
                  },
                }}
              >
                {/* Header */}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography
                    fontWeight={700}
                    fontSize={18}
                    color="text.primary"
                  >
                    Question {questionIndex + 1}
                  </Typography>

                  {questions.length > 1 && (
                    <IconButton
                      color="error"
                      onClick={() => removeQuestion(questionIndex)}
                    >
                      <DeleteOutline />
                    </IconButton>
                  )}
                </Box>

                {/* Question */}
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type your question"
                  value={question.questionText}
                  onChange={(e) =>
                    updateQuestion(questionIndex, "questionText", e.target.value)
                  }
                  sx={{
                    mb: 3,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                />

                <Divider sx={{ mb: 3 }} />

                {/* Options */}
                <Box display="flex" flexDirection="column" gap={2}>
                  {question.options.map((option, optionIndex) => (
                    <TextField
                      key={optionIndex}
                      fullWidth
                      variant="outlined"
                      placeholder={`Option ${optionIndex + 1}`}
                      value={option}
                      onChange={(e) =>
                        updateOption(
                          questionIndex,
                          optionIndex,
                          e.target.value
                        )
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconButton
                              size="small"
                              sx={{ mr: 1 }}
                              onClick={() =>
                                updateQuestion(
                                  questionIndex,
                                  "correctOptionIndex",
                                  optionIndex
                                )
                              }
                            >
                              {question.correctOptionIndex === optionIndex ? (
                                <CheckCircleOutline color="success" />
                              ) : (
                                <RadioButtonUnchecked color="disabled" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 3,
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddCircleOutline />}
              onClick={addQuestion}
              sx={{ width: { xs: '100%', sm: 'auto' }, textTransform: 'none', fontWeight: 600 }}
            >
              Add Question
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', p: { xs: 2, sm: 3 } }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' }, borderRadius: 3 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveOutlined />}
            onClick={handleSubmit}
            disabled={saving}
            sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' }, minWidth: 140, borderRadius: 3 }}
          >
            {saving ? (editingAssessment ? 'Updating...' : 'Creating...') : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssessmentManager;
