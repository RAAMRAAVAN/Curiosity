'use client';

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { Box, Typography } from '@mui/material';

const LoaderActivityContext = createContext(null);
const subscribeToNoActivity = () => () => {};
const getNoActivitySnapshot = () => 0;

export function LoaderActivityProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    let activeCount = 0;
    const listeners = new Set();
    storeRef.current = {
      getSnapshot: () => activeCount,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      registerLoader(change) {
        const nextCount = Math.max(0, activeCount + change);
        if (nextCount === activeCount) return;
        activeCount = nextCount;
        listeners.forEach((listener) => listener());
      },
    };
  }

  return <LoaderActivityContext.Provider value={storeRef.current}>{children}</LoaderActivityContext.Provider>;
}

export function useLoaderActivity() {
  const store = useContext(LoaderActivityContext);
  return useSyncExternalStore(
    store?.subscribe || subscribeToNoActivity,
    store?.getSnapshot || getNoActivitySnapshot,
    getNoActivitySnapshot,
  );
}

export default function Loader({
  variant = 'section',
  size,
  label = '',
  sx,
  spinnerSx,
}) {
  const isInline = variant === 'inline';
  const isPanel = variant === 'page' || variant === 'overlay';
  const activityContext = useContext(LoaderActivityContext);
  const registerLoader = activityContext?.registerLoader;
  const tracksActivity = variant === 'page' || variant === 'section';

  useEffect(() => {
    if (!registerLoader || !tracksActivity) return undefined;

    registerLoader(1);
    return () => registerLoader(-1);
  }, [registerLoader, tracksActivity]);

  const visibleLabel = label || (isPanel ? 'Loading...' : '');
  const imageSize = size ?? (isInline ? 24 : 44);

  return (
    <Box
      component={isInline ? 'span' : 'div'}
      role='status'
      aria-live='polite'
      aria-label={visibleLabel || 'Loading'}
      aria-busy='true'
      sx={{
        ...(isPanel ? {
          position: variant === 'overlay' ? 'absolute' : 'fixed',
          inset: 0,
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          background: 'rgba(10, 14, 26, 0.5)',
          backdropFilter: 'blur(4px)',
        } : {
          display: isInline ? 'inline-flex' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: isInline ? 'row' : 'column',
          gap: visibleLabel ? 1.5 : 0,
          width: isInline ? 'auto' : '100%',
          minHeight: variant === 'section' ? '20vh' : undefined,
          py: variant === 'section' ? 4 : 0,
        }),
        ...sx,
      }}
    >
      {isPanel ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            px: 5,
            py: 4,
            minWidth: { xs: 200, sm: 260 },
            borderRadius: 4,
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.22)',
          }}
        >
          <Box
            component='img'
            src='/favicon.gif'
            alt=''
            sx={{
              width: { xs: 140, sm: 180 },
              height: { xs: 140, sm: 180 },
              objectFit: 'contain',
              borderRadius: 4,
              animation: 'pulse 1.2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.96)', opacity: 0.75 },
                '50%': { transform: 'scale(1.12)', opacity: 1 },
                '100%': { transform: 'scale(0.96)', opacity: 0.75 },
              },
              ...spinnerSx,
            }}
          />
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 20, sm: 26 }, color: '#1f2937', letterSpacing: 0.5 }}>
            {visibleLabel}
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            component='img'
            src='/favicon.gif'
            alt=''
            sx={{
              width: imageSize,
              height: imageSize,
              objectFit: 'contain',
              animation: 'pulse 1.2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.96)', opacity: 0.75 },
                '50%': { transform: 'scale(1.12)', opacity: 1 },
                '100%': { transform: 'scale(0.96)', opacity: 0.75 },
              },
              ...spinnerSx,
            }}
          />
          {visibleLabel ? <Typography variant='body2' color='text.secondary'>{visibleLabel}</Typography> : null}
        </>
      )}
    </Box>
  );
}