'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography, Button } from '@mui/material';
import { Quiz } from '@mui/icons-material';

const StudentTestsPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const classSlug = params?.classSlug;
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjectId, setSubjectId] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedSubject');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSubjectId(parsed?.id || null);
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  useEffect(() => {
    if (subjectId) {
      sessionStorage.setItem('selectedSubject', JSON.stringify({ id: subjectId }));
    }
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId) return;

    const fetchAssessments = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/subjects/${subjectId}/assessments`);
        const response = await res.json();
        if (!response.success) throw new Error(response.message || 'Unable to load assessments');
        setAssessments(response.data || []);
      } catch (error) {
        console.error(error);
        setAssessments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [subjectId]);

  const availableAssessments = useMemo(() => {
    return (assessments || []).filter((assessment) => !assessment.isAttempted);
  }, [assessments]);

  const handleStart = (assessment) => {
    const query = new URLSearchParams({
      assessmentId: assessment.id,
      subjectId,
      returnTo: encodeURIComponent(`/courses/${classSlug}/tests`),
    }).toString();
    router.push(`/assessment?${query}`);
  };

  if (loading) {
    return <Box sx={{ p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 4, width: '100%' }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>My Unattempted Tests</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Open the assessment linked to your selected subject.</Typography>
      {availableAssessments.length === 0 ? (
        <Card variant="outlined"><CardContent>No unattempted assessments available for this subject yet.</CardContent></Card>
      ) : (
        <Stack spacing={2}>
          {availableAssessments.map((assessment) => (
            <Card key={assessment.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={700}>{assessment.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{assessment.description || 'No description'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip icon={<Quiz />} label={assessment.type} variant="outlined" />
                    <Button variant="contained" onClick={() => handleStart(assessment)}>Start</Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default StudentTestsPage;
