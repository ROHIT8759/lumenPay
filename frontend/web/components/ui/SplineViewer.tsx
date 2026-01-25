'use client';

import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-900" />,
});

interface SplineViewerProps {
  scene: string;
}

export default function SplineViewer({ scene }: SplineViewerProps) {
  return <div className="-translate-y-17"><Spline scene={scene} /></div>;
}
