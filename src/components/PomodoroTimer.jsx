import React, { useState, useEffect, useRef } from 'react';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds

const PomodoroIcon = ({ size = '1.5em' }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="50" cy="56" rx="38" ry="34" strokeWidth="6" />
        <path d="M50 22 C50 16, 46 12, 42 14" strokeWidth="4" />
        <path d="M42 28 C36 20, 30 22, 32 28" strokeWidth="3.5" fill="currentColor" />
        <path d="M46 26 C44 18, 38 16, 36 22" strokeWidth="3.5" fill="currentColor" />
        <path d="M50 25 C50 17, 46 14, 44 20" strokeWidth="3.5" fill="currentColor" />
        <path d="M54 26 C56 18, 60 16, 62 22" strokeWidth="3.5" fill="currentColor" />
        <path d="M58 28 C62 20, 68 22, 66 28" strokeWidth="3.5" fill="currentColor" />
        <circle cx="55" cy="55" r="16" strokeWidth="3.5" strokeDasharray="0 25.1 50.2" />
        <circle cx="55" cy="55" r="16" strokeWidth="3.5" strokeDasharray="3 5" strokeDashoffset="-25" />
        <line x1="55" y1="55" x2="55" y2="44" strokeWidth="3.5" />
        <line x1="55" y1="55" x2="63" y2="60" strokeWidth="3.5" />
        <path d="M40 44 C36 38, 42 34, 48 38" strokeWidth="3" />
        <path d="M40 44 L42 39 L37 41" strokeWidth="2.5" fill="currentColor" />
        <path d="M28 62 L28 74 L36 74 L36 62 Z" strokeWidth="3" fill="none" />
        <line x1="28" y1="68" x2="36" y2="68" strokeWidth="2" />
        <path d="M30 62 L34 66 L30 66 Z" fill="currentColor" stroke="none" />
    </svg>
);

