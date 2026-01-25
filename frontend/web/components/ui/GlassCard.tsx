'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    activeEffect?: boolean;
    onClick?: () => void;
}

export default function GlassCard({
    children,
    className,
    hoverEffect = false,
    activeEffect = true,
    onClick,
}: GlassCardProps) {
    return (
        <motion.div
            className={cn(
                isDark ? "glass rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden backdrop-blur-xl" : "bg-white/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-900/10 shadow-xl relative overflow-hidden",
                hoverEffect && "cursor-pointer group",
                className
            )}
            initial={false}
            whileHover={hoverEffect ? {
                scale: 1.02,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.6)",
                borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
                boxShadow: isDark ? "0 20px 40px -10px rgba(0, 0, 0, 0.4)" : "0 20px 40px -10px rgba(0, 0, 0, 0.2)"
            } : undefined}
            whileTap={activeEffect && hoverEffect ? { scale: 0.98 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={onClick}
        >
            { }
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            { }
            {hoverEffect && (
                <motion.div
                    className={cn(
                        "absolute inset-0 -skew-x-12 translate-x-[-100%]",
                        isDark ? "bg-white/5" : "bg-gray-900/5"
                    )}
                    variants={{
                        hover: { translateX: "200%" }
                    }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                />
            )}

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}
