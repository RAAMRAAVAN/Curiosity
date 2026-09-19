'use client';

import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import AssessmentResultsDashboard from '../AssessmentResultsDashboard';
import { useAdminAuth } from '../AdminAuthContext';

export default function AssessmentResultsRoutePage() {
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
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)' }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Assessment Results</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Review live submissions from students across subjects.</Typography>
        <AssessmentResultsDashboard assessmentId="" />
      </Paper>
    </Box>
  );
}
