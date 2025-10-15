import React from 'react';
import type { IconProps } from '../types';

export const LoadingOHIFMark = (props: IconProps) => (
  <img
    src="/biedx.png"
    alt="Loading"
    className={`h-12 w-12 ${props.className || ''}`}
    style={{ width: '47px', height: '47px', ...props.style }}
    {...props}
  />
);

export default LoadingOHIFMark;
