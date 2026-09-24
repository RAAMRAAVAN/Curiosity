'use client';

import { Box, CircularProgress, Paper } from '@mui/material';
import AttendanceManager from './AttendanceManager';
import { useAdminAuth } from '../AdminAuthContext';

export default function AdminAttendanceRoutePage() {
  const { admin, loading } = useAdminAuth();

  if (loading || !admin) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eef4fb', p: 3 }}>
        <CircularProgress size={64} thickness={4} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <Paper sx={{ p: { xs: 0, sm: 0 }, borderRadius: { xs: 0, sm: 0 } }}>
        <AttendanceManager admin={admin} role={admin?.role} permissions={admin?.permissions || []} />
      </Paper>
    </Box>
  );
}
