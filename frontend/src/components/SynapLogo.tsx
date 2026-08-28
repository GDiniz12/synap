'use client';

import React from 'react';
import Image from 'next/image';

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
        src="/synap-logo-unique.png"
        alt="Synap Logo"
        width={size * 2}
        height={size * 2}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        className="dark:invert-0 invert transition-opacity"
        priority={priority}
      />
    </div>
  );
}
