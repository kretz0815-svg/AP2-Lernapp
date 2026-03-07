import React, { useState, useEffect, useRef } from 'react';
import '../index.css';

const CALC_MIN_WIDTH = 220;
const CALC_MIN_HEIGHT = 320;
const CALC_MAX_WIDTH = 420;
const CALC_MAX_HEIGHT = 560;
const MOBILE_CALC_MIN_WIDTH = 180;
const MOBILE_CALC_MIN_HEIGHT = 220;
const MOBILE_VIEWPORT_MARGIN = 8;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const getMobileWindowDimensions = (vvState) => {
    const maxWidth = Math.max(MOBILE_CALC_MIN_WIDTH, vvState.width - (MOBILE_VIEWPORT_MARGIN * 2));
    const maxHeight = Math.max(MOBILE_CALC_MIN_HEIGHT, vvState.height - (MOBILE_VIEWPORT_MARGIN * 2));
    const preset = { widthTarget: vvState.width * 0.52, heightTarget: vvState.height * 0.45 };
    return {
        width: clamp(preset.widthTarget, MOBILE_CALC_MIN_WIDTH, Math.min(CALC_MAX_WIDTH, maxWidth)),
        height: clamp(preset.heightTarget, MOBILE_CALC_MIN_HEIGHT, Math.min(560, maxHeight))
    };
};

