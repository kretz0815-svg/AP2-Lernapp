import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import FloatingNotes from './FloatingNotes';
import FloatingCalculator from './FloatingCalculator';

export default function FloatingPortal({ questionId, questionText, currentAppMode }) {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (typeof document === 'undefined') return null;

    if (!isMobile) {
        return createPortal(
            <>
                <FloatingNotes questionId={questionId} questionText={questionText} currentAppMode={currentAppMode} />
                <FloatingCalculator currentAppMode={currentAppMode} />
            </>,
            document.body
        );
    }

    // On mobile: horizontal top-right arrangement, teleported to body to stay on top
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div 
            className="mobile-floating-portal"
            style={{
                position: 'fixed',
                right: '12px',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                zIndex: 1000001,
                pointerEvents: 'none',
                overflow: 'visible'
            }}
        >
            <div 
                style={{
                    display: 'flex',
                    gap: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.82)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    pointerEvents: 'auto', // Re-enable pointer events for icons
                    marginLeft: 'auto', // Align to right
                    width: 'fit-content'
                }}
            >
                <FloatingNotes 
                    questionId={questionId} 
                    questionText={questionText} 
                    currentAppMode={currentAppMode} 
                    isMobileOverride={true}
                    inlineMode={true}
                />
                <FloatingCalculator 
                    currentAppMode={currentAppMode} 
                    isMobileOverride={true}
                    inlineMode={true}
                />
            </div>
        </div>,
        document.body
    );
}
