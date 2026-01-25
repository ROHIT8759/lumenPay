/**
 * RWA Layout
 * 
 * Layout wrapper for all RWA-related pages.
 */

import React from 'react';

export default function RWALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
