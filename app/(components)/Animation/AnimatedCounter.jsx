'use client';

import React, { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { useInView } from 'react-intersection-observer';

const AnimatedCounter = ({
  end = 1000,
  duration = 2000,
  variant = 'h4',
  ...props
}) => {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  useEffect(() => {
    if (!inView) return;

    let start = 0;
    const increment = end / (duration / 16); // 60fps

    const step = () => {
      start += increment;
      if (start < end) {
        setCount(Math.floor(start));
        requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(step);
  }, [inView, end, duration]);

  return (
    <Typography ref={ref} variant={variant} {...props}>
      {count}
    </Typography>
  );
};

export default AnimatedCounter;
