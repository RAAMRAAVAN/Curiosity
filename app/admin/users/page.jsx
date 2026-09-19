'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Paper } from '@mui/material';
import ManageUsersPage from '../ManageUsers/ManageUsers';
import { useAdminAuth } from '../AdminAuthContext';

export default function AdminUsersRoutePage() {
  const router = useRouter();
  const { admin, loading } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState(null);

  const refreshUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setUsers(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (admin) refreshUsers();
  }, [admin]);

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
        <ManageUsersPage
          users={users}
          setUsers={setUsers}
          setLoading={() => {}}
          loading={false}
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
