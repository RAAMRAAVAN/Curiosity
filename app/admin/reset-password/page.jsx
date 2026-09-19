'use client';

import { Box, CircularProgress, Paper } from '@mui/material';
import ResetPassword from '../ResetPassword';
import { useAdminAuth } from '../AdminAuthContext';

export default function AdminResetPasswordRoutePage() {
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
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)' }}>
        <ResetPassword />
      </Paper>
    </Box>
  );
}
