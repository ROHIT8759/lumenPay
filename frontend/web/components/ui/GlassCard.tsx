'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    activeEffect?: boolean;
}

export default function GlassCard({
    children,
    className,
    hoverEffect = false,
    activeEffect = true,
    ...props
}: GlassCardProps) {
    return (
        <motion.div
            className={cn(
                "glass rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden backdrop-blur-xl",
                hoverEffect && "cursor-pointer group",
                className
            )}
            initial={false}
            whileHover={hoverEffect ? {
                scale: 1.02,
                backgroundColor: "rgba(255, 255, 255, 0.07)",
                borderColor: "rgba(255, 255, 255, 0.2)",
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.4)"
            } : undefined}
            whileTap={activeEffect && hoverEffect ? { scale: 0.98 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            {...props}
        >
            {}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            {}
            {hoverEffect && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%]"
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
