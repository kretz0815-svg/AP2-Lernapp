import React, { useState } from 'react';

const BurgerMenu = ({ authUser, handleLogout, stats, isLightMode, toggleTheme, onOpenQuestionManager, onOpenLearningDashboard, onStartPomodoro, pomodoroRunning, pomodoroTimeLeft, onStopPomodoro, onOpenAppearanceSettings }) => {
    const [isOpen, setIsOpen] = useState(false);

    const formatPomodoroTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleCategoryClick = (category) => {
        setIsOpen(false);
        if (onOpenQuestionManager) onOpenQuestionManager(category);
    };

    return (
        <>
            <button
                className="burger-menu-toggle hide-on-print"
                style={{
                    position: 'absolute',
                    left: 0,
                    top: '0',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    zIndex: 1000,
                    color: 'var(--text-light)',
                    transition: 'transform 0.2s'
                }}
                onClick={() => setIsOpen(true)}
                title="Menü öffnen"
            >
                ☰
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 9998,
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setIsOpen(false)}>
                    <div
                        className="burger-sidebar"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: '300px',
                            maxWidth: '80vw',
                            background: 'linear-gradient(180deg, rgba(2,6,23,0.5), rgba(2,6,23,0.72)), var(--app-bg-image), var(--app-bg-color)',
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                            backgroundRepeat: 'no-repeat',
                            borderRight: '1px solid var(--glass-border)',
                            padding: '2rem 1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '4px 0 25px rgba(0,0,0,0.5)',
                            zIndex: 9999,
                            animation: 'slideInLeft 0.3s ease forwards'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)', transition: 'transform 0.2s', padding: 0
                                }}
                                title={isLightMode ? 'Zum Darkmode wechseln' : 'Zum Hellmodus wechseln'}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg viewBox="0 0 100 50" width="3em" height="1.5em" style={{ overflow: 'visible', transition: 'transform 0.3s ease-in-out', transform: isLightMode ? 'scaleX(-1)' : 'scaleX(1)' }}>
                                    <rect x="-1" y="4" width="75" height="42" rx="21" fill="currentColor" />
                                    <circle cx="75" cy="25" r="25" fill="var(--bg-dark)" stroke="currentColor" strokeWidth="6" />
                                    <path d="M69 13 A 11 11 0 1 0 84 33 A 13 13 0 1 1 69 13 Z" fill="currentColor" />
                                    <polygon points="87,20 88.5,23.5 92,25 88.5,26.5 87,30 85.5,26.5 82,25 85.5,23.5" fill="currentColor" />
                                    <polygon points="78,16 79,18 81,19 79,20 78,22 77,20 75,19 77,18" fill="currentColor" />
                                </svg>
                            </button>
                            <button
                                onClick={() => { if (onStartPomodoro) onStartPomodoro(); setIsOpen(false); }}
                                disabled={pomodoroRunning}
                                style={{
                                    background: pomodoroRunning ? 'rgba(239,68,68,0.15)' : 'transparent',
                                    border: pomodoroRunning ? '1px solid rgba(239,68,68,0.3)' : 'none',
                                    cursor: pomodoroRunning ? 'default' : 'pointer',
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '8px',
                                    transition: 'transform 0.2s',
                                    opacity: pomodoroRunning ? 0.5 : 1
                                }}
                                title={pomodoroRunning ? 'Pomodoro läuft bereits' : 'Pomodoro Timer starten (25 Min)'}
                                onMouseOver={(e) => { if (!pomodoroRunning) e.currentTarget.style.transform = 'scale(1.15)'; }}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg viewBox="0 0 100 100" width="1.8em" height="1.8em" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)' }}>
                                    {/* Tomato body */}
                                    <ellipse cx="50" cy="56" rx="38" ry="34" strokeWidth="6" />
                                    {/* Stem/leaves */}
                                    <path d="M50 22 C50 16, 46 12, 42 14" strokeWidth="4" />
                                    <path d="M42 28 C36 20, 30 22, 32 28" strokeWidth="3.5" fill="currentColor" />
                                    <path d="M46 26 C44 18, 38 16, 36 22" strokeWidth="3.5" fill="currentColor" />
                                    <path d="M50 25 C50 17, 46 14, 44 20" strokeWidth="3.5" fill="currentColor" />
                                    <path d="M54 26 C56 18, 60 16, 62 22" strokeWidth="3.5" fill="currentColor" />
                                    <path d="M58 28 C62 20, 68 22, 66 28" strokeWidth="3.5" fill="currentColor" />
                                    {/* Clock circle (dashed right half) */}
                                    <circle cx="55" cy="55" r="16" strokeWidth="3.5" strokeDasharray="0 25.1 50.2" />
                                    <path d="M55 55 L55 55" strokeWidth="0" />
                                    <circle cx="55" cy="55" r="16" strokeWidth="3.5" strokeDasharray="3 5" strokeDashoffset="-25" />
                                    {/* Clock hands */}
                                    <line x1="55" y1="55" x2="55" y2="44" strokeWidth="3.5" />
                                    <line x1="55" y1="55" x2="63" y2="60" strokeWidth="3.5" />
                                    {/* Arrow on clock */}
                                    <path d="M40 44 C36 38, 42 34, 48 38" strokeWidth="3" />
                                    <path d="M40 44 L42 39 L37 41" strokeWidth="2.5" fill="currentColor" />
                                    {/* Hourglass */}
                                    <path d="M28 62 L28 74 L36 74 L36 62 Z" strokeWidth="3" fill="none" />
                                    <line x1="28" y1="68" x2="36" y2="68" strokeWidth="2" />
                                    <path d="M30 62 L34 66 L30 66 Z" fill="currentColor" stroke="none" />
                                </svg>
                            </button>
                            <button
                                onClick={() => { if (onOpenAppearanceSettings) onOpenAppearanceSettings(); setIsOpen(false); }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '8px',
                                    transition: 'transform 0.2s'
                                }}
                                title="Darstellung anpassen"
                                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width="1.8em" height="1.8em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)' }}>
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </button>
                            {pomodoroRunning && (
                                <div style={
                                    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }
                                }>
                                    <span style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        color: pomodoroTimeLeft <= 60 ? '#ef4444' : 'var(--text-light)',
                                        animation: pomodoroTimeLeft <= 60 ? 'pomoPulse 1s ease-in-out infinite' : 'none'
                                    }}>
                                        {formatPomodoroTime(pomodoroTimeLeft)}
                                    </span>
                                    <button
                                        onClick={() => { if (onStopPomodoro) onStopPomodoro(); setIsOpen(false); }}
                                        style={{
                                            padding: '0.15rem 0.45rem',
                                            borderRadius: '5px',
                                            border: '1px solid rgba(239,68,68,0.4)',
                                            background: 'rgba(239,68,68,0.1)',
                                            color: '#ef4444',
                                            fontSize: '0.6rem',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Beenden
                                    </button>
                                    <style>{`
                                        @keyframes pomoPulse {
                                            0%, 100% { opacity: 1; }
                                            50% { opacity: 0.5; }
                                        }
                                    `}</style>
                                </div>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <h3 style={{ color: 'var(--text-light)', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Account</h3>
                        {authUser ? (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{authUser.email}</p>
                                <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem' }}>Logout</button>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Gast-Modus (Lokal)</p>
                                <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem' }}>Zum Login wechseln</button>
                            </div>
                        )}

                        <h3 style={{ color: 'var(--text-light)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Mein Lernstand</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto' }}>

                            {authUser ? (
                                <div
                                    className="stat-card"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                        setIsOpen(false);
                                        if (onOpenLearningDashboard) onOpenLearningDashboard();
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lernkarten Analyse</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>Daily / Week / Month</span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                        Fehlerboard, Schwächen, PDF-Export
                                    </div>
                                </div>
                            ) : (
                                <div className="stat-card" style={{ opacity: 0.72, cursor: 'not-allowed' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lernkarten Analyse 🔒</span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                        Nur mit E-Mail-Login verfügbar
                                    </div>
                                </div>
                            )}

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('quiz')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quiz (Wissen testen)</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.quizLearned}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.quizTotal} verinnerlicht</span>
                                </div>
                                <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                    <div className="progress-bar" style={{ width: `${(stats.quizLearned / Math.max(stats.quizTotal, 1)) * 100}%`, background: 'var(--success)' }}></div>
                                </div>
                            </div>

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('wisor')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WisoR (Eingabe)</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.wisorLearned}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.wisorTotal} gemeistert</span>
                                </div>
                                <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                    <div className="progress-bar" style={{ width: `${(stats.wisorLearned / Math.max(stats.wisorTotal, 1)) * 100}%`, background: 'var(--primary)' }}></div>
                                </div>
                            </div>

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('wisorEco')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WisoR E-Commerce</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.wisorEcoLearned}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.wisorEcoTotal} gemeistert</span>
                                </div>
                                <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                    <div className="progress-bar" style={{ width: `${(stats.wisorEcoLearned / Math.max(stats.wisorEcoTotal, 1)) * 100}%`, background: 'var(--accent)' }}></div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          padding: 0.8rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          transition: background 0.15s ease;
        }
        .stat-card:hover {
          background: rgba(255,255,255,0.06);
        }
      `}</style>
        </>
    );
};

export default BurgerMenu;