export default function FloatingCalculator() {
    const [isOpen, setIsOpen] = useState(false);
    const [avoidInput, setAvoidInput] = useState(false);
    const [hasCalcActivity, setHasCalcActivity] = useState(false);

    // Calculator State
    const [currentValue, setCurrentValue] = useState('0');
    const [prevValue, setPrevValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [waitingForNewValue, setWaitingForNewValue] = useState(false);

    // Responsive State
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? window.innerWidth - 300 : 800,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 250 : 200
    });
    const [size, setSize] = useState({ width: 260, height: 350 });
    const [vvState, setVvState] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 390,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
        offsetTop: 0
    });
    const [mobileWindow, setMobileWindow] = useState({ x: 12, y: 120, width: 340, height: 420 });

    const dragRef = useRef(false);
    const resizeRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const startSizeRef = useRef({ w: 0, h: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });
    const mobileGestureRef = useRef({
        isDragging: false,
        startTouch: null,
        startWindow: null
    });

    useEffect(() => {
        const handleResize = () => {
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

    useEffect(() => {
        if (!isMobile) return;
        const updateVv = () => {
            if (window.visualViewport) {
                setVvState({
                    width: window.visualViewport.width,
                    height: window.visualViewport.height,
                    offsetTop: window.visualViewport.offsetTop
                });
            } else {
                setVvState({ width: window.innerWidth, height: window.innerHeight, offsetTop: 0 });
            }
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateVv);
            window.visualViewport.addEventListener('scroll', updateVv);
        } else {
            window.addEventListener('resize', updateVv);
        }
        updateVv();
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

    useEffect(() => {
        if (!isMobile || !isOpen) return;

        const isExternalFormField = (el) => {
            if (!el) return false;
            if (el.closest('.floating-notes-window')) return false;
            return Boolean(el.closest('input, textarea, [contenteditable="true"]'));
        };

        const handleFocusIn = (e) => {
            if (isExternalFormField(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('focusin', handleFocusIn);
        return () => {
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, [isMobile, isOpen]);

    useEffect(() => {
        if (!isMobile || !isOpen) return;
        const { width, height } = getMobileWindowDimensions(vvState);
        const x = clamp((vvState.width - width) / 2, MOBILE_VIEWPORT_MARGIN, vvState.width - width - MOBILE_VIEWPORT_MARGIN);
        const y = clamp(
            vvState.offsetTop + vvState.height - height - 18,
            vvState.offsetTop + MOBILE_VIEWPORT_MARGIN,
            vvState.offsetTop + vvState.height - height - MOBILE_VIEWPORT_MARGIN
        );
        setMobileWindow({ x, y, width, height });
    }, [isMobile, isOpen, vvState]);

    useEffect(() => {
        if (!isMobile || !isOpen) return;
        setMobileWindow((prev) => {
            const maxWidth = Math.max(MOBILE_CALC_MIN_WIDTH, vvState.width - (MOBILE_VIEWPORT_MARGIN * 2));
            const width = clamp(prev.width, MOBILE_CALC_MIN_WIDTH, Math.min(CALC_MAX_WIDTH, maxWidth));
            const maxHeight = Math.max(MOBILE_CALC_MIN_HEIGHT, vvState.height - (MOBILE_VIEWPORT_MARGIN * 2));
            const height = clamp(prev.height, MOBILE_CALC_MIN_HEIGHT, Math.min(500, maxHeight));
            const x = clamp(prev.x, MOBILE_VIEWPORT_MARGIN, vvState.width - width - MOBILE_VIEWPORT_MARGIN);
            const y = clamp(
                prev.y,
                vvState.offsetTop + MOBILE_VIEWPORT_MARGIN,
                vvState.offsetTop + vvState.height - height - MOBILE_VIEWPORT_MARGIN
            );
            if (x === prev.x && y === prev.y && width === prev.width && height === prev.height) return prev;
            return { x, y, width, height };
        });
    }, [vvState, isMobile, isOpen]);

    const handleMobileWindowTouchStart = (e) => {
        if (!isMobile) return;
        if (e.target.closest('button')) return;

        const touch = e.touches[0];
        if (!touch) return;
        mobileGestureRef.current = {
            isDragging: true,
            startTouch: { x: touch.clientX, y: touch.clientY },
            startWindow: mobileWindow
        };
    };

    const handleMobileWindowTouchMove = (e) => {
        if (!isMobile) return;
        const gesture = mobileGestureRef.current;
        if (!gesture.isDragging || !gesture.startWindow || !gesture.startTouch || e.touches.length !== 1) return;
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - gesture.startTouch.x;
        const dy = touch.clientY - gesture.startTouch.y;
        const nextX = clamp(
            gesture.startWindow.x + dx,
            MOBILE_VIEWPORT_MARGIN,
            vvState.width - gesture.startWindow.width - MOBILE_VIEWPORT_MARGIN
        );
        const nextY = clamp(
            gesture.startWindow.y + dy,
            vvState.offsetTop + MOBILE_VIEWPORT_MARGIN,
            vvState.offsetTop + vvState.height - gesture.startWindow.height - MOBILE_VIEWPORT_MARGIN
        );
        setMobileWindow(prev => ({ ...prev, x: nextX, y: nextY }));
    };

    const handleMobileWindowTouchEnd = () => {
        mobileGestureRef.current = {
            isDragging: false,
            startTouch: null,
            startWindow: null
        };
    };

    const onDragStart = (e) => {
        if (isMobile || e.target.closest('.floating-notes-close') || e.target.closest('.calc-btn')) return;
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

                if (resizeRef.current.includes('l')) { newWidth -= dx; newX += dx; }
                else if (resizeRef.current.includes('r')) { newWidth += dx; }
                if (resizeRef.current.includes('t')) { newHeight -= dy; newY += dy; }
                else if (resizeRef.current.includes('b')) { newHeight += dy; }

                if (newWidth < CALC_MIN_WIDTH) { if (resizeRef.current.includes('l')) newX += (newWidth - CALC_MIN_WIDTH); newWidth = CALC_MIN_WIDTH; }
                if (newHeight < CALC_MIN_HEIGHT) { if (resizeRef.current.includes('t')) newY += (newHeight - CALC_MIN_HEIGHT); newHeight = CALC_MIN_HEIGHT; }

                if (newWidth > CALC_MAX_WIDTH) { if (resizeRef.current.includes('l')) newX += (newWidth - CALC_MAX_WIDTH); newWidth = CALC_MAX_WIDTH; }
                if (newHeight > CALC_MAX_HEIGHT) { if (resizeRef.current.includes('t')) newY += (newHeight - CALC_MAX_HEIGHT); newHeight = CALC_MAX_HEIGHT; }

                newX = Math.min(Math.max(0, newX), window.innerWidth - newWidth);
                newY = Math.min(Math.max(0, newY), window.innerHeight - newHeight);

                setSize({ width: newWidth, height: newHeight });
                setPosition({ x: newX, y: newY });
            }
        };

        const onEnd = () => { dragRef.current = false; resizeRef.current = null; };

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

    // Calculator Logic
    const calculate = (a, b, op) => {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '×': return a * b;
            case '÷': return a / b;
            default: return b;
        }
    };

    const handleDigit = (digit) => {
        setHasCalcActivity(true);
        if (waitingForNewValue) {
            setCurrentValue(digit);
            setWaitingForNewValue(false);
        } else {
            setCurrentValue(currentValue === '0' ? digit : currentValue + digit);
        }
    };

    const handleOperator = (nextOperator) => {
        setHasCalcActivity(true);
        const inputValue = parseFloat(currentValue);
        if (operator && !waitingForNewValue) {
            const result = calculate(prevValue, inputValue, operator);
            setCurrentValue(String(result));
            setPrevValue(result);
        } else {
            setPrevValue(inputValue);
        }
        setWaitingForNewValue(true);
        setOperator(nextOperator);
    };

    const handleEquals = () => {
        setHasCalcActivity(true);
        if (!operator) return;
        const inputValue = parseFloat(currentValue);
        const result = calculate(prevValue, inputValue, operator);
        setCurrentValue(String(result));
        setPrevValue(null);
        setOperator(null);
        setWaitingForNewValue(true);
    };

    const handleClear = () => {
        setHasCalcActivity(true);
        setCurrentValue('0');
        setPrevValue(null);
        setOperator(null);
        setWaitingForNewValue(false);
    };

    const handleBackspace = () => {
        setHasCalcActivity(true);
        if (waitingForNewValue) {
            setWaitingForNewValue(false);
            setCurrentValue('0');
            return;
        }

        if (currentValue.length <= 1 || (currentValue.startsWith('-') && currentValue.length <= 2)) {
            setCurrentValue('0');
            return;
        }

        const next = currentValue.slice(0, -1);
        setCurrentValue(next === '-' ? '0' : next);
    };

    const handleToggleSign = () => {
        setHasCalcActivity(true);
        setCurrentValue(String(parseFloat(currentValue) * -1));
    };

    const handlePercent = () => {
        setHasCalcActivity(true);
        setCurrentValue(String(parseFloat(currentValue) / 100));
    };

    const handleDot = () => {
        setHasCalcActivity(true);
        if (waitingForNewValue) {
            setCurrentValue('0.');
            setWaitingForNewValue(false);
        } else if (currentValue.indexOf('.') === -1) {
            setCurrentValue(currentValue + '.');
        }
    };

    // Calculate dynamically resized text size for display
    const displayLength = currentValue.length;
    let fontSize = '2.5rem';
    if (displayLength > 8) fontSize = '2rem';
    if (displayLength > 12) fontSize = '1.5rem';

    const isTopHalf = position.y + (size.height / 2) < (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);
    const isLeftHalf = position.x + (size.width / 2) < (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const activeResizeHandle = (isTopHalf ? 'b' : 't') + (isLeftHalf ? 'r' : 'l');

    const resizeProps = {
        'tl': { cursor: 'nwse-resize', vBorder: 'borderTop', hBorder: 'borderLeft', vPos: 'top', hPos: 'left' },
        'tr': { cursor: 'nesw-resize', vBorder: 'borderTop', hBorder: 'borderRight', vPos: 'top', hPos: 'right' },
        'bl': { cursor: 'nesw-resize', vBorder: 'borderBottom', hBorder: 'borderLeft', vPos: 'bottom', hPos: 'left' },
        'br': { cursor: 'nwse-resize', vBorder: 'borderBottom', hBorder: 'borderRight', vPos: 'bottom', hPos: 'right' }
    }[activeResizeHandle];

    const visibleTop = vvState.offsetTop;
    const visibleHeight = vvState.height;
    const preferredTop = visibleTop + Math.round(visibleHeight * 0.22);
    const minTop = visibleTop + 72;
    const maxTop = visibleTop + Math.max(92, visibleHeight - 180);
    const mobileTop = Math.max(minTop, Math.min(preferredTop, maxTop));
    const mobileToggleStyle = avoidInput
        ? {
            position: 'fixed',
            left: '12px',
            top: `calc(env(safe-area-inset-top, 0px) + ${mobileTop}px)`,
            zIndex: 1000
        }
        : {
            position: 'fixed',
            right: '12px',
            top: `calc(env(safe-area-inset-top, 0px) + ${mobileTop}px)`,
            zIndex: 1000
        };
    const helperValue = String(currentValue ?? '').replace('.', ',');
    const helperText = helperValue.length > 14 ? `${helperValue.slice(0, 14)}…` : helperValue;
    const showMobileResultHelper = isMobile && !isOpen && hasCalcActivity;

    return (
        <>
            {!isOpen ? (
                <div style={isMobile ? mobileToggleStyle : { position: 'fixed', right: '20px', top: 'calc(50% + 70px)', transform: 'translateY(-50%)', zIndex: 1000 }}>
                    <button
                        className="floating-notes-toggle"
                        onClick={() => setIsOpen(true)}
                        title="Taschenrechner öffnen"
                    >
                        <svg viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: 'block' }}>
                            <rect x="2" y="2" width="20" height="20" rx="3" />
                            <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" />
                            <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" />
                            <line x1="7" y1="5" x2="7" y2="9" />
                            <line x1="5" y1="7" x2="9" y2="7" />
                            <line x1="15" y1="7" x2="19" y2="7" />
                            <line x1="15" y1="15.5" x2="19" y2="19" />
                            <line x1="19" y1="15.5" x2="15" y2="19" />
                            <line x1="5" y1="16" x2="9" y2="16" />
                            <line x1="5" y1="18.5" x2="9" y2="18.5" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div
                    className="floating-notes-window fade-in card-face"
                    style={isMobile ? {
                        position: 'fixed',
                        left: `${mobileWindow.x}px`,
                        top: `${mobileWindow.y}px`,
                        width: `${mobileWindow.width}px`,
                        height: `${mobileWindow.height}px`,
                        maxWidth: `${CALC_MAX_WIDTH}px`,
                        zIndex: 1000, margin: 0, padding: '10px 10px 8px 10px',
                        display: 'flex', flexDirection: 'column',
                        borderRadius: '18px', border: '1px solid var(--glass-border)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.55)', background: 'rgba(0, 0, 0, 0.96)',
                        touchAction: 'auto'
                    } : {
                        position: 'fixed',
                        left: `${position.x}px`, top: `${position.y}px`,
                        width: `${size.width}px`, height: `${size.height}px`,
                        maxWidth: `${CALC_MAX_WIDTH}px`, maxHeight: `${CALC_MAX_HEIGHT}px`,
                        zIndex: 1000, resize: 'none', margin: 0, transform: 'none',
                        padding: '10px 0', display: 'flex', flexDirection: 'column', background: 'rgba(0, 0, 0, 0.96)'
                    }}
                >
                    <div
                        className="floating-notes-header"
                        onMouseDown={!isMobile ? onDragStart : undefined}
                        onTouchStart={isMobile ? handleMobileWindowTouchStart : onDragStart}
                        onTouchMove={isMobile ? handleMobileWindowTouchMove : undefined}
                        onTouchEnd={isMobile ? handleMobileWindowTouchEnd : undefined}
                        onTouchCancel={isMobile ? handleMobileWindowTouchEnd : undefined}
                        style={{ cursor: isMobile ? 'grab' : 'move', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', userSelect: 'none', touchAction: 'none' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'white' }}>Rechner</h3>
                            {isMobile && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>↕︎ ziehen</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                className="floating-notes-close"
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none', padding: '0 5px' }}
                            > &times; </button>
                        </div>
                    </div>

                    <input
                        className="calc-display"
                        style={{ fontSize, border: 'none', outline: 'none', width: '100%', textAlign: 'right', background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit', caretColor: 'rgba(255,255,255,0.6)' }}
                        value={currentValue}
                        onChange={(e) => {
                            setHasCalcActivity(true);
                            const raw = e.target.value.replace(',', '.').replace(/[^0-9.-]/g, '');
                            if (raw === '' || raw === '-') { setCurrentValue(raw || '0'); return; }
                            // Prevent multiple dots
                            const parts = raw.split('.');
                            const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
                            setCurrentValue(cleaned);
                            setWaitingForNewValue(false);
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            setHasCalcActivity(true);
                            const pasted = (e.clipboardData.getData('text') || '').replace(',', '.').replace(/[^0-9.-]/g, '');
                            if (pasted) {
                                setCurrentValue(pasted);
                                setWaitingForNewValue(false);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleEquals(); }
                            if (e.key === 'Backspace' && currentValue.length <= 1) {
                                e.preventDefault();
                                setCurrentValue('0');
                            }
                        }}
                        inputMode="decimal"
                    />

                    <div className="calc-wrapper">
                        <div className="calc-grid">
                            <button className="calc-btn calc-top" onClick={handleClear}>{currentValue === '0' ? 'AC' : 'C'}</button>
                            <button className="calc-btn calc-top" onClick={handleToggleSign}>+/-</button>
                            <button className="calc-btn calc-top" onClick={handlePercent}>%</button>
                            <button className={`calc-btn calc-op ${operator === '÷' && waitingForNewValue ? 'active' : ''}`} onClick={() => handleOperator('÷')}>÷</button>

                            <button className="calc-btn calc-num" onClick={() => handleDigit('7')}>7</button>
                            <button className="calc-btn calc-num" onClick={() => handleDigit('8')}>8</button>
                            <button className="calc-btn calc-num" onClick={() => handleDigit('9')}>9</button>
                            <button className={`calc-btn calc-op ${operator === '×' && waitingForNewValue ? 'active' : ''}`} onClick={() => handleOperator('×')}>×</button>

                            <button className="calc-btn calc-num" onClick={() => handleDigit('4')}>4</button>
                            <button className="calc-btn calc-num" onClick={() => handleDigit('5')}>5</button>
                            <button className="calc-btn calc-num" onClick={() => handleDigit('6')}>6</button>
                            <button className={`calc-btn calc-op ${operator === '-' && waitingForNewValue ? 'active' : ''}`} onClick={() => handleOperator('-')}>-</button>

                            <button className="calc-btn calc-num" onClick={() => handleDigit('1')}>1</button>
                            <button className="calc-btn calc-num" onClick={() => handleDigit('2')}>2</button>
                            <button className="calc-btn calc-num" onClick={() => handleDigit('3')}>3</button>
                            <button className={`calc-btn calc-op ${operator === '+' && waitingForNewValue ? 'active' : ''}`} onClick={() => handleOperator('+')}>+</button>

                            <button className="calc-btn calc-num" onClick={() => handleDigit('0')}>0</button>
                            <button className="calc-btn calc-num" onClick={handleDot}>,</button>
                            <button className="calc-btn calc-top" onClick={handleBackspace} title="Eine Ziffer löschen">⌫</button>
                            <button className="calc-btn calc-op" onClick={handleEquals}>=</button>
                        </div>
                    </div>

                    {/* Resizer Desktop */}
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
            {showMobileResultHelper && (
                <div
                    style={{
                        position: 'fixed',
                        right: '12px',
                        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
                        zIndex: 1001,
                        minWidth: '120px',
                        maxWidth: '170px',
                        padding: '8px 10px 9px 10px',
                        borderRadius: '12px',
                        background: 'rgba(0, 0, 0, 0.92)',
                        border: '1.8px solid #9CFF00',
                        color: '#fff',
                        lineHeight: 1,
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 1px rgba(156,255,0,0.25), 0 10px 22px rgba(0,0,0,0.48), 0 0 14px rgba(156,255,0,0.28)'
                    }}
                    aria-hidden="true"
                >
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.06em', color: '#C7FF63', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Kalk
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {helperText}
                    </div>
                </div>
            )}
        </>
    );
}
