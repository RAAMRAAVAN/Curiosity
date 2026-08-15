'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Assessment, BarChart, TrendingUp } from '@mui/icons-material';

const AssessmentResultsDashboard = ({ assessmentId }) => {
  const ALL_CENTERS = 'ALL';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({});
  const [pendingCountsLoading, setPendingCountsLoading] = useState(false);
  const [absentCounts, setAbsentCounts] = useState({});
  const [absentCountsLoading, setAbsentCountsLoading] = useState(false);
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailResults, setDetailResults] = useState([]);
  const [detailAssessmentTitle, setDetailAssessmentTitle] = useState('');
  const [detailAbsentStudents, setDetailAbsentStudents] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(ALL_CENTERS);
  const [canUseCenterFilter, setCanUseCenterFilter] = useState(false);

  useEffect(() => {
    const loadAuthRole = async () => {
      try {
        const res = await fetch('/api/admin/me', { credentials: 'include' });
        const response = await res.json();
        if (!response.success) return;

        const role = String(response.data?.role || '').toUpperCase();
        setCanUseCenterFilter(role === 'ADMIN' || role === 'MANAGEMENT');
      } catch (error) {
        console.error(error);
      }
    };

    loadAuthRole();
  }, []);

  const centerOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        detailResults
          .map((item) => item.studentCenterName || 'N/A')
          .filter((item) => String(item).trim())
      )
    ).sort((a, b) => String(a).localeCompare(String(b)));

    return [ALL_CENTERS, ...values];
  }, [detailResults]);

  const filteredDetailResults = useMemo(() => {
    if (!canUseCenterFilter) return detailResults;
    if (selectedCenter === ALL_CENTERS) return detailResults;
    return detailResults.filter((item) => (item.studentCenterName || 'N/A') === selectedCenter);
  }, [detailResults, selectedCenter, canUseCenterFilter]);

  const detailStats = useMemo(() => {
    if (!filteredDetailResults.length) {
      return { attempts: 0, avg: 0, top: 0 };
    }

    const attempts = filteredDetailResults.length;
    const totalPercentage = filteredDetailResults.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
    const avg = Math.round((totalPercentage / attempts) * 100) / 100;
    const top = Math.max(...filteredDetailResults.map((item) => Number(item.score) || 0));
    return { attempts, avg, top };
  }, [filteredDetailResults]);

  const getResultRowStyles = (percentage) => {
    const value = Number(percentage) || 0;
    if (value >= 33) {
      return { bgcolor: 'rgba(56, 142, 60, 0.08)' };
    }
    if (value >= 30) {
      return { bgcolor: 'rgba(245, 124, 0, 0.14)' };
    }
    return { bgcolor: 'rgba(211, 47, 47, 0.12)' };
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      const query = assessmentId ? `?assessmentId=${assessmentId}` : '';
      const res = await fetch(`/api/assessments/results${query}`, {
        credentials: 'include',
      });
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

  const fetchPendingCount = async (id) => {
    if (!id) return 0;
    try {
      const res = await fetch(`/api/assessments/${id}/pending-students`, {
        credentials: 'include',
      });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load pending counts');
      const count = Array.isArray(response.data)
        ? response.data.reduce((sum, group) => sum + (group.students?.length || 0), 0)
        : 0;
      setPendingCounts((prev) => ({ ...prev, [id]: count }));
      return count;
    } catch (error) {
      console.error(error);
      setPendingCounts((prev) => ({ ...prev, [id]: 0 }));
      return 0;
    }
  };

  const fetchAbsentStudents = async (id) => {
    if (!id) return [];
    try {
      const res = await fetch(`/api/assessments/${id}/absent-students`, {
        credentials: 'include',
      });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load absent students');
      const data = Array.isArray(response.data) ? response.data : [];
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const fetchAbsentCount = async (id) => {
    if (!id) return 0;
    try {
      const groups = await fetchAbsentStudents(id);
      const count = groups.reduce((sum, group) => sum + (group.students?.length || 0), 0);
      setAbsentCounts((prev) => ({ ...prev, [id]: count }));
      return count;
    } catch (error) {
      console.error(error);
      setAbsentCounts((prev) => ({ ...prev, [id]: 0 }));
      return 0;
    }
  };

  useEffect(() => {
    fetchResults();
  }, [assessmentId]);

  useEffect(() => {
    if (!assessmentId) return;

    const loadCount = async () => {
      setPendingCountsLoading(true);
      await fetchPendingCount(assessmentId);
      setPendingCountsLoading(false);
    };

    loadCount();
  }, [assessmentId]);

  const stats = useMemo(() => {
    if (!results.length) {
      return { attempts: 0, avg: 0, top: 0 };
    }

    const totalPercentage = results.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);

    const avg = Math.round((totalPercentage / results.length) * 100) / 100;
    const top = Math.max(...results.map((item) => Number(item.score) || 0));
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
          totalPercent: 0,
          maxScore: 0,
        });
      }

      const summary = grouped.get(key);
      const score = Number(result.score) || 0;
      const percent = Number(result.percentage) || 0;

      summary.attempts += 1;
      summary.totalScore += score;
      summary.totalPercent += percent;
      summary.maxScore = Math.max(summary.maxScore, score);
    });

    return Array.from(grouped.values())
      .map((summary) => ({
        ...summary,
        averageScore:
          summary.attempts > 0
            ? Math.round((summary.totalPercent / summary.attempts) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [results, assessmentId]);

  useEffect(() => {
    if (assessmentId || !assessmentSummaries.length) return;

    const loadSummaryCounts = async () => {
      setPendingCountsLoading(true);
      setAbsentCountsLoading(true);
      try {
        await Promise.all(
          assessmentSummaries.map((summary) => {
            if (!summary.id) return Promise.resolve();
            return Promise.all([
              fetchPendingCount(summary.id),
              fetchAbsentCount(summary.id),
            ]);
          })
        );
      } catch (error) {
        console.error('Failed to load summary counts', error);
      } finally {
        setPendingCountsLoading(false);
        setAbsentCountsLoading(false);
      }
    };

    loadSummaryCounts();
  }, [assessmentSummaries, assessmentId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  const pendingCount = assessmentId ? pendingCounts[assessmentId] || 0 : 0;

  const handleOpenPendingDialog = async (id) => {
    if (!id) return;

    try {
      setPendingLoading(true);
      const res = await fetch(`/api/assessments/${id}/pending-students`, {
        credentials: 'include',
      });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load pending students');
      setPendingStudents((response.data || []).map((group) => ({
        ...group,
        students: (group.students || []).map((student) => ({
          ...student,
          centerName: student.student?.center?.centerName || student.centerName || 'N/A',
        })),
      })));
      setPendingDialogOpen(true);
    } catch (error) {
      console.error(error);
      setPendingStudents([]);
      setPendingDialogOpen(true);
    } finally {
      setPendingLoading(false);
    }
  };

  const handleOpenAbsentDialog = async (id) => {
    if (!id) return;

    try {
      setAbsentLoading(true);
      const res = await fetch(`/api/assessments/${id}/absent-students`, {
        credentials: 'include',
      });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load absent students');
      const groups = (response.data || []).map((group) => ({
        ...group,
        className: group.className || 'N/A',
        students: (group.students || []).map((student) => ({
          ...student,
          centerName: student.student?.center?.centerName || student.centerName || 'N/A',
          className: group.className || student.studentClassName || student.student?.className || student.className || 'N/A',
        })),
      }));
      setAbsentStudents(groups);
      setAbsentDialogOpen(true);
    } catch (error) {
      console.error(error);
      setAbsentStudents([]);
      setAbsentDialogOpen(true);
    } finally {
      setAbsentLoading(false);
    }
  };

  const handleOpenAssessmentDetailDialog = async (summary) => {
    if (!summary?.id) return;
    const filtered = results
      .filter((item) => item.assessmentId === summary.id)
      .slice()
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const absentGroups = await fetchAbsentStudents(summary.id);
    setDetailResults(filtered);
    setDetailAbsentStudents(absentGroups);
    setDetailAssessmentTitle(summary.title || 'Assessment Results');
    setSelectedCenter(ALL_CENTERS);
    setDetailDialogOpen(true);
  };

  const escapeValue = (value) => String(value).replace(/"/g, '""');

  const downloadAbsentStudentsExcel = (groups = absentStudents, fileName = 'absent-students') => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return;
    }

    const headers = ['S.No', 'Student', 'Center Name', 'Class', 'Email', 'Reason', 'Marked At'];
    const rows = groups
      .flatMap((group) => (group.students || []).map((student) => ({
        ...student,
        centerName: student.student?.center?.centerName || student.centerName || 'N/A',
        className: group.className || student.studentClassName || student.student?.className || student.className || 'N/A',
      })))
      .map((student, index) => [
        index + 1,
        student.name || '',
        student.centerName || 'N/A',
        student.className || 'N/A',
        student.email || 'No email',
        student.reason || '—',
        student.markedAt ? new Date(student.markedAt).toLocaleString() : '—',
      ]);

    const headerRow = headers
      .map((header) => `<th style="border:1px solid #666; padding:8px; font-weight:bold; background:#f9e4e4;">${escapeValue(header)}</th>`)
      .join('');

    const bodyRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) => `<td style="border:1px solid #666; padding:8px; text-align:left;">${escapeValue(cell)}</td>`
            )
            .join('')}</tr>`
      )
      .join('');

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h2 style="margin-bottom:12px;">${escapeValue(fileName)}</h2><table style="border-collapse:collapse; width:100%;"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(fileName).replace(/[^a-z0-9-_ ]/gi, '') || 'absent-students'}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadDetailResults = () => {
    const resultTable = filteredDetailResults.length
      ? (() => {
          const headers = [
            'S.No',
            'Student',
            'Center Name',
            'Class',
            'Subject',
            'Correct Attempts',
            'Wrong Attempts',
            'Marks Obtained',
            'Total Marks',
            'Percentage',
            'Grade',
          ];

          const rows = filteredDetailResults.map((result, index) => [
            index + 1,
            result.user?.name || '',
            result.studentCenterName || '',
            result.studentClassName || '',
            result.assessment?.subject?.subjectName || '',
            result.correctAttempts ?? 0,
            result.wrongAttempts ?? 0,
            result.score ?? 0,
            result.totalMarks ?? result.totalQuestions ?? 0,
            `${result.percentage ?? 0}%`,
            result.grade || '-',
          ]);

          const headerRow = headers
            .map((header) => `<th style="border:1px solid #666; padding:8px; font-weight:bold; background:#f0f0f0;">${escapeValue(header)}</th>`)
            .join('');

          const bodyRows = rows
            .map(
              (row) =>
                `<tr>${row
                  .map(
                    (cell) =>
                      `<td style="border:1px solid #666; padding:8px; text-align:left;">${escapeValue(cell)}</td>`
                  )
                  .join('')}</tr>`
            )
            .join('');

          return `<table style="border-collapse:collapse; width:100%; margin-bottom:20px;"> <thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        })()
      : '';

    const absentTable = detailAbsentStudents.length
      ? (() => {
          const headers = ['S.No', 'Student', 'Center Name', 'Class', 'Reason', 'Marked At'];
          const rows = detailAbsentStudents
            .flatMap((group) => (group.students || []).map((student) => ({
              ...student,
              centerName: student.student?.center?.centerName || student.centerName || 'N/A',
              className: group.className || student.studentClassName || student.student?.className || student.className || 'N/A',
            })))
            .map((student, index) => [
              index + 1,
              student.name || '',
              student.centerName || 'N/A',
              student.className || 'N/A',
              student.reason || '—',
              student.markedAt ? new Date(student.markedAt).toLocaleString() : '—',
            ]);

          const headerRow = headers
            .map((header) => `<th style="border:1px solid #666; padding:8px; font-weight:bold; background:#f9e4e4;">${escapeValue(header)}</th>`)
            .join('');

          const bodyRows = rows
            .map(
              (row) =>
                `<tr>${row
                  .map(
                    (cell) =>
                      `<td style="border:1px solid #666; padding:8px; text-align:left;">${escapeValue(cell)}</td>`
                  )
                  .join('')}</tr>`
            )
            .join('');

          return `<h3 style="margin:18px 0 10px;">Absent Students</h3><table style="border-collapse:collapse; width:100%;"> <thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        })()
      : '';

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><h2 style="margin-bottom:12px;">${escapeValue(detailAssessmentTitle || 'Assessment Results')}</h2>${resultTable}${absentTable}</body></html>`;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${detailAssessmentTitle.replace(/[^a-z0-9-_ ]/gi, '') || 'assessment-results'}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

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
              <Typography fontWeight={700}>Average Score (%)</Typography>
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>{stats.avg}%</Typography>
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
                  <TableCell>Absent</TableCell>
                  <TableCell>Average Score</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessmentSummaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell>{summary.title}</TableCell>
                    <TableCell>{summary.className}</TableCell>
                    <TableCell>{summary.subject}</TableCell>
                    <TableCell>{summary.attempts}</TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleOpenPendingDialog(summary.id)}
                        disabled={pendingCountsLoading || !(pendingCounts[summary.id] > 0)}
                      >
                        {pendingCountsLoading ? 'Loading...' : pendingCounts[summary.id] ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        color="error"
                        onClick={() => handleOpenAbsentDialog(summary.id)}
                        disabled={absentCountsLoading || !(absentCounts[summary.id] > 0)}
                      >
                        {absentCountsLoading ? 'Loading...' : absentCounts[summary.id] ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell>{summary.averageScore}%</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenAssessmentDetailDialog(summary)}
                      >
                        View Results
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {assessmentId ? (
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Student Submissions
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Submitted At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.user?.name || 'Unknown'}</TableCell>
                    <TableCell>{result.user?.email || '-'}</TableCell>
                    <TableCell>{result.score}/{result.totalMarks || result.totalQuestions || 0}</TableCell>
                    <TableCell>{new Date(result.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => handleOpenPendingDialog(assessmentId)}
              disabled={pendingLoading || pendingCount === 0}
            >
              Pending Students ({pendingCountsLoading ? 'Loading...' : pendingCount})
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleOpenAbsentDialog(assessmentId)}
              disabled={absentLoading || !(absentCounts[assessmentId] > 0)}
            >
              Absent Students ({absentLoading ? 'Loading...' : (absentCounts[assessmentId] ?? 0)})
            </Button>
          </Box>
        </>
      ) : null}

      <Dialog open={pendingDialogOpen} onClose={() => setPendingDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Pending Students</DialogTitle>
        <DialogContent>
          {pendingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : pendingStudents.length === 0 ? (
            <Typography color="text.secondary">No pending students found for this assessment.</Typography>
          ) : (
            <List>
              {pendingStudents.map((group) => (
                <Box key={group.className} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    {group.className}
                  </Typography>
                  {group.students?.map((student) => (
                    <ListItem key={student.id} disablePadding>
                      <ListItemText
                        primary={student.name || 'Unnamed student'}
                        secondary={`${student.email || 'No email'} • Center: ${student.centerName || student.student?.center?.centerName || 'N/A'}`}
                      />
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={absentDialogOpen} onClose={() => setAbsentDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Absent Students</DialogTitle>
        <DialogContent>
          {absentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : absentStudents.length === 0 ? (
            <Typography color="text.secondary">No absent students found for this assessment.</Typography>
          ) : (
            <List>
              {absentStudents.map((group) => (
                <Box key={group.className} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    {group.className}
                  </Typography>
                  {group.students?.map((student) => (
                    <ListItem key={student.id || student.attendanceId} disablePadding>
                      <ListItemText
                        primary={student.name || 'Unnamed student'}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.secondary">
                              {student.email || 'No email'} • Center: {student.centerName || student.student?.center?.centerName || 'N/A'}
                            </Typography>
                            {student.reason ? (
                              <>
                                <br />
                                <Typography component="span" variant="caption" color="text.secondary">
                                  Reason: {student.reason}
                                </Typography>
                              </>
                            ) : null}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Button variant="contained" color="success" onClick={() => downloadAbsentStudentsExcel()} disabled={absentLoading || absentStudents.length === 0}>
            Export Excel
          </Button>
          <Button onClick={() => setAbsentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>{detailAssessmentTitle}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mt: 1,
              mb: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {canUseCenterFilter ? (
              <TextField
                select
                size="small"
                label="Filter By Center"
                value={selectedCenter}
                onChange={(event) => setSelectedCenter(event.target.value)}
                sx={{ minWidth: 280 }}
                InputLabelProps={{ shrink: true }}
              >
                {centerOptions.map((centerName) => (
                  <MenuItem key={centerName} value={centerName}>
                    {centerName === ALL_CENTERS ? 'All' : centerName}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Box />
            )}

            <Button variant="contained" size="small" onClick={downloadDetailResults}>
              Download Excel
            </Button>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Card sx={{ flex: 1, bgcolor: '#f5f7ff', borderRadius: 3 }} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Attempts</Typography>
                  <Typography variant="h5" fontWeight={700}>{detailStats.attempts}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, bgcolor: '#eef7ed', borderRadius: 3 }} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Average Score</Typography>
                  <Typography variant="h5" fontWeight={700}>{detailStats.avg}%</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, bgcolor: '#fff4e5', borderRadius: 3 }} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Top Score</Typography>
                  <Typography variant="h5" fontWeight={700}>{detailStats.top}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, bgcolor: '#fff1f2', borderRadius: 3 }} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Absent</Typography>
                  <Typography variant="h5" fontWeight={700}>{detailAbsentStudents.reduce((sum, group) => sum + ((group.students || []).length), 0)}</Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                  <TableCell sx={{ fontWeight: 700 }}>S.No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Center Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Correct</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Wrong</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Marks Obtained</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Marks</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDetailResults.map((result, index) => (
                  <TableRow key={result.id} sx={getResultRowStyles(result.percentage)}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{result.user?.name || 'Unknown'}</TableCell>
                    <TableCell>{result.studentCenterName || 'N/A'}</TableCell>
                    <TableCell>{result.studentClassName || result.user?.studyingClass || 'N/A'}</TableCell>
                    <TableCell>{result.assessment?.subject?.subjectName || 'N/A'}</TableCell>
                    <TableCell>{result.correctAttempts ?? 0}</TableCell>
                    <TableCell>{result.wrongAttempts ?? 0}</TableCell>
                    <TableCell>{result.score ?? 0}</TableCell>
                    <TableCell>{result.totalMarks ?? result.totalQuestions ?? 0}</TableCell>
                    <TableCell>{result.percentage ?? 0}%</TableCell>
                    <TableCell>{result.grade || '—'}</TableCell>
                  </TableRow>
                ))}
                {filteredDetailResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      <Typography color="text.secondary">No student results available for the selected center.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssessmentResultsDashboard;
