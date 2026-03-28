import React, { useState } from 'react';
import { useJourneyArchitect } from '../state/JourneyArchitectProvider';
import { L1_SCENARIOS, L2_SCENARIOS, L3_SCENARIOS, L4_SCENARIOS } from '../data/scenarios';
import Confetti from '../../../components/Confetti';
import GeminiPanel from '../../../components/GeminiPanel';
import VideoPanel from '../../../components/VideoPanel';
import FloatingPortal from '../../../components/FloatingPortal';
import './journey-architect.css';
import { askGemini } from '../../../geminiClient';
import { fetchYouTubeVideos } from '../../../youtubeClient';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const LEVEL_DATA = {
    1: { id: 1, title: 'Level 1: 5-Phasen-Journey', scenarios: L1_SCENARIOS, xpPoints: 100 },
    2: { id: 2, title: 'Level 2: 7-Phasen-Journey', scenarios: L2_SCENARIOS, xpPoints: 150 },
    3: { id: 3, title: 'Level 3: 8-Phasen-Journey', scenarios: L3_SCENARIOS, xpPoints: 200 },
    4: { id: 4, title: 'Level 4: Mastermind', scenarios: L4_SCENARIOS, xpPoints: 300 }
};

export default function JourneyArchitectGame({ onBack }) {
    const { progress, grantXp, unlockLevel } = useJourneyArchitect();
    const [view, setView] = useState('menu'); // 'menu', 'level', 'end'

    const [currentLevelId, setCurrentLevelId] = useState(null);
    const [currentScenario, setCurrentScenario] = useState(null);

    // active challenge index
    const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);

    // states for D&D
    const [slots, setSlots] = useState([]);
    const [availableCards, setAvailableCards] = useState([]);
    
    // states for MC
    const [mcSelected, setMcSelected] = useState(null);
    const [mcRevealed, setMcRevealed] = useState(false);

    // states for OQ
    const [oqAnswer, setOqAnswer] = useState('');
    const [oqFeedback, setOqFeedback] = useState(null);
    const [oqLoading, setOqLoading] = useState(false);

    // AI & Video States
    const [geminiVisible, setGeminiVisible] = useState(false);
    const [geminiQuery, setGeminiQuery] = useState('');
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [geminiResponse, setGeminiResponse] = useState('');

    const [wisorVideoOpen, setWisorVideoOpen] = useState(false);
    const [wisorVideoLoading, setWisorVideoLoading] = useState(false);
    const [wisorVideos, setWisorVideos] = useState([]);
    const [wisorVideoError, setWisorVideoError] = useState(null);
    const [selectedWisorVideo, setSelectedWisorVideo] = useState(null);

    // Feedback
    const [feedback, setFeedback] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleGeminiAsk = async () => {
        if (!geminiQuery.trim()) return;
        setGeminiLoading(true);
        try {
            const contextMsg = "Beziehe dich auf Customer Journeys im E-Commerce. Frage: " + geminiQuery;
            const res = await askGemini(contextMsg, "Du bist der Experte für Customer Journeys.");
            setGeminiResponse(res || "Entschuldigung, es gab einen Fehler.");
        } catch (_err) {
            setGeminiResponse("Fehler bei der KI-Anfrage.");
        }
        setGeminiLoading(false);
    };

    const startLevel = (levelId) => {
        const levelData = LEVEL_DATA[levelId];
        const scenario = levelData.scenarios[Math.floor(Math.random() * levelData.scenarios.length)];
        
        setCurrentLevelId(levelId);
        setCurrentScenario(scenario);
        setActiveChallengeIdx(0);
        setFeedback(null);
        setupChallenge(scenario.challenges[0]);
        setView('level');
    };

    const setupChallenge = (challenge) => {
        setFeedback(null);
        if (challenge.type === 'dnd') {
            const shuffled = [...challenge.cards].sort(() => Math.random() - 0.5);
            setAvailableCards(shuffled);
            setSlots(Array(challenge.cards.length).fill(null));
        } else if (challenge.type === 'mc') {
            setMcSelected(null);
            setMcRevealed(false);
        } else if (challenge.type === 'oq') {
            setOqAnswer('');
            setOqFeedback(null);
            setOqLoading(false);
        } else if (challenge.type === 'dnd-master') {
            // Simplified
            setShowConfetti(true);
        }
    };

    const checkChallenge = async () => {
        const challenge = currentScenario.challenges[activeChallengeIdx];

        if (challenge.type === 'dnd') {
            const correctIds = [...challenge.cards].sort((a,b)=>a.order - b.order).map(c=>c.id);
            const userIds = slots.map(c=>c ? c.id : null);
            if(userIds.includes(null)) {
                setFeedback({ type: 'error', text: 'Bitte alle Plätze belegen!' }); return;
            }
            if(JSON.stringify(correctIds) === JSON.stringify(userIds)) {
                setFeedback({ type: 'success', text: 'Korrekt sortiert!' });
            } else {
                setFeedback({ type: 'error', text: 'Die Reihenfolge stimmt noch nicht. Versuch es noch einmal.' });
            }
        } else if (challenge.type === 'oq') {
            setOqLoading(true);
            try {
                const prompt = `Du bist ein strenger aber fairer Marketing-Experte. Bewerte die Antwort des Studenten zur Customer Journey präzise.
Aufgabe: ${challenge.task}
Antwort des Studenten: "${oqAnswer}"

Prüfe:
1. Ist die Antwort inhaltlich korrekt? 
2. Ist sie ausführlich genug oder nur ein "Ja/Nein"? (Verlange eine Begründung oder ein Beispiel).
3. Bezieht sie sich auf die korrekte Phase?

GIB KURZES FEEDBACK (max 3 Sätze). 
WICHTIG: Antworte am Ende ENTWEDER mit dem Wort "KORREKT" (wenn alles passt) ODER "INKORREKT" (wenn es unzureichend oder falsch ist). Sei strenger bei sehr kurzen Antworten.`;
                
                const res = await askGemini(prompt, "Du bist C-Level Marketing Experte.");
                const isCorrect = res.trim().endsWith("KORREKT") || res.includes("KORREKT");
                
                // If it contains "INKORREKT" at the end, force false
                const reallyCorrect = isCorrect && !res.trim().endsWith("INKORREKT");

                setOqFeedback({ text: res.replace(/KORREKT|INKORREKT/g, '').trim(), correct: reallyCorrect });
                
                if(reallyCorrect) {
                  setFeedback({ type: 'success', text: 'Klasse Antwort!' });
                } else {
                  setFeedback({ type: 'error', text: 'Das hat leider noch nicht gereicht.' });
                }
            } catch {
                setOqFeedback({ text: 'KI konnte nicht antworten. Wir werten es als richtig!', correct: true });
                setFeedback({ type: 'success', text: 'Weiter gehts!' });
            }
            setOqLoading(false);
        } else if (challenge.type === 'dnd-master') {
            setFeedback({ type: 'success', text: 'Master-Challenge bestanden! Du hast die 3 Modelle verstanden.' });
        }
    };

    const handleToggleVideos = async () => {
        if (wisorVideoOpen) {
            setWisorVideoOpen(false);
            return;
        }
        setWisorVideoOpen(true);
        const challenge = currentScenario.challenges[activeChallengeIdx];
        const query = challenge.youtubeQuery || "Customer Journey Modelle erklärt";
        
        setWisorVideoLoading(true);
        setWisorVideoError(null);
        try {
            const results = await fetchYouTubeVideos(query, YOUTUBE_API_KEY, 4);
            setWisorVideos(results);
            if (results.length === 0) setWisorVideoError("Keine passenden Videos gefunden.");
        } catch (_e) {
            setWisorVideoError("Fehler beim Laden der Videos.");
        } finally {
            setWisorVideoLoading(false);
        }
    };

    const nextChallenge = () => {
        if(activeChallengeIdx + 1 < currentScenario.challenges.length) {
            const nextIdx = activeChallengeIdx + 1;
            setActiveChallengeIdx(nextIdx);
            setupChallenge(currentScenario.challenges[nextIdx]);
        } else {
            // Level done
            grantXp(LEVEL_DATA[currentLevelId].xpPoints);
            if(currentLevelId < 4) unlockLevel(currentLevelId + 1);
            setShowConfetti(true);
            setView('end');
        }
    };

    return (
        <div className="ja-app fade-in journey-architect-theme" style={{ paddingBottom: '80px' }}>
            <div className="ja-header-bar">
                <button className="ja-back-btn" onClick={view === 'menu' ? onBack : () => setView('menu')}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Zurück
                </button>
                <div className="ja-xp-badge">
                    <span>⭐ {progress.xp} XP</span>
                </div>
            </div>

            <FloatingPortal questionId={`journey_${currentLevelId}`} questionText="Journey Architect" currentAppMode="journey" />

            {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

            {view === 'menu' && (
                <div className="ja-menu-container">
                    <h1 className="ja-title">Journey Architect</h1>
                    <p className="ja-subtitle">Werde zum Meister der Kundenreisen</p>
                    
                    <div className="ja-level-grid">
                        {[1, 2, 3, 4].map((levelId) => {
                            const isLocked = !progress.unlockedLevels.includes(levelId);
                            const lvl = LEVEL_DATA[levelId];
                            return (
                                <div key={levelId} className={`ja-level-card ja-wire ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && startLevel(levelId)}>
                                    <div className="ja-level-icon">{isLocked ? '🔒' : '🗺️'}</div>
                                    <h3>{lvl.title}</h3>
                                    {isLocked && <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Sperre aktiv</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {view === 'level' && currentScenario && (
                <div className="ja-level-container">
                    <div className="ja-challenge-progress">
                        Challenge {activeChallengeIdx + 1} / {currentScenario.challenges.length}
                    </div>

                    {/* AI & Video Help Section (Above Question) */}
                    <div style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            className={`ja-mc-btn ja-wire fade-in ${wisorVideoLoading ? 'loading' : ''}`}
                            onClick={handleToggleVideos}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: wisorVideoOpen ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--primary-purple)' }}
                        >
                            <span>{wisorVideoOpen ? '🙈' : '📺'}</span>
                            {wisorVideoOpen ? 'Video aus' : 'Hilfe-Video'}
                        </button>

                        <button
                            className="ja-mc-btn ja-wire fade-in"
                            onClick={() => setGeminiVisible(!geminiVisible)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: geminiVisible ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--primary-purple)' }}
                        >
                            <span>✨</span>
                            {geminiVisible ? 'KI Schließen' : 'KI um Hilfe bitten'}
                        </button>
                    </div>

                    <VideoPanel
                        isOpen={wisorVideoOpen}
                        isLoading={wisorVideoLoading}
                        videos={wisorVideos}
                        error={wisorVideoError}
                        selectedVideo={selectedWisorVideo}
                        onSelectVideo={setSelectedWisorVideo}
                        onCloseVideo={() => setSelectedWisorVideo(null)}
                    />

                    <GeminiPanel 
                        isOpen={geminiVisible}
                        title="Frage an deinen Architekten-Tutor"
                        placeholder="Brauchst du Hilfe bei der Journey?"
                        query={geminiQuery}
                        onQueryChange={setGeminiQuery}
                        onAsk={handleGeminiAsk}
                        isLoading={geminiLoading}
                        response={geminiResponse}
                    />

                    <div className="ja-scenario-box ja-wire">
                        <p>{currentScenario.scenario}</p>
                    </div>

                    <h2 style={{marginTop: '1.5rem', fontSize: '1.2rem', textAlign: 'center'}}>{currentScenario.challenges[activeChallengeIdx].task}</h2>

                    {/* DND Challenge */}
                    {currentScenario.challenges[activeChallengeIdx].type === 'dnd' && (
                        <div className="ja-dnd-area">
                            <div className="ja-slots">
                                {slots.map((item, idx) => (
                                    <div key={idx} className="ja-slot" 
                                        onClick={() => {
                                            if(!item) return;
                                            const newSlots = [...slots];
                                            newSlots[idx] = null;
                                            setSlots(newSlots);
                                            setAvailableCards([...availableCards, item]);
                                        }}>
                                        {item ? <span className="ja-card-in-slot">{item.label}</span> : <span className="ja-slot-empty">Phase {idx+1}</span>}
                                    </div>
                                ))}
                            </div>
                            <div className="ja-available-cards ja-wire">
                                {availableCards.map((card, idx) => (
                                    <div key={idx} className="ja-card" onClick={() => {
                                        const emptyIdx = slots.findIndex(s=>!s);
                                        if(emptyIdx !== -1) {
                                            const newSlots = [...slots];
                                            newSlots[emptyIdx] = card;
                                            setSlots(newSlots);
                                            setAvailableCards(availableCards.filter(c => c.id !== card.id));
                                        }
                                    }}>
                                        {card.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MC Challenge */}
                    {currentScenario.challenges[activeChallengeIdx].type === 'mc' && (
                        <div className="ja-mc-area">
                            {currentScenario.challenges[activeChallengeIdx].answers.map((ans, idx) => {
                                let btnClass = "ja-mc-btn ja-wire";
                                if (mcRevealed) {
                                    if(ans.correct) btnClass += " correct";
                                    else if (mcSelected === idx) btnClass += " wrong";
                                }
                                return (
                                    <button key={idx} className={btnClass} disabled={mcRevealed}
                                        onClick={() => {
                                            setMcSelected(idx);
                                            setMcRevealed(true);
                                            if(ans.correct) setFeedback({type:'success', text:'Richtig!'});
                                            else setFeedback({type:'error', text:'Leider falsch. Versuch es weiter oder frage die KI.'});
                                        }}
                                    >
                                        {ans.text}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* OQ Challenge */}
                    {currentScenario.challenges[activeChallengeIdx].type === 'oq' && (
                        <div className="ja-oq-area">
                            <textarea 
                                className="wisor-input ja-wire" 
                                placeholder="Deine Antwort hier..." 
                                value={oqAnswer} 
                                onChange={(e)=>setOqAnswer(e.target.value)}
                                style={{ width: '100%', minHeight: '120px', padding: '15px', color:'white', background:'rgba(255,255,255,0.05)' }}
                            />
                            {oqFeedback && (
                                <div className={`ja-feedback-box ${oqFeedback.correct ? 'success' : 'error'}`} style={{marginTop:'1rem', padding:'1rem', borderRadius:'12px', background: oqFeedback.correct ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', border: oqFeedback.correct ? '1px solid #22c55e' : '1px solid #ef4444'}}>
                                    {oqFeedback.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* DND Master */}
                    {currentScenario.challenges[activeChallengeIdx].type === 'dnd-master' && (
                        <div className="ja-dnd-area">
                            <p style={{textAlign:'center', padding:'20px'}}>
                                Master-Stufe freigeschaltet. Wähle Challenge beenden. 
                            </p>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        {feedback && <div className={`ja-feedback ${feedback.type}`}>{feedback.text}</div>}
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {(!feedback || feedback.type === 'error') && currentScenario.challenges[activeChallengeIdx].type !== 'mc' && (
                                <button className="btn-primary" onClick={checkChallenge} disabled={
                                    (currentScenario.challenges[activeChallengeIdx].type === 'oq' && !oqAnswer) || oqLoading
                                }>
                                    {oqLoading ? 'Prüfe...' : 'Prüfen'}
                                </button>
                            )}

                            {(feedback?.type === 'success' || (currentScenario.challenges[activeChallengeIdx].type === 'mc' && mcRevealed)) && (
                                <button className="btn-secondary" onClick={nextChallenge} style={{background: 'var(--primary-purple)', color:'white'}}>
                                    Nächste Challenge
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === 'end' && (
                <div className="ja-end-container ja-wire">
                    <h2>Level Abgeschlossen! 🎉</h2>
                    <p>Du hast das Level erfolgreich gemeistert und neue XP gesammelt.</p>
                    <button className="btn-primary" onClick={() => setView('menu')} style={{marginTop: '2rem', padding:'1rem 2rem', fontSize:'1.1rem'}}>
                        Zurück zur Übersicht
                    </button>
                </div>
            )}
        </div>
    );
}
