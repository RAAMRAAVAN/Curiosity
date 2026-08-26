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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AddCircleOutline, CheckCircleOutline, Close, DeleteOutline, RadioButtonUnchecked, Quiz, SaveOutlined } from '@mui/icons-material';

const AssessmentManager = ({ resetForm, fetchAssessments, emptyQuestion, assessments, loading, addQuestion, subjectId, classId, chapterId, title, setTitle, description, setDescription, type, setType, questions, setQuestions, feedback, setFeedback, editingAssessment, setEditingAssessment, open, setOpen, saving, setSaving, allowSubjectSelection = false, assessmentSubjectOptions = [], assessmentVisibleClassOptions = [], onAssessmentSubjectChange, onAllowedClassIdsChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  const [availableClasses, setAvailableClasses] = useState([]);
  const [allowedClassIds, setAllowedClassIds] = useState(classId ? [String(classId)] : []);
  const [classesLoading, setClassesLoading] = useState(false);
  const [canManageAssessments, setCanManageAssessments] = useState(true);
  const [canCreateAssessments, setCanCreateAssessments] = useState(false);
  const [canEditAssessments, setCanEditAssessments] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [assessmentUpdateStatus, setAssessmentUpdateStatus] = useState(null);
  const [statusOperationId, setStatusOperationId] = useState(null);
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [absentCounts, setAbsentCounts] = useState({});
  const [absentCountsLoading, setAbsentCountsLoading] = useState(false);
  const [selectedStudentsForAbsent, setSelectedStudentsForAbsent] = useState(new Set());
  const [markingAbsentLoading, setMarkingAbsentLoading] = useState(false);
  const [operationSteps, setOperationSteps] = useState([]);
  const [showOperationLoader, setShowOperationLoader] = useState(false);
  const computedTotalMarks = questions.reduce((sum, question) => sum + Number(question.marks || 1), 0);
  const visibleClassOptions = assessmentVisibleClassOptions.length ? assessmentVisibleClassOptions : availableClasses;

  const addOperationStep = (stepName, status = 'in-progress') => {
    setOperationSteps((prev) => {
      const existing = prev.find((s) => s.name === stepName);
      if (existing) {
        return prev.map((s) => (s.name === stepName ? { ...s, status } : s));
      }
      return [...prev, { name: stepName, status }];
    });
  };

  const hasPermission = (permissions, permission, role) => {
    if (String(role || '').toUpperCase() === 'ADMIN') return true;
    if (!permission) return true;

    const normalizedPermissions = Array.isArray(permissions)
      ? permissions.map((item) => String(item || '').toLowerCase())
      : [];

    const normalizedPermission = String(permission || '').toLowerCase();

    return normalizedPermissions.includes('*')
      || normalizedPermissions.includes(normalizedPermission)
      || normalizedPermissions.some(
        (item) => item.endsWith('.*') && normalizedPermission.startsWith(`${item.slice(0, -2)}.`)
      );
  };

  useEffect(() => {
    // Permission checks disabled - all features are open
    setCanCreateAssessments(true);
    setCanEditAssessments(true);
    setCanManageAssessments(true);
    setPermissionChecked(true);
  }, []);

  useEffect(() => {
    // Load absent counts for all assessments
    if (Array.isArray(assessments) && assessments.length > 0) {
      assessments.forEach((assessment) => {
        if (assessment?.id && !absentCounts[assessment.id]) {
          fetchAbsentCount(assessment.id);
        }
      });
    }
  }, [assessments]);

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

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setClassesLoading(true);
        const res = await fetch('/api/classes', { credentials: 'include' });
        const result = await res.json();

        if (!result.success) {
          throw new Error(result.message || 'Unable to load classes');
        }

        const classes = Array.isArray(result.data) ? result.data : [];
        setAvailableClasses(classes);
        setAllowedClassIds((prev) => {
          const current = prev && prev.length ? prev : (classId ? [String(classId)] : []);
          const validCurrent = classId && !current.includes(String(classId))
            ? [String(classId), ...current.filter(Boolean)]
            : current;
          return Array.from(new Set(validCurrent.filter(Boolean))).filter((id) => classes.some((item) => String(item.id) === String(id)) || String(id) === String(classId));
        });
      } catch (error) {
        console.error(error);
        setAvailableClasses([]);
        setAllowedClassIds(classId ? [String(classId)] : []);
      } finally {
        setClassesLoading(false);
      }
    };

    loadClasses();
  }, [classId]);

  useEffect(() => {
    if (!open && !editingAssessment) {
      setAllowedClassIds(classId ? [String(classId)] : []);
    }
  }, [open, editingAssessment, classId]);

  useEffect(() => {
    if (!editingAssessment && !allowSubjectSelection) {
      setAllowedClassIds(classId ? [String(classId)] : []);
    }
  }, [classId, editingAssessment, allowSubjectSelection]);

  const handleAllowedClassSelection = (event) => {
    const nextValues = Array.isArray(event?.target?.value) ? event.target.value : [];
    const fixedCurrentClass = classId ? [String(classId)] : [];
    const selectedOthers = nextValues
      .map((item) => String(item))
      .filter((item) => item && item !== String(classId));

    const nextAllowedClassIds = [...fixedCurrentClass, ...selectedOthers];
    setAllowedClassIds(nextAllowedClassIds);
    onAllowedClassIdsChange?.(nextAllowedClassIds);
  };

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
    const normalizedQuestions = (assessment.questions || []).map((question) => {
      const correctOptionIndex = question.options?.findIndex((option) => option.isCorrect) ?? 0;
      return {
        id: question.id || null,
        questionText: question.questionText || '',
        questionDesc: question.questionDesc ?? question.questiondesc ?? '',
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

    const allowedIds = Array.isArray(assessment?.allowedClasses)
      ? assessment.allowedClasses.map((item) => String(item.classId || item.id || item)).filter(Boolean)
      : [];
    const selectedAllowedClassIds = Array.from(new Set([
      ...(classId ? [String(classId)] : []),
      ...allowedIds,
    ])).filter(Boolean);

    setAllowedClassIds(selectedAllowedClassIds);
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
      subjectId: selectedAssessment.subjectId || subjectId || '',
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
      subjectId: selectedAssessment.subjectId || subjectId || '',
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

  const handleOpenAbsentDialog = async (assessment) => {
    if (!assessment?.id) return;

    try {
      setAbsentLoading(true);
      const res = await fetch(`/api/assessments/${assessment.id}/absent-students`, {
        credentials: 'include',
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Unable to load absent students');
      }

      setAbsentStudents(result.data || []);
      setSelectedAssessment(assessment);
      setAbsentDialogOpen(true);
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to load absent students' });
    } finally {
      setAbsentLoading(false);
    }
  };

  const handleMarkAbsent = async (students) => {
    if (!selectedAssessment?.id || !Array.isArray(students) || students.length === 0) return;

    try {
      setShowOperationLoader(true);
      setOperationSteps([]);
      setMarkingAbsentLoading(true);

      addOperationStep('Preparing attendance update');
      addOperationStep('Sending request to mark students absent');
      const res = await fetch(`/api/assessments/${selectedAssessment.id}/mark-absent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: students.map((s) => s.id),
          reason: null,
        }),
      });
      addOperationStep('Sending request to mark students absent', 'completed');

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Unable to mark students absent');
      }

      addOperationStep('Updating UI state and counts');
      setFeedback({ severity: 'success', message: `Marked ${result.data?.markedCount || 0} student(s) as absent` });
      setSelectedStudentsForAbsent(new Set());
      setPendingDialogOpen(false);

      addOperationStep('Refreshing absent count');
      await fetchAbsentCount(selectedAssessment.id);
      addOperationStep('Refreshing absent count', 'completed');

      addOperationStep('Refreshing pending students list');
      await handleOpenPendingDialog(selectedAssessment);
      addOperationStep('Refreshing pending students list', 'completed');

      addOperationStep('Refreshing absent students list');
      await handleOpenAbsentDialog(selectedAssessment);
      addOperationStep('Refreshing absent students list', 'completed');

      addOperationStep('Refreshing assessment summary');
      await fetchAssessments();
      addOperationStep('Refreshing assessment summary', 'completed');
      addOperationStep('Completing attendance update', 'completed');
    } catch (error) {
      console.error(error);
      addOperationStep('Error occurred', 'failed');
      setFeedback({ severity: 'error', message: error.message || 'Unable to mark students absent' });
    } finally {
      setMarkingAbsentLoading(false);
      setShowOperationLoader(false);
    }
  };

  const handleRevokeAbsent = async (students) => {
    if (!selectedAssessment?.id || !Array.isArray(students) || students.length === 0) return;

    try {
      setShowOperationLoader(true);
      setOperationSteps([]);
      setMarkingAbsentLoading(true);

      addOperationStep('Preparing absent status update');
      addOperationStep('Sending request to revoke absent status');
      const res = await fetch(`/api/assessments/${selectedAssessment.id}/revoke-absent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: students.map((s) => s.id),
        }),
      });
      addOperationStep('Sending request to revoke absent status', 'completed');

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Unable to revoke absent status');
      }

      addOperationStep('Updating UI state and counts');
      setFeedback({ severity: 'success', message: `Revoked absent status for ${result.data?.revokedCount || 0} student(s)` });
      setSelectedStudentsForAbsent(new Set());

      addOperationStep('Refreshing absent count');
      await fetchAbsentCount(selectedAssessment.id);
      addOperationStep('Refreshing absent count', 'completed');

      addOperationStep('Refreshing absent students list');
      await handleOpenAbsentDialog(selectedAssessment);
      addOperationStep('Refreshing absent students list', 'completed');

      addOperationStep('Refreshing pending students list');
      await handleOpenPendingDialog(selectedAssessment);
      addOperationStep('Refreshing pending students list', 'completed');

      addOperationStep('Refreshing assessment summary');
      await fetchAssessments();
      addOperationStep('Refreshing assessment summary', 'completed');
      addOperationStep('Completing absent status update', 'completed');
    } catch (error) {
      console.error(error);
      addOperationStep('Error occurred', 'failed');
      setFeedback({ severity: 'error', message: error.message || 'Unable to revoke absent status' });
    } finally {
      setMarkingAbsentLoading(false);
      setShowOperationLoader(false);
    }
  };

  const toggleStudentForAbsent = (studentId) => {
    const newSet = new Set(selectedStudentsForAbsent);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudentsForAbsent(newSet);
  };

  const fetchAbsentCount = async (id) => {
    if (!id) return 0;
    try {
      const res = await fetch(`/api/assessments/${id}/absent-students`, {
        credentials: 'include',
      });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load absent counts');
      const count = Array.isArray(response.data)
        ? response.data.reduce((sum, group) => sum + (group.students?.length || 0), 0)
        : 0;
      setAbsentCounts((prev) => ({ ...prev, [id]: count }));
      return count;
    } catch (error) {
      console.error(error);
      setAbsentCounts((prev) => ({ ...prev, [id]: 0 }));
      return 0;
    }
  };

  const handleSubmit = async () => {
    if (!subjectId && !classId && !editingAssessment) {
      alert('Class or subject is required to save assessment.');
      return;
    }

    const validQuestions = questions
      .filter((question) => question.questionText.trim())
      .map((question) => ({
        id: question.id || undefined,
        questionText: question.questionText.trim(),
        questionDesc: String(question.questionDesc ?? question.questiondesc ?? '').trim() || null,
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

      const normalizedAllowedClassIds = Array.from(
        new Set([
          ...(classId ? [String(classId)] : []),
          ...(Array.isArray(allowedClassIds) ? allowedClassIds.map((item) => String(item)) : []),
        ])
      ).filter(Boolean);

      const resolvedClassId = editingAssessment?.classId || classId || undefined;
      const resolvedSubjectId = editingAssessment?.subjectId || subjectId || null;
      const endpoint = editingAssessment || classId ? '/api/assessments' : `/api/subjects/${subjectId}/assessments`;
      const res = await fetch(endpoint, {
        method: editingAssessment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: editingAssessment?.id,
          classId: resolvedClassId,
          subjectId: resolvedSubjectId,
          chapterId: chapterId || null,
          title: title.trim(),
          description: description.trim() || null,
          type,
          resolvedSubjectId,
          totalMarks: computedTotalMarks,
          gradeBands: gradeBands.filter((band) => band?.label?.trim()),
          allowedClassIds: normalizedAllowedClassIds,
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

      {showOperationLoader ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2400,
            bgcolor: 'rgba(2, 6, 23, 0.78)',
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
              maxWidth: 620,
              bgcolor: '#ffffff',
              borderRadius: 3,
              p: { xs: 3, sm: 4 },
              boxShadow: '0 18px 45px rgba(15, 23, 42, 0.35)',
            }}
          >
            <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <CircularProgress size={42} />
              <Typography variant="h6" fontWeight={700}>Processing student attendance update</Typography>
            </Stack>
            <Stack spacing={1.2}>
              {operationSteps.length ? operationSteps.map((step) => (
                <Box key={`${step.name}-${step.status}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.2, borderRadius: 2, bgcolor: step.status === 'failed' ? '#fef2f2' : step.status === 'completed' ? '#ecfdf5' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: step.status === 'failed' ? '#ef4444' : step.status === 'completed' ? '#22c55e' : '#60a5fa' }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{step.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{step.status === 'completed' ? 'Done' : step.status === 'failed' ? 'Failed' : 'Running'}</Typography>
                </Box>
              )) : (
                <Box sx={{ p: 1.5, textAlign: 'center', color: 'text.secondary' }}>Waiting for backend operations to start…</Box>
              )}
            </Stack>
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
          {assessments.map((assessment) => (
            <Card
              key={assessment.id}
              variant="outlined"
              sx={{
                width: { xs: '100%', sm: '100%' },
                mx: 'auto',
                backgroundColor: '#f9f9f9',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
                  <Box sx={{ width: '100%', minWidth: 0 }}>
                    <Typography fontWeight="bold">{assessment.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{assessment.description || 'No description'}</Typography>
                    {(assessment.subject?.subjectName || assessment.class?.className) ? (
                      <Typography variant="caption" color="text.secondary">
                        {assessment.subject?.subjectName || 'Subject'}{assessment.class?.className ? ` • ${assessment.class.className}` : ''}
                      </Typography>
                    ) : null}
                  </Box>
                  <Chip
                    label={`View ${assessment.type}`}
                    color="primary"
                    variant="outlined"
                    onClick={() => openEditDialog(assessment)}
                    sx={{ fontWeight: 600, alignSelf: { xs: 'flex-center', sm: 'auto' } }}
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
                  <Chip
                    label={`Absent: ${absentCounts[assessment.id] || 0}`}
                    color="error"
                    variant="outlined"
                    onClick={() => handleOpenAbsentDialog(assessment)}
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

      <Dialog
        open={pendingDialogOpen}
        onClose={() => setPendingDialogOpen(false)}
        maxWidth={isMobile ? false : "sm"}
        fullWidth
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '80vh',
            maxHeight: '80vh',
          },
        } : {}}
      >
        <DialogTitle>Pending Students</DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
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
                      <ListItem
                        key={student.id}
                        disablePadding
                        secondaryAction={
                          <Checkbox
                            edge="end"
                            checked={selectedStudentsForAbsent.has(student.id)}
                            onChange={() => toggleStudentForAbsent(student.id)}
                          />
                        }
                      >
                        <ListItemButton onClick={() => handleOpenPendingStudentAttempt(student)}>
                          <ListItemText 
                            primary={student.name} 
                            secondary={`${student.email} • Center: ${student.student?.center?.centerName || 'N/A'}`}
                          />
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
          <Button
            onClick={() => {
              setSelectedStudentsForAbsent(new Set());
              setPendingDialogOpen(false);
            }}
          >
            Close
          </Button>
          {selectedStudentsForAbsent.size > 0 && (
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                const selectedStudents = pendingStudents
                  .flatMap((group) => group.students)
                  .filter((student) => selectedStudentsForAbsent.has(student.id));
                handleMarkAbsent(selectedStudents);
              }}
              disabled={markingAbsentLoading}
            >
              {markingAbsentLoading ? 'Marking...' : `Mark ${selectedStudentsForAbsent.size} as Absent`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={appearedDialogOpen}
        onClose={() => setAppearedDialogOpen(false)}
        maxWidth={isMobile ? false : "sm"}
        fullWidth
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '80vh',
            maxHeight: '80vh',
          },
        } : {}}
      >
        <DialogTitle>Appeared Students</DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
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
                          <ListItemText primary={student.name} secondary={`${student.email || 'No email'} • Center: ${student.student?.center?.centerName || student.centerName || 'N/A'}`} />
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

      <Dialog
        open={absentDialogOpen}
        onClose={() => setAbsentDialogOpen(false)}
        maxWidth={isMobile ? false : "sm"}
        fullWidth
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '80vh',
            maxHeight: '80vh',
          },
        } : {}}
      >
        <DialogTitle>Absent Students</DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          {absentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : absentStudents.length === 0 ? (
            <Typography color="text.secondary">No absent students found for this assessment.</Typography>
          ) : (
            <Stack spacing={2}>
              {absentStudents.map((group) => (
                <Box key={group.className}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Class {group.className}
                  </Typography>
                  <List dense disablePadding>
                    {group.students.map((student) => (
                      <ListItem
                        key={student.id}
                        disablePadding
                        secondaryAction={
                          <Checkbox
                            edge="end"
                            checked={selectedStudentsForAbsent.has(student.id)}
                            onChange={() => toggleStudentForAbsent(student.id)}
                          />
                        }
                      >
                        <ListItemText
                          primary={student.name}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.secondary">
                                {student.email} • Center: {student.student?.center?.centerName || 'N/A'}
                              </Typography>
                              {student.reason && (
                                <>
                                  <br />
                                  <Typography component="span" variant="caption" color="text.secondary">
                                    Reason: {student.reason}
                                  </Typography>
                                </>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedStudentsForAbsent(new Set());
              setAbsentDialogOpen(false);
            }}
          >
            Close
          </Button>
          {selectedStudentsForAbsent.size > 0 && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                const selectedStudents = absentStudents
                  .flatMap((group) => group.students)
                  .filter((student) => selectedStudentsForAbsent.has(student.id));
                handleRevokeAbsent(selectedStudents);
              }}
              disabled={markingAbsentLoading}
            >
              {markingAbsentLoading ? 'Revoking...' : `Revoke ${selectedStudentsForAbsent.size} Absent`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={studentAssessmentOpen}
        onClose={() => setStudentAssessmentOpen(false)}
        maxWidth={false}
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '90vh',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          Student Assessment
          <IconButton
            aria-label="Close student assessment"
            onClick={() => setStudentAssessmentOpen(false)}
            edge="end"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ flex: 1, minHeight: 0, overflow: 'hidden', p: 0 }}>
          {studentAssessmentContext ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ px: { xs: 1.5, sm: 2 }, py: 1, mb: 0 }}>
                {studentAssessmentContext.studentName || 'Student assessment'}
              </Typography>
              {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {studentAssessmentContext.studentEmail || 'Opening assessment for this student.'}
              </Typography> */}
              <iframe
                src={`/assessment?assessmentId=${studentAssessmentContext.assessmentId}&subjectId=${studentAssessmentContext.subjectId || ''}&studentId=${studentAssessmentContext.studentId}&editMode=${studentAssessmentContext.editMode}&returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                title="Student assessment"
                style={{ display: 'block', width: '100%', flex: 1, minHeight: 0, border: '1px solid #d0d7de', borderRadius: 0, padding: 0, margin: 0 }}
              />
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={isMobile ? false : "lg"}
        fullWidth
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '90vh',
            maxHeight: '90vh',
            borderRadius: 0,
          },
        } : {}}
        PaperProps={{ sx: { minHeight: { xs: 'auto', sm: 620 }, borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700, px: { xs: 2, sm: 3 } }}>
          <Quiz sx={{ fontSize: 28, color: '#1a73e8' }} />
          <Typography component="span" sx={{ flex: 1, minWidth: 0, fontWeight: 700 }}>
            {editingAssessment ? 'Edit Assessment' : 'Create Assessment'}
          </Typography>
          <IconButton
            aria-label="Close assessment dialog"
            onClick={() => setOpen(false)}
            edge="end"
            sx={{ flexShrink: 0 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3.5, md: 4 }, overflowY: 'auto' }}>
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

            <FormControl fullWidth>
              <InputLabel>Group Classes</InputLabel>
              <Select
                multiple
                value={allowedClassIds}
                label="Group Classes"
                onChange={handleAllowedClassSelection}
                disabled={classesLoading || availableClasses.length === 0}
                renderValue={(selected) => {
                  const names = (selected || [])
                    .map((id) => visibleClassOptions.find((item) => String(item.id) === String(id))?.className)
                    .filter(Boolean);

                  return names.length ? names.join(', ') : 'No classes selected';
                }}
              >
                {visibleClassOptions.map((item) => {
                  const isCurrentClass = String(item.id) === String(classId);
                  return (
                    <MenuItem key={item.id} value={item.id} disabled={isCurrentClass}>
                      <Checkbox checked={allowedClassIds.includes(String(item.id))} disabled={isCurrentClass} />
                      <ListItemText primary={item.className} secondary={isCurrentClass ? 'Current class (fixed)' : 'Visible for this assessment'} />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {allowSubjectSelection && !editingAssessment ? (
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={subjectId || ''}
                  label="Subject"
                  onChange={(event) => onAssessmentSubjectChange?.(event.target.value)}
                  disabled={!assessmentSubjectOptions.length}
                >
                  {assessmentSubjectOptions.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      <ListItemText primary={item.subjectName} secondary={item.className || undefined} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Total Marks"
                type="number"
                fullWidth
                value={computedTotalMarks}
                inputProps={{ min: 0, readOnly: true }}
                helperText="Auto-calculated from per-question marks"
              />
              {/* <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {computedTotalMarks} marks from questions
              </Typography> */}
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
                  fullWidth
                  multiline
                  minRows={3}
                  variant="outlined"
                  label="Question description"
                  placeholder="Add a passage or additional details"
                  value={question.questionDesc ?? ''}
                  onChange={(e) =>
                    updateQuestion(questionIndex, 'questionDesc', e.target.value)
                  }
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
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
