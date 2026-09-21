'use client';

import { Box, CircularProgress, Paper } from '@mui/material';
import AdminAssessments316Page from '../AdminAssessments316Page';
import { useAdminAuth } from '../AdminAuthContext';

export default function Assessments316RoutePage() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#eef4fb',
          p: 3,
        }}
      >
        <CircularProgress size={64} thickness={4} />
      </Box>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: { xs: 'calc(100% + 32px)', sm: '100%' }, ml: { xs: -2, sm: 'auto' } }}>
      <Paper sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' } }}>
        <AdminAssessments316Page
          role={admin?.role}
          permissions={admin?.permissions || []}
        />
      </Paper>
    </Box>
  );
}
