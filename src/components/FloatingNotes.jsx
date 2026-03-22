import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../index.css';

export default function FloatingNotes({ 
    questionId, 
    questionText, 
    currentAppMode,
    inlineMode = false,
    mobileTopOverride = null,
    isMobileOverride = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [avoidInput, setAvoidInput] = useState(false);

    const [isMobile, setIsMobile] = useState(isMobileOverride !== null ? isMobileOverride : (typeof window !== 'undefined' && window.innerWidth <= 768));

    // Desktop: drag & resize state
    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? window.innerWidth - 300 : 800,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 150 : 300
    });
    const [size, setSize] = useState({ width: 280, height: 300 });

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

    // --- Helper: read all notes (localStorage + Supabase merge) ---
    const getAllNotes = () => {
        return JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
    };

    // --- Helper: persist notes to localStorage AND Supabase ---
    const persistNotes = async (allNotes) => {
        localStorage.setItem('ap2_saved_notes', JSON.stringify(allNotes));

        // Also sync to Supabase so notes appear on all devices (only for authenticated users)
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const userId = session.user.id;
                const { data } = await supabase
                    .from('user_data')
                    .select('progress_data')
                    .eq('user_id', userId)
                    .single();

                const progressData = (data && data.progress_data) ? data.progress_data : {};
                progressData.saved_notes = allNotes;

                await supabase
                    .from('user_data')
                    .update({ progress_data: progressData, updated_at: new Date().toISOString() })
                    .eq('user_id', userId);
            }
        } catch (err) {
            console.error('Supabase notes sync error:', err);
        }
    };

    // --- Load note for current question (from localStorage first, then Supabase in background) ---
    useEffect(() => {
        // Immediately load from localStorage
        const saved = getAllNotes();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotes(saved[questionId]?.text || '');

        // Then try to pull latest from Supabase (only for authenticated users)
        const syncFromSupabase = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return;
                const userId = session.user.id;

                const { data } = await supabase
                    .from('user_data')
                    .select('progress_data')
                    .eq('user_id', userId)
                    .single();

                if (data?.progress_data?.saved_notes) {
                    const remoteNotes = data.progress_data.saved_notes;
                    const localNotes = getAllNotes();

                    // Merge: for each key, keep the one with the newer date
                    let merged = { ...localNotes };
                    let changed = false;
                    for (const key of Object.keys(remoteNotes)) {
                        const remoteDate = new Date(remoteNotes[key]?.date || 0).getTime();
                        const localDate = new Date(localNotes[key]?.date || 0).getTime();
                        if (!localNotes[key] || remoteDate > localDate) {
                            merged[key] = remoteNotes[key];
                            changed = true;
                        }
                    }

                    if (changed) {
                        localStorage.setItem('ap2_saved_notes', JSON.stringify(merged));
                        // Update the current note if it changed
                        if (merged[questionId]?.text && merged[questionId].text !== notes) {
                            setNotes(merged[questionId].text);
                        }
                    }
                }
            } catch (err) {
                // Silently fail – localStorage version still works
                console.error('Supabase notes fetch error:', err);
            }
        };

        syncFromSupabase();
    }, [questionId]);

    const handleSaveNote = async () => {
        const saved = getAllNotes();
        saved[questionId] = {
            text: notes,
            context: questionText || 'Kein Kontext',
            date: new Date().toISOString()
        };
        await persistNotes(saved);
        alert('Notiz erfolgreich gespeichert!');
    };

    // Resize (umbruch Mobile/Desktop + Desktop Constraints)
    useEffect(() => {
        const handleResize = () => {
            if (isMobileOverride !== null) return;
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (!mobile) {
                setPosition(p => ({
                    x: Math.min(Math.max(0, p.x), window.innerWidth - size.width),
                    y: Math.min(Math.max(0, p.y), window.innerHeight - size.height)
                }));
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [size]);

    // Visual Viewport tracking for mobile keyboard
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

    useEffect(() => {
        if (!isMobile) {
            setAvoidInput(false);
            return;
        }

        const shouldAvoid = (el) => {
            if (!el) return false;
            if (el.closest('.floating-notes-window')) return false;
            return Boolean(el.closest('input, textarea, [contenteditable="true"]'));
        };

        const handleFocusIn = (e) => {
            setAvoidInput(shouldAvoid(e.target));
        };

        const handleFocusOut = () => {
            requestAnimationFrame(() => {
                setAvoidInput(shouldAvoid(document.activeElement));
            });
        };

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
        };
    }, [isMobile]);

    const onDragStart = (e) => {
        if (isMobile || e.target.closest('.floating-notes-close') || e.target.closest('textarea')) return;
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
    }, [isOpen, size, isMobile]);

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

    // Mobile Styling Konstanten
    const mobileHeight = Math.min(220, vvState.height * 0.45);
    const visibleTop = vvState.offsetTop;
    const visibleHeight = vvState.height;
    const preferredTop = visibleTop + Math.round(visibleHeight * 0.22) + 70;
    const minTop = visibleTop + 142;
    const maxTop = visibleTop + Math.max(160, visibleHeight - 110);
    const mobileTop = mobileTopOverride !== null ? mobileTopOverride : Math.max(minTop, Math.min(preferredTop, maxTop));
    let mobileToggleStyle = avoidInput
        ? {
            position: inlineMode ? 'relative' : 'fixed',
            left: inlineMode ? '0' : '12px',
            top: inlineMode ? '0' : `calc(env(safe-area-inset-top, 0px) + ${mobileTop}px)`,
            zIndex: 1000
        }
        : {
            position: inlineMode ? 'relative' : 'fixed',
            right: (currentAppMode === 'klr') ? (inlineMode ? '0' : '74px') : (inlineMode ? '0' : '12px'),
            top: (currentAppMode === 'klr') ? (inlineMode ? '0' : '1px') : (inlineMode ? '0' : `calc(env(safe-area-inset-top, 0px) + ${mobileTop}px)`),
            zIndex: 1000
        };

    if (inlineMode) {
        // Reset top/right/left for inline positioning within the draggable group
        mobileToggleStyle = { ...mobileToggleStyle, top: 'auto', right: 'auto', left: 'auto', position: 'relative' };
    }

    return (
        <>
            {!isOpen ? (
                inlineMode ? (
                    <button
                        className="floating-notes-toggle"
                        onClick={() => setIsOpen(true)}
                        title="Notizen zur aktuellen Frage"
                        style={{ position: 'relative', width: '42px', height: '42px' }}
                    >
                        <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="currentColor" style={{ display: 'block' }}>
                            <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6.586l-1 1V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7v1H5a2 2 0 0 1-2-2V5z" />
                            <rect x="7" y="7" width="6" height="1.2" rx="0.6" />
                            <rect x="7" y="10" width="8" height="1.2" rx="0.6" />
                            <rect x="7" y="13" width="5" height="1.2" rx="0.6" />
                            <path d="M16.293 12.293a1 1 0 0 1 1.414 0l1 1a1 1 0 0 1 0 1.414l-5.5 5.5L11 21l.793-2.207 5.5-5.5z" />
                        </svg>
                    </button>
                ) : (
                    <div style={isMobile ? mobileToggleStyle : { position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 1000 }}>
                        <button
                            className="floating-notes-toggle"
                            onClick={() => setIsOpen(true)}
                            title="Notizen zur aktuellen Frage"
                        >
                            <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="currentColor" style={{ display: 'block' }}>
                                <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6.586l-1 1V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7v1H5a2 2 0 0 1-2-2V5z" />
                                <rect x="7" y="7" width="6" height="1.2" rx="0.6" />
                                <rect x="7" y="10" width="8" height="1.2" rx="0.6" />
                                <rect x="7" y="13" width="5" height="1.2" rx="0.6" />
                                <path d="M16.293 12.293a1 1 0 0 1 1.414 0l1 1a1 1 0 0 1 0 1.414l-5.5 5.5L11 21l.793-2.207 5.5-5.5z" />
                            </svg>
                        </button>
                    </div>
                )
            ) : (
                <div
                    className="floating-notes-window fade-in card-face"
                    style={isMobile ? {
                        position: 'fixed',
                        left: '0px',
                        top: `${vvState.height - mobileHeight}px`,
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
                        background: 'rgba(15, 23, 42, 0.96)',
                        color: 'white',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)'
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
                        background: 'rgba(15, 23, 42, 0.96)',
                        color: 'white',
                        borderRadius: '18px',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
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
                            marginBottom: '5px',
                            userSelect: 'none'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Notizen</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="floating-notes-save"
                                onClick={handleSaveNote}
                                style={{ background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '4px', padding: '0 8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                title="Notiz speichern"
                            >
                                Speichern
                            </button>
                            <button
                                className="floating-notes-close"
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none', padding: '0 5px' }}
                                title="Notizfenster minimieren"
                            >
                                &times;
                            </button>
                        </div>
                    </div>

                    <textarea
                        className="floating-notes-textarea wisor-input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Deine Notizen hier..."
                        autoFocus={!isMobile} // Disable autoFocus on mobile to avoid keyboard pop on open
                        style={{
                            width: '100%',
                            flex: 1,
                            resize: 'none',
                            marginTop: isMobile ? '5px' : '10px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            padding: '10px',
                            outline: 'none',
                            fontSize: isMobile ? '16px' : 'inherit' // Prevent iOS zoom on focus
                        }}
                    />

                    {!isMobile && resizeProps && (
                        <>
                            <div
                                style={{ position: 'absolute', [resizeProps.vPos]: 0, [resizeProps.hPos]: 0, width: '30px', height: '30px', cursor: resizeProps.cursor, zIndex: 10 }}
                                onMouseDown={(e) => onResizeStart(activeResizeHandle, e)}
                                onTouchStart={(e) => onResizeStart(activeResizeHandle, e)}
                            />
                            <div style={{
                                position: 'absolute', [resizeProps.vPos]: '8px', [resizeProps.hPos]: '8px', width: '12px', height: '12px',
                                [resizeProps.vBorder]: '2.5px solid rgba(255,255,255,0.7)',
                                [resizeProps.hBorder]: '2.5px solid rgba(255,255,255,0.7)',
                                pointerEvents: 'none',
                                borderRadius: '2px'
                            }} />
                        </>
                    )}
                </div>
            )}
        </>
    );
}
