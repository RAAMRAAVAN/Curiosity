'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Backdrop, Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Menu } from '@mui/icons-material';
import AdminDrawyer from './AdminDrawyer';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';
import Loader, { LoaderActivityProvider } from '@/app/(components)/Loader';
import PortalTheme from '@/app/(components)/PortalTheme';

const routeValues = {
  users: '/admin/users',
  classes: '/admin/classes',
  teachers: '/admin/teachers',
  centers: '/admin/centers',
  students: '/admin/students',
  'student-attendance': '/admin/attendance/students',
  'student-monthly-attendance': '/admin/attendance/monthly',
  'management-monthly-attendance': '/admin/attendance/management/monthly',
  'teacher-monthly-attendance': '/admin/attendance/teachers/monthly',
  'teacher-attendance': '/admin/attendance/teachers',
  'management-attendance': '/admin/attendance/management',
  attendance: '/admin/attendance',
  roles: '/admin/roles',
  'reset-password': '/admin/reset-password',
  assessments: '/admin/view_assessments',
  'assessments-3-16': '/admin/assessments-3-16',
  results: '/admin/assessment-results',
  'results-3-16': '/admin/assessment-results-3-16',
  'asset-categories': '/admin/asset-management/categories',
  'asset-items': '/admin/asset-management/items',
  'asset-list': '/admin/asset-management/assets',
  'asset-transfer': '/admin/asset-management/transfers',
  'asset-receive': '/admin/asset-management/receive',
  'asset-tracking': '/admin/asset-management/tracking',
  'asset-reports': '/admin/asset-management/reports',
};

const monthlyAttendanceViews = [
  'student-monthly-attendance',
  'management-monthly-attendance',
  'teacher-monthly-attendance',
];

const activeViewTitles = {
  users: 'Manage Users',
  classes: 'Manage Classes',
  teachers: 'Manage Teachers',
  centers: 'Manage Centers',
  students: 'Manage Students',
  roles: 'Manage Roles',
  'reset-password': 'Reset Password',
  assessments: 'Assessment Module',
  'assessments-3-16': 'Assessment Module',
  results: 'Assessment Module',
  'results-3-16': 'Assessment Module',
  attendance: 'Attendance',
  'student-attendance': 'Attendance',
  'student-monthly-attendance': 'Attendance',
  'management-monthly-attendance': 'Attendance',
  'teacher-monthly-attendance': 'Attendance',
  'teacher-attendance': 'Attendance',
  'management-attendance': 'Attendance',
  'asset-categories': 'Asset Management',
  'asset-items': 'Asset Management',
  'asset-list': 'Asset Management',
  'asset-transfer': 'Asset Management',
  'asset-receive': 'Asset Management',
  'asset-tracking': 'Asset Management',
  'asset-reports': 'Asset Management',
};

const normalizeRoutePath = (path) => (path || '').replace(/\/+$/, '') || '/';

