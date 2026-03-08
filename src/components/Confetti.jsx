import React, { useMemo } from 'react';

/**
 * Reusable Confetti component that renders a burst of confetti.
 * It uses the animation defined in index.css (klrConfettiFall).
 */
const Confetti = ({ amount = 55, colors = ['#6dff73', '#22c55e', '#fef08a', '#f59e0b', '#86efac', '#fbbf24'] }) => {
    const pieces = useMemo(() => {
        return Array.from({ length: amount }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 1.5,
            duration: 2.2 + Math.random() * 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 6 + Math.floor(Math.random() * 8),
            rotation: Math.random() * 360,
        }));
    }, [amount, colors]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            {pieces.map((p) => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        top: '-20px',
                        left: `${p.left}%`,
                        width: `${p.size}px`,
                        height: `${p.size * 1.2}px`,
                        backgroundColor: p.color,
                        borderRadius: p.id % 2 === 0 ? '2px' : '50%',
                        opacity: 0,
                        transform: `rotate(${p.rotation}deg)`,
                        animation: `klrConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
                    }}
                />
            ))}
        </div>
    );
};

export default Confetti;
