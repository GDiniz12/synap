'use client';

import React from 'react';
import Image from 'next/image';
import synapLogoImg from '../../public/synap-logo-unique.png';

interface SynapLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export default function SynapLogo({
  size = 28,
  className = '',
  priority = false,
}: SynapLogoProps) {
  return (
    <div 
      style={{ width: `${size}px`, height: `${size}px` }} 
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <Image
        src={synapLogoImg}
        alt="Synap Logo"
        width={size * 2}
        height={size * 2}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        className="synap-logo-img transition-[filter,opacity] duration-200"
        priority={priority}
        unoptimized
      />
    </div>
  );
}
