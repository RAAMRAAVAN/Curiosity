'use client';

import { useEffect, useState } from 'react';
import { Backdrop, Box, CircularProgress, LinearProgress, Typography } from '@mui/material';

const initialStatus = { state: 'IDLE', total: 0, processed: 0, marked: 0, message: '' };

export default function AttendanceAutomationOverlay() {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch('/api/attendance/automation/status', { cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && result.success) setStatus(result.data || initialStatus);
      } catch {
        // A transient status request failure should not block the admin UI.
      }
    };

    void poll();
    const intervalId = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const running = status.state === 'RUNNING';
  const progress = status.total > 0 ? Math.min(100, (status.processed / status.total) * 100) : 0;

  return (
    <Backdrop
      open={running}
      role="dialog"
      aria-modal="true"
      aria-label="Daily attendance finalization in progress"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.preventDefault()}
      sx={{
        zIndex: 2147483647,
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 23, 49, 0.86)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Box sx={{ width: 'min(560px, calc(100vw - 32px))', color: '#fff', textAlign: 'center' }}>
        <CircularProgress size={58} thickness={4} sx={{ color: '#90caf9', mb: 3 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Finalizing daily attendance
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.78)', mb: 3 }}>
          Please wait while unmarked attendance is being marked absent. Other admin actions are temporarily paused.
        </Typography>
        <LinearProgress
          variant={status.total > 0 ? 'determinate' : 'indeterminate'}
          value={progress}
          sx={{ height: 8, borderRadius: 4, mb: 1.5, backgroundColor: 'rgba(255,255,255,0.18)', '& .MuiLinearProgress-bar': { backgroundColor: '#90caf9' } }}
        />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          {status.total > 0 ? `${status.processed.toLocaleString()} of ${status.total.toLocaleString()} students processed` : 'Preparing student records...'}
        </Typography>
        {status.marked > 0 ? (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>
            {status.marked.toLocaleString()} student(s) marked absent
          </Typography>
        ) : null}
      </Box>
    </Backdrop>
  );
}
