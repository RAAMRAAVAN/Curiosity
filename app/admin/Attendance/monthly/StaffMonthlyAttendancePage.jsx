'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
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
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ScreenRotation from '@mui/icons-material/ScreenRotation';
import LocationOn from '@mui/icons-material/LocationOn';
import { reverseGeocodeLocation } from '@/lib/reverseGeocodeLocation';
import { useAdminAuth } from '../../AdminAuthContext';

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2024, index, 1).toLocaleString('en-US', { month: 'long' }),
}));

function formatTime(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export default function StaffMonthlyAttendancePage({ audience }) {
  const { admin, loading } = useAdminAuth();
  const isCompactScreen = useMediaQuery('(max-width: 899px)', { noSsr: true });
  const isPortraitPhone = useMediaQuery('(max-width: 600px) and (orientation: portrait)');
  const isTeacherReport = audience === 'teacher';
  const staffLabel = isTeacherReport ? 'Teachers' : 'Management';
  const singularLabel = isTeacherReport ? 'Teacher' : 'Management';
  const reportTitle = isTeacherReport ? "Teachers' Monthly Attendance" : "Management's Monthly Attendance";
  const [centers, setCenters] = useState([]);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [reportLoaded, setReportLoaded] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const reportRef = useRef(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!admin || !isTeacherReport) return;
    const fetchCenters = async () => {
      try {
        const response = await fetch('/api/admin/centers', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load centers.');

        const centerList = data.data || [];
        setCenters(centerList);
        const preferredCenter = admin.centerId
          || admin.teacher?.centerId
          || admin.management?.centerId
          || admin.assignedCenterIds?.[0]
          || '';
        setSelectedCenterId(preferredCenter || centerList[0]?.id || '');
      } catch (fetchError) {
        setError(fetchError.message || 'Unable to load centers.');
      }
    };

    fetchCenters();
  }, [admin, isTeacherReport]);

  const monthDates = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(year, selectedMonth, 0)).getUTCDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        day,
        dateKey: `${year}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        date: new Date(Date.UTC(year, selectedMonth - 1, day)),
      };
    });
  }, [selectedMonth, year]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rows;
    return rows.filter((row) => String(row.name || '').toLocaleLowerCase().includes(query));
  }, [rows, search]);

  const fetchReport = async () => {
    if (isTeacherReport && !selectedCenterId) return;
    setLoadingRows(true);
    setError('');
    setRows([]);
    setReportLoaded(false);
    setSearch('');

    try {
      const params = new URLSearchParams({
        audience,
        month: String(selectedMonth),
        year: String(year),
      });
      if (isTeacherReport) params.set('centerId', selectedCenterId);
      const response = await fetch(`/api/admin/attendance/monthly/staff?${params}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load monthly attendance report.');
      setRows(data.data?.rows || []);
      setReportLoaded(true);
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load monthly attendance report.');
    } finally {
      setLoadingRows(false);
    }
  };

  const exportReport = () => {
    const params = new URLSearchParams({
      audience,
      month: String(selectedMonth),
      year: String(year),
    });
    if (isTeacherReport) params.set('centerId', selectedCenterId);
    window.open(`/api/admin/attendance/monthly/staff/export?${params}`, '_blank');
  };

  useEffect(() => {
    if (!isPortraitPhone && !loadingRows && reportLoaded) {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isPortraitPhone, loadingRows, reportLoaded]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!admin) return null;

  const requiredPermission = isTeacherReport
    ? 'attendance.teachers.monthly.view'
    : 'attendance.management.monthly.view';
  const grantedPermissions = Array.isArray(admin.permissions)
    ? admin.permissions.map((item) => String(item || '').toLowerCase())
    : [];
  const canViewReport = String(admin.role || '').toUpperCase() === 'ADMIN'
    || grantedPermissions.includes('*')
    || grantedPermissions.includes(requiredPermission)
    || grantedPermissions.some((item) => item.endsWith('.*') && requiredPermission.startsWith(`${item.slice(0, -2)}.`))
    || grantedPermissions.includes('attendance.*');

  if (!canViewReport) {
    return <Alert severity='error'>You are not authorized to view this monthly attendance report.</Alert>;
  }

  return (
    <Box sx={{ width: '100%', height: isCompactScreen ? 'auto' : '100%', minWidth: 0, minHeight: 0, p: 0, overflow: isCompactScreen ? 'visible' : 'hidden' }}>
      <Paper sx={{ height: isCompactScreen ? 'auto' : '100%', minWidth: 0, minHeight: isCompactScreen ? 'calc(100dvh - 73px)' : 0, display: 'flex', flexDirection: 'column', overflow: isCompactScreen ? 'visible' : 'hidden', p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }} sx={{ mb: 3 }}>
          <Box>
            <Typography variant='h5' fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, lineHeight: { xs: 1.2, sm: 1.334 } }}>
              {reportTitle}
            </Typography>
            <Typography color='text.secondary'>Review and download monthly {singularLabel.toLowerCase()} attendance.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant='contained'
              onClick={exportReport}
              disabled={(isTeacherReport && !selectedCenterId) || loadingRows}
              sx={{ backgroundColor: '#0a336b', '&:hover': { backgroundColor: '#082b57' } }}
            >
              Download Excel
            </Button>
            {!isCompactScreen ? (
              <Button variant='contained' onClick={fetchReport} disabled={(isTeacherReport && !selectedCenterId) || loadingRows}>
                View report
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, alignItems: 'flex-end' }}>
          {isTeacherReport ? (
            <FormControl fullWidth>
              <InputLabel id={`monthly-${audience}-center-label`}>Centre</InputLabel>
              <Select
                labelId={`monthly-${audience}-center-label`}
                value={selectedCenterId}
                label='Centre'
                onChange={(event) => setSelectedCenterId(event.target.value)}
              >
                {centers.map((center) => (
                  <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <FormControl fullWidth sx={{ maxWidth: { md: 220 } }}>
            <InputLabel id={`monthly-${audience}-month-label`}>Month</InputLabel>
            <Select
              labelId={`monthly-${audience}-month-label`}
              value={selectedMonth}
              label='Month'
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
            >
              {monthOptions.map((month) => (
                <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {isCompactScreen ? (
          <Button variant='contained' onClick={fetchReport} disabled={(isTeacherReport && !selectedCenterId) || loadingRows} sx={{ width: '100%', mb: 2 }}>
            View report
          </Button>
        ) : null}

        {error ? <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert> : null}
        {loadingRows ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {!loadingRows && reportLoaded ? (
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
              '&::-webkit-scrollbar-track': { backgroundColor: '#e8eef3', borderRadius: 8 },
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
                  label={`Search ${singularLabel.toLowerCase()}`}
                  placeholder={`Type a ${singularLabel.toLowerCase()} name`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ position: 'sticky', left: 0, zIndex: 5, width: { xs: '100%', sm: 360 }, mb: 1.5, backgroundColor: 'background.paper' }}
                />
                <Table
                  size='small'
                  stickyHeader
                  sx={{ width: '100%', minWidth: 3910, tableLayout: 'fixed', border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 2, borderCollapse: 'separate' }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ position: 'sticky', top: 0, left: 0, zIndex: 4, width: 220, minWidth: 220, maxWidth: 220, fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>
                        {singularLabel}
                      </TableCell>
                      {monthDates.map(({ date, dateKey, day }) => (
                        <TableCell key={dateKey} title={date.toLocaleDateString('en-US', { dateStyle: 'full', timeZone: 'UTC' })} align='center' sx={{ position: 'sticky', top: 0, zIndex: 2, width: 112, minWidth: 112, maxWidth: 112, px: 0.25, fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>
                          {day}
                        </TableCell>
                      ))}
                      <TableCell align='center' sx={{ position: 'sticky', top: 0, zIndex: 2, width: 105, px: 0.5, whiteSpace: 'nowrap', fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>Present</TableCell>
                      <TableCell align='center' sx={{ position: 'sticky', top: 0, zIndex: 2, width: 110, px: 0.5, whiteSpace: 'nowrap', fontWeight: 700, backgroundColor: '#edf3f8', borderBottom: '2px solid #cbd8e3' }}>No record</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          height: 80,
                          '&:nth-of-type(even) > td': { backgroundColor: '#f8fafc' },
                          '&:hover > td': { backgroundColor: '#edf5fb' },
                        }}
                      >
                        <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, width: 220, minWidth: 220, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: 'background.paper', fontWeight: 500 }}>
                          <span title={row.name}>{row.name}</span>
                        </TableCell>
                        {monthDates.map(({ dateKey }) => {
                          return (
                            <TableCell key={`${row.id}-${dateKey}`} align='center' sx={{ width: 112, minWidth: 112, maxWidth: 112, px: 0.25 }}>
                              <StaffAttendanceDayCell details={row.dailyDetails[dateKey]} />
                            </TableCell>
                          );
                        })}
                        <TableCell align='center' sx={{ width: 105, px: 0.5, color: '#237a4b', fontWeight: 700 }}>{row.presentCount}</TableCell>
                        <TableCell align='center' sx={{ width: 110, px: 0.5, color: '#526779', fontWeight: 700 }}>{row.noRecordCount}</TableCell>
                      </TableRow>
                    ))}
                    {!filteredRows.length ? (
                      <TableRow>
                        <TableCell align='center' colSpan={monthDates.length + 3} sx={{ py: 3, color: 'text.secondary' }}>
                          {rows.length ? `No ${singularLabel.toLowerCase()} matches that name.` : `No active ${staffLabel.toLowerCase()} found for this centre.`}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </>
            )}
          </Box>
        ) : null}

        {!loadingRows && !reportLoaded && !error ? (
          <Alert severity='info'>Select a {isTeacherReport ? 'centre and ' : ''}month, then click View report.</Alert>
        ) : null}
      </Paper>
    </Box>
  );
}

function formatCompactTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatLocation(details, direction, placeName) {
  const latitude = details?.[`${direction}Latitude`];
  const longitude = details?.[`${direction}Longitude`];
  if (latitude == null || longitude == null) return 'Location not recorded';

  const accuracy = details?.[`${direction}AccuracyMeters`];
  const accuracyLabel = accuracy == null ? '' : ` (GPS accuracy ±${Math.round(accuracy)} m)`;
  const location = placeName || `Coordinates: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
  return `${location}${accuracyLabel}`;
}

function StaffAttendanceDayCell({ details }) {
  const [placeNames, setPlaceNames] = useState(null);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const loadPlaceNames = async () => {
    if (placeNames || loadingPlaces || !details) return;
    setLoadingPlaces(true);
    const [checkIn, checkOut] = await Promise.all([
      reverseGeocodeLocation(details.checkInLatitude, details.checkInLongitude),
      reverseGeocodeLocation(details.checkOutLatitude, details.checkOutLongitude),
    ]);
    setPlaceNames({ checkIn, checkOut });
    setLoadingPlaces(false);
  };

  if (!details) {
    return (
      <Box
        component='span'
        sx={{
          width: 104,
          height: 60,
          boxSizing: 'border-box',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #cbd5e1',
          borderRadius: 1,
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: 12,
        }}
      >
        No record
      </Box>
    );
  }

  const checkInMap = details.checkInLatitude == null || details.checkInLongitude == null
    ? null
    : `https://www.google.com/maps/search/?api=1&query=${details.checkInLatitude},${details.checkInLongitude}`;
  const checkOutMap = details.checkOutLatitude == null || details.checkOutLongitude == null
    ? null
    : `https://www.google.com/maps/search/?api=1&query=${details.checkOutLatitude},${details.checkOutLongitude}`;
  const checkInLocation = loadingPlaces && !placeNames
    ? 'Looking up nearby place…'
    : formatLocation(details, 'checkIn', placeNames?.checkIn);
  const checkOutLocation = loadingPlaces && !placeNames
    ? 'Looking up nearby place…'
    : formatLocation(details, 'checkOut', placeNames?.checkOut);

  return (
    <Tooltip
      arrow
      placement='top'
      onOpen={loadPlaceNames}
      title={(
        <Stack spacing={1} sx={{ py: 0.5, maxWidth: 320 }}>
          <Box>
            <Typography variant='caption' fontWeight={700} display='block'>In time: {formatTime(details.checkInAt)}</Typography>
            <Typography variant='caption' display='block'>In location: {checkInLocation}</Typography>
            {checkInMap ? <Link href={checkInMap} target='_blank' rel='noreferrer' color='inherit' underline='always' variant='caption'>Open check-in map</Link> : null}
          </Box>
          <Box>
            <Typography variant='caption' fontWeight={700} display='block'>Out time: {formatTime(details.checkOutAt)}</Typography>
            <Typography variant='caption' display='block'>Out location: {checkOutLocation}</Typography>
            {checkOutMap ? <Link href={checkOutMap} target='_blank' rel='noreferrer' color='inherit' underline='always' variant='caption'>Open check-out map</Link> : null}
          </Box>
        </Stack>
      )}
    >
      <Box tabIndex={0} sx={{
        width: 104,
        height: 60,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #b8d9c4',
        borderRadius: 1,
        backgroundColor: '#f1f8f3',
        color: '#21623b',
        cursor: 'help',
        lineHeight: 1.2,
      }}>
        <Typography variant='caption' noWrap>In {formatCompactTime(details.checkInAt)}</Typography>
        <Typography variant='caption' noWrap>Out {formatCompactTime(details.checkOutAt)}</Typography>
        <LocationOn sx={{ fontSize: 13, color: '#537b9a' }} />
      </Box>
    </Tooltip>
  );
}