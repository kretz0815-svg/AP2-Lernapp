import React, { useState, useEffect } from 'react';
import FloatingNotes from './FloatingNotes';
import FloatingCalculator from './FloatingCalculator';

export default function FloatingPortal({ questionId, questionText, currentAppMode }) {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isMobile) {
        return (
            <>
                <FloatingNotes questionId={questionId} questionText={questionText} currentAppMode={currentAppMode} />
                <FloatingCalculator currentAppMode={currentAppMode} />
            </>
        );
    }

    // On mobile: horizontal top-right arrangement
    return (
        <div 
            className="mobile-floating-portal"
            style={{
                position: 'fixed',
                right: '12px',
                top: '12px',
                zIndex: 1000,
                display: 'flex',
                gap: '10px',
                pointerEvents: 'none'
            }}
        >
            <div style={{ pointerEvents: 'auto' }}>
                <FloatingNotes 
                    questionId={questionId} 
                    questionText={questionText} 
                    currentAppMode={currentAppMode} 
                    isMobileOverride={true}
                    inlineMode={true}
                />
            </div>
            <div style={{ pointerEvents: 'auto' }}>
                <FloatingCalculator 
                    currentAppMode={currentAppMode} 
                    isMobileOverride={true}
                    inlineMode={true}
                />
            </div>
        </div>
    );
}
