'use client';

import { useState } from 'react';
import { Box, Paper } from '@mui/material';
import ManageTeachersPage from '../ManageTeachers/ManageTeachers';
import { useAdminAuth } from '../AdminAuthContext';
import Loader from '@/app/(components)/Loader';

export default function AdminTeachersRoutePage() {
  const { admin, loading } = useAdminAuth();
  const [message, setMessage] = useState(null);

  if (loading || !admin) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%', minWidth: 0 }}>
      <Paper sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' }, minWidth: 0 }}>
        <ManageTeachersPage
          loading={false}
          setLoading={() => {}}
          message={message}
          setMessage={setMessage}
          setAdminView={() => {}}
          users={[]}
          role={admin?.role}
          permissions={admin?.permissions || []}
        />
      </Paper>
    </Box>
  );
}
