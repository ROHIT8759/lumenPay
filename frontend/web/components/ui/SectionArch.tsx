'use client';

interface SectionArchProps {
  topColor: string;
  bottomColor: string;
}

export default function SectionArch({ topColor, bottomColor }: SectionArchProps) {
  return (
    <div className="relative w-full h-24 -mb-1" style={{ backgroundColor: topColor }}>
      <svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
          fill={bottomColor}
        />
      </svg>
    </div>
  );
}