export default function PomodoroTimer({ isActive, onStart, onStop, onTimeUp, onTick, sessionLog, forceStop }) {
    const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
    const [isRunning, setIsRunning] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [analysisSnapshot, setAnalysisSnapshot] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [showFinalCountdown, setShowFinalCountdown] = useState(false);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const endTimeRef = useRef(null);
    const lastForceStopRef = useRef(0);

    const buildSessionAnalysis = (endTimestamp = null) => {
        if (!sessionLog || sessionLog.length === 0) return null;

        const total = sessionLog.length;
        const correct = sessionLog.filter(l => l.correct).length;
        const wrong = sessionLog.filter(l => !l.correct);
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        const topicMap = {};
        sessionLog.forEach(l => {
            const topic = l.topic || 'Allgemein';
            if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
            topicMap[topic].total++;
            if (l.correct) topicMap[topic].correct++;
        });

        const weakTopics = Object.entries(topicMap)
            .filter((entry) => {
                const v = entry[1];
                return v.total >= 2 && (v.correct / v.total) < 0.5;
            })
            .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));

        const resolvedEnd = endTimestamp ?? endTimeRef.current;
        const timeUsed = startTimeRef.current && resolvedEnd
            ? Math.round((resolvedEnd - startTimeRef.current) / 1000)
            : POMODORO_DURATION - timeLeft;

        return { total, correct, wrong, accuracy, weakTopics, timeUsed, topicMap };
    };

    const handleStart = () => {
        setTimeLeft(POMODORO_DURATION);
        setIsRunning(true);
        setIsPaused(false);
        setShowResults(false);
        setShowFinalCountdown(false);
        startTimeRef.current = Date.now();
        endTimeRef.current = null;
        setAnalysisSnapshot(null);
        if (onTick) onTick(POMODORO_DURATION);
        if (onStart) onStart();
    };

    // React to forceStop from parent
    useEffect(() => {
        if (forceStop && forceStop !== lastForceStopRef.current && isRunning) {
            lastForceStopRef.current = forceStop;
            endTimeRef.current = Date.now();
            setAnalysisSnapshot(buildSessionAnalysis(endTimeRef.current));
            setIsRunning(false);
            setIsPaused(false);
            setShowFinalCountdown(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            setShowResults(true);
            if (onStop) onStop();
        }
    }, [forceStop]);

    // React to isActive from parent (BurgerMenu start button)
    const prevIsActiveRef = useRef(false);
    useEffect(() => {
        if (isActive && !prevIsActiveRef.current && !isRunning) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            handleStart();
        }
        prevIsActiveRef.current = isActive;
    }, [isActive, isRunning]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Timer logic
    useEffect(() => {
        if (isRunning && !isPaused) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        endTimeRef.current = Date.now();
                        setAnalysisSnapshot(buildSessionAnalysis(endTimeRef.current));
                        setIsRunning(false);
                        setShowResults(true);
                        setShowFinalCountdown(false);
                        if (onTimeUp) onTimeUp();
                        return 0;
                    }
                    if (prev <= 4 && prev > 1) {
                        setShowFinalCountdown(true);
                    }
                    const next = prev - 1;
                    if (onTick) onTick(next);
                    return next;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isRunning, isPaused, onTimeUp, onTick]);

    const handlePause = () => {
        setIsPaused(!isPaused);
    };

    const handleCancel = () => {
        endTimeRef.current = Date.now();
        setAnalysisSnapshot(buildSessionAnalysis(endTimeRef.current));
        setIsRunning(false);
        setIsPaused(false);
        setShowFinalCountdown(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setShowResults(true);
        if (onStop) onStop();
    };

    const handleClose = () => {
        setShowResults(false);
        setTimeLeft(POMODORO_DURATION);
        setAnalysisSnapshot(null);
        if (onStop) onStop();
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progress = ((POMODORO_DURATION - timeLeft) / POMODORO_DURATION) * 100;

    // --- Full countdown overlay (last 3 seconds) ---
    if (showFinalCountdown && isRunning) {
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 99999,
                background: 'rgba(220, 38, 38, 0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                animation: 'pulseRed 0.5s ease-in-out infinite alternate'
            }}>
                <div style={{
                    fontSize: '10rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '0 0 60px rgba(255,255,255,0.5)',
                    animation: 'countdownPop 1s ease-in-out infinite',
                    fontFamily: '"Anton", sans-serif'
                }}>
                    {timeLeft}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.5rem', marginTop: '1rem' }}>
                    ⏱ Zeit läuft ab!
                </p>
                <style>{`
                    @keyframes pulseRed {
                        from { background: rgba(220, 38, 38, 0.85); }
                        to { background: rgba(185, 28, 28, 0.95); }
                    }
                    @keyframes countdownPop {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.15); }
                        100% { transform: scale(1); }
                    }
                `}</style>
            </div>
        );
    }

    // --- Results overlay ---
    if (showResults) {
        const analysis = analysisSnapshot;

        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 99999,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(15px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '20px',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <span style={{ color: 'var(--text-light)' }}><PomodoroIcon size="3rem" /></span>
                        <h2 style={{ color: 'var(--text-light)', margin: '0.5rem 0 0.3rem 0', fontSize: '1.5rem' }}>
                            Pomodoro beendet!
                        </h2>
                        {analysis && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                {Math.floor(analysis.timeUsed / 60)} Min {analysis.timeUsed % 60} Sek aktive Lernzeit
                            </p>
                        )}
                    </div>

                    {analysis && analysis.total > 0 ? (
                        <>
                            {/* Score Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-light)' }}>{analysis.total}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fragen</div>
                                </div>
                                <div style={{
                                    background: 'rgba(34,197,94,0.08)',
                                    border: '1px solid rgba(34,197,94,0.25)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#22c55e' }}>{analysis.correct}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>Richtig ✓</div>
                                </div>
                                <div style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444' }}>{analysis.wrong.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Falsch ✗</div>
                                </div>
                            </div>

                            {/* Accuracy bar */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trefferquote</span>
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        color: analysis.accuracy >= 70 ? '#22c55e' : analysis.accuracy >= 40 ? '#fb923c' : '#ef4444'
                                    }}>
                                        {analysis.accuracy}%
                                    </span>
                                </div>
                                <div style={{
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.08)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${analysis.accuracy}%`,
                                        borderRadius: '4px',
                                        background: analysis.accuracy >= 70 ? '#22c55e' : analysis.accuracy >= 40 ? '#fb923c' : '#ef4444',
                                        transition: 'width 0.5s ease'
                                    }}></div>
                                </div>
                            </div>

                            {/* Weakness analysis */}
                            {analysis.weakTopics.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: '#fb923c', fontSize: '0.9rem', margin: '0 0 0.6rem 0' }}>
                                        ⚠️ Schwachstellen
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {analysis.weakTopics.map(([topic, data], i) => (
                                            <div key={i} style={{
                                                padding: '0.5rem 0.8rem',
                                                borderRadius: '8px',
                                                background: 'rgba(251,146,60,0.08)',
                                                border: '1px solid rgba(251,146,60,0.25)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>{topic}</span>
                                                <span style={{ fontSize: '0.78rem', color: '#fb923c', fontWeight: 'bold' }}>
                                                    {data.correct}/{data.total} ({Math.round((data.correct / data.total) * 100)}%)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Wrong questions list */}
                            {analysis.wrong.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 0.6rem 0' }}>
                                        ✗ Falsch beantwortete Fragen
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '150px', overflowY: 'auto' }}>
                                        {analysis.wrong.map((q, i) => (
                                            <div key={i} style={{
                                                padding: '0.4rem 0.7rem',
                                                borderRadius: '6px',
                                                background: 'rgba(239,68,68,0.06)',
                                                border: '1px solid rgba(239,68,68,0.15)',
                                                fontSize: '0.78rem',
                                                color: 'var(--text-muted)',
                                                lineHeight: '1.3'
                                            }}>
                                                {q.questionText?.substring(0, 100) || `Frage ${i + 1}`}...
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Performance rating */}
                            <div style={{
                                textAlign: 'center',
                                padding: '1rem',
                                borderRadius: '12px',
                                background: analysis.accuracy >= 80 ? 'rgba(34,197,94,0.08)' : analysis.accuracy >= 50 ? 'rgba(251,146,60,0.08)' : 'rgba(239,68,68,0.08)',
                                border: `1px solid ${analysis.accuracy >= 80 ? 'rgba(34,197,94,0.25)' : analysis.accuracy >= 50 ? 'rgba(251,146,60,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                marginBottom: '1rem'
                            }}>
                                <span style={{ fontSize: '2rem' }}>
                                    {analysis.accuracy >= 80 ? '🏆' : analysis.accuracy >= 50 ? '💪' : '📚'}
                                </span>
                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 'bold' }}>
                                    {analysis.accuracy >= 80 ? 'Ausgezeichnet! Weiter so!' :
                                        analysis.accuracy >= 50 ? 'Guter Anfang – dranbleiben!' :
                                            'Themen wiederholen – du schaffst das!'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            <p>Keine Fragen in dieser Sitzung beantwortet.</p>
                            <p style={{ fontSize: '0.85rem' }}>Starte den Timer und beantworte Fragen im Quiz oder WisoR!</p>
                        </div>
                    )}

                    <button
                        onClick={handleClose}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: '#fff',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Schließen
                    </button>
                </div>
            </div>
        );
    }

    // --- Floating timer widget (shown when running) ---
    if (isRunning) {
        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: 9990,
                background: timeLeft <= 60 ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(15px)',
                border: `1px solid ${timeLeft <= 60 ? 'rgba(239,68,68,0.4)' : 'var(--glass-border)'}`,
                borderRadius: '14px',
                padding: '0.5rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease',
                cursor: 'default'
            }}>
                {/* Tomato icon */}
                <span style={{ color: timeLeft <= 60 ? '#ef4444' : '#fff', display: 'flex' }}><PomodoroIcon size="1.3em" /></span>

                {/* Time display */}
                <span style={{
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: timeLeft <= 60 ? '#ef4444' : '#fff',
                    minWidth: '50px',
                    textAlign: 'center'
                }}>
                    {formatTime(timeLeft)}
                </span>

                {/* Mini progress ring */}
                <svg width="24" height="24" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                    <circle cx="12" cy="12" r="10" fill="none"
                        stroke={timeLeft <= 60 ? '#ef4444' : '#22c55e'}
                        strokeWidth="2.5"
                        strokeDasharray={`${(progress / 100) * 62.83} 62.83`}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Pause/Resume */}
                <button
                    onClick={handlePause}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        padding: '0.2rem'
                    }}
                    title={isPaused ? 'Fortsetzen' : 'Pausieren'}
                >
                    {isPaused ? '▶' : '⏸'}
                </button>

                {/* Stop */}
                <button
                    onClick={handleCancel}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        padding: '0.2rem'
                    }}
                    title="Beenden"
                >
                    ⏹
                </button>

                {isPaused && (
                    <span style={{ fontSize: '0.7rem', color: '#fb923c', fontWeight: 'bold' }}>PAUSE</span>
                )}
            </div>
        );
    }

    // Not running, not showing results → render nothing (button is in BurgerMenu)
    return null;
}
