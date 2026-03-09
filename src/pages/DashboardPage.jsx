import React from 'react';
import ResetModal from '../components/ResetModal';

function DashboardPage({
    pomodoroPortal,
    burgerMenuPortal,
    einsteinTilt,
    setAppMode,
    authUser,
    quizDuePool,
    quizProg,
    openResetModal,
    completedWisors,
    wisor1,
    startWisor,
    completedWisorsEco,
    wisorEco,
    notesIcon,
    isLightMode,
    resetModalVisible,
    setResetModalVisible,
    handleResetExecute,
    einsteinRef
}) {
    return (
        <div className="app-container" style={{ zIndex: 10 }}>
            {pomodoroPortal}
            {burgerMenuPortal}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <header style={{ position: 'relative', width: '100%' }}>
                <div className="einstein-header-row">
                    <div ref={einsteinRef} className="einstein-image-container" style={{ cursor: 'pointer' }} onClick={() => setAppMode('appearance_settings')} title="Hintergrund anpassen">
                        <img
                            src="/einstein.webp"
                            alt="Einstein"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                transform: `rotateX(${einsteinTilt.rotateX}deg) rotateY(${einsteinTilt.rotateY}deg)`,
                                transition: 'transform 0.12s ease-out',
                                filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.5))',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                    <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '0px', fontSize: '3.5rem', transform: 'scaleY(1.2)', transformOrigin: 'bottom', margin: '0 0 0 0', color: 'var(--text-light)', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>MASTERPAT APP</h1>
                </div>
                <p className="subtitle" style={{ marginTop: '0.8rem' }}>Wähle deinen Lernmodus</p>
            </header>
            <div className="dashboard-grid">
                <div className="dash-card" onClick={() => { setAppMode('quiz_setup'); }}>
                    <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
                        <svg width="0.9em" height="0.9em" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="85" cy="85" r="50" fill="none" stroke="var(--text-light)" strokeWidth="35" />
                            <circle cx="85" cy="85" r="25" fill="var(--text-light)" />
                            <rect x="190" y="45" width="290" height="80" rx="10" fill="var(--text-light)" />
                            <circle cx="85" cy="256" r="50" fill="none" stroke="var(--text-light)" strokeWidth="35" />
                            <rect x="190" y="216" width="290" height="80" rx="10" fill="var(--text-light)" />
                            <circle cx="85" cy="427" r="50" fill="none" stroke="var(--text-light)" strokeWidth="35" />
                            <rect x="190" y="387" width="290" height="80" rx="10" fill="var(--text-light)" />
                        </svg>
                    </div>
                    <h2>Wissen testen<br />(Quiz)</h2>
                    <p>Multiple-Choice Fragen zum Überprüfen deines Wissensstands.</p>
                    {!authUser ? (
                        <div className="chip">🔒 3 Testfragen (Gast)</div>
                    ) : (
                        <div className="chip">{quizDuePool?.length === 0 ? 'Alles gemeistert! 🎉' : `${quizDuePool?.length} Fragen fällig`}</div>
                    )}

                    {(Object.keys(quizProg || {}).length > 0 || !!authUser?.id) && (
                        <button
                            className="btn-secondary"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                            onClick={(e) => { e.stopPropagation(); openResetModal(e, 'quiz'); }}
                        >
                            🔄 Lernfortschritt zurücksetzen
                        </button>
                    )}
                </div>

                <div className="dash-card" style={!authUser ? { opacity: 0.55, cursor: 'not-allowed' } : {}} onClick={() => { if (authUser) startWisor('wisor1'); }}>
                    <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
                        <svg width="1.2em" height="1.2em" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 280 200 H 460 V 420 L 420 460 L 380 420 L 340 460 L 300 420 L 260 460 L 220 420 V 320" fill="none" stroke="var(--text-light)" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                            <rect x="290" y="270" width="140" height="24" rx="12" fill="var(--text-light)" />
                            <rect x="290" y="325" width="140" height="24" rx="12" fill="var(--text-light)" />
                            <rect x="290" y="380" width="80" height="24" rx="12" fill="var(--text-light)" />
                            <g transform="translate(190, 220) rotate(45)">
                                <rect x="-20" y="40" width="40" height="200" rx="20" fill="var(--text-light)" />
                                <rect x="-60" y="-45" width="120" height="90" rx="5" fill="var(--text-light)" />
                                <rect x="-80" y="-35" width="20" height="70" fill="var(--text-light)" />
                                <rect x="-105" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                                <rect x="60" y="-35" width="20" height="70" fill="var(--text-light)" />
                                <rect x="80" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                            </g>
                        </svg>
                    </div>
                    <h2>WisoR<br />(Eingabe)</h2>
                    <p>Freitext Eingabe für Zahlen und Fakten. Gekonntes verschwindet!</p>
                    {!authUser ? (
                        <div className="chip">🔒 Nur mit Account</div>
                    ) : (
                        <div className="chip">{Object.keys(completedWisors || {}).length === wisor1?.questions?.length ? 'Alles gemeistert! 🎉' : `${(wisor1?.questions?.length || 0) - Object.keys(completedWisors || {}).length} Fragen verfügbar`}</div>
                    )}

                    {authUser && Object.keys(completedWisors || {}).length > 0 && (
                        <button
                            className="btn-secondary"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                            onClick={(e) => { e.stopPropagation(); openResetModal(e, 'wisor'); }}
                        >
                            🔄 Lernfortschritt zurücksetzen
                        </button>
                    )}
                </div>

                <div className="dash-card" style={!authUser ? { opacity: 0.55, cursor: 'not-allowed' } : {}} onClick={() => { if (authUser) startWisor('wisorEco'); }}>
                    <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
                        <svg width="1.2em" height="1.2em" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 280 200 H 460 V 420 L 420 460 L 380 420 L 340 460 L 300 420 L 260 460 L 220 420 V 320" fill="none" stroke="var(--text-light)" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                            <text x="290" y="375" fontSize="130" fontWeight="900" fill="var(--text-light)" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">$</text>
                            <rect x="340" y="270" width="100" height="24" rx="12" fill="var(--text-light)" />
                            <rect x="340" y="325" width="100" height="24" rx="12" fill="var(--text-light)" />
                            <rect x="340" y="380" width="60" height="24" rx="12" fill="var(--text-light)" />
                            <g transform="translate(190, 220) rotate(45)">
                                <rect x="-20" y="40" width="40" height="200" rx="20" fill="var(--text-light)" />
                                <rect x="-60" y="-45" width="120" height="90" rx="5" fill="var(--text-light)" />
                                <rect x="-80" y="-35" width="20" height="70" fill="var(--text-light)" />
                                <rect x="-105" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                                <rect x="60" y="-35" width="20" height="70" fill="var(--text-light)" />
                                <rect x="80" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                            </g>
                        </svg>
                    </div>
                    <h2>WisoR im<br />E-Commerce</h2>
                    <p>Freitext Eingabe für E-Commerce spezifische Aufgaben.</p>
                    {!authUser ? (
                        <div className="chip">🔒 Nur mit Account</div>
                    ) : (
                        <div className="chip">{Object.keys(completedWisorsEco || {}).length === (wisorEco?.questions?.length || 0) && (wisorEco?.questions?.length || 0) > 0 ? 'Alles gemeistert! 🎉' : `${(wisorEco?.questions?.length || 0) - Object.keys(completedWisorsEco || {}).length} Fragen verfügbar`}</div>
                    )}

                    {authUser && Object.keys(completedWisorsEco || {}).length > 0 && (
                        <button
                            className="btn-secondary"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                            onClick={(e) => { e.stopPropagation(); openResetModal(e, 'wisorEco'); }}
                        >
                            🔄 Lernfortschritt zurücksetzen
                        </button>
                    )}
                </div>

                <div className="dash-card" onClick={() => { setAppMode('notes_manager'); }}>
                    <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
                        <img
                            src={notesIcon}
                            alt="Notizen"
                            style={{
                                width: '1.05em',
                                height: '1.05em',
                                objectFit: 'contain',
                                filter: isLightMode ? 'none' : 'invert(1)'
                            }}
                        />
                    </div>
                    <h2>Meine Notizen</h2>
                    <p>Deine gespeicherten Notizen ansehen und als PDF exportieren.</p>
                    <div className="chip" style={{ marginTop: 'auto' }}>Gespeichert</div>
                </div>

                <div className="dash-card" onClick={() => setAppMode('kalkulation')}>
                    <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
                        <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round">
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
                    </div>
                    <h2>Kalkulations-<br />Boss</h2>
                    <p>Meistere Vorwärts-, Rückwärts- und Differenzkalkulation spielerisch.</p>
                    {!authUser ? (
                        <div className="chip">🔒 Level 1 frei (Gast)</div>
                    ) : (
                        <div className="chip">3 Level</div>
                    )}
                    <button
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
                        onClick={(e) => { e.stopPropagation(); openResetModal(e, 'kalkulation'); }}
                    >
                        🔄 Lernfortschritt zurücksetzen
                    </button>
                </div>

                <div className="dash-card" onClick={() => setAppMode('break_even')}>
                    <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
                        <svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="3" x2="3" y2="21" />
                            <line x1="3" y1="21" x2="21" y2="21" />
                            <line x1="4" y1="17" x2="9" y2="17" />
                            <line x1="9" y1="17" x2="13" y2="12" />
                            <line x1="13" y1="12" x2="20" y2="12" />
                            <circle cx="9" cy="17" r="1.2" fill="var(--text-light)" stroke="none" />
                            <circle cx="13" cy="12" r="1.2" fill="var(--text-light)" stroke="none" />
                        </svg>
                    </div>
                    <h2>Break Even<br />Point</h2>
                    <p>Trainiere Deckungsbeitrag, Gewinnschwelle in Stück und kritischen Umsatz.</p>
                    <div className="chip">Neuer Raum</div>
                    <button
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
                        onClick={(e) => { e.stopPropagation(); openResetModal(e, 'breakEven'); }}
                    >
                        🔄 Lernfortschritt zurücksetzen
                    </button>
                </div>

                <div className="dash-card" onClick={() => setAppMode('klr')}>
                    <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
                        <svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2.5" />
                            <line x1="7" y1="9" x2="17" y2="9" />
                            <line x1="7" y1="13" x2="12" y2="13" />
                            <line x1="7" y1="17" x2="10" y2="17" />
                            <line x1="16" y1="13" x2="16" y2="18" />
                            <line x1="14" y1="15.5" x2="18" y2="15.5" />
                        </svg>
                    </div>
                    <h2>KLR Startup<br />Survival</h2>
                    <p>Gamifizierte Kosten- und Leistungsrechnung im E-Commerce-Setting.</p>
                    <div className="chip">Neu: Phase 1</div>
                    <button
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
                        onClick={(e) => { e.stopPropagation(); openResetModal(e, 'klr'); }}
                    >
                        🔄 Lernfortschritt zurücksetzen
                    </button>
                </div>
            </div>

            <ResetModal
                isOpen={resetModalVisible}
                onClose={() => setResetModalVisible(false)}
                onConfirm={handleResetExecute}
            />
        </div>
    );
}

export default DashboardPage;
