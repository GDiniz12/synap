'use client';

import React, { useState } from 'react';

interface WorkspaceIconProps {
  icone?: string | null;
  nome: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
  emojiClassName?: string;
}

export function getWorkspaceInitials(name: string): string {
  if (!name) return 'WS';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function isImageIconUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  );
}

export default function WorkspaceIcon({
  icone,
  nome,
  size,
  className = 'w-full h-full',
  fallbackClassName = '',
  emojiClassName = '',
}: WorkspaceIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [icone]);

  const isImage = isImageIconUrl(icone);

  if (icone && isImage && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icone}
        alt={nome || 'Workspace Icon'}
        className={`${className} object-cover select-none pointer-events-none`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (icone && !isImage) {
    return (
      <span
        className={`flex items-center justify-center select-none font-normal leading-none ${className} ${emojiClassName}`}
        style={size ? { fontSize: `${Math.round(size * 0.55)}px` } : undefined}
      >
        {icone}
      </span>
    );
  }

  return (
    <span
      className={`flex items-center justify-center font-bold font-mono tracking-wider select-none ${className} ${fallbackClassName}`}
      style={size ? { fontSize: `${Math.round(size * 0.38)}px` } : undefined}
    >
      {getWorkspaceInitials(nome)}
    </span>
  );
}
