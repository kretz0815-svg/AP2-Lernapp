import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import FloatingNotes from './FloatingNotes';
import FloatingCalculator from './FloatingCalculator';

export default function FloatingPortal({ questionId, questionText, currentAppMode }) {
    const trayRef = useRef(null);
    const draggingRef = useRef(false);
    const startPointerRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });
    const storageKey = useMemo(() => `ap2_floating_tray_pos_${currentAppMode || 'default'}`, [currentAppMode]);
    const [trayPos, setTrayPos] = useState(() => {
        if (typeof window === 'undefined') return { x: 16, y: 16 };
        const defaultX = Math.max(8, window.innerWidth - 220);
        const defaultY = Math.max(8, window.innerHeight - 70);
        return { x: defaultX, y: defaultY };
    });

    const clampToViewport = (candidatePos) => {
        if (typeof window === 'undefined') return candidatePos;
        const rect = trayRef.current?.getBoundingClientRect();
        const trayWidth = rect?.width || 206;
        const trayHeight = rect?.height || 62;
        const maxX = Math.max(8, window.innerWidth - trayWidth - 8);
        const maxY = Math.max(8, window.innerHeight - trayHeight - 8);
        return {
            x: Math.max(8, Math.min(candidatePos.x, maxX)),
            y: Math.max(8, Math.min(candidatePos.y, maxY))
        };
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
            if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
                setTrayPos(clampToViewport(saved));
            } else {
                setTrayPos(clampToViewport({
                    x: Math.max(8, window.innerWidth - 220),
                    y: Math.max(8, window.innerHeight - 70)
                }));
            }
        } catch {
            setTrayPos(clampToViewport({
                x: Math.max(8, window.innerWidth - 220),
                y: Math.max(8, window.innerHeight - 70)
            }));
        }
    }, [storageKey]);

    useEffect(() => {
        const handleResize = () => {
            setTrayPos((prev) => clampToViewport(prev));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(storageKey, JSON.stringify(trayPos));
    }, [trayPos, storageKey]);

    const beginDrag = (clientX, clientY) => {
        draggingRef.current = true;
        startPointerRef.current = { x: clientX, y: clientY };
        startPosRef.current = { ...trayPos };
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        beginDrag(e.clientX, e.clientY);
    };

    const handleTouchStart = (e) => {
        const touch = e.touches?.[0];
        if (!touch) return;
        beginDrag(touch.clientX, touch.clientY);
    };

    useEffect(() => {
        const handlePointerMove = (clientX, clientY) => {
            if (!draggingRef.current) return;
            const dx = clientX - startPointerRef.current.x;
            const dy = clientY - startPointerRef.current.y;
            setTrayPos(clampToViewport({
                x: startPosRef.current.x + dx,
                y: startPosRef.current.y + dy
            }));
        };

        const onMouseMove = (e) => handlePointerMove(e.clientX, e.clientY);
        const onTouchMove = (e) => {
            const touch = e.touches?.[0];
            if (!touch) return;
            handlePointerMove(touch.clientX, touch.clientY);
        };
        const stopDrag = () => { draggingRef.current = false; };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopDrag);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', stopDrag);
        window.addEventListener('touchcancel', stopDrag);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', stopDrag);
            window.removeEventListener('touchcancel', stopDrag);
        };
    }, [trayPos.x, trayPos.y]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div 
            className="mobile-floating-portal"
            style={{
                position: 'fixed',
                left: `${trayPos.x}px`,
                top: `${trayPos.y}px`,
                zIndex: 1000001,
                pointerEvents: 'none',
                overflow: 'visible'
            }}
        >
            <div 
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.82)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    pointerEvents: 'auto',
                    width: 'fit-content'
                }}
                ref={trayRef}
            >
                <button
                    type="button"
                    aria-label="Floating Buttons verschieben"
                    title="Ziehen zum Verschieben"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    style={{
                        width: '28px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        cursor: 'grab',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        touchAction: 'none'
                    }}
                >
                    ⋮⋮
                </button>
                <FloatingNotes 
                    questionId={questionId} 
                    questionText={questionText} 
                    currentAppMode={currentAppMode} 
                    inlineMode={true}
                />
                <FloatingCalculator 
                    currentAppMode={currentAppMode} 
                    inlineMode={true}
                />
            </div>
        </div>,
        document.body
    );
}
