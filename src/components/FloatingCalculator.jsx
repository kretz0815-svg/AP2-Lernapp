import React, { useState, useEffect, useRef } from 'react';
import '../index.css';

export default function FloatingCalculator() {
    const [isOpen, setIsOpen] = useState(false);

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
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
        offsetTop: 0
    });

    const dragRef = useRef(false);
    const resizeRef = useRef(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const startSizeRef = useRef({ w: 0, h: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });

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

                if (newWidth < 220) { if (resizeRef.current.includes('l')) newX += (newWidth - 220); newWidth = 220; }
                if (newHeight < 320) { if (resizeRef.current.includes('t')) newY += (newHeight - 320); newHeight = 320; }

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
        if (waitingForNewValue) {
            setCurrentValue(digit);
            setWaitingForNewValue(false);
        } else {
            setCurrentValue(currentValue === '0' ? digit : currentValue + digit);
        }
    };

    const handleOperator = (nextOperator) => {
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
        if (!operator) return;
        const inputValue = parseFloat(currentValue);
        const result = calculate(prevValue, inputValue, operator);
        setCurrentValue(String(result));
        setPrevValue(null);
        setOperator(null);
        setWaitingForNewValue(true);
    };

    const handleClear = () => {
        setCurrentValue('0');
        setPrevValue(null);
        setOperator(null);
        setWaitingForNewValue(false);
    };

    const handleToggleSign = () => {
        setCurrentValue(String(parseFloat(currentValue) * -1));
    };

    const handlePercent = () => {
        setCurrentValue(String(parseFloat(currentValue) / 100));
    };

    const handleDot = () => {
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

    const mobileHeight = Math.min(400, vvState.height * 0.7);

    return (
        <>
            {!isOpen ? (
                <div style={isMobile ? { position: 'fixed', right: '15px', bottom: '90px', zIndex: 1000 } : { position: 'fixed', right: '20px', top: 'calc(50% + 70px)', transform: 'translateY(-50%)', zIndex: 1000 }}>
                    <button
                        className="floating-notes-toggle"
                        onClick={() => setIsOpen(true)}
                        title="Taschenrechner öffnen"
                        style={{ background: '#66295c', color: '#2c3170', fontSize: '1.8rem', fontWeight: 'bold' }}
                    >
                        €
                    </button>
                </div>
            ) : (
                <div
                    className="floating-notes-window fade-in card-face"
                    style={isMobile ? {
                        position: 'fixed',
                        left: '0px',
                        top: `${vvState.offsetTop + vvState.height - mobileHeight}px`,
                        width: '100vw',
                        height: `${mobileHeight}px`,
                        zIndex: 1000, margin: 0, padding: '10px 15px',
                        display: 'flex', flexDirection: 'column',
                        borderRadius: '24px 24px 0 0', border: '1px solid var(--glass-border)',
                        borderBottom: 'none', boxShadow: '0 -5px 25px rgba(0,0,0,0.5)', background: 'rgba(15, 23, 42, 0.95)'
                    } : {
                        position: 'fixed',
                        left: `${position.x}px`, top: `${position.y}px`,
                        width: `${size.width}px`, height: `${size.height}px`,
                        zIndex: 1000, resize: 'none', margin: 0, transform: 'none',
                        padding: '12px', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)'
                    }}
                >
                    <div
                        className="floating-notes-header"
                        onMouseDown={!isMobile ? onDragStart : undefined}
                        onTouchStart={!isMobile ? onDragStart : undefined}
                        style={{ cursor: isMobile ? 'default' : 'move', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', userSelect: 'none' }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Rechner</h3>
                        <button
                            className="floating-notes-close"
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none', padding: '0 5px' }}
                        > &times; </button>
                    </div>

                    <div className="calc-display" style={{ fontSize }}>
                        {currentValue}
                    </div>

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

                        <button className="calc-btn calc-num calc-zero" onClick={() => handleDigit('0')}>0</button>
                        <button className="calc-btn calc-num" onClick={handleDot}>,</button>
                        <button className="calc-btn calc-op" onClick={handleEquals}>=</button>
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
        </>
    );
}
