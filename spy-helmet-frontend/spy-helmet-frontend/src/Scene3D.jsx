import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float, Trail } from '@react-three/drei';
import * as THREE from 'three';

// ------------------------------------------------------------------
// 🫀 PROCEDURAL HEART (Particle System)
// ------------------------------------------------------------------
function HeartHologram({ heartRate }) {
    const points = useRef();

    // Create a heart shape using particles
    const particleCount = 3000;
    const positions = useMemo(() => {
        const pos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            // Random parametric loop for heart-like cloud
            const t = Math.random() * Math.PI * 2;
            const u = Math.random() * Math.PI; // slice

            // Heart formula approximation (or just a sphere for stability, let's try a distorted sphere)
            // x = 16sin^3(t)
            // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
            // z = varied depth

            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            const z = (Math.random() - 0.5) * 10; // Thickness

            // Scale down
            pos[i * 3] = x * 0.1;
            pos[i * 3 + 1] = y * 0.1;
            pos[i * 3 + 2] = z * 0.1;
        }
        return pos;
    }, []);

    useFrame((state) => {
        if (!points.current) return;
        const time = state.clock.getElapsedTime();
        // Beat logic: BPM -> Frequency
        const bps = (heartRate || 75) / 60;
        const beat = Math.sin(time * bps * Math.PI * 2) * 0.1 + 1;

        points.current.scale.set(beat, beat, beat);
        points.current.rotation.y += 0.005;
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#ef4444" // Red-500
                transparent
                opacity={0.8}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// ------------------------------------------------------------------
// 🧘 HOLOGRAPHIC BODY (Geomtric Primitives)
// ------------------------------------------------------------------
function BodyHologram({ temp }) {
    // Color generic based on temp: <37 = Blue, >37.5 = Red
    const color = temp > 37.5 ? "#ef4444" : temp < 36.0 ? "#3b82f6" : "#fbbf24";

    return (
        <group position={[2.5, 0, 0]} scale={0.8}>
            {/* Head */}
            <mesh position={[0, 1.6, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.5} />
            </mesh>
            {/* Torso */}
            <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.3, 0.2, 1.2, 16]} />
                <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.2} />
            </mesh>
            {/* Arms */}
            <mesh position={[-0.45, 0.9, 0]} rotation={[0, 0, 0.2]}>
                <cylinderGeometry args={[0.08, 0.06, 1, 8]} />
                <meshStandardMaterial color={color} wireframe />
            </mesh>
            <mesh position={[0.45, 0.9, 0]} rotation={[0, 0, -0.2]}>
                <cylinderGeometry args={[0.08, 0.06, 1, 8]} />
                <meshStandardMaterial color={color} wireframe />
            </mesh>
            {/* Legs */}
            <mesh position={[-0.2, -0.4, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.08, 1.2, 8]} />
                <meshStandardMaterial color={color} wireframe />
            </mesh>
            <mesh position={[0.2, -0.4, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.08, 1.2, 8]} />
                <meshStandardMaterial color={color} wireframe />
            </mesh>

            <Text position={[0, 2.2, 0]} fontSize={0.2} color="white">
                TEMP: {temp}°C
            </Text>
        </group>
    );
}

// ------------------------------------------------------------------
// 🧪 DATA STREAM LINES
// ------------------------------------------------------------------
function DataStream({ position, color }) {
    // A simple trail/line effect to signify data connection
    return (
        <mesh position={position}>
            <boxGeometry args={[0.02, 3, 0.02]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
    )
}


export default function Scene3D({ heartRate, bodyTemp }) {
    return (
        <div className="absolute inset-0 z-0">
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
                <fog attach="fog" args={['#000000', 5, 20]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                {/* Central Stage */}
                <group position={[0, 0, 0]}>

                    {/* Left: Heart */}
                    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                        <group position={[-2.5, 0, 0]}>
                            <HeartHologram heartRate={parseFloat(heartRate) || 75} />
                            <Text position={[0, -2, 0]} fontSize={0.25} color="#ef4444" anchorX="center">
                                HEART RATE: {heartRate} BPM
                            </Text>
                            {/* Fake EKG Line visual */}
                            <mesh position={[2, 0, -1]} rotation={[0, 0, Math.PI / 2]}>
                                <planeGeometry args={[0.02, 4]} />
                                <meshBasicMaterial color="cyan" transparent opacity={0.3} />
                            </mesh>
                        </group>
                    </Float>

                    {/* Right: Body */}
                    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
                        <BodyHologram temp={parseFloat(bodyTemp) || 37.0} />
                    </Float>

                </group>

                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} />
            </Canvas>
        </div>
    );
}
