'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { Quiz } from '@mui/icons-material';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

const StudentAssessmentView = ({ subjectId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAssessments = async () => {
    if (!subjectId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/subjects/${subjectId}/assessments`);
      const resultData = await res.json();
      if (!resultData.success) throw new Error(resultData.message || 'Unable to load assessments');
      setAssessments(resultData.data || []);
    } catch (error) {
      console.error(error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [subjectId]);

  const handleStartAssessment = (assessment) => {
    const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const query = new URLSearchParams({
      assessmentId: assessment.id,
      subjectId,
      returnTo: encodeURIComponent(returnTo),
    }).toString();

    router.push(`/assessment?${query}`);
  };

  if (loading) {
    return <Typography color="text.secondary">Loading assessments...</Typography>;
  }

  if (!assessments.length) {
    return <Typography color="text.secondary">No assessments available for this chapter yet.</Typography>;
  }

  return (
    <Box sx={{ mt: 4, width: '100%' }}>
      <Typography fontWeight="bold" fontSize={18} sx={{ mb: 2 }}>
        Chapter Assessments
      </Typography>
      <Stack spacing={2}>
        {assessments.map((assessment) => (
          <Card key={assessment.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Box>
                  <Typography fontWeight="bold">{assessment.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{assessment.description || 'No description'}</Typography>
                </Box>
                <Chip icon={<Quiz />} label={assessment.type} color="primary" variant="outlined" />
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Button variant="contained" onClick={() => handleStartAssessment(assessment)}>
                Start
              </Button>
            </CardContent>
          </Card>
        ))}
      </Stack>

    </Box>
  );
};

export default StudentAssessmentView;
