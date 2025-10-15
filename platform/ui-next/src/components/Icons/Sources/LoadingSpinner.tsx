import React from 'react';
import type { IconProps } from '../types';

export const LoadingSpinner = (props: IconProps) => (
  <img
    src="/biedx.png"
    alt="Loading"
    className={`h-5 w-5 animate-spin ${props.className || ''}`}
    style={{ width: '24px', height: '24px', ...props.style }}
    {...props}
  />
);

export default LoadingSpinner;
