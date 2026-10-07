'use client';

import { Box, Paper, Typography } from '@mui/material';
import Loader from '@/app/(components)/Loader';
import AssessmentResultsDashboard from '../AssessmentResultsDashboard';
import { useAdminAuth } from '../AdminAuthContext';

export default function AssessmentResultsRoutePage() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (!admin) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%', minWidth: 0 }}>
      <Paper sx={{ p: { xs:1, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2, fontSize: { xs: '1.25rem', sm: '1.5rem' }, overflowWrap: 'anywhere' }}>Assessment Results - A</Typography>
        <Typography color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0', sm: '1rem' } }}>Review live submissions from students across subjects.</Typography>
        <AssessmentResultsDashboard assessmentId="" />
      </Paper>
    </Box>
  );
}
