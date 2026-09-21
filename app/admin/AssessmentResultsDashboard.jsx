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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Assessment, BarChart, TrendingUp } from '@mui/icons-material';
import * as XLSX from 'xlsx-js-style';

const AssessmentResultsDashboard = ({ assessmentId, assessmentType }) => {
  const ALL_CENTERS = 'ALL';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
  const [pendingSearch, setPendingSearch] = useState('');
  const [absentSearch, setAbsentSearch] = useState('');
  const [appearedDialogOpen, setAppearedDialogOpen] = useState(false);
  const [appearedStudents, setAppearedStudents] = useState([]);
  const [appearedLoading, setAppearedLoading] = useState(false);
  const [appearedSearch, setAppearedSearch] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailResults, setDetailResults] = useState([]);
  const [detailAssessmentTitle, setDetailAssessmentTitle] = useState('');
  const [detailAbsentStudents, setDetailAbsentStudents] = useState([]);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultDialogRows, setResultDialogRows] = useState([]);
  const [resultDialogTitle, setResultDialogTitle] = useState('');
  const [resultDialogLoading, setResultDialogLoading] = useState(false);
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

  const filterGroupsByName = (groups, search) => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups
      .map((group) => ({
        ...group,
        students: (group.students || []).filter((student) => String(student.name || '').toLowerCase().includes(query)),
      }))
      .filter((group) => group.students.length > 0);
  };

  const filteredPendingStudents = useMemo(() => filterGroupsByName(pendingStudents, pendingSearch), [pendingStudents, pendingSearch]);
  const filteredAbsentStudents = useMemo(() => filterGroupsByName(absentStudents, absentSearch), [absentStudents, absentSearch]);
  const filteredAppearedStudents = useMemo(() => filterGroupsByName(appearedStudents, appearedSearch), [appearedStudents, appearedSearch]);

  const resultDialogStats = useMemo(() => {
    if (!resultDialogRows.length) {
      return { attempts: 0, avg: 0, top: 0, absent: 0 };
    }

    const values = resultDialogRows.map((row) => Number(row.percentage ?? row.score ?? 0));
    const attempts = resultDialogRows.length;
    const avg = values.reduce((sum, value) => sum + value, 0) / attempts;
    const top = Math.max(...values);

    return { attempts, avg: Math.round(avg * 100) / 100, top, absent: 0 };
  }, [resultDialogRows]);

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
      const endpoint = assessmentType === '3-16'
        ? '/api/assessments-3-16/results'
        : `/api/assessments/results${assessmentId ? `?assessmentId=${assessmentId}` : ''}`;
      const res = await fetch(endpoint, { credentials: 'include' });
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
      const endpoint = assessmentType === '3-16'
        ? `/api/assessments-3-16/${encodeURIComponent(id)}/pending-students`
        : `/api/assessments/${id}/pending-students`;
      const res = await fetch(endpoint, { credentials: 'include' });
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
      const endpoint = assessmentType === '3-16'
        ? `/api/assessments-3-16/${encodeURIComponent(id)}/absent-students`
        : `/api/assessments/${id}/absent-students`;
      const res = await fetch(endpoint, { credentials: 'include' });
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
  }, [assessmentId, assessmentType]);

  const handleOpenPendingDialog = async (id) => {
    if (!id) return;

    try {
      setPendingLoading(true);
      const endpoint = assessmentType === '3-16'
        ? `/api/assessments-3-16/${encodeURIComponent(id)}/pending-students`
        : `/api/assessments/${id}/pending-students`;
      const res = await fetch(endpoint, { credentials: 'include' });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load pending students');
      setPendingStudents((response.data || []).map((group) => ({
        ...group,
        students: (group.students || []).map((student) => ({
          ...student,
          centerName: student.student?.center?.centerName || student.centerName || 'N/A',
        })),
      })));
      setPendingSearch('');
      setPendingDialogOpen(true);
    } catch (error) {
      console.error(error);
      setPendingStudents([]);
      setPendingSearch('');
      setPendingDialogOpen(true);
    } finally {
      setPendingLoading(false);
    }
  };

  const handleOpenAbsentDialog = async (id) => {
    if (!id) return;

    try {
      setAbsentLoading(true);
      const endpoint = assessmentType === '3-16'
        ? `/api/assessments-3-16/${encodeURIComponent(id)}/absent-students`
        : `/api/assessments/${id}/absent-students`;
      const res = await fetch(endpoint, { credentials: 'include' });
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
      setAbsentSearch('');
      setAbsentDialogOpen(true);
    } catch (error) {
      console.error(error);
      setAbsentStudents([]);
      setAbsentSearch('');
      setAbsentDialogOpen(true);
    } finally {
      setAbsentLoading(false);
    }
  };

  const handleOpenAppearedDialog = async (id) => {
    if (!id) return;

    try {
      setAppearedLoading(true);
      const endpoint = assessmentType === '3-16'
        ? `/api/assessments-3-16/${encodeURIComponent(id)}/appeared-students`
        : `/api/assessments/${id}/appeared-students`;
      const res = await fetch(endpoint, { credentials: 'include' });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load appeared students');
      setAppearedStudents(response.data || []);
      setAppearedSearch('');
      setAppearedDialogOpen(true);
    } catch (error) {
      console.error(error);
      setAppearedStudents([]);
      setAppearedSearch('');
      setAppearedDialogOpen(true);
    } finally {
      setAppearedLoading(false);
    }
  };

  const handleOpenAssessment316ResultDialog = async (summary) => {
    if (!summary?.id) return;
    try {
      setResultDialogLoading(true);
      const res = await fetch(`/api/assessments-3-16/${encodeURIComponent(summary.id)}/results`, { credentials: 'include' });
      const response = await res.json();
      if (!response.success) throw new Error(response.message || 'Unable to load student results');

      setResultDialogRows(Array.isArray(response.data) ? response.data : []);
      setResultDialogTitle(summary.title || 'Assessment Results');
      setResultDialogOpen(true);
    } catch (error) {
      console.error(error);
      setResultDialogRows([]);
      setResultDialogTitle(summary.title || 'Assessment Results');
      setResultDialogOpen(true);
    } finally {
      setResultDialogLoading(false);
    }
  };

  function export316ResultRowsToExcel() {
    if (!Array.isArray(resultDialogRows) || resultDialogRows.length === 0) {
      return;
    }

    const headers = ['S.No', 'Student', 'Center', 'Class', 'Subject', 'Result', 'Submitted At'];
    const rows = resultDialogRows.map((row, index) => [
      index + 1,
      row.user?.name || 'Unknown',
      row.studentCenterName || 'N/A',
      row.studentClassName || 'N/A',
      row.subjectName || 'N/A',
      row.resultSummary || 'No data',
      row.submittedAt ? new Date(row.submittedAt).toLocaleString() : 'N/A',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 42 },
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '3-16 Results');
    XLSX.writeFile(workbook, `${String(resultDialogTitle || 'assessment-results').replace(/[^a-z0-9-_ ]/gi, '') || 'assessment-results'}.xlsx`);
  }

  if (assessmentType === '3-16') {
    return (
      <Box sx={{ mt: 2 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead sx={{ backgroundColor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700 } }}>
              <TableRow>
                <TableCell>Assessment Name</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Appeared</TableCell>
                <TableCell>Pending</TableCell>
                <TableCell>Absent</TableCell>
                <TableCell>View</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
                  </TableCell>
                </TableRow>
              ) : results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ color: 'text.secondary' }}>No assessment results found.</TableCell>
                </TableRow>
              ) : (
                results.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title || 'Untitled assessment'}</TableCell>
                    <TableCell>{item.className || 'N/A'}</TableCell>
                    <TableCell>{item.subjectName || 'N/A'}</TableCell>
                    <TableCell>
                      <Button variant="text" size="small" onClick={() => handleOpenAppearedDialog(item.id)}>
                        {item.appearedCount ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="text" size="small" onClick={() => handleOpenPendingDialog(item.id)}>
                        {item.pendingCount ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="text" size="small" color="error" onClick={() => handleOpenAbsentDialog(item.id)}>
                        {item.absentCount ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="contained" size="small" onClick={() => handleOpenAssessment316ResultDialog(item)}>
                        View Results
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={pendingDialogOpen} onClose={() => setPendingDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Pending Students</DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            <TextField label="Search by Name" value={pendingSearch} onChange={(event) => setPendingSearch(event.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
            {pendingLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : filteredPendingStudents.length === 0 ? (
              <Typography color="text.secondary">{pendingStudents.length === 0 ? 'No pending students found for this assessment.' : 'No students match your search.'}</Typography>
            ) : (
              <List dense disablePadding>
                {filteredPendingStudents.map((group) => (
                  <Box key={group.className} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Class {group.className}</Typography>
                    {group.students.map((student) => (
                      <ListItem key={student.id} disablePadding>
                        <ListItemText primary={student.name} secondary={`Enrollment ID: ${student.id || 'N/A'} • Center: ${student.student?.center?.centerName || student.centerName || 'N/A'}`} />
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

        <Dialog open={absentDialogOpen} onClose={() => setAbsentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Absent Students</DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            <TextField label="Search by Name" value={absentSearch} onChange={(event) => setAbsentSearch(event.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
            {absentLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : filteredAbsentStudents.length === 0 ? (
              <Typography color="text.secondary">{absentStudents.length === 0 ? 'No absent students found for this assessment.' : 'No students match your search.'}</Typography>
            ) : (
              <List dense disablePadding>
                {filteredAbsentStudents.map((group) => (
                  <Box key={group.className} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Class {group.className}</Typography>
                    {group.students.map((student) => (
                      <ListItem key={student.id || student.attendanceId} disablePadding>
                        <ListItemText primary={student.name} secondary={student.reason ? `Reason: ${student.reason}` : `Enrollment ID: ${student.id || 'N/A'} • Center: ${student.student?.center?.centerName || student.centerName || 'N/A'}`} />
                      </ListItem>
                    ))}
                  </Box>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAbsentDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={appearedDialogOpen} onClose={() => setAppearedDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Appeared Students</DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            <TextField label="Search by Name" value={appearedSearch} onChange={(event) => setAppearedSearch(event.target.value)} fullWidth size="small" sx={{ mb: 2 }} />
            {appearedLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : filteredAppearedStudents.length === 0 ? (
              <Typography color="text.secondary">{appearedStudents.length === 0 ? 'No appeared students found for this assessment.' : 'No students match your search.'}</Typography>
            ) : (
              <List dense disablePadding>
                {filteredAppearedStudents.map((group) => (
                  <Box key={group.className} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Class {group.className}</Typography>
                    {group.students.map((student) => (
                      <ListItem key={student.id} disablePadding>
                        <ListItemText primary={student.name} secondary={`Enrollment ID: ${student.id || 'N/A'} • Center: ${student.student?.center?.centerName || 'N/A'}`} />
                      </ListItem>
                    ))}
                  </Box>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAppearedDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={resultDialogOpen} onClose={() => setResultDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>{resultDialogTitle}</DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            {resultDialogLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : resultDialogRows.length === 0 ? (
              <Typography color="text.secondary">No student results found for this assessment.</Typography>
            ) : (
              <>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                  <Card sx={{ flex: 1, bgcolor: '#f3f4f6', borderRadius: 3 }} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Attempts</Typography>
                      <Typography variant="h5" fontWeight={700}>{resultDialogStats.attempts}</Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1, bgcolor: '#eef7ed', borderRadius: 3 }} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Average Score</Typography>
                      <Typography variant="h5" fontWeight={700}>{resultDialogStats.avg}%</Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1, bgcolor: '#fff4e5', borderRadius: 3 }} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Top Score</Typography>
                      <Typography variant="h5" fontWeight={700}>{resultDialogStats.top}%</Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1, bgcolor: '#fff1f2', borderRadius: 3 }} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Absent</Typography>
                      <Typography variant="h5" fontWeight={700}>{resultDialogStats.absent}</Typography>
                    </CardContent>
                  </Card>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700 } }}>
                      <TableRow>
                        <TableCell>S.No</TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell>Center</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell>Submitted At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resultDialogRows.map((row, index) => (
                        <TableRow key={row.id || `${row.userId}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{row.user?.name || 'Unknown'}</TableCell>
                          <TableCell>{row.studentCenterName || 'N/A'}</TableCell>
                          <TableCell>{row.studentClassName || 'N/A'}</TableCell>
                          <TableCell>{row.subjectName || 'N/A'}</TableCell>
                          <TableCell>{row.resultSummary || 'No data'}</TableCell>
                          <TableCell>{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Button variant="contained" color="primary" onClick={export316ResultRowsToExcel} disabled={resultDialogRows.length === 0}>
              Download Excel
            </Button>
            <Button onClick={() => setResultDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

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
          createdAt: result.assessment?.createdAt,
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
      .sort((a, b) => {
        // Sort by creation date (latest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [results, assessmentId]);

  useEffect(() => {
    if (assessmentId || !assessmentSummaries.length || assessmentType === '3-16') return;

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
  }, [assessmentSummaries, assessmentId, assessmentType]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  const pendingCount = assessmentId ? pendingCounts[assessmentId] || 0 : 0;

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

  const exportStudentGroupsToExcel = (groups, fileName, { includeReason = false } = {}) => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return;
    }

    const headers = ['S.No', 'Student Name', 'Enrollment ID', 'Center Name', 'Class', ...(includeReason ? ['Reason', 'Marked At'] : [])];

    const students = groups.flatMap((group) => (group.students || []).map((student) => ({
      ...student,
      centerName: student.centerName || student.student?.center?.centerName || 'N/A',
      className: group.className || student.studentClassName || student.student?.className || student.className || 'N/A',
    })));

    const rows = students.map((student, index) => [
      index + 1,
      student.name || '',
      student.id || 'N/A',
      student.centerName || 'N/A',
      student.className || 'N/A',
      ...(includeReason ? [student.reason || '—', student.markedAt ? new Date(student.markedAt).toLocaleString() : '—'] : []),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'FF1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'FFB7C3D0' } },
        bottom: { style: 'thin', color: { rgb: 'FFB7C3D0' } },
        left: { style: 'thin', color: { rgb: 'FFB7C3D0' } },
        right: { style: 'thin', color: { rgb: 'FFB7C3D0' } },
      },
    };
    headers.forEach((_, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      if (worksheet[cellRef]) worksheet[cellRef].s = headerStyle;
    });

    const bodyBorder = {
      top: { style: 'thin', color: { rgb: 'FFD9E0E7' } },
      bottom: { style: 'thin', color: { rgb: 'FFD9E0E7' } },
      left: { style: 'thin', color: { rgb: 'FFD9E0E7' } },
      right: { style: 'thin', color: { rgb: 'FFD9E0E7' } },
    };
    rows.forEach((row, rowIndex) => {
      const fillColor = rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF3F6FA';
      row.forEach((_, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            border: bodyBorder,
            alignment: { vertical: 'center', horizontal: colIndex === 0 ? 'center' : 'left' },
            fill: { patternType: 'solid', fgColor: { rgb: fillColor } },
          };
        }
      });
    });

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 22 },
      { wch: 24 },
      { wch: 14 },
      ...(includeReason ? [{ wch: 26 }, { wch: 20 }] : []),
    ];
    worksheet['!rows'] = [{ hpx: 22 }];
    worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `${String(fileName).replace(/[^a-z0-9-_ ]/gi, '') || 'students'}.xlsx`);
  };

  const downloadPendingStudentsExcel = (groups = filteredPendingStudents, fileName = 'pending-students') => {
    exportStudentGroupsToExcel(groups, fileName);
  };

  const downloadAbsentStudentsExcel = (groups = filteredAbsentStudents, fileName = 'absent-students') => {
    exportStudentGroupsToExcel(groups, fileName, { includeReason: true });
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
      {/* <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Assessment Results Dashboard
      </Typography> */}

      {/* <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
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
      </Stack> */}

      {!assessmentId && assessmentSummaries.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Assessment Summary
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead sx={{ backgroundColor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700 } }}>
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
              <TableHead sx={{ backgroundColor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700 } }}>
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

      <Dialog 
        open={pendingDialogOpen} 
        onClose={() => setPendingDialogOpen(false)} 
        fullWidth
        maxWidth={isMobile ? false : "sm"}
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '80vh',
            maxHeight: '80vh',
          },
        } : {}}
      >
        <DialogTitle>Pending Students</DialogTitle>
        <DialogContent>
          <TextField
            label="Search by Name"
            value={pendingSearch}
            onChange={(event) => setPendingSearch(event.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          {pendingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : filteredPendingStudents.length === 0 ? (
            <Typography color="text.secondary">{pendingStudents.length === 0 ? 'No pending students found for this assessment.' : 'No students match your search.'}</Typography>
          ) : (
            <List>
              {filteredPendingStudents.map((group) => (
                <Box key={group.className} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Class {group.className}
                  </Typography>
                  {group.students?.map((student) => (
                    <ListItem key={student.id} disablePadding>
                      <ListItemText
                        primary={student.name || 'Unnamed student'}
                        secondary={`Enrollment ID: ${student.id || 'N/A'} • Center: ${student.centerName || student.student?.center?.centerName || 'N/A'}`}
                      />
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Button variant="contained" color="success" onClick={() => downloadPendingStudentsExcel()} disabled={pendingLoading || pendingStudents.length === 0}>
            Export Excel
          </Button>
          <Button onClick={() => setPendingDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={absentDialogOpen} 
        onClose={() => setAbsentDialogOpen(false)} 
        fullWidth
        maxWidth={isMobile ? false : "sm"}
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '80vh',
            maxHeight: '80vh',
          },
        } : {}}
      >
        <DialogTitle>Absent Students</DialogTitle>
        <DialogContent>
          <TextField
            label="Search by Name"
            value={absentSearch}
            onChange={(event) => setAbsentSearch(event.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          {absentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : filteredAbsentStudents.length === 0 ? (
            <Typography color="text.secondary">{absentStudents.length === 0 ? 'No absent students found for this assessment.' : 'No students match your search.'}</Typography>
          ) : (
            <List>
              {filteredAbsentStudents.map((group) => (
                <Box key={group.className} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Class {group.className}
                  </Typography>
                  {group.students?.map((student) => (
                    <ListItem key={student.id || student.attendanceId} disablePadding>
                      <ListItemText
                        primary={student.name || 'Unnamed student'}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.secondary">
                              Enrollment ID: {student.id || 'N/A'} • Center: {student.centerName || student.student?.center?.centerName || 'N/A'}
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

      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        fullWidth
        maxWidth={isMobile ? false : "lg"}
        sx={isMobile ? {
          '& .MuiDialog-paper': {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '80vh',
            maxHeight: '80vh',
          },
        } : {}}
      >
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

          <Box sx={{ mb: 3, display: { xs: 'none', lg: 'block' } }}>
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
              <TableHead sx={{ backgroundColor: '#0a336b', '& .MuiTableCell-root': { color: '#ffffff', fontWeight: 700 } }}>
                <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                  {assessmentType === '3-16' ? (
                    <>
                      <TableCell sx={{ fontWeight: 700 }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Center Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Selected Result</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Submitted At</TableCell>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {assessmentType === '3-16' ? (
                  filteredDetailResults.map((result, index) => (
                    <TableRow key={result.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{result.user?.name || 'Unknown'}</TableCell>
                      <TableCell>{result.studentCenterName || 'N/A'}</TableCell>
                      <TableCell>{result.studentClassName || result.user?.studyingClass || 'N/A'}</TableCell>
                      <TableCell>{result.subjectName || result.assessment?.subject?.subjectName || 'N/A'}</TableCell>
                      <TableCell>{result.resultSummary || 'No data'}</TableCell>
                      <TableCell>{result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredDetailResults.map((result, index) => (
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
                  ))
                )}
                {filteredDetailResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={assessmentType === '3-16' ? 7 : 11} align="center">
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
