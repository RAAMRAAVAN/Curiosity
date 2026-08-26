'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import AssessmentManager from '@/app/(components)/AssessmentManager';

const emptyQuestion = () => ({
  questionText: '',
  questionDesc: '',
  marks: 1,
  correctOptionIndex: 0,
  options: ['', '', '', ''],
});

const AdminAssessmentsPage = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
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
    try {
      setLoading(true);
      const response = await fetch('/api/assessments/all', { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load assessments');
      setAssessments(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error(error);
      setAssessments([]);
      setFeedback({ severity: 'error', message: error.message || 'Unable to load assessments' });
    } finally {
      setLoading(false);
    }
  };

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
    fetchAssessments();
    loadAssessmentOptions();
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>View Assessments</Typography>
          <Typography color="text.secondary">Review and manage assessments across all available subjects.</Typography>
        </Box>
        {canCreateAssessments ? (
          <Button variant="contained" startIcon={<AddCircleOutline />} onClick={handleOpenCreate} disabled={!selectedSubjectId}>
            Add New Assessment
          </Button>
        ) : null}
      </Box>
      <AssessmentManager
        resetForm={resetForm}
        fetchAssessments={fetchAssessments}
        emptyQuestion={emptyQuestion}
        assessments={assessments}
        loading={loading}
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
        onAssessmentSubjectChange={handleAssessmentSubjectChange}
        onAllowedClassIdsChange={handleVisibleClassIdsChange}
      />
    </Box>
  );
};

export default AdminAssessmentsPage;