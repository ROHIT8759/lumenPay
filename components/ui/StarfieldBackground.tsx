'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';


const mousePosition = { x: 0, y: 0 };

function WarpStars({ count = 800 }) {
    const mesh = useRef<THREE.Points>(null!);
    const { size } = useThree();

    const CENTER_SPAWN_RADIUS = 1.0;
    const MAX_DISTANCE = 25;
    const REPEL_RADIUS = 2.5;
    const REPEL_STRENGTH = 8;

    const { positions, velocities, sizes } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        const siz = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r1 = Math.random();
            const r2 = Math.random();
            const r3 = Math.random();
            const r4 = Math.random();
            const r5 = Math.random();

            const theta = r1 * Math.PI * 2;
            const phi = Math.acos(2 * r2 - 1);
            const distance = CENTER_SPAWN_RADIUS + r3 * (MAX_DISTANCE - CENTER_SPAWN_RADIUS);

            pos[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = distance * Math.cos(phi);

            const speed = 0.3 + r4 * 0.5;
            vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
            vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
            vel[i * 3 + 2] = Math.cos(phi) * speed;

            siz[i] = 0.005 + r5 * 0.008;
        }
        return { positions: pos, velocities: vel, sizes: siz };
    }, [count]);

    // Use actual refs for values that we mutate in useFrame to satisfy the immutability rule
    const currentVelocities = useRef(velocities);
    useEffect(() => {
        currentVelocities.current = velocities;
    }, [velocities]);

    useFrame((_state, delta) => {
        if (!mesh.current) return;

        const pos = mesh.current.geometry.attributes.position.array as Float32Array;
        const sizeAttr = mesh.current.geometry.attributes.size?.array as Float32Array;
        const vels = currentVelocities.current;

        // Mouse to World 
        const mouseX = (mousePosition.x / size.width) * 2 - 1;
        const mouseY = -(mousePosition.y / size.height) * 2 + 1;

        // Approximate mouse position in 3D space
        const mouseVec = new THREE.Vector3(mouseX * 8, mouseY * 5, 0);

        for (let i = 0; i < count; i++) {
            // Update Position
            pos[i * 3] += vels[i * 3] * delta;
            pos[i * 3 + 1] += vels[i * 3 + 1] * delta;
            pos[i * 3 + 2] += vels[i * 3 + 2] * delta;

            const x = pos[i * 3];
            const y = pos[i * 3 + 1];
            const z = pos[i * 3 + 2];

            // Repel from Mouse
            const dx = x - mouseVec.x;
            const dy = y - mouseVec.y;
            const distFromMouse = Math.sqrt(dx * dx + dy * dy);

            if (distFromMouse < REPEL_RADIUS && distFromMouse > 0.01) {
                const repelForce = (1 - distFromMouse / REPEL_RADIUS) * REPEL_STRENGTH * delta;
                const nx = dx / distFromMouse;
                const ny = dy / distFromMouse;
                pos[i * 3] += nx * repelForce;
                pos[i * 3 + 1] += ny * repelForce;
            }

            // Wrap logic
            const distance = Math.sqrt(x * x + y * y + z * z);

            if (distance > MAX_DISTANCE) {
                const r1 = Math.random();
                const r2 = Math.random();
                const r3 = Math.random();
                const r4 = Math.random();

                const theta = r1 * Math.PI * 2;
                const phi = Math.acos(2 * r2 - 1);
                const newDist = CENTER_SPAWN_RADIUS + r3 * 0.3;

                pos[i * 3] = newDist * Math.sin(phi) * Math.cos(theta);
                pos[i * 3 + 1] = newDist * Math.sin(phi) * Math.sin(theta);
                pos[i * 3 + 2] = newDist * Math.cos(phi);

                const speed = 0.3 + r4 * 0.5;
                vels[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
                vels[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
                vels[i * 3 + 2] = Math.cos(phi) * speed;
            }

            if (sizeAttr) {
                sizeAttr[i] = sizes[i] * (1 + (distance - CENTER_SPAWN_RADIUS) * 0.01);
            }
        }

        mesh.current.geometry.attributes.position.needsUpdate = true;
        if (mesh.current.geometry.attributes.size) {
            mesh.current.geometry.attributes.size.needsUpdate = true;
        }
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-size"
                    count={count}
                    array={sizes}
                    itemSize={1}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.008}
                color="#ffffff"
                transparent
                opacity={0.9}
                sizeAttenuation={true}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

export default function StarfieldBackground() {
    const [cursorPos, setCursorPos] = useState({ x: -1000, y: -1000 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePosition.x = e.clientX;
            mousePosition.y = e.clientY;
            setCursorPos({ x: e.clientX, y: e.clientY });
        };

        const handleMouseLeave = () => {
            mousePosition.x = -10000;
            mousePosition.y = -10000;
            setCursorPos({ x: -1000, y: -1000 });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] bg-black pointer-events-none">
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <WarpStars />
            </Canvas>

            { }
            <div
                className="pointer-events-none fixed transition-opacity duration-150"
                style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    transform: 'translate(-50%, -50%)',
                    opacity: cursorPos.x > 0 ? 1 : 0,
                }}
            >
                { }
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '120px',
                        height: '120px',
                        left: '-60px',
                        top: '-60px',
                        background: 'radial-gradient(circle, rgba(255,165,0,0.15) 0%, rgba(255,100,0,0.08) 40%, transparent 70%)',
                        filter: 'blur(8px)',
                    }}
                />
                { }
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '60px',
                        height: '60px',
                        left: '-30px',
                        top: '-30px',
                        background: 'radial-gradient(circle, rgba(255,200,100,0.25) 0%, rgba(255,150,50,0.1) 50%, transparent 70%)',
                        filter: 'blur(4px)',
                    }}
                />
                { }
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '20px',
                        height: '20px',
                        left: '-10px',
                        top: '-10px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,200,100,0.2) 50%, transparent 70%)',
                        filter: 'blur(2px)',
                    }}
                />
            </div>
        </div>
    );
}
