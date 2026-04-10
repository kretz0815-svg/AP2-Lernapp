import React, { useState, memo } from 'react';
import { PomodoroIcon, SettingsIcon, InfoIcon } from './IconLibrary';

const BurgerMenu = memo(({ authUser, handleLogout, stats, isLightMode, themePreference, setThemePref, onOpenQuestionManager, onOpenLearningDashboard, onStartPomodoro, pomodoroRunning, pomodoroTimeLeft, onStopPomodoro, onOpenAppearanceSettings, profileSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toolIconColor = isLightMode ? '#0f172a' : '#f8fafc';

    const formatPomodoroTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const displayName = String(
        profileSettings?.displayName
        || authUser?.user_metadata?.full_name
        || authUser?.user_metadata?.name
        || authUser?.email?.split('@')[0]
        || 'User'
    ).trim();
    const avatarUrl = String(profileSettings?.avatarDataUrl || '').trim();

    const handleCategoryClick = (category) => {
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => { if (onStartPomodoro) onStartPomodoro(); setIsOpen(false); }}
                                        disabled={pomodoroRunning}
                                        style={{
                                            background: pomodoroRunning ? 'rgba(239,68,68,0.15)' : 'transparent',
                                            border: pomodoroRunning ? '1px solid rgba(239,68,68,0.3)' : 'none',
                                            cursor: pomodoroRunning ? 'not-allowed' : 'pointer',
                                            padding: '4px',
                                            borderRadius: '8px',
                                            transition: 'transform 0.2s',
                                            opacity: pomodoroRunning ? 0.35 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title={pomodoroRunning ? 'Pomodoro läuft bereits' : 'Pomodoro Timer starten (25 Min)'}
                                        onMouseOver={(e) => { if (!pomodoroRunning) e.currentTarget.style.transform = 'scale(1.15)'; }}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <PomodoroIcon size="1.4em" style={{ color: toolIconColor }} />
                                    </button>
                                    <button
                                        onClick={() => { if (onOpenAppearanceSettings) onOpenAppearanceSettings(); setIsOpen(false); }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            borderRadius: '8px',
                                            transition: 'transform 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Darstellung anpassen"
                                        onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <SettingsIcon size="1.4em" style={{ color: toolIconColor }} />
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
                                        <InfoIcon size="1.4em" style={{ color: toolIconColor }} />
                                    </a>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: toolIconColor,
                                        fontSize: '1.25rem',
                                        cursor: 'pointer',
                                        padding: '2px 4px'
                                    }}
                                    title="Menü schließen"
                                >
                                    ✕
                                </button>
                            </div>

                            {pomodoroRunning && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        color: pomodoroTimeLeft <= 60 ? '#ef4444' : toolIconColor,
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

                            <div style={{
                                display: 'flex',
                                gap: '2px',
                                background: 'rgba(128,128,128,0.15)',
                                borderRadius: '10px',
                                padding: '2px',
                                alignSelf: 'flex-start'
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
                        </div>

                        <h3 style={{ color: 'var(--text-light)', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Account</h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Profilbild" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ color: 'var(--text-light)', fontWeight: 700 }}>{displayName.slice(0, 1).toUpperCase()}</span>
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ color: 'var(--text-light)', fontWeight: 'bold', fontSize: '0.92rem', margin: 0, lineHeight: 1.2 }}>{displayName}</p>
                                    <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.82rem', margin: 0, marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{authUser?.email || 'Mit Google angemeldet'}</p>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem' }}>Logout</button>
                        </div>

                        <h3 style={{ color: 'var(--text-light)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Mein Lernstand</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto' }}>

                            <div
                                className="stat-card"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    setIsOpen(false);
                                    if (onOpenLearningDashboard) onOpenLearningDashboard();
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Analyse</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>Daily / Week / Month</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                    Fehlerboard, Schwächen, PDF-Export
                                </div>
                            </div>

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('quiz')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quiz (Wissen testen)</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.quizLearned}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.quizTotal} verinnerlicht</span>
                                    </div>
                                    <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                        <div className="progress-bar" style={{ width: `${(stats.quizLearned / Math.max(stats.quizTotal, 1)) * 100}%`, background: 'var(--success)' }}></div>
                                    </div>
                                </>
                            </div>

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('wisorEco')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WiSoR</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.wisorEcoLearned}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.wisorEcoTotal} verinnerlicht</span>
                                    </div>
                                    <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                        <div className="progress-bar" style={{ width: `${(stats.wisorEcoLearned / Math.max(stats.wisorEcoTotal, 1)) * 100}%`, background: 'var(--accent)' }}></div>
                                    </div>
                                </>
                            </div>

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('rechen')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>KPI's</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.rechenLearned}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.rechenTotal} verinnerlicht</span>
                                    </div>
                                    <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                        <div className="progress-bar" style={{ width: `${(stats.rechenLearned / Math.max(stats.rechenTotal, 1)) * 100}%`, background: 'var(--primary)' }}></div>
                                    </div>
                                </>
                            </div>

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('klr_mc')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>KLR MC</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#22c55e' }}>{stats.klrMcLearned}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.klrMcTotal} verinnerlicht</span>
                                    </div>
                                    <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                        <div className="progress-bar" style={{ width: `${(stats.klrMcLearned / Math.max(stats.klrMcTotal, 1)) * 100}%`, background: '#22c55e' }}></div>
                                    </div>
                                </>
                            </div>

                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick('marketing_review')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>IHK Extras</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                                </div>
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.reviewLearned}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.reviewTotal} verinnerlicht</span>
                                    </div>
                                    <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                        <div className="progress-bar" style={{ width: `${(stats.reviewLearned / Math.max(stats.reviewTotal, 1)) * 100}%`, background: 'var(--accent)' }}></div>
                                    </div>
                                </>
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
