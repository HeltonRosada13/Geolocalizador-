'use client';

import React from 'react';

interface MulticaixaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MulticaixaLogo: React.FC<MulticaixaLogoProps> = ({ size = 'md', className = '' }) => {
  const dimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 80, height: 80 },
  };

  const { width, height } = dimensions[size];

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100" height="100" rx="20" fill="#004FAC" />
        <path
          d="M20 30H80V40H20V30ZM20 45H80V55H20V45ZM20 60H80V70H20V60Z"
          fill="white"
        />
        <circle cx="80" cy="80" r="10" fill="#FACC15" />
      </svg>
    </div>
  );
};

