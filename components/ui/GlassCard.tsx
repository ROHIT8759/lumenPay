import React from 'react';

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export default function GlassCard({ className, children }: Props) {
  return (
    <div
      className={className}
      style={{
        backdropFilter: 'blur(8px)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}
