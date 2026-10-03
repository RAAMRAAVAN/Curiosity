'use client';

import { useCallback, useState } from 'react';
import { Alert, Box, Button, Paper } from '@mui/material';
import ManageUsersPage from '../ManageUsers/ManageUsers';
import { useAdminAuth } from '../AdminAuthContext';
import usePagedData from '../usePagedData';
import Loader from '@/app/(components)/Loader';

export default function AdminUsersRoutePage() {
  const { admin, loading } = useAdminAuth();
  const [message, setMessage] = useState(null);
  const paged = usePagedData({ endpoint: '/api/admin/users', enabled: Boolean(admin) });
  const { reload } = paged;

  const refreshUsers = useCallback(async () => { reload(); }, [reload]);

  if (loading) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (!admin) return null;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%', minWidth: 0 }}>
      <Paper sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' }, minWidth: 0 }}>
        {paged.error ? (
          <Alert
            severity='error'
            action={<Button color='inherit' size='small' onClick={reload} disabled={paged.loading}>Retry</Button>}
            sx={{ mb: 2 }}
          >
            {paged.error}
          </Alert>
        ) : null}
        <ManageUsersPage
          users={paged.rows}
          paged={paged}
          setUsers={() => {}}
          setLoading={() => {}}
          loading={paged.loading}
          refreshUsers={refreshUsers}
          setMessage={setMessage}
          message={message}
          role={admin?.role}
          permissions={admin?.permissions || []}
        />
      </Paper>
    </Box>
  );
}
