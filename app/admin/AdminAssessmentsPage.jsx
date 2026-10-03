'use client';

import { useEffect, useState } from 'react';
import { Box, Button, TablePagination, TextField, Typography } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import AssessmentManager from '@/app/(components)/AssessmentManager';
import usePagedData from './usePagedData';

const emptyQuestion = () => ({
  questionText: '',
  questionDesc: '',
  marks: 1,
  correctOptionIndex: 0,
  options: ['', '', '', ''],
});

const AdminAssessmentsPage = ({ heading = 'View Assessment - A', moduleDescription = 'Review and manage assessments across all available subjects.' }) => {
  const paged = usePagedData({ endpoint: '/api/assessments/all', initialPageSize: 10 });
  const assessments = paged.rows;
  const loading = paged.loading;
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ASSESSMENT');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [feedback, setFeedback] = useState(null);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canCreateAssessments, setCanCreateAssessments] = useState(false);
  const [assessmentClasses, setAssessmentClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assessmentSubjects, setAssessmentSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('ASSESSMENT');
    setQuestions([emptyQuestion()]);
    setEditingAssessment(null);
  };

  const fetchAssessments = async () => {
    paged.reload();
  };

  useEffect(() => {
    if (paged.error) setFeedback({ severity: 'error', message: paged.error });
  }, [paged.error]);

  const loadAssessmentOptions = async () => {
    try {
      const [meResponse, classesResponse] = await Promise.all([
        fetch('/api/admin/me', { credentials: 'include' }),
        fetch('/api/classes', { credentials: 'include' }),
      ]);
      const meResult = await meResponse.json();
      const classesResult = await classesResponse.json();
      const role = String(meResult?.data?.role || '').toUpperCase();
      const permissions = Array.isArray(meResult?.data?.permissions) ? meResult.data.permissions : [];
      const canCreate = role === 'ADMIN'
        || permissions.includes('*')
        || permissions.includes('assessments.create')
        || permissions.some((item) => String(item).endsWith('.*') && 'assessments.create'.startsWith(`${String(item).slice(0, -2)}.`));
      setCanCreateAssessments(canCreate);

      const classes = Array.isArray(classesResult?.data) ? classesResult.data : [];
      const classOptions = await Promise.all(classes.map(async (item) => {
        const response = await fetch(`/api/subjects?classID=${encodeURIComponent(item.id)}`, { credentials: 'include' });
        const result = await response.json();
        return { ...item, subjects: result.success && Array.isArray(result.data) ? result.data : [] };
      }));
      const usableClasses = classOptions.filter((item) => item.subjects.length > 0);
      setAssessmentClasses(usableClasses);
      const firstClass = usableClasses[0];
      setSelectedClassId(firstClass?.id || '');
      setAssessmentSubjects(firstClass?.subjects || []);
      setSelectedSubjectId(firstClass?.subjects?.[0]?.id || '');
    } catch (error) {
      console.error(error);
      setAssessmentClasses([]);
      setAssessmentSubjects([]);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleVisibleClassIdsChange = (classIds) => {
    const normalizedIds = new Set((classIds || []).map((id) => String(id)));
    const subjects = assessmentClasses
      .filter((item) => normalizedIds.has(String(item.id)))
      .flatMap((item) => item.subjects || []);
    const nextSubject = subjects.some((item) => String(item.id) === String(selectedSubjectId))
      ? subjects.find((item) => String(item.id) === String(selectedSubjectId))
      : subjects[0];

    setAssessmentSubjects(subjects);
    setSelectedSubjectId(nextSubject?.id || '');
    setSelectedClassId(nextSubject?.classId || '');
  };

  const handleAssessmentSubjectChange = (subjectId) => {
    const subject = assessmentSubjects.find((item) => String(item.id) === String(subjectId));
    setSelectedSubjectId(subjectId);
    setSelectedClassId(subject?.classId || '');
  };

  const handleOpenCreate = () => {
    if (!selectedClassId || !selectedSubjectId) {
      setFeedback({ severity: 'error', message: 'No subject is available for assessment creation.' });
      return;
    }
    resetForm();
    setOpen(true);
  };

  useEffect(() => {
    loadAssessmentOptions();
  }, []);

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', minWidth: 0, p: { xs: 0, sm: 2, md: 3 } }}>
      <Box paddingX={2} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1, fontSize: { xs: 16, sm: 20 }, overflowWrap: 'anywhere' }}>{heading}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 12, sm: 16 }, overflowWrap: 'anywhere' }}>{moduleDescription}</Typography>
        </Box>
        {canCreateAssessments ? (
          <Button variant="contained" startIcon={<AddCircleOutline />} onClick={handleOpenCreate} disabled={!selectedSubjectId} sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44, flexShrink: 0, backgroundColor: '#0a336b', color: '#ffffff', '&:hover': { backgroundColor: '#082b57' } }}>
            Add New Assessment
          </Button>
        ) : null}
      </Box>
      <Box paddingX={2} sx={{ mb: 2 }}>
        <TextField size="small" label="Search assessments" value={paged.search} onChange={(event) => paged.setSearch(event.target.value)} sx={{ width: { xs: '100%', sm: 360 }, maxWidth: '100%' }} />
      </Box>
      <AssessmentManager
        resetForm={resetForm}
        fetchAssessments={fetchAssessments}
        emptyQuestion={emptyQuestion}
        assessments={assessments}
        loading={loading || loadingOptions}
        addQuestion={() => setQuestions((previous) => [...previous, emptyQuestion()])}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        type={type}
        setType={setType}
        questions={questions}
        setQuestions={setQuestions}
        feedback={feedback}
        setFeedback={setFeedback}
        editingAssessment={editingAssessment}
        setEditingAssessment={setEditingAssessment}
        open={open}
        setOpen={setOpen}
        saving={saving}
        setSaving={setSaving}
        classId={selectedClassId}
        subjectId={selectedSubjectId}
        allowSubjectSelection
        assessmentSubjectOptions={assessmentSubjects}
        assessmentVisibleClassOptions={assessmentClasses}
        fullWidth
        onAssessmentSubjectChange={handleAssessmentSubjectChange}
        onAllowedClassIdsChange={handleVisibleClassIdsChange}
      />
      <TablePagination {...paged.paginationProps} rowsPerPageOptions={[10, 25, 50]} sx={{ maxWidth: '100%' }} />
    </Box>
  );
};

export default AdminAssessmentsPage;