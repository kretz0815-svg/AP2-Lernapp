import React, { useState, useEffect, useRef } from 'react';

const FloatingImage = ({ svgCode, isLightMode }) => {
    const [isOpen, setIsOpen] = useState(false);

    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);

    // Desktop: drag & resize state
    const MathMax = Math.max;
    const MathMin = Math.min;

    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? MathMax(0, window.innerWidth / 2 - 350) : 100,
        y: typeof window !== 'undefined' ? MathMax(0, window.innerHeight / 2 - 250) : 100
    });
    const [size, setSize] = useState({ width: 700, height: 500 });

    // Mobile: visual viewport state for keyboard stickiness
    const [vvState, setVvState] = useState({
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
        offsetTop: 0
    });

    const dragRef = useRef(false);
    const resizeRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const startSizeRef = useRef({ w: 0, h: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });

    // Resize constraints
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (!mobile) {
                setPosition(p => ({
                    x: MathMin(MathMax(0, p.x), window.innerWidth - size.width),
                    y: MathMin(MathMax(0, p.y), window.innerHeight - size.height)
                }));
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [size]);

    useEffect(() => {
        if (!isMobile) return;
        const updateVv = () => {
            if (window.visualViewport) {
                setVvState({
                    height: window.visualViewport.height,
                    offsetTop: window.visualViewport.offsetTop
                });
            } else {
                setVvState({ height: window.innerHeight, offsetTop: 0 });
            }
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateVv);
            window.visualViewport.addEventListener('scroll', updateVv);
        } else {
            window.addEventListener('resize', updateVv);
        }
        updateVv(); // Initial call
        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateVv);
                window.visualViewport.removeEventListener('scroll', updateVv);
            } else {
                window.removeEventListener('resize', updateVv);
            }
        };
    }, [isMobile]);

    const onDragStart = (e) => {
        if (isMobile || e.target.closest('.floating-notes-close') || e.target.closest('.svg-modal-content')) return;
        dragRef.current = true;
        const clientX = e.clientX ?? e.touches?.[0].clientX;
        const clientY = e.clientY ?? e.touches?.[0].clientY;
        startMouseRef.current = { x: clientX, y: clientY };
        startPosRef.current = { ...position };
    };

    const onResizeStart = (direction, e) => {
        if (isMobile) return;
        e.stopPropagation();
        e.preventDefault();
        resizeRef.current = direction;
        const clientX = e.clientX ?? e.touches?.[0].clientX;
        const clientY = e.clientY ?? e.touches?.[0].clientY;
        startMouseRef.current = { x: clientX, y: clientY };
        startPosRef.current = { ...position };
        startSizeRef.current = { ...size };
    };

    useEffect(() => {
        if (isMobile) return;

        const onMove = (e) => {
            if (!dragRef.current && !resizeRef.current) return;

            const clientX = e.clientX ?? e.touches?.[0].clientX;
            const clientY = e.clientY ?? e.touches?.[0].clientY;

            if (dragRef.current) {
                if (e.cancelable) e.preventDefault();

                const dx = clientX - startMouseRef.current.x;
                const dy = clientY - startMouseRef.current.y;
                setPosition({
                    x: MathMin(MathMax(0, startPosRef.current.x + dx), window.innerWidth - size.width),
                    y: MathMin(MathMax(0, startPosRef.current.y + dy), window.innerHeight - size.height)
                });
            } else if (resizeRef.current) {
                if (e.cancelable) e.preventDefault();

                const dx = clientX - startMouseRef.current.x;
                const dy = clientY - startMouseRef.current.y;

                let newWidth = startSizeRef.current.width;
                let newHeight = startSizeRef.current.height;
                let newX = startPosRef.current.x;
                let newY = startPosRef.current.y;

                if (resizeRef.current.includes('l')) {
                    newWidth -= dx;
                    newX += dx;
                } else if (resizeRef.current.includes('r')) {
                    newWidth += dx;
                }

                if (resizeRef.current.includes('t')) {
                    newHeight -= dy;
                    newY += dy;
                } else if (resizeRef.current.includes('b')) {
                    newHeight += dy;
                }

                if (newWidth < 300) {
                    if (resizeRef.current.includes('l')) newX += (newWidth - 300);
                    newWidth = 300;
                }
                if (newHeight < 250) {
                    if (resizeRef.current.includes('t')) newY += (newHeight - 250);
                    newHeight = 250;
                }

                setSize({ width: newWidth, height: newHeight });
                setPosition({ x: newX, y: newY });
            }
        };

        const onEnd = () => {
            dragRef.current = false;
            resizeRef.current = null;
        };

        if (isOpen) {
            window.addEventListener('mousemove', onMove, { passive: false });
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchend', onEnd);
        }

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isOpen, size, isMobile]);

    if (!svgCode) return null;

    // Nur für Desktop relevant
    const isTopHalf = position.y + (size.height / 2) < (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);
    const isLeftHalf = position.x + (size.width / 2) < (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const activeResizeHandle = (isTopHalf ? 'b' : 't') + (isLeftHalf ? 'r' : 'l');

    const resizeProps = {
        'tl': { cursor: 'nwse-resize', vBorder: 'borderTop', hBorder: 'borderLeft', vPos: 'top', hPos: 'left' },
        'tr': { cursor: 'nesw-resize', vBorder: 'borderTop', hBorder: 'borderRight', vPos: 'top', hPos: 'right' },
        'bl': { cursor: 'nesw-resize', vBorder: 'borderBottom', hBorder: 'borderLeft', vPos: 'bottom', hPos: 'left' },
        'br': { cursor: 'nwse-resize', vBorder: 'borderBottom', hBorder: 'borderRight', vPos: 'bottom', hPos: 'right' }
    }[activeResizeHandle];

    const mobileHeight = Math.min(800, vvState.height * 0.85); // Takes more space on mobile for visual graphics

    return (
        <>
            <button
                className="fade-in hide-on-print"
                type="button"
                style={{
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    background: '#3b82f6',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '1rem auto 0 auto',
                    width: 'fit-content'
                }}
                onClick={() => setIsOpen(true)}
                title="Dazugehörige Grafik anzeigen"
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(59, 130, 246, 0.6)';
                    e.currentTarget.style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(59, 130, 246, 0.4)';
                    e.currentTarget.style.background = '#3b82f6';
                }}
            >
                Anhang
            </button>

            {isOpen && (
                <div
                    className="floating-notes-window fade-in card-face"
                    style={isMobile ? {
                        position: 'fixed',
                        left: '0px',
                        top: `${vvState.offsetTop + vvState.height - mobileHeight}px`,
                        width: '100vw',
                        height: `${mobileHeight}px`,
                        zIndex: 1000,
                        margin: 0,
                        padding: '10px 15px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '24px 24px 0 0',
                        border: '1px solid var(--glass-border)',
                        borderBottom: 'none',
                        boxShadow: '0 -5px 25px rgba(0,0,0,0.5)',
                        background: isLightMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)'
                    } : {
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        width: `${size.width}px`,
                        height: `${size.height}px`,
                        zIndex: 1000,
                        resize: 'none',
                        margin: 0,
                        transform: 'none',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        background: isLightMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        borderRadius: '24px',
                        border: '1px solid var(--glass-border)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}
                >
                    <div
                        className="floating-notes-header"
                        onMouseDown={!isMobile ? onDragStart : undefined}
                        onTouchStart={!isMobile ? onDragStart : undefined}
                        style={{
                            cursor: isMobile ? 'default' : 'move',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            userSelect: 'none'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-light)' }}>Zugehörige Grafik</h3>
                        <button
                            className="floating-notes-close"
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', outline: 'none', padding: '0 5px' }}
                            title="Schließen"
                        >
                            &times;
                        </button>
                    </div>

                    <div
                        className="svg-modal-content"
                        style={{
                            flex: 1,
                            overflow: 'auto',
                            background: isLightMode ? '#ffffff' : 'rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <div
                            className="svg-container"
                            dangerouslySetInnerHTML={{ __html: svgCode }}
                        />
                    </div>

                    <style>{`
                        .svg-container {
                            display: flex;
                            justifyContent: center;
                            alignItems: center;
                            width: 100%;
                            height: 100%;
                        }
                        .svg-container svg {
                            max-width: 100%;
                            max-height: 100%;
                            ${isLightMode ? 'filter: invert(1) hue-rotate(180deg);' : ''}
                        }
                    `}</style>

                    {!isMobile && resizeProps && (
                        <>
                            <div
                                style={{ position: 'absolute', [resizeProps.vPos]: 0, [resizeProps.hPos]: 0, width: '30px', height: '30px', cursor: resizeProps.cursor, zIndex: 10 }}
                                onMouseDown={(e) => onResizeStart(activeResizeHandle, e)}
                                onTouchStart={(e) => onResizeStart(activeResizeHandle, e)}
                            />
                            <div style={{
                                position: 'absolute', [resizeProps.vPos]: '8px', [resizeProps.hPos]: '8px', width: '12px', height: '12px',
                                [resizeProps.vBorder]: '2.5px solid var(--text-muted)',
                                [resizeProps.hBorder]: '2.5px solid var(--text-muted)',
                                pointerEvents: 'none',
                                borderRadius: '2px'
                            }} />
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default FloatingImage;
