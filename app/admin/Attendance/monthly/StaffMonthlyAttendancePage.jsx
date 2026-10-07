'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ScreenRotation from '@mui/icons-material/ScreenRotation';
import LocationOn from '@mui/icons-material/LocationOn';
import { reverseGeocodeLocation } from '@/lib/reverseGeocodeLocation';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../../AdminAuthContext';

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2024, index, 1).toLocaleString('en-US', { month: 'long' }),
}));

const SELECT_ALL_CENTERS = '__select_all_centers__';
const DESELECT_ALL_CENTERS = '__deselect_all_centers__';

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
  const [selectedCenterIds, setSelectedCenterIds] = useState([]);
  const [subroles, setSubroles] = useState([]);
  const [selectedSubroleId, setSelectedSubroleId] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(isTeacherReport);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [requested, setRequested] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const latestRequest = useRef(0);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const reportRef = useRef(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!admin || !isTeacherReport) return;
    const fetchCenters = async () => {
      setLoadingOptions(true);
      try {
        const response = await fetch('/api/admin/centers', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load centers.');

        const centerList = data.data || [];
        setCenters(centerList);
        setSelectedCenterIds(centerList.map((center) => center.id));
      } catch (fetchError) {
        setError(fetchError.message || 'Unable to load centers.');
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchCenters();
  }, [admin, isTeacherReport]);

  useEffect(() => {
    if (!admin || isTeacherReport) return;
    const controller = new AbortController();
    const fetchSubroles = async () => {
      setLoadingOptions(true);
      try {
        const response = await fetch('/api/admin/attendance/monthly/staff?audience=management&subrolesOnly=1', {
          credentials: 'include',
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load subroles.');
        setSubroles(data.data?.subroles || []);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') setError(fetchError.message || 'Unable to load subroles.');
      } finally {
        if (!controller.signal.aborted) setLoadingOptions(false);
      }
    };

    fetchSubroles();
    return () => controller.abort();
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

  const filteredRows = rows;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(0); }, [debouncedSearch, pageSize]);

  const requestReport = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(0);
    setRows([]);
    setReportLoaded(false);
    setRequested(true);
    setReloadToken((value) => value + 1);
  };

  const fetchReport = async () => {
    if (isTeacherReport && !selectedCenterIds.length) return;
    setLoadingRows(true);
    setError('');
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;

    try {
      const params = new URLSearchParams({
        audience,
        month: String(selectedMonth),
        year: String(year),
        page: String(page + 1),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (isTeacherReport) params.set('centerIds', selectedCenterIds.join(','));
      if (!isTeacherReport && selectedSubroleId) params.set('subroleId', selectedSubroleId);
      const response = await fetch(`/api/admin/attendance/monthly/staff?${params}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load monthly attendance report.');
      if (latestRequest.current !== requestId) return;
      setRows(data.data?.rows || []);
      setTotal(data.pagination?.total ?? (data.data?.rows || []).length);
      setReportLoaded(true);
    } catch (fetchError) {
      if (latestRequest.current !== requestId) return;
      setError(fetchError.message || 'Unable to load monthly attendance report.');
    } finally {
      if (latestRequest.current === requestId) setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (requested) fetchReport();
  }, [requested, page, pageSize, debouncedSearch, reloadToken]);

  const exportReport = () => {
    const params = new URLSearchParams({
      audience,
      month: String(selectedMonth),
      year: String(year),
    });
    if (isTeacherReport) params.set('centerIds', selectedCenterIds.join(','));
    if (!isTeacherReport && selectedSubroleId) params.set('subroleId', selectedSubroleId);
    window.open(`/api/admin/attendance/monthly/staff/export?${params}`, '_blank');
  };

  useEffect(() => {
    if (!isPortraitPhone && !loadingRows && reportLoaded) {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isPortraitPhone, loadingRows, reportLoaded]);

  if (loading) {
    return <Loader variant='page' />;
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

  if (loadingOptions) return <Loader variant='page' label='Loading attendance options...' />;

  return (
    <Box sx={{ width: '100%', height: isCompactScreen ? 'auto' : '100%', minWidth: 0, minHeight: 0, p: 0, overflow: isCompactScreen ? 'visible' : 'hidden' }}>
      <Paper sx={{ height: isCompactScreen ? 'auto' : '100%', minWidth: 0, minHeight: isCompactScreen ? 'calc(100dvh - 73px)' : 0, display: 'flex', flexDirection: 'column', overflow: isCompactScreen ? 'visible' : 'hidden', p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }} sx={{ mb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h5' fontWeight={700} sx={{ color: '#0a336b', fontSize: { xs: '1.25rem', sm: '1.5rem' }, lineHeight: { xs: 1.2, sm: 1.334 } }}>
              {reportTitle}
            </Typography>
            <Typography color='text.secondary' sx={{fontSize: { xs: '0', sm: '1rem' } }}>
              Review and download monthly {singularLabel.toLowerCase()} attendance.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {!isCompactScreen ? (
              <Button
                variant='contained'
                onClick={exportReport}
                disabled={(isTeacherReport && !selectedCenterIds.length) || loadingRows}
                sx={{ backgroundColor: '#0a336b', '&:hover': { backgroundColor: '#082b57' } }}
              >
                Download Excel
              </Button>
            ) : null}
            {!isCompactScreen ? (
              <Button variant='contained' onClick={requestReport} disabled={(isTeacherReport && !selectedCenterIds.length) || loadingRows}>
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
                multiple
                labelId={`monthly-${audience}-center-label`}
                value={selectedCenterIds}
                label='Centre'
                onChange={(event) => {
                  const selected = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
                  if (selected.includes(SELECT_ALL_CENTERS)) {
                    setSelectedCenterIds(centers.map((center) => center.id));
                  } else if (selected.includes(DESELECT_ALL_CENTERS)) {
                    setSelectedCenterIds([]);
                  } else {
                    setSelectedCenterIds(selected);
                  }
                }}
                renderValue={(selected) => selected.length === centers.length
                  ? `All centres (${selected.length})`
                  : selected.map((id) => centers.find((center) => center.id === id)?.name).filter(Boolean).join(', ') || 'Select centres'}
              >
                <MenuItem value={SELECT_ALL_CENTERS}>
                  <Checkbox checked={centers.length > 0 && selectedCenterIds.length === centers.length} />
                  Select All
                </MenuItem>
                <MenuItem value={DESELECT_ALL_CENTERS}>
                  <Checkbox checked={selectedCenterIds.length === 0} />
                  Deselect All
                </MenuItem>
                {centers.map((center) => (
                  <MenuItem key={center.id} value={center.id}>
                    <Checkbox checked={selectedCenterIds.includes(center.id)} />
                    {center.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {!isTeacherReport ? (
            <FormControl fullWidth sx={{ maxWidth: { md: 260 } }}>
              <InputLabel id='monthly-management-subrole-label'>Subrole</InputLabel>
              <Select
                labelId='monthly-management-subrole-label'
                value={selectedSubroleId}
                label='Subrole'
                onChange={(event) => setSelectedSubroleId(event.target.value)}
              >
                <MenuItem value=''>All subroles</MenuItem>
                {subroles.map((subrole) => (
                  <MenuItem key={subrole.id} value={subrole.id}>{subrole.name}</MenuItem>
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
          <Button variant='contained' onClick={requestReport} disabled={(isTeacherReport && !selectedCenterIds.length) || loadingRows} sx={{ width: '100%', mb: 2 }}>
            View report
          </Button>
        ) : null}

        {error ? <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert> : null}
        {loadingRows && !reportLoaded ? (
          <Loader variant='section' label='Loading monthly attendance' />
        ) : null}

        {reportLoaded ? (
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
                  sx={{ position: 'sticky', left: 0, zIndex: 5, width: { xs: '100%', sm: 360 }, maxWidth: '100%', mb: 1.5, backgroundColor: 'background.paper' }}
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
                          '&:hover > td': { backgroundColor: '#f8fbff' },
                        }}
                      >
                        <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, width: 220, minWidth: 220, maxWidth: 220, overflow: 'hidden', backgroundColor: 'background.paper', fontWeight: 500 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <Typography component='span' title={row.name} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.name}
                            </Typography>
                            {!isTeacherReport && row.subroleName ? (
                              <Typography variant='caption' fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ({row.subroleName})
                              </Typography>
                            ) : null}
                          </Box>
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
                          {debouncedSearch ? `No ${singularLabel.toLowerCase()} matches that name.` : `No active ${staffLabel.toLowerCase()} found for this centre.`}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
                <TablePagination
                  component='div'
                  count={total}
                  page={page}
                  onPageChange={(_event, next) => setPage(next)}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={(event) => setPageSize(Number(event.target.value))}
                  rowsPerPageOptions={[25, 50, 100, 200]}
                  sx={{ position: 'sticky', left: 0, maxWidth: '100%' }}
                />
              </>
            )}
          </Box>
        ) : null}

        {!loadingRows && !reportLoaded && !error ? (
          <Alert severity='info'>Select {isTeacherReport ? 'one or more centres and a ' : 'a '}month, then click View report.</Alert>
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
        <Stack spacing={1} sx={{ py: 0.5, maxWidth: 'min(320px, calc(100vw - 48px))', overflowWrap: 'anywhere' }}>
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