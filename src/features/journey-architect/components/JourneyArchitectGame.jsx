import React, { useState, useEffect } from 'react';
import { useJourneyArchitect } from '../state/JourneyArchitectProvider';
import { L1_SCENARIOS, L2_SCENARIOS, L3_SCENARIOS, L4_SCENARIOS } from '../data/scenarios';
import Confetti from '../../../components/Confetti';
import GeminiPanel from '../../../components/GeminiPanel';
import FloatingPortal from '../../../components/FloatingPortal';
import './journey-architect.css';
import { askGemini } from '../../../geminiClient';

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

    // Feedback
    const [feedback, setFeedback] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // AI Helper
    const [geminiVisible, setGeminiVisible] = useState(false);
    const [geminiQuery, setGeminiQuery] = useState('');
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [geminiResponse, setGeminiResponse] = useState(null);

    const handleGeminiAsk = async () => {
        if (!geminiQuery.trim()) return;
        setGeminiLoading(true);
        try {
            const contextMsg = "Beziehe dich auf Customer Journeys im E-Commerce. Frage: " + geminiQuery;
            const res = await askGemini(contextMsg, "Du bist der Experte für Customer Journeys.");
            setGeminiResponse(res || "Entschuldigung, es gab einen Fehler.");
        } catch (err) {
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
                const prompt = `Bewerte die folgende Antwort des Studenten zum Thema Customer Journey:
Aufgabe: ${challenge.task}
Antwort des Studenten: "${oqAnswer}"
Kriterien: Ist die Antwort fachlich sinnvoll? Gibt es einen konkreten Bezug?
Gibt kurzes, ermutigendes Feedback. Wenn es falsch ist, erkläre warum. Wenn es richtig ist, lobe ihn. Beende mit "KORREKT", wenn es inhaltlich richtig ist, ansonsten "INKORREKT".`;
                
                const res = await askGemini(prompt, "Du bist C-Level Marketing Experte.");
                const correct = res.includes("KORREKT");
                setOqFeedback({ text: res, correct });
                if(correct) setFeedback({ type: 'success', text: 'Klasse Antwort!' });
                else setFeedback({ type: 'error', text: 'Das war leider nicht ganz richtig.' });
            } catch {
                setOqFeedback({ text: 'KI konnte nicht antworten. Wir werten es als richtig!', correct: true });
                setFeedback({ type: 'success', text: 'Weiter gehts!' });
            }
            setOqLoading(false);
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
                    <div className="ja-scenario-box ja-wire">
                        <p>{currentScenario.scenario}</p>
                    </div>

                    <h2 style={{marginTop: '1.5rem'}}>{currentScenario.challenges[activeChallengeIdx].task}</h2>

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
                                className="wisor-input" 
                                placeholder="Deine Antwort hier..." 
                                value={oqAnswer} 
                                onChange={(e)=>setOqAnswer(e.target.value)}
                                style={{ width: '100%', minHeight: '100px', padding: '15px' }}
                            />
                            {oqFeedback && (
                                <div className={`ja-feedback-box ${oqFeedback.correct ? 'success' : 'error'}`} style={{marginTop:'1rem'}}>
                                    {oqFeedback.text.replace(/KORREKT|INKORREKT/g, '')}
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

                        <button className="ja-toggle-ki" onClick={() => setGeminiVisible(!geminiVisible)}>
                            {geminiVisible ? 'KI Ausblenden' : 'KI um Hilfe bitten'}
                        </button>

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

