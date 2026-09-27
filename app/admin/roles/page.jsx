'use client';

import { Box, Paper } from '@mui/material';
import ManageRoles from '../ManageRoles/ManageRoles';
import { useAdminAuth } from '../AdminAuthContext';
import Loader from '@/app/(components)/Loader';

export default function AdminRolesRoutePage() {
  const { admin, loading } = useAdminAuth();

  if (loading || !admin) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <Paper sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' } }}>
        <ManageRoles setMessage={() => {}} role={admin?.role} permissions={admin?.permissions || []} />
      </Paper>
    </Box>
  );
}
