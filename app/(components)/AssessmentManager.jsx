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
  const defaultGradeBands = [
    { label: 'A', minPercentage: 80 },
    { label: 'B', minPercentage: 60 },
    { label: 'C', minPercentage: 40 },
    { label: 'D', minPercentage: 0 },
  ];
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [appearedDialogOpen, setAppearedDialogOpen] = useState(false);
  const [appearedStudents, setAppearedStudents] = useState([]);
  const [appearedLoading, setAppearedLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [studentAssessmentOpen, setStudentAssessmentOpen] = useState(false);
  const [studentAssessmentContext, setStudentAssessmentContext] = useState(null);
  const [totalMarks, setTotalMarks] = useState(0);
  const [gradeBands, setGradeBands] = useState([
    { label: 'A', minPercentage: 80 },
    { label: 'B', minPercentage: 60 },
    { label: 'C', minPercentage: 40 },
    { label: 'D', minPercentage: 0 },
  ]);
  const [canManageAssessments, setCanManageAssessments] = useState(true);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [assessmentUpdateStatus, setAssessmentUpdateStatus] = useState(null);
  const [statusOperationId, setStatusOperationId] = useState(null);
  const computedTotalMarks = questions.reduce((sum, question) => sum + Number(question.marks || 1), 0);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const res = await fetch('/api/admin/me', { credentials: 'include' });
        const response = await res.json();
        if (!response.success) {
          setCanManageAssessments(false);
          setPermissionChecked(true);
          return;
        }

        const role = String(response.data?.role || '').toUpperCase();
        setCanManageAssessments(role === 'ADMIN' || role === 'MANAGEMENT');
        setPermissionChecked(true);
      } catch (error) {
        console.error(error);
        setCanManageAssessments(false);
        setPermissionChecked(true);
      }
    };

    loadAccess();
  }, []);

  useEffect(() => {
    if (!editingAssessment) {
      setTotalMarks(0);
      setGradeBands(defaultGradeBands);
    }
  }, [editingAssessment]);

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

  useEffect(() => {
    if (!statusOperationId) return undefined;

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/assessments/update-status?operationId=${encodeURIComponent(statusOperationId)}`, {
          credentials: 'include',
        });
        const response = await res.json();
        if (!response.success || !response.data || cancelled) return;

        setAssessmentUpdateStatus(response.data);

        const state = String(response.data.state || '').toUpperCase();
        if (state === 'COMPLETED' || state === 'FAILED') {
          setStatusOperationId(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [statusOperationId]);

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((question, itemIndex) => (itemIndex === index ? { ...question, [field]: value } : question))
    );
  };

  const updateGradeBand = (index, field, value) => {
    setGradeBands((prev) => prev.map((band, bandIndex) => (bandIndex === index ? { ...band, [field]: value } : band)));
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
    if (!canManageAssessments) {
      setFeedback({ severity: 'warning', message: 'Only admin and management users can edit assessments.' });
      return;
    }

    const normalizedQuestions = (assessment.questions || []).map((question) => {
      const correctOptionIndex = question.options?.findIndex((option) => option.isCorrect) ?? 0;
      return {
        id: question.id || null,
        questionText: question.questionText || '',
        marks: Number(question.marks) || 1,
        correctOptionIndex: correctOptionIndex >= 0 ? correctOptionIndex : 0,
        options: (question.options || []).map((option) => option.optionText || ''),
      };
    });

    let normalizedGradeBands = defaultGradeBands;
    if (Array.isArray(assessment?.gradeBands)) {
      normalizedGradeBands = assessment.gradeBands;
    } else if (typeof assessment?.gradeBands === 'string') {
      try {
        const parsed = JSON.parse(assessment.gradeBands);
        normalizedGradeBands = Array.isArray(parsed) && parsed.length ? parsed : defaultGradeBands;
      } catch {
        normalizedGradeBands = defaultGradeBands;
      }
    }

    setEditingAssessment(assessment);
    setTitle(assessment.title || '');
    setDescription(assessment.description || '');
    setType(assessment.type || 'ASSESSMENT');
    setTotalMarks(Number(assessment.totalMarks) || 0);
    setGradeBands(normalizedGradeBands.length ? normalizedGradeBands : defaultGradeBands);
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
    if (!canManageAssessments) {
      setFeedback({ severity: 'warning', message: 'Only admin and management users can create or edit assessments.' });
      return;
    }

    if (!subjectId && !classId) {
      alert('Class or subject is required to save assessment.');
      return;
    }

    const validQuestions = questions
      .filter((question) => question.questionText.trim())
      .map((question) => ({
        id: question.id || undefined,
        questionText: question.questionText.trim(),
        marks: Number(question.marks) || 1,
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
      const operationId = editingAssessment
        ? (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `assessment-update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
        : null;

      if (operationId) {
        setAssessmentUpdateStatus({
          state: 'IN_PROGRESS',
          stage: 'REQUEST_STARTED',
          message: 'Submitting assessment update request...',
        });
        setStatusOperationId(operationId);
      } else {
        setAssessmentUpdateStatus(null);
      }

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
          totalMarks: computedTotalMarks,
          gradeBands: gradeBands.filter((band) => band?.label?.trim()),
          operationId: operationId || undefined,
          questions: validQuestions,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Unable to save assessment');

      setFeedback({
        severity: 'success',
        message: editingAssessment ? 'Assessment updated successfully.' : 'Assessment created successfully.',
      });
      if (editingAssessment) {
        const recalculatedResults = Number(result?.data?.recalculatedResults || 0);
        setAssessmentUpdateStatus({
          state: 'COMPLETED',
          stage: 'DONE',
          message: `Assessment updated. Recalculated ${recalculatedResults} submitted result(s).`,
        });
      }
      resetForm();
      setOpen(false);
      await fetchAssessments();
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to save assessment' });
      if (editingAssessment) {
        setAssessmentUpdateStatus({
          state: 'FAILED',
          stage: 'FAILED',
          message: error.message || 'Unable to update assessment',
        });
      }
    } finally {
      setStatusOperationId(null);
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 4, px: { xs: 2, sm: 3, md: 4 }, width: '100%', maxWidth: 1400, mx: 'auto' }}>
      {saving && editingAssessment ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2500,
            bgcolor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            px: 2,
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 560,
              bgcolor: '#ffffff',
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              boxShadow: '0 16px 40px rgba(2, 6, 23, 0.35)',
              p: { xs: 3, sm: 4 },
              textAlign: 'center',
            }}
          >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Updating Assessment
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
              {assessmentUpdateStatus?.message || 'Please wait while backend updates the assessment and recalculates results.'}
            </Typography>
            {assessmentUpdateStatus?.progress?.total > 0 ? (
              <Typography variant="body2" color="text.secondary">
                Progress: {assessmentUpdateStatus.progress.processed || 0}/{assessmentUpdateStatus.progress.total}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Stage: {assessmentUpdateStatus?.stage || 'INITIALIZING'}
              </Typography>
            )}
          </Box>
        </Box>
      ) : null}

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
          {!canManageAssessments ? (
            <Typography variant="body2" color="text.secondary">
              You can view submissions, but only admin and management users can create or edit assessments.
            </Typography>
          ) : null}
          {assessments.map((assessment) => (
            <Card key={assessment.id} variant="outlined" border='1px solid black' sx={{ backgroundColor: '#f9f9f9' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Box>
                    <Typography fontWeight="bold">{assessment.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{assessment.description || 'No description'}</Typography>
                  </Box>
                  <Chip
                    label={`View ${assessment.type}`}
                    color="primary"
                    variant="outlined"
                    onClick={() => openEditDialog(assessment)}
                    disabled={!canManageAssessments}
                    sx={{ fontWeight: 600 }}
                  />
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

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Total Marks"
                type="number"
                fullWidth
                value={computedTotalMarks}
                inputProps={{ min: 0, readOnly: true }}
                helperText="Auto-calculated from per-question marks"
              />
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {computedTotalMarks} marks from questions
              </Typography>
            </Stack>

            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1.5 }}>Grade Bands</Typography>
              <Stack spacing={1.5}>
                {gradeBands.map((band, bandIndex) => (
                  <Stack key={`${band.label}-${bandIndex}`} direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label="Label"
                      value={band.label || ''}
                      onChange={(event) => updateGradeBand(bandIndex, 'label', event.target.value)}
                      sx={{ minWidth: 120 }}
                    />
                    <TextField
                      label="Min %"
                      type="number"
                      value={band.minPercentage ?? 0}
                      onChange={(event) => updateGradeBand(bandIndex, 'minPercentage', Number(event.target.value) || 0)}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Box>

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
                    mb: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                />

                <TextField
                  label="Marks"
                  type="number"
                  value={question.marks ?? 1}
                  onChange={(e) => updateQuestion(questionIndex, 'marks', Number(e.target.value) || 0)}
                  inputProps={{ min: 0 }}
                  sx={{ mb: 3, maxWidth: 180 }}
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
            disabled={saving || (permissionChecked && !canManageAssessments)}
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
