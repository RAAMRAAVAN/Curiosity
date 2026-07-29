'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Assessment, BarChart, TrendingUp } from '@mui/icons-material';

const AssessmentResultsDashboard = ({ assessmentId }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const query = assessmentId ? `?assessmentId=${assessmentId}` : '';
      const res = await fetch(`/api/assessments/results${query}`);
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load results');
      setResults(response.data || []);
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [assessmentId]);

  const stats = useMemo(() => {
    if (!results.length) {
      return { attempts: 0, avg: 0, top: 0 };
    }

    const total = results.reduce((sum, item) => sum + (item.score || 0), 0);
    const avg = Math.round((total / results.length) * 100) / 100;
    const top = Math.max(...results.map((item) => item.score || 0));
    return { attempts: results.length, avg, top };
  }, [results]);

  const assessmentSummaries = useMemo(() => {
    if (!results.length || assessmentId) {
      return [];
    }

    const grouped = new Map();
    results.forEach((result) => {
      const key = result.assessmentId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          title: result.assessment?.title || 'Untitled assessment',
          subject: result.assessment?.subject?.subjectName || '-',
          className: result.assessment?.class?.className || '-',
          attempts: 0,
          totalScore: 0,
          maxScore: 0,
        });
      }

      const summary = grouped.get(key);
      summary.attempts += 1;
      summary.totalScore += result.score || 0;
      summary.maxScore = Math.max(summary.maxScore, result.score || 0);
    });

    return Array.from(grouped.values()).sort((a, b) => b.attempts - a.attempts);
  }, [results, assessmentId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Assessment Results Dashboard
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1, bgcolor: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="primary" />
              <Typography fontWeight={700}>Attempts</Typography>
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>{stats.attempts}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="success" />
              <Typography fontWeight={700}>Average Score</Typography>
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>{stats.avg}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart color="warning" />
              <Typography fontWeight={700}>Top Score</Typography>
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>{stats.top}</Typography>
          </CardContent>
        </Card>
      </Stack>

      {!assessmentId && assessmentSummaries.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Assessment Summary
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Assessment</TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Appeared</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>Best Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessmentSummaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell>{summary.title}</TableCell>
                    <TableCell>{summary.className}</TableCell>
                    <TableCell>{summary.subject}</TableCell>
                    <TableCell>{summary.attempts}</TableCell>
                    <TableCell>{Math.max(0, 0 - summary.attempts)}</TableCell>
                    <TableCell>{summary.maxScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {assessmentId ? 'Student Submissions' : 'Recent Submissions'}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{assessmentId ? 'Student' : 'Assessment'}</TableCell>
              <TableCell>{assessmentId ? 'Email' : 'Student'}</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Submitted At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell>{assessmentId ? result.user?.name || 'Unknown' : result.assessment?.title || 'Unknown'}</TableCell>
                <TableCell>{assessmentId ? result.user?.email || '-' : result.user?.name || '-'}</TableCell>
                <TableCell>{result.score}/{result.totalQuestions}</TableCell>
                <TableCell>{new Date(result.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AssessmentResultsDashboard;
