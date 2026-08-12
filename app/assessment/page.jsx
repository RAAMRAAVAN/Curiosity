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
  const studentId = searchParams.get('studentId');
  const editMode = searchParams.get('editMode') === 'true';
  const returnTo = searchParams.get('returnTo');

  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [existingResult, setExistingResult] = useState(null);

  const fetchAssessment = async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      const endpoint = subjectId
        ? `/api/subjects/${subjectId}/assessments/${assessmentId}`
        : `/api/assessments/${assessmentId}`;
      const res = await fetch(endpoint);
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
    const loadExistingResult = async () => {
      if (!assessmentId || !studentId || !editMode) return;

      try {
        const res = await fetch(`/api/assessments/results?assessmentId=${assessmentId}&userId=${studentId}`);
        const response = await res.json();

        if (response.success && response.data?.length) {
          const latestResult = response.data[0];
          setExistingResult(latestResult);

          if (latestResult.answers) {
            try {
              const parsedAnswers = JSON.parse(latestResult.answers);
              const nextAnswers = {};
              parsedAnswers.forEach((answer, index) => {
                nextAnswers[index] = { selectedOptionIndex: answer.selectedOptionIndex };
              });
              setAnswers(nextAnswers);
            } catch (error) {
              console.error(error);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadExistingResult();
  }, [assessmentId, studentId, editMode]);

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
    const targetUserId = studentId || activeUser?.id;

    if (!assessment || !targetUserId) {
      setFeedback({ severity: 'error', message: 'Please log in again to submit this assessment.' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        assessmentId: assessment.id,
        userId: targetUserId,
        answers: assessment.questions.map((question, index) => ({
          questionId: question.id,
          selectedOptionIndex: answers[index]?.selectedOptionIndex,
        })),
        allowReattempt: Boolean(editMode && existingResult),
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
          setFeedback({ severity: 'warning', message: response.message || 'You have already attempted this assessment.' });
          return;
        }
        throw new Error(response.message || 'Unable to submit assessment');
      }

      setResult(response.data);
      setFeedback({
        severity: 'success',
        message: `Assessment submitted successfully. Score: ${response.data.score}/${response.data.totalQuestions} (${response.data.percentage}%)`,
      });
      setExistingResult(response.data);
      notifyParent('assessment:completed');
    } catch (error) {
      console.error(error);
      setFeedback({ severity: 'error', message: error.message || 'Unable to submit assessment' });
    } finally {
      setSubmitting(false);
    }
  };

  const notifyParent = (type) => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type, assessmentId, studentId, returnTo }, '*');
    }
  };

  const handleCancelAssessment = () => {
    notifyParent('assessment:closed');

    if (window.parent && window.parent !== window) {
      return;
    }

    if (returnTo) {
      const target = decodeURIComponent(returnTo);
      window.location.href = target;
    } else {
      router.back();
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

  const resolvedTotalMarks = (result?.totalMarks && Number(result.totalMarks) > 0)
    ? Number(result.totalMarks)
    : (assessment?.questions || []).reduce((sum, question) => sum + (Number(question?.marks) || 0), 0) || Number(result?.totalQuestions || 0);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f1f3f4',
        py: { xs: 1.5, md: 3 },
        px: { xs: 1.5, sm: 2.5, md: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: 840,
          mx: 'auto',
          width: '100%',
        }}
      >
        {/* Header */}
        <Card
          elevation={0}
          sx={{
            mb: 2.5,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,.08)',
          }}
        >
          <Box
            sx={{
              height: { xs: 6, md: 10 },
              bgcolor: '#673ab7',
            }}
          />

          <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <Typography
              variant="h5"
              fontWeight={700}
              gutterBottom
              sx={{ fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' } }}
            >
              {assessment.title}
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ fontSize: { xs: 13, sm: 14.5, md: 15 } }}
            >
              {assessment.description || 'Answer all questions carefully.'}
            </Typography>
          </CardContent>
        </Card>

        {!result ? (
          <>
            {/* Questions */}
            <Stack spacing={{ xs: 2, md: 2.5 }}>
              {assessment.questions.map((question, questionIndex) => (
                <Card
                  key={question.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    borderLeft: '5px solid #673ab7',
                    boxShadow: '0 1px 8px rgba(0,0,0,.08)',
                    transition: '.2s',
                    '&:hover': {
                      boxShadow: '0 6px 18px rgba(0,0,0,.12)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 1.75, sm: 2, md: 2.5 } }}>
                    <Typography
                      fontWeight={700}
                      fontSize={{ xs: 15, sm: 16.5, md: 17 }}
                      sx={{ mb: 2 }}
                    >
                      {questionIndex + 1}. {question.questionText}
                    </Typography>

                    <RadioGroup
                      value={answers[questionIndex]?.selectedOptionIndex ?? ''}
                      onChange={(event) =>
                        handleAnswerChange(questionIndex, Number(event.target.value))
                      }
                    >
                      {question.options.map((option, optionIndex) => (
                        <Box
                          key={option.id}
                          sx={{
                            mb: 1.25,
                            borderRadius: 2.5,
                            border:
                              answers[questionIndex]?.selectedOptionIndex === optionIndex
                                ? '2px solid #673ab7'
                                : '1px solid #E5E7EB',
                            bgcolor:
                              answers[questionIndex]?.selectedOptionIndex === optionIndex
                                ? '#F3E8FF'
                                : '#fff',
                            transition: '.2s',
                            '&:hover': {
                              bgcolor: '#f8f5ff',
                            },
                          }}
                        >
                          <FormControlLabel
                            value={optionIndex}
                            control={<Radio color="secondary" />}
                            label={option.optionText}
                            sx={{
                              width: '100%',
                              m: 0,
                              px: 1.5,
                              py: 1,
                            }}
                          />
                        </Box>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {/* Feedback */}
            {feedback && (
              <Alert
                severity={feedback.severity}
                sx={{
                  mt: 3,
                  borderRadius: 3,
                }}
              >
                {feedback.message}
              </Alert>
            )}

            {/* Footer */}
            <Card
              elevation={0}
              sx={{
                mt: 3,
                borderRadius: 3,
                position: 'static',
                boxShadow: '0 4px 16px rgba(0,0,0,.06)',
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                >
                  <Typography color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: 14, sm: 15 } }}>
                    {assessment.questions.length} Questions
                  </Typography>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.25}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="medium"
                      onClick={handleCancelAssessment}
                      sx={{
                        borderRadius: 3,
                        textTransform: 'none',
                        px: { xs: 2, sm: 2.5 },
                        width: { xs: '100%', sm: 'auto' },
                      }}
                    >
                      Cancel Assessment
                    </Button>

                    <Button
                      variant="contained"
                      color="secondary"
                      size="medium"
                      onClick={handleSubmit}
                      disabled={submitting}
                      sx={{
                        borderRadius: 3,
                        textTransform: 'none',
                        px: { xs: 2, sm: 3 },
                        width: { xs: '100%', sm: 'auto' },
                        boxShadow: 'none',
                      }}
                    >
                      {submitting ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        'Submit Assessment'
                      )}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </>
        ) : (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Card
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 680,
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 18px rgba(0,0,0,.1)',
                bgcolor: result.percentage > 30 ? '#fff' : '#fafafa',
              }}
            >
              {result.percentage > 30 && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    '@keyframes confettiFall': {
                      '0%': {
                        transform: 'translateY(-30px) rotate(0deg)',
                        opacity: 1,
                      },
                      '100%': {
                        transform: 'translateY(120vh) rotate(360deg)',
                        opacity: 0,
                      },
                    },
                  }}
                >
                  {[
                    { left: '10%', bg: '#F44336', rotate: '15deg', delay: '0s' },
                    { left: '22%', bg: '#FFEB3B', rotate: '45deg', delay: '0.1s' },
                    { left: '34%', bg: '#4CAF50', rotate: '-20deg', delay: '0.2s' },
                    { left: '46%', bg: '#2196F3', rotate: '10deg', delay: '0.05s' },
                    { left: '58%', bg: '#9C27B0', rotate: '-10deg', delay: '0.15s' },
                    { left: '70%', bg: '#FF9800', rotate: '20deg', delay: '0.08s' },
                    { left: '82%', bg: '#00BCD4', rotate: '-25deg', delay: '0.12s' },
                  ].map((piece, index) => (
                    <Box
                      key={index}
                      component="span"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: piece.left,
                        width: 8,
                        height: 20,
                        bgcolor: piece.bg,
                        borderRadius: '2px',
                        transform: `rotate(${piece.rotate})`,
                        animation: `confettiFall 1.8s ${piece.delay} ease-in forwards`,
                      }}
                    />
                  ))}
                </Box>
              )}

              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 2 } }}>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    {result.percentage > 30 ? 'Congratulations!' : 'Assessment Completed'}
                  </Typography>
                  {result.percentage > 30 ? (
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      Great job! Your score is ready.
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      Your score is below the passing threshold.
                    </Typography>
                  )}

                  <Typography
                    variant="h2"
                    fontWeight={700}
                    sx={{ fontSize: { xs: '2.5rem', sm: '3rem' } }}
                  >
                    {result.score} / {resolvedTotalMarks}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, fontSize: { xs: 15, sm: 16 } }}>
                    {result.percentage}% • Grade {result.grade || '—'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleCancelAssessment}
                    sx={{ borderRadius: 3, textTransform: 'none', px: 4 }}
                  >
                    End Assessment
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AssessmentPage;
