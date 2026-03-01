import React, { useState } from 'react';

const BurgerMenu = ({ authUser, handleLogout, stats }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
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
                            background: 'var(--bg-dark)',
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
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', alignSelf: 'flex-end', marginBottom: '1rem'
                            }}
                        >
                            ✕
                        </button>

                        <h3 style={{ color: 'white', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Account</h3>
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

                        <h3 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Mein Lernstand</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto' }}>

                            <div className="stat-card">
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quiz (Wissen testen)</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.quizLearned}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.quizTotal} verinnerlicht</span>
                                </div>
                                <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                    <div className="progress-bar" style={{ width: `${(stats.quizLearned / Math.max(stats.quizTotal, 1)) * 100}%`, background: 'var(--success)' }}></div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WisoR (Eingabe)</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.wisorLearned}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>von {stats.wisorTotal} gemeistert</span>
                                </div>
                                <div className="progress-container" style={{ height: '4px', marginTop: '0.3rem' }}>
                                    <div className="progress-bar" style={{ width: `${(stats.wisorLearned / Math.max(stats.wisorTotal, 1)) * 100}%`, background: 'var(--primary)' }}></div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WisoR E-Commerce</span>
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
        }
      `}</style>
        </>
    );
};

export default BurgerMenu;
