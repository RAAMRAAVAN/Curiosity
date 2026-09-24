'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AddCircleOutline, DeleteOutline, EditOutlined } from '@mui/icons-material';

const emptyForm = { title: '', description: '', classIds: [], subjectIds: [], checklist: [{ itemText: 'Field 1', options: [''] }] };

const AdminAssessments316Page = ({ role, permissions = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAssessment, setDeleteAssessment] = useState(null);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [classOptions, setClassOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [summaryCounts, setSummaryCounts] = useState({});
  const [pendingStudents, setPendingStudents] = useState([]);
  const [appearedStudents, setAppearedStudents] = useState([]);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [appearedDialogOpen, setAppearedDialogOpen] = useState(false);
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [appearedSearch, setAppearedSearch] = useState('');
  const [absentSearch, setAbsentSearch] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);
  const [appearedLoading, setAppearedLoading] = useState(false);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [pendingSubmissionStudent, setPendingSubmissionStudent] = useState(null);
  const [pendingSubmissionSelections, setPendingSubmissionSelections] = useState({});
  const [pendingSubmissionLoading, setPendingSubmissionLoading] = useState(false);
  const [appearedSubmissionStudent, setAppearedSubmissionStudent] = useState(null);
  const [appearedSubmissionSelections, setAppearedSubmissionSelections] = useState({});
  const [appearedSubmissionLoading, setAppearedSubmissionLoading] = useState(false);
  const [selectedStudentsForAbsent, setSelectedStudentsForAbsent] = useState(new Set());
  const [markingAbsentLoading, setMarkingAbsentLoading] = useState(false);

  const hasPermission = (permission) => {
    if (String(role || '').toUpperCase() === 'ADMIN') return true;
    const normalized = Array.isArray(permissions)
      ? permissions.map((item) => String(item || '').toLowerCase())
      : [];
    return normalized.includes('*')
      || normalized.includes(permission)
      || normalized.some((item) => item.endsWith('.*') && permission.startsWith(`${item.slice(0, -2)}.`));
  };

  const canCreate = hasPermission('assessments316.create');
  const canEdit = hasPermission('assessments316.edit');
  const canDelete = hasPermission('assessments316.delete');

  const fetchAssessmentStatusSummary = async (assessment) => {
    if (!assessment?.id) return;

    try {
      const [pendingRes, appearedRes, absentRes] = await Promise.all([
        fetch(`/api/assessments-3-16/${encodeURIComponent(assessment.id)}/pending-students`, { credentials: 'include' }),
        fetch(`/api/assessments-3-16/${encodeURIComponent(assessment.id)}/appeared-students`, { credentials: 'include' }),
        fetch(`/api/assessments-3-16/${encodeURIComponent(assessment.id)}/absent-students`, { credentials: 'include' }),
      ]);

      const [pendingResult, appearedResult, absentResult] = await Promise.all([
        pendingRes.json(),
        appearedRes.json(),
        absentRes.json(),
      ]);

      setSummaryCounts((current) => ({
        ...current,
        [assessment.id]: {
          pending: pendingResult?.success ? (pendingResult.data || []).reduce((count, group) => count + ((group.students || []).length), 0) : 0,
          appeared: appearedResult?.success ? (appearedResult.data || []).reduce((count, group) => count + ((group.students || []).length), 0) : 0,
          absent: absentResult?.success ? (absentResult.data || []).reduce((count, group) => count + ((group.students || []).length), 0) : 0,
        },
      }));
    } catch (error) {
      console.error('Load 3-16 status summary error:', error);
    }
  };

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/assessments-3-16', { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load assessments.');

      const nextAssessments = Array.isArray(result.data) ? result.data : [];
      setAssessments(nextAssessments);

      if (nextAssessments.length > 0) {
        void Promise.allSettled(nextAssessments.map((assessment) => fetchAssessmentStatusSummary(assessment)));
      }
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load assessments.' });
    } finally {
      setLoading(false);
    }
  };

  const loadClassAndSubjectOptions = async () => {
    try {
      setOptionsLoading(true);
      const classesResponse = await fetch('/api/classes', { credentials: 'include' });
      const classesResult = await classesResponse.json();
      if (!classesResponse.ok || !classesResult.success) throw new Error(classesResult.message || 'Unable to load classes.');

      const classes = Array.isArray(classesResult.data) ? classesResult.data : [];
      const classOptionsWithSubjects = await Promise.all(classes.map(async (classItem) => {
        const response = await fetch(`/api/subjects?classID=${encodeURIComponent(classItem.id)}`, { credentials: 'include' });
        const result = await response.json();
        return { ...classItem, subjects: result.success && Array.isArray(result.data) ? result.data : [] };
      }));
      setClassOptions(classOptionsWithSubjects.filter((item) => item.subjects.length > 0));
      setSubjectOptions(classOptionsWithSubjects.flatMap((item) => item.subjects));
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load classes and subjects.' });
      setClassOptions([]);
      setSubjectOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
    loadClassAndSubjectOptions();
  }, []);

  const openCreate = () => {
    setEditingAssessment(null);
    setForm(emptyForm);
    setFeedback(null);
    setDialogOpen(true);
  };

  const openEdit = (assessment) => {
    setEditingAssessment(assessment);
    setForm({
      title: assessment.title || '',
      description: assessment.description || '',
      classIds: (assessment.allowedClasses || []).map((item) => String(item.classId || item.class?.id || item.id)),
      subjectIds: (assessment.subjects || []).map((item) => String(item.subjectId || item.subject?.id || item.id)),
      checklist: [{
        itemText: 'Field 1',
        options: (assessment.checklist?.[0]?.options || []).map((option) => option.optionText || ''),
      }],
    });
    setFeedback(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFeedback({ severity: 'error', message: 'Assessment title is required.' });
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingAssessment
        ? `/api/admin/assessments-3-16/${encodeURIComponent(editingAssessment.id)}`
        : '/api/admin/assessments-3-16';
      const response = await fetch(endpoint, {
        method: editingAssessment ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save assessment.');
      setDialogOpen(false);
      setFeedback({ severity: 'success', message: result.message });
      await fetchAssessments();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save assessment.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assessment) => {
    try {
      const response = await fetch(`/api/admin/assessments-3-16/${encodeURIComponent(assessment.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to delete assessment.');
      setFeedback({ severity: 'success', message: result.message });
      await fetchAssessments();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to delete assessment.' });
    }
  };

  const openDeleteConfirmation = (assessment) => {
    setDeleteAssessment(assessment);
  };

  const closeDeleteConfirmation = () => {
    setDeleteAssessment(null);
  };

  const confirmDelete = async () => {
    if (!deleteAssessment) return;

    const assessment = deleteAssessment;
    closeDeleteConfirmation();
    await handleDelete(assessment);
  };

  const filterGroupsByName = (groups, search) => {
    const query = String(search || '').trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        students: (group.students || []).filter((student) => String(student.name || '').toLowerCase().includes(query)),
      }))
      .filter((group) => (group.students || []).length > 0);
  };

  const handleOpenPendingDialog = async (assessment) => {
    if (!assessment?.id) return;

    try {
      setPendingLoading(true);
      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(assessment.id)}/pending-students`, { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load pending students.');
      setPendingStudents(result.data || []);
      setSelectedAssessment(assessment);
      setPendingSearch('');
      setPendingDialogOpen(true);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load pending students.' });
    } finally {
      setPendingLoading(false);
    }
  };

  const handleOpenAppearedDialog = async (assessment) => {
    if (!assessment?.id) return;

    try {
      setAppearedLoading(true);
      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(assessment.id)}/appeared-students`, { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load appeared students.');
      setAppearedStudents(result.data || []);
      setSelectedAssessment(assessment);
      setAppearedSearch('');
      setAppearedDialogOpen(true);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load appeared students.' });
    } finally {
      setAppearedLoading(false);
    }
  };

  const handleOpenAbsentDialog = async (assessment) => {
    if (!assessment?.id) return;

    try {
      setAbsentLoading(true);
      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(assessment.id)}/absent-students`, { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load absent students.');
      setAbsentStudents(result.data || []);
      setSelectedAssessment(assessment);
      setAbsentSearch('');
      setAbsentDialogOpen(true);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load absent students.' });
    } finally {
      setAbsentLoading(false);
    }
  };

  const handleMarkAbsent = async (students) => {
    if (!selectedAssessment?.id || !Array.isArray(students) || students.length === 0) return;

    try {
      setMarkingAbsentLoading(true);
      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(selectedAssessment.id)}/mark-absent`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: students.map((student) => student.id) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to mark students absent.');
      setFeedback({ severity: 'success', message: result.message });
      setSelectedStudentsForAbsent(new Set());
      setPendingDialogOpen(false);
      await fetchAssessments();
      await handleOpenAbsentDialog(selectedAssessment);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to mark students absent.' });
    } finally {
      setMarkingAbsentLoading(false);
    }
  };

  const handleRevokeAbsent = async (students) => {
    if (!selectedAssessment?.id || !Array.isArray(students) || students.length === 0) return;

    try {
      setMarkingAbsentLoading(true);
      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(selectedAssessment.id)}/revoke-absent`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: students.map((student) => student.id) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to revoke absent status.');
      setFeedback({ severity: 'success', message: result.message });
      setSelectedStudentsForAbsent(new Set());
      setAbsentDialogOpen(false);
      await fetchAssessments();
      await handleOpenPendingDialog(selectedAssessment);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to revoke absent status.' });
    } finally {
      setMarkingAbsentLoading(false);
    }
  };

  const toggleStudentForAbsent = (studentId) => {
    setSelectedStudentsForAbsent((current) => {
      const next = new Set(current);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const openStudentAssessmentSubmission = (student) => {
    if (!selectedAssessment || !student) return;
    setPendingSubmissionStudent(student);
    setPendingSubmissionSelections({});
    setPendingSubmissionLoading(false);
  };

  const handleStudentAssessmentSubmit = async () => {
    if (!selectedAssessment?.id || !pendingSubmissionStudent?.id) return;

    try {
      setPendingSubmissionLoading(true);
      const selectionPayload = selectedAssessment.checklist.map((field) => ({
        checklistId: field.id,
        optionId: pendingSubmissionSelections[field.id],
      }));

      if (selectionPayload.some((item) => !item.optionId)) {
        throw new Error('Please answer all evaluation fields before submitting.');
      }

      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(selectedAssessment.id)}/responses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pendingSubmissionStudent.id,
          selections: selectionPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to save assessment.');
      }

      setFeedback({ severity: 'success', message: `Assessment submitted for ${pendingSubmissionStudent.name}.` });
      setPendingSubmissionStudent(null);
      setPendingSubmissionSelections({});
      setPendingDialogOpen(false);
      await fetchAssessments();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save assessment.' });
    } finally {
      setPendingSubmissionLoading(false);
    }
  };

  const openAppearedStudentAssessmentEdit = async (student) => {
    if (!selectedAssessment || !student) return;

    try {
      setAppearedSubmissionLoading(true);
      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(selectedAssessment.id)}/responses?userId=${encodeURIComponent(student.id)}`, { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to load submitted assessment.');
      }

      const nextSelections = {};
      (result.data?.response?.selections || []).forEach((item) => {
        if (item?.checklistId && item?.optionId) {
          nextSelections[item.checklistId] = item.optionId;
        }
      });

      setAppearedSubmissionStudent(student);
      setAppearedSubmissionSelections(nextSelections);
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to load submitted assessment.' });
    } finally {
      setAppearedSubmissionLoading(false);
    }
  };

  const handleAppearedStudentAssessmentSubmit = async () => {
    if (!selectedAssessment?.id || !appearedSubmissionStudent?.id) return;

    try {
      setAppearedSubmissionLoading(true);
      const selectionPayload = selectedAssessment.checklist.map((field) => ({
        checklistId: field.id,
        optionId: appearedSubmissionSelections[field.id],
      }));

      if (selectionPayload.some((item) => !item.optionId)) {
        throw new Error('Please answer all evaluation fields before saving changes.');
      }

      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(selectedAssessment.id)}/responses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: appearedSubmissionStudent.id,
          selections: selectionPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to update assessment.');
      }

      setFeedback({ severity: 'success', message: `Updated assessment for ${appearedSubmissionStudent.name}.` });
      setAppearedSubmissionStudent(null);
      setAppearedSubmissionSelections({});
      setAppearedDialogOpen(false);
      await fetchAssessments();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to update assessment.' });
    } finally {
      setAppearedSubmissionLoading(false);
    }
  };

  const closeAppearedEditDialog = () => {
    setAppearedSubmissionStudent(null);
    setAppearedSubmissionSelections({});
  };

  const filteredPendingStudents = filterGroupsByName(pendingStudents, pendingSearch);
  const filteredAppearedStudents = filterGroupsByName(appearedStudents, appearedSearch);
  const filteredAbsentStudents = filterGroupsByName(absentStudents, absentSearch);

  return (
    <Box sx={{ width: { xs: '100%', sm: '100%' }, ml: { xs: 0, sm: 0 }, p: { xs: 1, sm: 2, md: 3 } }}>
      <Box  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>View Assessment - B</Typography>
          <Typography color="text.secondary">Manage age-range assessment records.</Typography>
        </Box>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddCircleOutline />} onClick={openCreate} sx={{ backgroundColor: '#0a336b', color: '#ffffff', '&:hover': { backgroundColor: '#082b57' } }} fullWidth={isMobile} >
            Add Assessment
          </Button>
        ) : null}
      </Box>

      {feedback ? <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert> : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : assessments.length === 0 ? (
        <Typography color="text.secondary">No assessments have been created yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {assessments.map((assessment) => (
            <Card
              key={assessment.id}
              variant="outlined"
              sx={{
                width: '100%',
                mx: 'auto',
                backgroundColor: '#082b57',
                backgroundImage: 'conic-gradient(from 30deg at 25% 25%, rgba(22,78,126,0.2) 0deg 60deg, rgba(2,23,49,0.24) 60deg 120deg, transparent 120deg 180deg, rgba(12,56,101,0.18) 180deg 240deg, transparent 240deg 360deg), conic-gradient(from 210deg at 75% 75%, rgba(35,98,145,0.13) 0deg 60deg, transparent 60deg 180deg, rgba(1,19,44,0.28) 180deg 240deg, transparent 240deg 360deg), linear-gradient(135deg, rgba(17,68,113,0.15) 0% 24%, transparent 24% 48%, rgba(2,27,58,0.26) 48% 72%, transparent 72%), linear-gradient(180deg, #041832 0%, #062a4a 52%, #083d63 100%)',
                backgroundSize: '150px 150px, 180px 180px, 210px 210px, 100% 100%',
                borderColor: 'rgba(255, 255, 255, 0.22)',
                color: '#ffffff',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  backgroundColor: '#0b3968',
                  boxShadow: '0 4px 14px rgba(2, 23, 49, 0.28)',
                },
              }}
            >
              <CardContent sx={{ position: 'relative', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2, alignItems: { xs: 'stretch', sm: 'flex-start' }, color: '#ffffff' }}>
                <Box sx={{ minWidth: 0, pr: { xs: 8, sm: 0 } }}>
                  <Typography fontWeight={700}>{assessment.title}</Typography>
                  <Typography sx={{ whiteSpace: 'pre-line', color: 'rgba(255, 255, 255, 0.78)' }}>
                    {assessment.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255, 255, 255, 0.72)' }}>
                    Classes: {(assessment.allowedClasses || []).map((item) => item.class?.className).filter(Boolean).join(', ') || 'None'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.72)' }}>
                    Subjects: {(assessment.subjects || []).map((item) => item.subject?.subjectName).filter(Boolean).join(', ') || 'None'}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5, alignItems: { xs: 'flex-start', sm: 'center', display: 'flex', width: '100%'} }}>
                    <Chip label={`Pending: ${summaryCounts[assessment.id]?.pending ?? 0}`} color="warning" variant="filled" onClick={() => handleOpenPendingDialog(assessment)} sx={{ cursor: 'pointer', display: 'flex', width: '100%', color: '#ffffff' }} />
                    <Chip label={`Appeared: ${summaryCounts[assessment.id]?.appeared ?? 0}`} color="success" variant="filled" onClick={() => handleOpenAppearedDialog(assessment)} sx={{ cursor: 'pointer', display: 'flex', width: '100%', color: '#ffffff' }} />
                    <Chip label={`Absent: ${summaryCounts[assessment.id]?.absent ?? 0}`} color="error" variant="filled" onClick={() => handleOpenAbsentDialog(assessment)} sx={{ cursor: 'pointer', display: 'flex', width: '100%', color: '#ffffff' }} />
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.5} sx={{ position: { xs: 'absolute', sm: 'static' }, top: { xs: 8, sm: 'auto' }, right: { xs: 8, sm: 'auto' } }}>
                  {canEdit ? <IconButton aria-label="Edit assessment" onClick={() => openEdit(assessment)}><EditOutlined sx={{ color: '#ffffff' }} /></IconButton> : null}
                  {canDelete ? <IconButton aria-label="Delete assessment" color="error" onClick={() => openDeleteConfirmation(assessment)}><DeleteOutline sx={{ color: '#ffffff' }} /></IconButton> : null}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog
        open={pendingDialogOpen}
        onClose={() => setPendingDialogOpen(false)}
        // maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column',  } }}
      >
        <DialogTitle>Pending Students</DialogTitle>
        <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <TextField label="Search by Name" value={pendingSearch} onChange={(event) => setPendingSearch(event.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
          {pendingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : filteredPendingStudents.length === 0 ? (
            <Typography color="text.secondary">{pendingStudents.length === 0 ? 'No pending students found for this assessment.' : 'No students match your search.'}</Typography>
          ) : (
            <List dense disablePadding>
              {filteredPendingStudents.map((group) => (
                <Box key={group.className} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Class {group.className}</Typography>
                  {group.students.map((student) => (
                    <ListItem key={student.id} disablePadding secondaryAction={
                      <Checkbox edge="end" checked={selectedStudentsForAbsent.has(student.id)} onChange={() => toggleStudentForAbsent(student.id)} />
                    }>
                      <ListItemButton onClick={() => openStudentAssessmentSubmission(student)}>
                        <ListItemText primary={student.name} secondary={`Enrollment ID: ${student.id || 'N/A'} • Center: ${student.student?.center?.centerName || 'N/A'}`} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelectedStudentsForAbsent(new Set()); setPendingDialogOpen(false); }}>Close</Button>
          {selectedStudentsForAbsent.size > 0 ? (
            <Button variant="contained" color="error" onClick={() => { const selectedStudents = pendingStudents.flatMap((group) => group.students).filter((student) => selectedStudentsForAbsent.has(student.id)); handleMarkAbsent(selectedStudents); }} disabled={markingAbsentLoading}>
              {markingAbsentLoading ? 'Marking...' : `Mark ${selectedStudentsForAbsent.size} as Absent`}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(pendingSubmissionStudent) && !!selectedAssessment} onClose={() => { setPendingSubmissionStudent(null); setPendingSubmissionSelections({}); }} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle>Submit assessment for {pendingSubmissionStudent?.name || 'student'}</DialogTitle>
        <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: { xs: 'none', sm: '75vh' } }}>
          {!selectedAssessment?.checklist?.length ? (
            <Typography color="text.secondary">No evaluation checklist is available for this assessment.</Typography>
          ) : (
            <Stack spacing={2}>
              {selectedAssessment.checklist.map((field, index) => (
                <Card key={field.id} variant="outlined">
                  <CardContent>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>{index + 1}. {field.itemText || field.label || 'Field'}</Typography>
                    <FormControl component="fieldset" fullWidth>
                      <RadioGroup
                        value={pendingSubmissionSelections[field.id] || ''}
                        onChange={(event) => setPendingSubmissionSelections((current) => ({ ...current, [field.id]: event.target.value }))}
                      >
                        {(field.options || []).map((option) => (
                          <FormControlLabel key={option.id} value={option.id} control={<Radio />} label={option.optionText || option.label || 'Option'} />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPendingSubmissionStudent(null); setPendingSubmissionSelections({}); }}>Close</Button>
          <Button variant="contained" onClick={handleStudentAssessmentSubmit} disabled={pendingSubmissionLoading || !selectedAssessment?.checklist?.length}>
            {pendingSubmissionLoading ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={appearedDialogOpen}
        onClose={() => setAppearedDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle>Appeared Students</DialogTitle>
        <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <TextField label="Search by Name" value={appearedSearch} onChange={(event) => setAppearedSearch(event.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
          {appearedLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : filteredAppearedStudents.length === 0 ? (
            <Typography color="text.secondary">{appearedStudents.length === 0 ? 'No appeared students found for this assessment.' : 'No students match your search.'}</Typography>
          ) : (
            <List dense disablePadding>
              {filteredAppearedStudents.map((group) => (
                <Box key={group.className} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Class {group.className}</Typography>
                  {group.students.map((student) => (
                    <ListItem key={student.id} disablePadding>
                      <ListItemButton onClick={() => openAppearedStudentAssessmentEdit(student)}>
                        <ListItemText primary={student.name} secondary={`Enrollment ID: ${student.id || 'N/A'} • Center: ${student.student?.center?.centerName || 'N/A'}`} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAppearedDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(appearedSubmissionStudent) && !!selectedAssessment} onClose={closeAppearedEditDialog} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle>Edit assessment for {appearedSubmissionStudent?.name || 'student'}</DialogTitle>
        <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: { xs: 'none', sm: '75vh' } }}>
          {!selectedAssessment?.checklist?.length ? (
            <Typography color="text.secondary">No evaluation checklist is available for this assessment.</Typography>
          ) : (
            <Stack spacing={2}>
              {selectedAssessment.checklist.map((field, index) => (
                <Card key={field.id} variant="outlined">
                  <CardContent>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>{index + 1}. {field.itemText || field.label || 'Field'}</Typography>
                    <FormControl component="fieldset" fullWidth>
                      <RadioGroup
                        value={appearedSubmissionSelections[field.id] || ''}
                        onChange={(event) => setAppearedSubmissionSelections((current) => ({ ...current, [field.id]: event.target.value }))}
                      >
                        {(field.options || []).map((option) => (
                          <FormControlLabel key={option.id} value={option.id} control={<Radio />} label={option.optionText || option.label || 'Option'} />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAppearedEditDialog}>Close</Button>
          <Button variant="contained" onClick={handleAppearedStudentAssessmentSubmit} disabled={appearedSubmissionLoading || !selectedAssessment?.checklist?.length}>
            {appearedSubmissionLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={absentDialogOpen}
        onClose={() => setAbsentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle>Absent Students</DialogTitle>
        <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <TextField label="Search by Name" value={absentSearch} onChange={(event) => setAbsentSearch(event.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
          {absentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : filteredAbsentStudents.length === 0 ? (
            <Typography color="text.secondary">{absentStudents.length === 0 ? 'No absent students found for this assessment.' : 'No students match your search.'}</Typography>
          ) : (
            <List dense disablePadding>
              {filteredAbsentStudents.map((group) => (
                <Box key={group.className} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Class {group.className}</Typography>
                  {group.students.map((student) => (
                    <ListItem key={student.id} disablePadding secondaryAction={
                      <Checkbox edge="end" checked={selectedStudentsForAbsent.has(student.id)} onChange={() => toggleStudentForAbsent(student.id)} />
                    }>
                      <ListItemButton>
                        <ListItemText primary={student.name} secondary={student.reason ? `Reason: ${student.reason}` : 'Absent'} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelectedStudentsForAbsent(new Set()); setAbsentDialogOpen(false); }}>Close</Button>
          {selectedStudentsForAbsent.size > 0 ? (
            <Button variant="contained" color="primary" onClick={() => { const selectedStudents = absentStudents.flatMap((group) => group.students).filter((student) => selectedStudentsForAbsent.has(student.id)); handleRevokeAbsent(selectedStudents); }} disabled={markingAbsentLoading}>
              {markingAbsentLoading ? 'Revoking...' : `Revoke ${selectedStudentsForAbsent.size} Absent`}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteAssessment)}
        onClose={closeDeleteConfirmation}
        fullWidth
        maxWidth="xs"
        fullScreen={isMobile}
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle>Delete assessment?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete <strong>{deleteAssessment?.title || 'this assessment'}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirmation}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth fullScreen={isMobile} PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography component="span" sx={{ flex: 1, fontWeight: 700 }}>
            {editingAssessment ? 'Edit Assessment' : 'Create Assessment'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Assessment Title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Group Classes</InputLabel>
              <Select
                multiple
                value={form.classIds}
                label="Group Classes"
                onChange={(event) => {
                  const classIds = event.target.value.map((id) => String(id));
                  const selectedSubjectIds = form.subjectIds.filter((subjectId) => subjectOptions.some((subject) => classIds.includes(String(subject.classId)) && String(subject.id) === String(subjectId)));
                  setForm((current) => ({ ...current, classIds, subjectIds: selectedSubjectIds }));
                }}
                disabled={optionsLoading || classOptions.length === 0}
                renderValue={(selected) => classOptions.filter((item) => selected.includes(String(item.id))).map((item) => item.className).join(', ') || 'No classes selected'}
              >
                {classOptions.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    <Checkbox checked={form.classIds.includes(String(item.id))} />
                    <ListItemText primary={item.className} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Subjects</InputLabel>
              <Select
                multiple
                value={form.subjectIds}
                label="Subjects"
                onChange={(event) => setForm((current) => ({ ...current, subjectIds: event.target.value.map((id) => String(id)) }))}
                disabled={optionsLoading || !form.classIds.length}
                renderValue={(selected) => subjectOptions.filter((item) => selected.includes(String(item.id))).map((item) => item.subjectName).join(', ') || 'No subjects selected'}
              >
                {subjectOptions.filter((item) => form.classIds.includes(String(item.classId))).map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    <Checkbox checked={form.subjectIds.includes(String(item.id))} />
                    <ListItemText primary={item.subjectName} secondary={item.className || undefined} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Typography fontWeight={700}>Evaluation Checklist</Typography>
              </Box>
              <Stack spacing={1.5}>
                {form.checklist.map((item, index) => (
                  <Box key={`checklist-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Stack spacing={1} sx={{ flex: 1 }}>
                      {item.options.map((option, optionIndex) => (
                        <Box key={`checklist-${index}-option-${optionIndex}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            label={`Option ${optionIndex + 1}`}
                            value={option}
                            onChange={(event) => setForm((current) => ({
                              ...current,
                              checklist: current.checklist.map((entry, itemIndex) => itemIndex === index
                                ? { ...entry, options: entry.options.map((value, valueIndex) => valueIndex === optionIndex ? event.target.value : value) }
                                : entry),
                            }))}
                            fullWidth
                          />
                          <IconButton
                            aria-label={`Delete option ${optionIndex + 1}`}
                            color="error"
                            onClick={() => setForm((current) => ({
                              ...current,
                              checklist: current.checklist.map((entry, itemIndex) => {
                                if (itemIndex !== index || entry.options.length <= 1) return entry;
                                return { ...entry, options: entry.options.filter((_, valueIndex) => valueIndex !== optionIndex) };
                              }),
                            }))}
                            disabled={item.options.length <= 1}
                          >
                            <DeleteOutline />
                          </IconButton>
                        </Box>
                      ))}
                      <Button
                        size="small"
                        onClick={() => setForm((current) => ({
                          ...current,
                          checklist: current.checklist.map((entry, itemIndex) => itemIndex === index ? { ...entry, options: [...entry.options, ''] } : entry),
                        }))}
                      >
                        Add option
                      </Button>
                    </Stack>
                  </Box>
                ))}
                {!form.checklist.length ? (
                  <Typography variant="body2" color="text.secondary">No checklist items added.</Typography>
                ) : null}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAssessments316Page;
