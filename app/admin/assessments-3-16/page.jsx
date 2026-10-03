'use client';

import { Box, Paper } from '@mui/material';
import Loader from '@/app/(components)/Loader';
import AdminAssessments316Page from '../AdminAssessments316Page';
import { useAdminAuth } from '../AdminAuthContext';

export default function Assessments316RoutePage() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (!admin) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%', minWidth: 0 }}>
      <Paper sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' }, overflow: 'hidden' }}>
        <AdminAssessments316Page
          role={admin?.role}
          permissions={admin?.permissions || []}
        />
      </Paper>
    </Box>
  );
}
