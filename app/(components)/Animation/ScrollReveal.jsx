'use client';

import { useEffect, useState, ReactNode } from 'react';
import { Box, Fade, Grow, Slide, SxProps, Theme } from '@mui/material';
import { useInView } from 'react-intersection-observer';

const ScrollReveal = ({
                        children,
                        animation = 'fade',
                        direction = 'up',
                        timeout = 1500,
                        threshold = 0.3,
                        sx,
                        ...rest
                      }) => {
  const { ref, inView } = useInView({
    threshold,
    triggerOnce: false,  // <-- key change
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(inView);   // <-- always update on visibility change
  }, [inView]);

  const transitionProps = { in: visible, timeout };

  if (animation === 'grow') {
    return (
        <div ref={ref} style={{ width: '100%' }}>
          <Grow {...transitionProps}>
            <Box
                {...rest}
                sx={{
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `transform ${timeout}ms ease-out`,
                  ...sx,
                }}
            >
              {children}
            </Box>
          </Grow>
        </div>
    );
  }

  return (
      <div ref={ref} style={{ width: '100%' }}>
        {animation === 'fade' && (
            <Fade {...transitionProps}>
              <Box {...rest} sx={sx}>
                {children}
              </Box>
            </Fade>
        )}
        {animation === 'slide' && (
            <Slide {...transitionProps} direction={direction}>
              <Box {...rest} sx={sx}>
                {children}
              </Box>
            </Slide>
        )}
      </div>
  );
};

export default ScrollReveal;
