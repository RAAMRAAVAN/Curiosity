'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Paper } from '@mui/material';
import ManageUsersPage from '../ManageUsers/ManageUsers';
import { useAdminAuth } from '../AdminAuthContext';
import Loader from '@/app/(components)/Loader';

const usersCache = new Map();
const usersRequests = new Map();

async function loadUsersForAdmin(adminId, { force = false } = {}) {
  const cached = usersCache.get(adminId);
  if (!force && cached && Date.now() - cached.loadedAt < 30000) return cached.users;

  const pendingRequest = usersRequests.get(adminId);
  if (pendingRequest) return pendingRequest;

  const request = (async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/admin/users/', { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Unable to load users.');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Unable to load users.');
      const users = Array.isArray(data.data) ? data.data : [];
      usersCache.set(adminId, { users, loadedAt: Date.now() });
      return users;
    } finally {
      window.clearTimeout(timeoutId);
    }
  })();

  usersRequests.set(adminId, request);
  try {
    return await request;
  } finally {
    if (usersRequests.get(adminId) === request) usersRequests.delete(adminId);
  }
}

export default function AdminUsersRoutePage() {
  const router = useRouter();
  const { admin, loading } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState(null);
  const requestedUserId = useRef(null);

  const refreshUsers = useCallback(async ({ force = true } = {}) => {
    const adminId = admin?.id;
    if (!adminId) return;

    setLoadingUsers(true);
    setLoadError('');

    try {
      setUsers(await loadUsersForAdmin(adminId, { force }));
    } catch (error) {
      if (error.name !== 'AbortError') console.error(error);
      setLoadError(error.name === 'AbortError'
        ? 'Loading users timed out. Please retry.'
        : error.message || 'Unable to load users.');
    } finally {
      setLoadedUserId(adminId);
      setLoadingUsers(false);
    }
  }, [admin?.id]);

  useEffect(() => {
    const userId = admin?.id;
    if (!userId || requestedUserId.current === userId) return;

    requestedUserId.current = userId;
    setUsers([]);
    setLoadedUserId(null);
    refreshUsers({ force: false });
  }, [admin?.id, refreshUsers]);

  if (loading) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (!admin) return null;
  if (loadingUsers && loadedUserId !== admin.id) return <Loader variant='page' label='Loading users...' />;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>
      <Paper sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: '0 20px 48px rgba(15, 23, 42, 0.08)' } }}>
        {loadError ? (
          <Alert
            severity='error'
            action={<Button color='inherit' size='small' onClick={refreshUsers} disabled={loadingUsers}>Retry</Button>}
            sx={{ mb: 2 }}
          >
            {loadError}
          </Alert>
        ) : null}
        <ManageUsersPage
          users={users}
          setUsers={setUsers}
          setLoading={() => {}}
          loading={loadingUsers}
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
