'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { Quiz } from '@mui/icons-material';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { selectAuthUser } from '@/redux/features/authSlice';
import { useSelector } from 'react-redux';

const StudentAssessmentView = ({ subjectId }) => {
  const user = useSelector(selectAuthUser);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAssessments = async () => {
    if (!subjectId || !user?.id) return;

    try {
      setLoading(true);

      const params = new URLSearchParams({
        userId: user.id,
      });

      const res = await fetch(
        `/api/subjects/${subjectId}/assessments?${params.toString()}`
      );

      const resultData = await res.json();

      if (!resultData.success) {
        throw new Error(resultData.message || 'Unable to load assessments');
      }

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
  }, [subjectId, user?.id]);

  const availableAssessments = useMemo(() => assessments || [], [assessments]);

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
    return (
      <Box
        sx={{
          width: '100%',
          py: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading assessments...</Typography>
      </Box>
    );
  }

  if (!availableAssessments.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography color="text.secondary">
            No assessments available for this chapter yet.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 4, width: '100%' }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Chapter Assessments
      </Typography>
      <Stack spacing={2}>
        {availableAssessments.map((assessment) => (
          <Card key={assessment.id} variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700}>{assessment.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {assessment.description || 'No description'}
                  </Typography>
                </Box>
                <Chip icon={<Quiz />} label={assessment.type} color="primary" variant="outlined" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {assessment.appeared_status === 'Y' ? (
                  <Chip label="Already Appeared" color="success" variant="outlined" />
                ) : (
                  <Button variant="contained" onClick={() => handleStartAssessment(assessment)}>
                    Start Assessment
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default StudentAssessmentView;
