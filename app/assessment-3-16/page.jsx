'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

const Assessment316Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const [assessments, setAssessments] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const endpoint = assessmentId
          ? `/api/assessments-3-16/${encodeURIComponent(assessmentId)}`
          : '/api/assessments-3-16';
        const response = await fetch(endpoint, { credentials: 'include' });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load assessment.');

        if (assessmentId) {
          setAssessment(result.data);
          const existing = Object.fromEntries((result.data.response?.selections || []).map((item) => [item.checklistId, item.optionId]));
          setSelections(existing);
        } else {
          setAssessments(Array.isArray(result.data) ? result.data : []);
        }
      } catch (error) {
        setFeedback({ severity: 'error', message: error.message || 'Unable to load assessment.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assessmentId]);

  const openAssessment = (id) => router.push(`/assessment-3-16?assessmentId=${encodeURIComponent(id)}`);

  const saveAssessment = async () => {
    if (!assessment) return;
    try {
      setSaving(true);
      setFeedback(null);
      const response = await fetch(`/api/assessments-3-16/${encodeURIComponent(assessment.id)}/responses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: assessment.checklist.map((field) => ({ checklistId: field.id, optionId: selections[field.id] })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save assessment.');
      setFeedback({ severity: 'success', message: 'Assessment saved successfully.' });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message || 'Unable to save assessment.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fb', p: { xs: 2, sm: 4 } }}>
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        {!assessment ? (
          <>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Assessment (3-16 years)</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Choose an assessment to attend.</Typography>
            {feedback ? <Alert severity={feedback.severity} sx={{ mb: 2 }}>{feedback.message}</Alert> : null}
            <Stack spacing={2}>
              {assessments.map((item) => (
                <Card key={item.id} variant="outlined">
                  <CardContent>
                    <Typography fontWeight={700}>{item.title}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>{item.description || 'No description'}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.fieldCount} evaluation fields</Typography>
                    <Box sx={{ mt: 2 }}><Button variant="contained" onClick={() => openAssessment(item.id)}>Attend Assessment</Button></Box>
                  </CardContent>
                </Card>
              ))}
              {!assessments.length ? <Typography color="text.secondary">No assessments are available.</Typography> : null}
            </Stack>
          </>
        ) : (
          <>
            <Typography variant="h5" fontWeight={700}>{assessment.title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{assessment.description || 'Select one option for each field.'}</Typography>
            {feedback ? <Alert severity={feedback.severity} sx={{ mb: 2 }}>{feedback.message}</Alert> : null}
            <Stack spacing={2}>
              {assessment.checklist.map((field, index) => (
                <Card key={field.id} variant="outlined">
                  <CardContent>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>{index + 1}. {field.label}</Typography>
                    <FormControl component="fieldset" fullWidth>
                      <RadioGroup
                        value={selections[field.id] || ''}
                        onChange={(event) => setSelections((current) => ({ ...current, [field.id]: event.target.value }))}
                      >
                        {field.options.map((option) => (
                          <FormControlLabel key={option.id} value={option.id} control={<Radio />} label={option.label} />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>
              ))}
            </Stack>
            <Button variant="contained" size="large" sx={{ mt: 3 }} onClick={saveAssessment} disabled={saving}>
              {saving ? 'Saving...' : 'Save Assessment'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default Assessment316Page;
