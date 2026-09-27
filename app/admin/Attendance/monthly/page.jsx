'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ScreenRotation from '@mui/icons-material/ScreenRotation';
import { useAdminAuth } from '../../AdminAuthContext';

const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  const value = `${String(month).padStart(2, '0')}`;
  return {
    value,
    label: new Date(2024, month - 1, 1).toLocaleString('en-US', { month: 'long' }),
  };
});

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function calculatePresentCount(attendance) {
  if (!Array.isArray(attendance) || !attendance.length) return 0;
  return attendance.filter((item) => String(item?.status || '').toUpperCase() === 'PRESENT').length;
}

export default function StudentMonthlyAttendancePage() {
  const { admin, loading } = useAdminAuth();
  const isCompactScreen = useMediaQuery('(max-width: 899px)', { noSsr: true });
  const isPortraitPhone = useMediaQuery('(max-width: 600px) and (orientation: portrait)');
  const [centers, setCenters] = useState([]);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const reportRef = useRef(null);
  const SELECT_ALL = '__select_all__';
  const DESELECT_ALL = '__deselect_all__';

  useEffect(() => {
    if (!admin) return;
    const fetchCenters = async () => {
      try {
        const response = await fetch('/api/admin/centers', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load centers.');

        const centerList = data.data || [];
        setCenters(centerList);

        const preferredCenter = admin.centerId || admin.teacher?.centerId || admin.assignedCenterIds?.[0] || '';
        const firstCenter = preferredCenter || centerList[0]?.id || '';
        setSelectedCenterId(firstCenter);
      } catch (err) {
        setError(err.message || 'Unable to load centers.');
      }
    };

    fetchCenters();
  }, [admin]);

  useEffect(() => {
    if (!selectedCenterId) {
      setClasses([]);
      setSelectedClassIds([]);
      return;
    }

    const fetchClasses = async () => {
      try {
        const response = await fetch(`/api/admin/attendance?purpose=monthly-options&centerId=${encodeURIComponent(selectedCenterId)}&date=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load classes.');

        const nextClasses = Array.isArray(data.data?.classes) ? data.data.classes : [];
        setClasses(nextClasses);
        if (nextClasses.length) {
          setSelectedClassIds([nextClasses[0].id]);
        } else {
          setSelectedClassIds([]);
        }
      } catch (err) {
        setError(err.message || 'Unable to load classes.');
      }
    };

    fetchClasses();
  }, [selectedCenterId]);

  const monthDates = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth - 1, 1);
    const end = monthEnd(start);
    const dates = [];
    for (let day = 1; day <= end.getDate(); day += 1) {
      dates.push(new Date(selectedYear, selectedMonth - 1, day));
    }
    return dates;
  }, [selectedMonth, selectedYear]);

  const filteredRows = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase();
    if (!query) return rows;
    return rows.filter((row) => String(row.studentName || '').toLocaleLowerCase().includes(query));
  }, [rows, studentSearch]);

  const fetchMonthlyReport = async () => {
    if (!selectedCenterId || !selectedClassIds.length) return;
    setLoadingRows(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/attendance/monthly?centerId=${encodeURIComponent(selectedCenterId)}&classId=${encodeURIComponent(selectedClassIds.join(','))}&month=${String(selectedMonth).padStart(2, '0')}&year=${selectedYear}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load monthly attendance report.');
      }

      setRows(data.data?.rows || []);
    } catch (err) {
      setError(err.message || 'Unable to load monthly attendance report.');
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (!isPortraitPhone && !loadingRows && rows.length) {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isPortraitPhone, loadingRows, rows]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!admin) {
    return null;
  }

  const grantedPermissions = Array.isArray(admin.permissions)
    ? admin.permissions.map((item) => String(item || '').toLowerCase())
    : [];
  const canViewReport = String(admin.role || '').toUpperCase() === 'ADMIN'
    || grantedPermissions.includes('*')
    || grantedPermissions.includes('attendance.students.monthly.view')
    || grantedPermissions.some((item) => item.endsWith('.*') && 'attendance.students.monthly.view'.startsWith(`${item.slice(0, -2)}.`))
    || grantedPermissions.includes('attendance.*');

  if (!canViewReport) {
    return <Alert severity="error">You are not authorized to view the student monthly attendance report.</Alert>;
  }

  return (
    <Box sx={{ width: '100%', height: isCompactScreen ? 'auto' : '100%', minWidth: 0, minHeight: 0, p: 0, overflow: isCompactScreen ? 'visible' : 'hidden' }}>
      <Paper sx={{ height: isCompactScreen ? 'auto' : '100%', minWidth: 0, minHeight: isCompactScreen ? 'calc(100dvh - 73px)' : 0, display: 'flex', flexDirection: 'column', overflow: isCompactScreen ? 'visible' : 'hidden', p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ mb: 3 }}>
          <Box>
            <Typography variant='h5' fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, lineHeight: { xs: 1.2, sm: 1.334 } }}>
              Student's Monthly Attendance
            </Typography>
            <Typography color='text.secondary'>Review and download student monthly attendance reports.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant='contained'
              onClick={() => {
                const url = `/api/admin/attendance/monthly/export?centerId=${encodeURIComponent(selectedCenterId)}&classId=${encodeURIComponent(selectedClassIds.join(','))}&month=${String(selectedMonth).padStart(2, '0')}&year=${selectedYear}`;
                window.open(url, '_blank');
              }}
              disabled={!selectedCenterId || !selectedClassIds.length || loadingRows}
              sx={{ backgroundColor: '#0a336b', '&:hover': { backgroundColor: '#082b57' } }}
            >
              Download Excel
            </Button>
            {!isCompactScreen ? (
              <Button
                variant='contained'
                onClick={fetchMonthlyReport}
                disabled={!selectedCenterId || !selectedClassIds.length || loadingRows}
              >
                View report
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, alignItems: 'flex-end' }}>
          <FormControl fullWidth>
            <InputLabel id='monthly-center-label'>Centre</InputLabel>
            <Select
              labelId='monthly-center-label'
              value={selectedCenterId}
              label='Centre'
              onChange={(e) => setSelectedCenterId(e.target.value)}
            >
              {centers.map((center) => (
                <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id='monthly-class-label'>Class</InputLabel>
            <Select
              labelId='monthly-class-label'
              label='Class'
              multiple
              value={selectedClassIds}
              disabled={!classes.length}
              onChange={(event) => {
                const selectedValues = Array.isArray(event.target.value) ? event.target.value : [event.target.value];
                if (selectedValues.includes(SELECT_ALL)) {
                  setSelectedClassIds(classes.map((item) => item.id));
                  return;
                }
                if (selectedValues.includes(DESELECT_ALL)) {
                  setSelectedClassIds([]);
                  return;
                }
                setSelectedClassIds(selectedValues.filter(Boolean));
              }}
              renderValue={(selected) => {
                if (!selected.length) return 'Select class';
                const names = classes.filter((item) => selected.includes(item.id)).map((item) => item.className);
                return names.length ? names.join(', ') : 'Select class';
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 'min(320px, calc(100dvh - 160px))' },
                },
              }}
            >
              <MenuItem value={SELECT_ALL} sx={{ fontWeight: 700, color: 'primary.main' }}>
                Select All
              </MenuItem>
              <MenuItem value={DESELECT_ALL} sx={{ fontWeight: 700, color: 'error.main' }}>
                Deselect All
              </MenuItem>
              {classes.map((classItem) => (
                <MenuItem key={classItem.id} value={classItem.id}>
                  <Checkbox checked={selectedClassIds.includes(classItem.id)} />
                  {classItem.className}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ maxWidth: { md: 220 } }}>
            <InputLabel id='monthly-month-label'>Month</InputLabel>
            <Select
              labelId='monthly-month-label'
              value={selectedMonth}
              label='Month'
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthOptions.map((month) => (
                <MenuItem key={month.value} value={Number(month.value)}>{month.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {isCompactScreen ? (
          <Button
            variant='contained'
            onClick={fetchMonthlyReport}
            disabled={!selectedCenterId || !selectedClassIds.length || loadingRows}
            sx={{ width: '100%', mb: 2 }}
          >
            View report
          </Button>
        ) : null}

        {error ? <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert> : null}

        {loadingRows ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {!loadingRows && rows.length ? (
          <Box
            ref={reportRef}
            sx={{
              flex: isCompactScreen ? '0 1 auto' : '1 1 0',
              minHeight: 0,
              minWidth: 0,
              maxHeight: isCompactScreen ? '65dvh' : undefined,
              overflow: 'auto',
              scrollMarginTop: '8px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#537b9a #e8eef3',
              '&::-webkit-scrollbar': { width: 10, height: 10 },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#e8eef3',
                borderRadius: 8,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#537b9a',
                border: '2px solid #e8eef3',
                borderRadius: 8,
                '&:hover': { backgroundColor: '#315f86' },
              },
              '&::-webkit-scrollbar-corner': { backgroundColor: '#e8eef3' },
            }}
          >
            {isPortraitPhone ? (
              <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, px: 3, textAlign: 'center', color: '#31536f' }}>
                <ScreenRotation sx={{ fontSize: 44, color: '#537b9a' }} />
                <Typography variant='h6' fontWeight={700}>Rotate your phone</Typography>
                <Typography color='text.secondary'>Switch to landscape to view the full monthly attendance report.</Typography>
              </Box>
            ) : (
              <>
                <TextField
                  size='small'
                  label='Search student'
                  placeholder='Type a student name'
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 5,
                    width: { xs: '100%', sm: 360 },
                    mb: 1.5,
                    backgroundColor: 'background.paper',
                  }}
                />
                <Box sx={{ width: '100%', minWidth: 0 }}>
            <Table size='small' stickyHeader sx={{ width: '100%', minWidth: 1340, tableLayout: 'fixed', border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 2, borderCollapse: 'separate' }}>
              <TableHead>
                <TableRow>
                  <TableCell align='center' sx={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 4,
                    width: '4%',
                    minWidth: 0,
                    maxWidth: '4%',
                    px: 0.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 700,
                    backgroundColor: '#edf3f8',
                    borderBottom: '2px solid #cbd8e3',
                  }}>Class</TableCell>
                  <TableCell sx={{
                    position: 'sticky',
                    top: 0,
                    left: 'max(54px, 4%)',
                    zIndex: 3,
                    width: '16%',
                    minWidth: 0,
                    maxWidth: '16%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 700,
                    backgroundColor: '#edf3f8',
                    borderBottom: '2px solid #cbd8e3',
                  }}>Student</TableCell>
                  {monthDates.map((date) => (
                    <TableCell key={date.toISOString()} title={date.toLocaleDateString('en-US', { dateStyle: 'full' })} align='center' sx={{ position: 'sticky', top: 0, zIndex: 2, width: '2%', minWidth: 0, px: 0, fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>
                      {date.getDate()}
                    </TableCell>
                  ))}
                  <TableCell align='center' sx={{ position: 'sticky', top: 0, zIndex: 2, width: '5.99%', px: 0.5, whiteSpace: 'nowrap', fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>Present</TableCell>
                  <TableCell align='center' sx={{ position: 'sticky', top: 0, zIndex: 2, width: '5.99%', px: 0.5, whiteSpace: 'nowrap', fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>Absent</TableCell>
                  <TableCell align='center' sx={{ position: 'sticky', top: 0, zIndex: 2, width: '5.99%', px: 0.5, whiteSpace: 'nowrap', fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>Holiday</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      '&:nth-of-type(even) > td': { backgroundColor: '#f8fafc' },
                      '&:hover > td': { backgroundColor: '#edf5fb' },
                    }}
                  >
                    <TableCell align='center' sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      width: '4%',
                      minWidth: 0,
                      maxWidth: '4%',
                      px: 0.5,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      backgroundColor: 'background.paper',
                      color: '#31536f',
                      fontWeight: 600,
                    }}>
                      <span title={row.className}>{row.className}</span>
                    </TableCell>
                    <TableCell sx={{
                      position: 'sticky',
                      left: 'max(54px, 4%)',
                      zIndex: 1,
                      width: '16%',
                      minWidth: 0,
                      maxWidth: '16%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      backgroundColor: 'background.paper',
                    }}>
                      <span title={row.studentName} style={{ fontWeight: 500 }}>{row.studentName}</span>
                    </TableCell>
                    {monthDates.map((date) => {
                      const dayKey = date.toISOString().slice(0, 10);
                      const status = row.dailyStatus[dayKey] || '—';
                      const statusLabel = status === '—' ? 'No record' : status.replace('_', ' ').toLowerCase();
                      const statusBackground = status === 'PRESENT'
                        ? '#e8f4ec'
                        : status === 'ABSENT'
                          ? '#fdecec'
                          : status === 'HOLIDAY'
                            ? '#fff3db'
                            : status === 'WEEKLY_OFF'
                              ? '#eaf2fb'
                              : '#f3f5f7';
                      const statusColor = status === 'PRESENT'
                        ? '#21623b'
                        : status === 'ABSENT'
                          ? '#aa2e2e'
                          : status === 'HOLIDAY'
                            ? '#8a5a00'
                            : status === 'WEEKLY_OFF'
                              ? '#315f86'
                              : '#64748b';
                      const statusBorder = status === 'PRESENT'
                        ? '#8ec7a1'
                        : status === 'ABSENT'
                          ? '#e4a1a1'
                          : status === 'HOLIDAY'
                            ? '#e5c078'
                            : status === 'WEEKLY_OFF'
                              ? '#9bb9dc'
                              : '#d0d7de';
                      return (
                        <TableCell key={`${row.id}-${dayKey}`} align='center' sx={{ width: 40, minWidth: 40, px: 0.25 }}>
                          <Box
                            component='span'
                            title={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${statusLabel}`}
                            sx={{
                              width: 24,
                              height: 24,
                              boxSizing: 'border-box',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid',
                              borderColor: statusBorder,
                              borderRadius: 0.75,
                              backgroundColor: statusBackground,
                              color: statusColor,
                              fontSize: 11,
                              fontWeight: 600,
                              lineHeight: 1,
                            }}
                          >
                            {status === '—' ? '—' : status.slice(0, 1)}
                          </Box>
                        </TableCell>
                      );
                    })}
                    <TableCell align='center' sx={{ width: '5.99%', px: 0.5, whiteSpace: 'nowrap', color: '#237a4b', fontWeight: 700 }}>{row.presentCount}</TableCell>
                    <TableCell align='center' sx={{ width: '5.99%', px: 0.5, whiteSpace: 'nowrap', color: '#c43b3b', fontWeight: 700 }}>{row.absentCount}</TableCell>
                    <TableCell align='center' sx={{ width: '5.99%', px: 0.5, whiteSpace: 'nowrap', color: '#a56800', fontWeight: 700 }}>{row.holidayCount}</TableCell>
                  </TableRow>
                ))}
                {!filteredRows.length ? (
                  <TableRow>
                    <TableCell align='center' colSpan={monthDates.length + 5} sx={{ py: 3, color: 'text.secondary' }}>
                      No students match that name.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
                </Box>
              </>
            )}
          </Box>
        ) : null}

        {!loadingRows && !rows.length && !error && (
          <Alert severity='info'>Select a centre and class, then click View report.</Alert>
        )}
      </Paper>
    </Box>
  );
}
