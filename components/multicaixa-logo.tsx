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
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Background rounded square */}
        <rect width="100" height="100" rx="20" fill="#002244" />
        
        {/* Stylized 'M' shape - Orange part */}
        <path
          d="M25 75V35L50 55L75 35V75"
          stroke="#F58220"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Accent dot or line to make it look more like the real logo */}
        <circle cx="50" cy="30" r="6" fill="#F58220" />
      </svg>
      {size === 'lg' && (
        <span className="mt-2 text-[#002244] font-black text-sm tracking-tighter uppercase">
          Multicaixa
        </span>
      )}
    </div>
  );
};
