import React from 'react';
import logoUrl from './logo.png';

/**
 * BrandLogo — Centralized logo loader for LIGHT by DIAMOND.
 *
 * The product logo is bundled from this directory so it works consistently in
 * development, production builds, and native packaging.
 */
interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'mini' | 'xl' | 'custom';
  showTagline?: boolean;
  iconOnly?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
  iconOnly = false,
}) => {
  const dimensionClasses = {
    mini: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    custom: 'w-full h-full',
  }[size];

  const logoMark = (
    <div
      className={`relative flex items-center justify-center rounded-lg overflow-hidden shrink-0 ${dimensionClasses} transition-transform`}
    >
      <img
        src={logoUrl}
        alt="LIGHT by DIAMOND"
        className="h-full w-full object-contain"
      />
    </div>
  );

  if (iconOnly) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{logoMark}</div>;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {logoMark}

      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-sm">
            LIGHT
          </span>
          <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400">
            by DIAMOND
          </span>
        </div>
        {showTagline && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Your friends. Your game. One click away.
          </p>
        )}
      </div>
    </div>
  );
};
