import React, { useState, useEffect, useRef } from 'react';

const FloatingImage = ({ svgCode, isLightMode }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Desktop & Mobile: unified drag & resize state
    const MathMax = Math.max;
    const MathMin = Math.min;

    // Initial size and position. If on a very small screen, make it smaller.
    const initialWidth = typeof window !== 'undefined' ? MathMin(700, window.innerWidth - 40) : 700;
    const initialHeight = typeof window !== 'undefined' ? MathMin(500, window.innerHeight - 40) : 500;

    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? MathMax(20, window.innerWidth / 2 - initialWidth / 2) : 100,
        y: typeof window !== 'undefined' ? MathMax(20, window.innerHeight / 2 - initialHeight / 2) : 100
    });

    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

    const dragRef = useRef(false);
    const resizeRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const startSizeRef = useRef({ w: 0, h: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });

    // Ensure the window stays somewhat on screen when resizing the browser
    useEffect(() => {
        const handleResize = () => {
            setPosition(p => ({
                x: MathMin(MathMax(-size.width + 80, p.x), window.innerWidth - 80),
                y: MathMin(MathMax(0, p.y), window.innerHeight - 80)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [size]);

    const onDragStart = (e) => {
        // Allow dragging from anywhere EXCEPT the close button or resize handles
        if (e.target.closest('.floating-notes-close') || resizeRef.current) return;
        dragRef.current = true;
        const clientX = e.clientX ?? e.touches?.[0].clientX;
        const clientY = e.clientY ?? e.touches?.[0].clientY;
        startMouseRef.current = { x: clientX, y: clientY };
        startPosRef.current = { ...position };
    };

    const onResizeStart = (direction, e) => {
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
        const onMove = (e) => {
            if (!dragRef.current && !resizeRef.current) return;

            const clientX = e.clientX ?? e.touches?.[0].clientX;
            const clientY = e.clientY ?? e.touches?.[0].clientY;

            if (dragRef.current) {
                // Prevent scrolling background on mobile while dragging window
                if (e.cancelable) e.preventDefault();

                const dx = clientX - startMouseRef.current.x;
                const dy = clientY - startMouseRef.current.y;
                setPosition({
                    x: MathMin(MathMax(-size.width + 50, startPosRef.current.x + dx), window.innerWidth - 50),
                    y: MathMin(MathMax(0, startPosRef.current.y + dy), window.innerHeight - 50)
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

                // Minimum constraints
                if (newWidth < 250) {
                    if (resizeRef.current.includes('l')) newX += (newWidth - 250);
                    newWidth = 250;
                }
                if (newHeight < 200) {
                    if (resizeRef.current.includes('t')) newY += (newHeight - 200);
                    newHeight = 200;
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
    }, [isOpen, size]);

    if (!svgCode) return null;

    // Determine active resize handle corners based on quadrant position
    const isTopHalf = position.y + (size.height / 2) < (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);
    const isLeftHalf = position.x + (size.width / 2) < (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const activeResizeHandle = (isTopHalf ? 'b' : 't') + (isLeftHalf ? 'r' : 'l');

    const resizeProps = {
        'tl': { cursor: 'nwse-resize', vBorder: 'borderTop', hBorder: 'borderLeft', vPos: 'top', hPos: 'left' },
        'tr': { cursor: 'nesw-resize', vBorder: 'borderTop', hBorder: 'borderRight', vPos: 'top', hPos: 'right' },
        'bl': { cursor: 'nesw-resize', vBorder: 'borderBottom', hBorder: 'borderLeft', vPos: 'bottom', hPos: 'left' },
        'br': { cursor: 'nwse-resize', vBorder: 'borderBottom', hBorder: 'borderRight', vPos: 'bottom', hPos: 'right' }
    }[activeResizeHandle];

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
                    onMouseDown={onDragStart}
                    onTouchStart={onDragStart}
                    style={{
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
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        cursor: 'move'
                    }}
                >
                    <div
                        className="floating-notes-header"
                        style={{
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
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
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
                            alignItems: 'center',
                            cursor: 'move'
                        }}
                    >
                        <div
                            className="svg-container"
                            dangerouslySetInnerHTML={{ __html: svgCode }}
                            style={{ userSelect: 'none', pointerEvents: 'none' }}
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

                    {resizeProps && (
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
