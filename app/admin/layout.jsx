'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Menu } from '@mui/icons-material';
import AdminDrawyer from './AdminDrawyer';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';

const routeValues = {
  users: '/admin/users',
  classes: '/admin/classes',
  teachers: '/admin/teachers',
  centers: '/admin/centers',
  students: '/admin/students',
  attendance: '/admin/attendance',
  roles: '/admin/roles',
  'reset-password': '/admin/reset-password',
  assessments: '/admin/view_assessments',
  'assessments-3-16': '/admin/assessments-3-16',
  results: '/admin/assessment-results',
  'results-3-16': '/admin/assessment-results-3-16',
};

const getActiveView = (pathname) => {
  const normalized = (pathname || '').replace(/\/+$/, '');
  if (!normalized || normalized === '/admin') return 'users';

  const match = Object.entries(routeValues).find(([, route]) => {
    const normalizedRoute = (route || '').replace(/\/+$/, '');
    return normalized === normalizedRoute || normalized.startsWith(`${normalizedRoute}/`);
  });

  if (match) return match[0].replace('-upper', '');

  const lastSegment = normalized.split('/').filter(Boolean).slice(-1)[0];
  return lastSegment || 'users';
};

function AdminLayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { admin, loading } = useAdminAuth();
  const [drawerOpen, setDrawerOpen] = useState(true);

  const activeView = useMemo(() => getActiveView(pathname), [pathname]);

  const handleNavigation = (value) => {
    const route = routeValues[value] || '/admin';
    if (route !== pathname) {
      router.push(route);
    }

    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eef4fb', p: 3 }}>
        <CircularProgress size={64} thickness={4} />
      </Box>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', overflowX: 'hidden', bgcolor: '#f5f8ff' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          backgroundColor: '#fff',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          position: { xs: 'sticky', md: 'relative' },
          top: 0,
          zIndex: 100,
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 18, md: 20 }, flex: 1 }}>
          {admin.customRole?.name || admin.customRoleName || admin.role || 'Admin'}'s Panel
        </Typography>

        {(isMobile || !drawerOpen) && (
          <Box
            component="button"
            type="button"
            onClick={() => setDrawerOpen(true)}
            sx={{
              border: '1px solid rgba(15, 23, 42, 0.12)',
              background: '#fff',
              borderRadius: 2,
              px: 1.5,
              py: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              cursor: 'pointer',
              color: 'text.primary',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Menu fontSize="small" />
            Menu
          </Box>
        )}
      </Box>

      <AdminDrawyer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        adminView={activeView}
        setAdminView={handleNavigation}
        role={admin?.role}
        permissions={admin?.permissions || []}
        customRolePermissions={admin?.customRole?.permissions || []}
        userName={admin?.name}
        centerName={admin?.centerName}
        customRoleName={admin?.customRole?.name || admin?.customRoleName || null}
      />

      <Box
        sx={{
          ml: { xs: 0, md: drawerOpen ? 44 : 0 },
          transition: 'margin-left 0.3s ease-in-out',
          pt: 0,
          pb: { xs: 1, sm: 2, md: 3 },
          px: { xs: 2, sm: 3, md: 4 },
          boxSizing: 'border-box',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}
