'use client';

import React from 'react';
import TesseractLogo from './TesseractLogo';

interface SynapLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export default function SynapLogo({
  size = 28,
  className = '',
}: SynapLogoProps) {
  return <TesseractLogo size={size} className={className} />;
}

