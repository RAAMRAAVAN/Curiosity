'use client';

import { Box, Paper } from '@mui/material';
import AdminAssessmentsPage from '../AdminAssessmentsPage';
import { useAdminAuth } from '../AdminAuthContext';
import Loader from '@/app/(components)/Loader';

export default function ViewAssessmentsPage() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (!admin) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)' }}>
        <AdminAssessmentsPage />
      </Paper>
    </Box>
  );
}
