import React, { useState, useEffect, useRef } from 'react';
import '../index.css';

export default function FloatingNotes({ questionId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState('');

    // Position initial auf der rechten Seite, vertikal mittig
    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? window.innerWidth - 300 : 800,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 150 : 300
    });
    const [size, setSize] = useState({ width: 280, height: 300 });

    const dragRef = useRef(false);
    const resizeRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const startSizeRef = useRef({ w: 0, h: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setNotes('');
    }, [questionId]);

    // Fenster-Resize behandeln
    useEffect(() => {
        const handleResize = () => {
            setPosition(p => ({
                x: Math.min(Math.max(0, p.x), window.innerWidth - size.width),
                y: Math.min(Math.max(0, p.y), window.innerHeight - size.height)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [size]);

    const onDragStart = (e) => {
        if (e.target.closest('.floating-notes-close') || e.target.closest('textarea')) return;
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
                // Prevent default scrolling when dragging on touch
                if (e.cancelable) e.preventDefault();

                const dx = clientX - startMouseRef.current.x;
                const dy = clientY - startMouseRef.current.y;
                setPosition({
                    x: Math.min(Math.max(0, startPosRef.current.x + dx), window.innerWidth - size.width),
                    y: Math.min(Math.max(0, startPosRef.current.y + dy), window.innerHeight - size.height)
                });
            } else if (resizeRef.current) {
                if (e.cancelable) e.preventDefault();

                const dx = clientX - startMouseRef.current.x;
                const dy = clientY - startMouseRef.current.y;

                let newWidth = startSizeRef.current.width;
                let newHeight = startSizeRef.current.height;
                let newX = startPosRef.current.x;
                let newY = startPosRef.current.y;

                // X-Achse
                if (resizeRef.current.includes('l')) {
                    newWidth -= dx;
                    newX += dx;
                } else if (resizeRef.current.includes('r')) {
                    newWidth += dx;
                }

                // Y-Achse
                if (resizeRef.current.includes('t')) {
                    newHeight -= dy;
                    newY += dy;
                } else if (resizeRef.current.includes('b')) {
                    newHeight += dy;
                }

                // Min-Size Limitierung
                if (newWidth < 200) {
                    if (resizeRef.current.includes('l')) newX += (newWidth - 200);
                    newWidth = 200;
                }
                if (newHeight < 150) {
                    if (resizeRef.current.includes('t')) newY += (newHeight - 150);
                    newHeight = 150;
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


    // Befindet sich das Fenster vertikal hauptsächlich in der oberen Hälfte?
    const isTopHalf = position.y + (size.height / 2) < (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);

    // Der Resizer soll auf der linken Seite sein (tl = top-left, bl = bottom-left)
    // Wenn es oben ist, ist der Resizer unten links (bl). 
    // Wenn es in der unteren Hälfte ist, ist der Resizer oben links (tl).
    const activeResizeHandle = isTopHalf ? 'bl' : 'tl';

    return (
        <>
            {!isOpen ? (
                <div style={{ position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 1000 }}>
                    <button
                        className="floating-notes-toggle"
                        onClick={() => setIsOpen(true)}
                        title="Notizen zur aktuellen Frage"
                    >
                        📝
                    </button>
                </div>
            ) : (
                <div
                    className="floating-notes-window fade-in card-face"
                    style={{
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        width: `${size.width}px`,
                        height: `${size.height}px`,
                        zIndex: 1000,
                        resize: 'none', // deaktiviert natives CSS resizen!
                        margin: 0,
                        transform: 'none',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header dient als Drag-Handle */}
                    <div
                        className="floating-notes-header"
                        onMouseDown={onDragStart}
                        onTouchStart={onDragStart}
                        style={{
                            cursor: 'move',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '5px',
                            userSelect: 'none'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Notizen</h3>
                        <button
                            className="floating-notes-close"
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}
                            title="Notizfenster minimieren"
                        >
                            &times;
                        </button>
                    </div>

                    <textarea
                        className="floating-notes-textarea wisor-input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Deine Notizen zu dieser Frage..."
                        style={{
                            width: '100%',
                            flex: 1,
                            resize: 'none',
                            marginTop: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '10px',
                            outline: 'none'
                        }}
                    />

                    {/* Der aktive Resize-Gripbereich */}
                    {activeResizeHandle === 'tl' && (
                        <div
                            style={{ position: 'absolute', top: 0, left: 0, width: '30px', height: '30px', cursor: 'nwse-resize', zIndex: 10 }}
                            onMouseDown={(e) => onResizeStart('tl', e)}
                            onTouchStart={(e) => onResizeStart('tl', e)}
                        />
                    )}
                    {activeResizeHandle === 'bl' && (
                        <div
                            style={{ position: 'absolute', bottom: 0, left: 0, width: '30px', height: '30px', cursor: 'nesw-resize', zIndex: 10 }}
                            onMouseDown={(e) => onResizeStart('bl', e)}
                            onTouchStart={(e) => onResizeStart('bl', e)}
                        />
                    )}

                    {/* Visuelle Linien im Eck, damit der Nutzer sieht wo er ziehen kann */}
                    {activeResizeHandle === 'tl' && (
                        <div style={{
                            position: 'absolute', top: '8px', left: '8px', width: '12px', height: '12px',
                            borderTop: '2.5px solid rgba(255,255,255,0.7)',
                            borderLeft: '2.5px solid rgba(255,255,255,0.7)',
                            pointerEvents: 'none',
                            borderRadius: '2px'
                        }} />
                    )}
                    {activeResizeHandle === 'bl' && (
                        <div style={{
                            position: 'absolute', bottom: '8px', left: '8px', width: '12px', height: '12px',
                            borderBottom: '2.5px solid rgba(255,255,255,0.7)',
                            borderLeft: '2.5px solid rgba(255,255,255,0.7)',
                            pointerEvents: 'none',
                            borderRadius: '2px'
                        }} />
                    )}

                </div>
            )}
        </>
    );
}
