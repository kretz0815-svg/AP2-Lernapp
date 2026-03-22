import React, { useState, useEffect, useRef } from 'react';
import FloatingNotes from './FloatingNotes';
import FloatingCalculator from './FloatingCalculator';

const STORAGE_KEY = 'ap2_mobile_toggle_y';

export default function FloatingPortal({ questionId, questionText, currentAppMode }) {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    const [toggleY, setToggleY] = useState(() => {
        if (typeof window === 'undefined') return 250;
        return Number(localStorage.getItem(STORAGE_KEY)) || 250;
    });
    
    const dragRef = useRef({ 
        isDragging: false, 
        startY: 0, 
        startToggleY: 0 
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, toggleY);
    }, [toggleY]);

    const onTouchStart = (e) => {
        if (!isMobile) return;
        // Don't drag if we are clicking a button inside
        if (e.target.closest('button')) return;
        
        const touch = e.touches[0];
        dragRef.current = {
            isDragging: true,
            startY: touch.clientY,
            startToggleY: toggleY
        };
    };

    const onTouchMove = (e) => {
        if (!dragRef.current.isDragging) return;
        if (e.cancelable) e.preventDefault();
        
        const touch = e.touches[0];
        const deltaY = touch.clientY - dragRef.current.startY;
        
        // Clamp between top and bottom
        const nextY = Math.max(80, Math.min(window.innerHeight - 150, dragRef.current.startToggleY + deltaY));
        setToggleY(nextY);
    };

    const onTouchEnd = () => {
        dragRef.current.isDragging = false;
    };

    if (!isMobile) {
        return (
            <>
                <FloatingNotes questionId={questionId} questionText={questionText} currentAppMode={currentAppMode} />
                <FloatingCalculator currentAppMode={currentAppMode} />
            </>
        );
    }

    // On mobile, we wrap them in a draggable container
    // We need to pass the shared toggleY to the children so they don't calculate their own
    return (
        <div 
            className="mobile-floating-portal"
            style={{
                position: 'fixed',
                right: currentAppMode === 'klr' ? '74px' : '12px',
                top: `${toggleY}px`,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none', // Allow clicking through the container gap
                touchAction: 'none',   // Prevent scrolling/selection
                userSelect: 'none',
                WebkitUserSelect: 'none'
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Improved Drag Handle for mobile */}
            <div style={{ 
                width: '44px', 
                height: '44px', 
                background: 'rgba(255,255,255,0.08)', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                pointerEvents: 'auto',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.8rem',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ width: '12px', height: '1.5px', background: 'currentColor', borderRadius: '1px' }} />
                    <div style={{ width: '18px', height: '1.5px', background: 'currentColor', borderRadius: '1px' }} />
                    <div style={{ width: '12px', height: '1.5px', background: 'currentColor', borderRadius: '1px' }} />
                </div>
            </div>
            
            <div style={{ pointerEvents: 'auto' }}>
                <FloatingNotes 
                    questionId={questionId} 
                    questionText={questionText} 
                    currentAppMode={currentAppMode} 
                    isMobileOverride={true}
                    mobileTopOverride={0} // We are already in a fixed parent
                    inlineMode={true}
                />
            </div>
            <div style={{ pointerEvents: 'auto' }}>
                <FloatingCalculator 
                    currentAppMode={currentAppMode} 
                    isMobileOverride={true}
                    mobileTopOverride={0}
                    inlineMode={true}
                />
            </div>
        </div>
    );
}
