import React from 'react';

interface ApexLogoProps {
  variant?: 'full' | 'icon' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ApexLogo: React.FC<ApexLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  const iconSizeMap = {
    sm: { w: 28, h: 28, text: 'text-base', sub: 'text-[9px]' },
    md: { w: 38, h: 38, text: 'text-lg', sub: 'text-[10px]' },
    lg: { w: 48, h: 48, text: 'text-2xl', sub: 'text-xs' },
    xl: { w: 64, h: 64, text: 'text-3xl', sub: 'text-sm' },
  };

  const { w, h, text, sub } = iconSizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic Vector Emblem */}
      <div 
        style={{ width: w, height: h }}
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 group hover:border-cyan-400/50 transition-all duration-300"
      >
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full p-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="apexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="telemetryGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>

          {/* Stylized A Frame */}
          <path
            d="M32 10 L48 50 L40 50 L35 37 L29 37 L24 50 L16 50 Z"
            fill="url(#apexGrad)"
          />
          <path d="M32 21 L37.5 33 L26.5 33 Z" fill="#0b1120" />

          {/* Aerodynamic Speed Arc */}
          <path
            d="M12 40 Q 28 26 52 24"
            stroke="url(#telemetryGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Telemetry Nodes */}
          <circle cx="28" cy="30" r="2.2" fill="#22d3ee" />
          <circle cx="44" cy="25" r="1.8" fill="#38bdf8" />
          <circle cx="52" cy="24" r="2.5" fill="#4ade80" />
        </svg>

        {/* Ambient Pulsing Glow Dot */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
      </div>

      {/* Typography Lockup */}
      {variant !== 'icon' && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-display font-extrabold tracking-wider text-white ${text}`}>
              APEX
            </span>
            <span className={`font-display font-black tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent ${text}`}>
              VMS
            </span>
          </div>
          <span className={`font-medium tracking-widest uppercase text-slate-400 ${sub}`}>
            Enterprise Fleet OS
          </span>
        </div>
      )}
    </div>
  );
};