function NavigationReadyWatcher({ pathname, targetPath, pending, isNavigating, onReady }) {
  useEffect(() => {
    if (!pending || !targetPath || isNavigating) return undefined;
    if (normalizeRoutePath(pathname) !== normalizeRoutePath(targetPath)) return undefined;

    const frame = window.requestAnimationFrame(onReady);
    return () => window.cancelAnimationFrame(frame);
  }, [isNavigating, onReady, pathname, pending, targetPath]);

  return null;
}

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
  const [isNavigating, startNavigation] = useTransition();
  const [navigationPending, setNavigationPending] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  const activeView = useMemo(() => getActiveView(pathname), [pathname]);

  const finishNavigation = useCallback(() => {
    setNavigationPending(false);
    setNavigationTarget(null);
  }, []);

  const handleNavigation = (value) => {
    const route = routeValues[value] || '/admin';
    if (normalizeRoutePath(route) !== normalizeRoutePath(pathname)) {
      setNavigationTarget(route);
      setNavigationPending(true);
      startNavigation(() => {
        router.push(route, { scroll: false });
      });
    }

    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  if (loading) {
    return <Loader variant='page' size={64} thickness={4} sx={{ bgcolor: '#eef4fb', p: 3 }} />;
  }

  if (!admin) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'clip', bgcolor: '#f5f8ff' }}>
      {!drawerOpen?<><Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          backgroundColor: '#082b57',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          position: { xs: 'sticky', md: 'relative' },
          top: 0,
          zIndex: 100,
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 18, md: 20 }, flex: 1 }} color="#fff">
          {activeViewTitles[activeView] || 'Admin Panel'}
        </Typography>

        {(isMobile || !drawerOpen) && (
          <Box
            component="button"
            type="button"
            onClick={() => setDrawerOpen(true)}
            sx={{
              border: '1px solid rgba(15, 23, 42, 0.12)',
              background: '#082b57',
              borderRadius: 2,
              px: 1.5,
              py: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Menu fontSize="small" />
            Menu
          </Box>
        )}
      </Box></>:null}

      <AdminDrawyer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        adminView={activeView}
        setAdminView={handleNavigation}
        onRouteNavigate={handleNavigation}
        role={admin?.role}
        permissions={admin?.permissions || []}
        customRolePermissions={admin?.customRole?.permissions || []}
        userName={admin?.name}
        centerName={admin?.centerName}
        customRoleName={admin?.customRole?.name || admin?.customRoleName || null}
      />

      <Box
        sx={{
          position: 'relative',
          ml: { xs: 0, md: drawerOpen ? 40 : 0 },
          transition: 'margin-left 0.3s ease-in-out',
          pt: 0,
          pb: { xs: 1, sm: 2, md: 3 },
          px: { xs: ['attendance', 'student-attendance', 'results', 'results-3-16', 'users', 'classes', 'teachers', 'centers', 'students', 'roles', 'assessments', 'assessments-3-16'].includes(activeView) || monthlyAttendanceViews.includes(activeView) ? 0 : 2, sm: monthlyAttendanceViews.includes(activeView) ? 0 : 3, md: 0 },
          pr: { xs: ['attendance', 'student-attendance', 'results', 'results-3-16', 'users', 'classes', 'teachers', 'centers', 'students', 'roles', 'assessments', 'assessments-3-16'].includes(activeView) || monthlyAttendanceViews.includes(activeView) ? 0 : 2, sm: monthlyAttendanceViews.includes(activeView) ? 0 : 3, md: 0 },
          boxSizing: 'border-box',
          minWidth: 0,
          maxWidth: '100%',
          height: monthlyAttendanceViews.includes(activeView) && !isMobile
            ? (drawerOpen ? '100dvh' : 'calc(100dvh - 73px)')
            : undefined,
          minHeight: monthlyAttendanceViews.includes(activeView)
            ? (isMobile
              ? (drawerOpen ? '100dvh' : 'calc(100dvh - 73px)')
              : (drawerOpen ? '100dvh' : 'calc(100dvh - 73px)'))
            : activeView === 'results' ? 'auto' : 'calc(100vh - 64px)',
          overflow: monthlyAttendanceViews.includes(activeView) && !isMobile ? 'hidden' : undefined,
        }}
      >
        {children}
      </Box>

      <Backdrop
        open={navigationPending || isNavigating}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 9999,
          backgroundColor: 'transparent',
        }}
      >
        <Loader variant='overlay' label='Loading...' />
      </Backdrop>
      <NavigationReadyWatcher
        pathname={pathname}
        targetPath={navigationTarget}
        pending={navigationPending}
        isNavigating={isNavigating}
        onReady={finishNavigation}
      />
    </Box>
  );
}

export default function AdminLayout({ children }) {
  return (
    <PortalTheme>
    <AdminAuthProvider>
      <LoaderActivityProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </LoaderActivityProvider>
    </AdminAuthProvider>
    </PortalTheme>
  );
}
