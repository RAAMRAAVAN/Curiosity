'use client';

import { useParams, useRouter } from 'next/navigation';
import { Alert, Box, CircularProgress, Paper } from '@mui/material';
import AttendanceManager from '../AttendanceManager';
import SelfAttendance from '@/app/teacher/TeacherAttendance';
import { useAdminAuth } from '../../AdminAuthContext';

export default function AttendanceAudiencePage() {
  const { audience } = useParams();
  const router = useRouter();
  const { admin, loading } = useAdminAuth();

  if (loading || !admin) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eef4fb', p: 3 }}>
        <CircularProgress size={64} thickness={4} />
      </Box>
    );
  }

  if (audience === 'students') {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>
        <Paper sx={{ p: { xs: 0, sm: 0 }, borderRadius: { xs: 0, sm: 0 } }}>
          <AttendanceManager admin={admin} role={admin?.role} permissions={admin?.permissions || []} />
        </Paper>
      </Box>
    );
  }

  if (audience === 'teachers') {
    if (String(admin.role || '').toUpperCase() !== 'TEACHER') {
      return (
        <Box sx={{ width: '100%', p: 0 }}>
          <Alert severity="error">Teacher access is required to use this attendance page.</Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', minHeight: '100%', p: 0 }}>
        <SelfAttendance />
      </Box>
    );
  }

  if (audience === 'management') {
    if (String(admin.role || '').toUpperCase() !== 'MANAGEMENT') {
      return (
        <Box sx={{ width: '100%', p: 0 }}>
          <Alert severity="error">Management access is required to use this attendance page.</Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', minHeight: '100%', p: 0 }}>
        <SelfAttendance endpoint="/api/management/attendance/" />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 0 }}>
      <Alert severity="error">Attendance category not found.</Alert>
    </Box>
  );
}