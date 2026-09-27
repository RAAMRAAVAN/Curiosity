'use client';

import { Alert, Box } from '@mui/material';
import TeacherAttendance from '@/app/teacher/TeacherAttendance';
import Loader from '@/app/(components)/Loader';
import { useAdminAuth } from '../../AdminAuthContext';

export default function TeacherAttendanceRoutePage() {
  const { admin, loading } = useAdminAuth();

  if (loading || !admin) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (String(admin.role || '').toUpperCase() !== 'TEACHER') {
    return (
      <Box sx={{ width: '100%', p: 0 }}>
        <Alert severity="error">Teacher access is required to use this attendance page.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100%', p: 0 }}>
      <TeacherAttendance />
    </Box>
  );
}