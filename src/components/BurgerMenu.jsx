import React, { useState, memo } from 'react';
import { PomodoroIcon, SettingsIcon, InfoIcon } from './IconLibrary';

const BurgerMenu = memo(({ authUser, handleLogout, stats, isLightMode, toggleTheme, themePreference, setThemePref, onOpenQuestionManager, onOpenLearningDashboard, onStartPomodoro, pomodoroRunning, pomodoroTimeLeft, onStopPomodoro, onOpenAppearanceSettings }) => {
    const [isOpen, setIsOpen] = useState(false);

    const formatPomodoroTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isGuest = !authUser;

    const handleCategoryClick = (category) => {
        if (isGuest) return;
        setIsOpen(false);
        if (onOpenQuestionManager) onOpenQuestionManager(category);
    };

    return (
        <>
            <button
                className="burger-menu-toggle hide-on-print"
                style={{
                    position: 'fixed',
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
                            background: isLightMode
                                ? 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.95))'
                                : 'linear-gradient(180deg, rgba(2,6,23,0.5), rgba(2,6,23,0.72)), var(--app-bg-image), var(--app-bg-color)',
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
                            <div style={{
                                display: 'flex', gap: '2px', background: 'rgba(128,128,128,0.15)', borderRadius: '10px', padding: '2px',
                                opacity: isGuest ? 0.35 : 1, pointerEvents: isGuest ? 'none' : 'auto'
                            }}>
                                {[
                                    { key: 'system', label: '🖥️', title: 'Systemstandard' },
                                    { key: 'light', label: '☀️', title: 'Immer Hell' },
                                    { key: 'dark', label: '🌙', title: 'Immer Dunkel' },
                                ].map(opt => {
                                    const active = (themePreference || 'system') === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            onClick={() => setThemePref && setThemePref(opt.key)}
                                            title={opt.title}
                                            style={{
                                                background: active ? 'var(--glass-bg)' : 'transparent',
                                                border: active ? '1px solid var(--glass-border)' : '1px solid transparent',
                                                borderRadius: '8px',
                                                padding: '0.3rem 0.5rem',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                lineHeight: 1,
                                                transition: 'all 0.2s',
                                                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={isGuest ? undefined : () => { if (onStartPomodoro) onStartPomodoro(); setIsOpen(false); }}
                                    disabled={pomodoroRunning || isGuest}
                                    style={{
                                        background: pomodoroRunning ? 'rgba(239,68,68,0.15)' : 'transparent',
                                        border: pomodoroRunning ? '1px solid rgba(239,68,68,0.3)' : 'none',
                                        cursor: (pomodoroRunning || isGuest) ? 'not-allowed' : 'pointer',
                                        padding: '4px',
                                        borderRadius: '8px',
                                        transition: 'transform 0.2s',
                                        opacity: (pomodoroRunning || isGuest) ? 0.35 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title={isGuest ? 'Nur für registrierte Nutzer' : (pomodoroRunning ? 'Pomodoro läuft bereits' : 'Pomodoro Timer starten (25 Min)')}
                                    onMouseOver={(e) => { if (!pomodoroRunning) e.currentTarget.style.transform = 'scale(1.15)'; }}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <PomodoroIcon size="1.4em" style={{ color: 'var(--text-light)' }} />
                                </button>
                                <button
                                    onClick={isGuest ? undefined : () => { if (onOpenAppearanceSettings) onOpenAppearanceSettings(); setIsOpen(false); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: isGuest ? 'not-allowed' : 'pointer',
                                        padding: '4px',
                                        borderRadius: '8px',
                                        transition: 'transform 0.2s',
                                        opacity: isGuest ? 0.35 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title={isGuest ? 'Nur für registrierte Nutzer' : 'Darstellung anpassen'}
                                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <SettingsIcon size="1.4em" style={{ color: 'var(--text-light)' }} />
                                </button>
                                <a
                                    href="/Beschreibung.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '8px',
                                        transition: 'transform 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textDecoration: 'none'
                                    }}
                                    title="App-Beschreibung (PDF) öffnen"
                                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <InfoIcon size="1.4em" style={{ color: 'var(--text-light)' }} />
                                </a>
                            </div>

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
                                </div>
                            )}

                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', marginLeft: 'auto'
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
                                <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.85 }}>🔒 Im Gast-Modus sind viele Funktionen gesperrt. Registriere dich für vollen Zugriff.</p>
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

                            <div className="stat-card" style={{ cursor: isGuest ? 'not-allowed' : 'pointer', opacity: isGuest ? 0.72 : 1 }} onClick={() => handleCategoryClick('quiz')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quiz (Wissen testen){isGuest ? ' 🔒' : ''}</span>
                                    {!isGuest && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>}
                                </div>
                                {isGuest ? (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Nur mit E-Mail-Login verfügbar</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.quizLearned}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.quizTotal} verinnerlicht</span>
                                        </div>
                                        <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                            <div className="progress-bar" style={{ width: `${(stats.quizLearned / Math.max(stats.quizTotal, 1)) * 100}%`, background: 'var(--success)' }}></div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="stat-card" style={{ cursor: isGuest ? 'not-allowed' : 'pointer', opacity: isGuest ? 0.72 : 1 }} onClick={() => handleCategoryClick('wisor')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WisoR (Eingabe){isGuest ? ' 🔒' : ''}</span>
                                    {!isGuest && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>}
                                </div>
                                {isGuest ? (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Nur mit E-Mail-Login verfügbar</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.wisorLearned}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.wisorTotal} gemeistert</span>
                                        </div>
                                        <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                            <div className="progress-bar" style={{ width: `${(stats.wisorLearned / Math.max(stats.wisorTotal, 1)) * 100}%`, background: 'var(--primary)' }}></div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="stat-card" style={{ cursor: isGuest ? 'not-allowed' : 'pointer', opacity: isGuest ? 0.72 : 1 }} onClick={() => handleCategoryClick('wisorEco')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WisoR E-Commerce{isGuest ? ' 🔒' : ''}</span>
                                    {!isGuest && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>}
                                </div>
                                {isGuest ? (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Nur mit E-Mail-Login verfügbar</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.wisorEcoLearned}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.wisorEcoTotal} gemeistert</span>
                                        </div>
                                        <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                            <div className="progress-bar" style={{ width: `${(stats.wisorEcoLearned / Math.max(stats.wisorEcoTotal, 1)) * 100}%`, background: 'var(--accent)' }}></div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="stat-card" style={{ cursor: isGuest ? 'not-allowed' : 'pointer', opacity: isGuest ? 0.72 : 1 }} onClick={() => handleCategoryClick('rechen')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>KPI's{isGuest ? ' 🔒' : ''}</span>
                                    {!isGuest && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>}
                                </div>
                                {isGuest ? (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Nur mit E-Mail-Login verfügbar</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.rechenLearned}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.rechenTotal} verinnerlicht</span>
                                        </div>
                                        <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                            <div className="progress-bar" style={{ width: `${(stats.rechenLearned / Math.max(stats.rechenTotal, 1)) * 100}%`, background: 'var(--primary)' }}></div>
                                        </div>
                                    </>
                                )}
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
});

export default BurgerMenu;
