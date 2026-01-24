'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils'; 




interface QRCodeDisplayProps {
    value: string; 
    size?: number;
    className?: string;
    label?: string;
}

export default function QRCodeDisplay({ value, size = 200, className, label }: QRCodeDisplayProps) {
    return (
        <div className={cn("flex flex-col items-center gap-4 p-6 bg-white rounded-3xl", className)}>
            <div className="relative">
                {}
                <QRCodeSVG
                    value={value}
                    size={size}
                    level={"H"}
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                />

                {}
            </div>

            {label && (
                <div className="text-center">
                    <p className="text-black font-bold text-sm tracking-wider uppercase">{label}</p>
                </div>
            )}
        </div>
    );
}
