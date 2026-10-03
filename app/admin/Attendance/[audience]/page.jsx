'use client';

import { useParams, useRouter } from 'next/navigation';
import { Alert, Box, Paper } from '@mui/material';
import AttendanceManager from '../AttendanceManager';
import SelfAttendance from '@/app/teacher/TeacherAttendance';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../../AdminAuthContext';

function hasAttendancePermission(admin, permission) {
  if (String(admin?.role || '').toUpperCase() === 'ADMIN') return true;
  const granted = Array.isArray(admin?.permissions)
    ? admin.permissions.map((item) => String(item || '').toLowerCase())
    : [];
  return granted.includes('*')
    || (granted.includes('attendance.view') && [
      'attendance.students.view',
      'attendance.teacher.self.view',
      'attendance.management.self.view',
    ].includes(permission))
    || granted.includes(permission)
    || granted.some((item) => item.endsWith('.*') && permission.startsWith(`${item.slice(0, -2)}.`));
}

export default function AttendanceAudiencePage() {
  const { audience } = useParams();
  const router = useRouter();
  const { admin, loading } = useAdminAuth();

  if (loading || !admin) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (audience === 'students') {
    if (!hasAttendancePermission(admin, 'attendance.students.view')) {
      return <Box sx={{ width: '100%', p: 0 }}><Alert severity="error">You are not authorized to view student attendance.</Alert></Box>;
    }

    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%', minWidth: 0 }}>
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

    if (!hasAttendancePermission(admin, 'attendance.teacher.self.view')) {
      return <Box sx={{ width: '100%', p: 0 }}><Alert severity="error">You are not authorized to view your attendance.</Alert></Box>;
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

    if (!hasAttendancePermission(admin, 'attendance.management.self.view')) {
      return <Box sx={{ width: '100%', p: 0 }}><Alert severity="error">You are not authorized to view your attendance.</Alert></Box>;
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