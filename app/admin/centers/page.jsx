'use client';

import { Box, CircularProgress, Paper } from '@mui/material';
import ManageCenters from '../ManageCenters/ManageCenters';
import { useAdminAuth } from '../AdminAuthContext';

export default function AdminCentersRoutePage() {
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
      <Paper sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' } }}>
        <ManageCenters setMessage={() => {}} role={admin?.role} permissions={admin?.permissions || []} />
      </Paper>
    </Box>
  );
}
