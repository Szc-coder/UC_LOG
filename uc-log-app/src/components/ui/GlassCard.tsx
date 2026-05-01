import type { ReactNode, HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: GlassCardProps) {
  const variantStyles = {
    default: 'bg-white/50 backdrop-blur-2xl border border-white/60 shadow-lg shadow-black/5',
    elevated: 'bg-white/60 backdrop-blur-2xl border border-white/70 shadow-xl shadow-black/8',
    flat: 'bg-white/40 backdrop-blur-xl border border-white/50',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        rounded-2xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
