'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@/redux/features/authSlice';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

const AssessmentPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSelector(selectAuthUser);
  const assessmentId = searchParams.get('assessmentId');
  const subjectId = searchParams.get('subjectId');
  const returnTo = searchParams.get('returnTo');

  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [requestingReattempt, setRequestingReattempt] = useState(false);
  const [reattemptRequested, setReattemptRequested] = useState(false);

  const fetchAssessment = async () => {
    if (!assessmentId || !subjectId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/subjects/${subjectId}/assessments/${assessmentId}`);
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load assessment');
      setAssessment(response.data);
    } catch (error) {
      console.error(error);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId, subjectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedAuth = window.sessionStorage.getItem('authDetails');
      if (!storedAuth) return;

      const parsed = JSON.parse(storedAuth);
      if (parsed?.user?.id) {
        setSessionUser(parsed.user);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleAnswerChange = (questionIndex, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: { selectedOptionIndex: optionIndex } }));
  };

  const handleSubmit = async () => {
    const activeUser = user || sessionUser;
    if (!assessment || !activeUser?.id) {
      setFeedback({ severity: 'error', message: 'Please log in again to submit this assessment.' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        assessmentId: assessment.id,
        userId: activeUser.id,
        answers: assessment.questions.map((question, index) => ({
          questionId: question.id,
          selectedOptionIndex: answers[index]?.selectedOptionIndex,
        })),
      };

      const res = await fetch('/api/assessments/results', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const response = await res.json();

      if (!response.success) {
        if (res.status === 409) {
          setReattemptRequested(false);
          setFeedback({ severity: 'warning', message: response.message || 'You have already attempted this assessment. Request a reattempt from your teacher.' });
          return;
        }
        throw new Error(response.message || 'Unable to submit assessment');
      }

      setResult(response.data);
      setFeedback({
        severity: 'success',
        message: `Assessment submitted successfully. Score: ${response.data.score}/${response.data.totalQuestions} (${response.data.percentage}%)`,
      });
      window.setTimeout(() => {
        if (returnTo) {
          const target = decodeURIComponent(returnTo);
          window.location.href = target;
        } else {
          router.back();
        }
      }, 1200);
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to submit assessment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReattempt = async () => {
    const activeUser = user || sessionUser;
    if (!assessment?.id) return;
    if (!activeUser?.id) {
      setFeedback({ severity: 'error', message: 'Please log in again to request a reattempt.' });
      return;
    }

    try {
      setRequestingReattempt(true);
      const res = await fetch('/api/assessments/reattempt-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: assessment.id, userId: activeUser.id, reason: 'Please allow another attempt.' }),
      });
      const response = await res.json();

      if (!response.success) throw new Error(response.message || 'Unable to request reattempt');

      setReattemptRequested(true);
      setFeedback({ severity: 'success', message: 'Reattempt request submitted. Your teacher will review it.' });
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to request reattempt' });
    } finally {
      setRequestingReattempt(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!assessment) {
    return <Typography sx={{ p: 4 }}>Assessment not found.</Typography>;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4, px: { xs: 2, md: 6 } }}>
      <Box sx={{ maxWidth: 980, mx: 'auto' }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>{assessment.title}</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>{assessment.description || 'Answer the questions below.'}</Typography>
            <Stack spacing={3}>
              {assessment.questions.map((question, questionIndex) => (
                <Box key={question.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2 }}>
                  <Typography fontWeight={600} sx={{ mb: 1 }}>
                    {questionIndex + 1}. {question.questionText}
                  </Typography>
                  <RadioGroup
                    value={answers[questionIndex]?.selectedOptionIndex ?? ''}
                    onChange={(event) => handleAnswerChange(questionIndex, Number(event.target.value))}
                  >
                    {question.options.map((option, optionIndex) => (
                      <FormControlLabel key={option.id} value={optionIndex} control={<Radio />} label={option.optionText} />
                    ))}
                  </RadioGroup>
                </Box>
              ))}
            </Stack>
            {feedback ? (
              <Alert severity={feedback.severity} sx={{ mb: 3 }}>
                {feedback.message}
              </Alert>
            ) : null}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography color="text.secondary">{assessment.questions.length} questions</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {!reattemptRequested && (
                  <Button variant="outlined" onClick={handleRequestReattempt} disabled={requestingReattempt || submitting}>
                    {requestingReattempt ? <CircularProgress size={20} /> : 'Request Reattempt'}
                  </Button>
                )}
                <Button variant="contained" onClick={handleSubmit} disabled={submitting || requestingReattempt}>
                  {submitting ? <CircularProgress size={20} /> : 'Submit Assessment'}
                </Button>
              </Box>
            </Box>
            {result && (
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Typography fontWeight={700}>Result: {result.score}/{result.totalQuestions}</Typography>
                <Typography color="text.secondary">Percentage: {result.percentage}%</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default AssessmentPage;
