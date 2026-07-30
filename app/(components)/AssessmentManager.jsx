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
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Quiz } from '@mui/icons-material';

const AssessmentManager = ({ resetForm, fetchAssessments, emptyQuestion, assessments, loading, addQuestion, subjectId, classId, chapterId, title, setTitle, description, setDescription, type, setType, questions, setQuestions, feedback, setFeedback, editingAssessment, setEditingAssessment, open, setOpen, saving, setSaving }) => {

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
    <Box sx={{ mt: 4 }}>

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
      ) : assessments.length === 0 ? (
      <Typography color="text.secondary">No assessments created for this subject yet.</Typography>
      ) : (<>
        <Stack spacing={2}>
          {assessments.map((assessment) => (
            <Card key={assessment.id} variant="outlined" border='1px solid black'>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Box>
                    <Typography fontWeight="bold">{assessment.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{assessment.description || 'No description'}</Typography>
                  </Box>
                  <Chip label={assessment.type} color="primary" variant="outlined" />
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                  <Chip label={`Questions: ${assessment.questions?.length || 0}`} variant="outlined" />
                  <Chip label={`Appeared: ${assessment.attempts || 0}`} color="success" variant="outlined" />
                  <Chip label={`Pending: ${assessment.pending || 0}`} color="warning" variant="outlined" />
                </Stack>
                <Button size="small" onClick={() => openEditDialog(assessment)}>
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingAssessment ? 'Edit Assessment / Assignment' : 'Create Assessment / Assignment'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={type} label="Type" onChange={(event) => setType(event.target.value)}>
                <MenuItem value="ASSESSMENT">Assessment</MenuItem>
                <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
              </Select>
            </FormControl>

            {questions.map((question, questionIndex) => (
              <Box key={questionIndex} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography fontWeight="bold">Question {questionIndex + 1}</Typography>
                  {questions.length > 1 && (
                    <Button color="error" startIcon={<Delete />} onClick={() => removeQuestion(questionIndex)}>
                      Remove
                    </Button>
                  )}
                </Box>

                <TextField
                  label="Question"
                  fullWidth
                  value={question.questionText}
                  onChange={(event) => updateQuestion(questionIndex, 'questionText', event.target.value)}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Correct Option</InputLabel>
                  <Select
                    value={question.correctOptionIndex}
                    label="Correct Option"
                    onChange={(event) => updateQuestion(questionIndex, 'correctOptionIndex', event.target.value)}
                  >
                    <MenuItem value={0}>Option 1</MenuItem>
                    <MenuItem value={1}>Option 2</MenuItem>
                    <MenuItem value={2}>Option 3</MenuItem>
                    <MenuItem value={3}>Option 4</MenuItem>
                  </Select>
                </FormControl>

                {question.options.map((option, optionIndex) => (
                  <TextField
                    key={optionIndex}
                    label={`Option ${optionIndex + 1}`}
                    fullWidth
                    value={option}
                    onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Box>
            ))}

            <Button variant="outlined" onClick={addQuestion}>
              Add Question
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? (editingAssessment ? 'Updating...' : 'Creating...') : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssessmentManager;
