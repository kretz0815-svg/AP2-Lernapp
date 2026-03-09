import React, { useState, useEffect } from 'react';
import VideoPanel from '../components/VideoPanel';
import GeminiPanel from '../components/GeminiPanel';
import FloatingCalculator from '../components/FloatingCalculator';
import FloatingNotes from '../components/FloatingNotes';

// --- Safety: Inlined Confetti to avoid ANY import issues causing a black screen ---
const LocalConfetti = ({ amount = 60 }) => {
    const pieces = React.useMemo(() => {
        const colors = ['#6dff73', '#22c55e', '#fef08a', '#f59e0b', '#86efac', '#fbbf24'];
        return Array.from({ length: amount }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 1.5,
            duration: 2.2 + Math.random() * 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 6 + Math.floor(Math.random() * 8),
            rotation: Math.random() * 360,
        }));
    }, [amount]);

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
            {pieces.map((p) => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        top: '-20px',
                        left: `${p.left}%`,
                        width: `${p.size}px`,
                        height: `${p.size * 1.2}px`,
                        backgroundColor: p.color,
                        borderRadius: p.id % 2 === 0 ? '2px' : '50%',
                        opacity: 0,
                        transform: `rotate(${p.rotation}deg)`,
                        animation: `klrConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
                    }}
                />
            ))}
        </div>
    );
};
import wisor1 from '../data/wisor_1.json';
import wisorEco from '../data/wisor_eco.json';
import { formatLatex } from '../utils/formatting';
import { mapWisorAnswerToRating } from '../services/srsFeedbackMapper';
import { reviewTaskWithDSR } from '../services/srsStore';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../supabaseClient';
import './WisorPage.css';

function WisorPage({
    appMode,
    setAppMode,
    burgerMenuPortal,
    pomodoroPortal,
    pomodoroActive,
    pomodoroTimeUpSignal,
    setPomodoroSessionLog,
    activeWisorMode,
    completedWisors,
    setCompletedWisors,
    completedWisorsEco,
    setCompletedWisorsEco,
    wisorVideoOpen,
    setWisorVideoOpen,
    wisorVideoLoading,
    setWisorVideoLoading,
    wisorVideos,
    setWisorVideos,
    wisorVideoError,
    setWisorVideoError,
    selectedWisorVideo,
    setSelectedWisorVideo,
    handleToggleVideos,
    geminiVisible,
    setGeminiVisible,
    geminiQuery,
    setGeminiQuery,
    geminiLoading,
    geminiResponse,
    handleGeminiAsk,
    triggerConfetti,
    showConfetti,
    authUser
}) {
    const { appendLearningEvent, syncProgressToSupabase } = useAppContext();

    const [allWisors, setAllWisors] = useState([]);
    const [currentWisorIndex, setCurrentWisorIndex] = useState(0);
    const [wisorInput, setWisorInput] = useState('');
    const [wisorEvaluated, setWisorEvaluated] = useState(false);
    const [wisorIsCorrect, setWisorIsCorrect] = useState(false);
    const [wisorScore, setWisorScore] = useState({ correct: 0, total: 0 });
    const [lastWisorCorrect, setLastWisorCorrect] = useState(false);

    // Initialize Wisor list on mount or activeWisorMode change
    useEffect(() => {
        const rawWisors = activeWisorMode === 'wisor1' ? [...wisor1.questions] : [...(wisorEco.questions || [])];
        const key = activeWisorMode === 'wisor1' ? 'ap2_wisor_progress' : 'ap2_wisor_eco_progress';
        const wisorProg = JSON.parse(localStorage.getItem(key)) || {};
        const uncompleted = rawWisors.filter(q => !wisorProg[q.id]);
        const shuffled = activeWisorMode === 'wisor1' ? [...uncompleted].sort(() => Math.random() - 0.5) : [...uncompleted];

        setAllWisors(shuffled);
        setCurrentWisorIndex(0);
        setWisorScore({ correct: 0, total: 0 });
        setWisorInput('');
        setWisorEvaluated(false);
        setWisorIsCorrect(false);
        setLastWisorCorrect(false);
        setWisorVideoOpen(false);
        setGeminiVisible(false);
        setGeminiQuery('');
    }, [activeWisorMode, setWisorVideoOpen, setGeminiVisible, setGeminiQuery]);

    useEffect(() => {
        if (pomodoroTimeUpSignal > 0) {
            setCurrentWisorIndex(allWisors.length); // force finish session
        }
    }, [pomodoroTimeUpSignal, allWisors.length]);

    const handleWisorSubmit = (e) => {
        if (e) e.preventDefault();
        if (wisorEvaluated || !wisorInput.trim()) return;

        const q = allWisors[currentWisorIndex];
        if (!q) return;

        const normalizedInput = wisorInput.toString().trim().toUpperCase();

        let correct = false;
        for (const expected of q.expectedAnswers) {
            if (normalizedInput === expected.toString().trim().toUpperCase()) {
                correct = true;
                break;
            }
        }

        setWisorIsCorrect(correct);
        setWisorEvaluated(true);
        setLastWisorCorrect(correct);

        appendLearningEvent({
            mode: activeWisorMode === 'wisor1' ? 'wisor' : 'wisorEco',
            questionId: q.id,
            questionText: q.question,
            correct,
            userAnswer: wisorInput,
            expectedAnswer: (q.expectedAnswers || []).join(' | ')
        });

        if (pomodoroActive) {
            const questionText = q.question?.substring(0, 100) || q.id || 'WisoR-Frage';
            const topicLabel = activeWisorMode === 'wisor1' ? 'WisoR' : 'WisoR E-Commerce';
            setPomodoroSessionLog(prev => [...prev, { correct, questionText, topic: topicLabel }]);
        }

        if (correct) {
            setWisorScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
            setLastWisorCorrect(true);
            if (currentWisorIndex === allWisors.length - 1) {
                triggerConfetti();
            }

            const updateProg = prev => {
                const next = { ...prev, [q.id]: true };
                const key = activeWisorMode === 'wisor1' ? 'ap2_wisor_progress' : 'ap2_wisor_eco_progress';
                localStorage.setItem(key, JSON.stringify(next));

                if (authUser?.id) {
                    const dbKey = activeWisorMode === 'wisor1' ? 'wisor_progress' : 'wisor_eco_progress';
                    syncProgressToSupabase({ [dbKey]: next }).catch(() => { });
                }
                return next;
            };

            if (activeWisorMode === 'wisor1') {
                setCompletedWisors(updateProg);
            } else {
                setCompletedWisorsEco(updateProg);
            }
        } else {
            setWisorScore(s => ({ ...s, total: s.total + 1 }));
            setLastWisorCorrect(false);
        }

        if (authUser?.id) {
            const rating = mapWisorAnswerToRating({ isCorrect: correct, attempt: 1 });
            reviewTaskWithDSR({
                supabase,
                userId: authUser.id,
                taskId: `${activeWisorMode === 'wisor1' ? 'wisor' : 'wisorEco'}:${q.id}`,
                rating,
                taskType: activeWisorMode === 'wisor1' ? 'wisor' : 'wisorEco',
                category: activeWisorMode,
                metadata: { source: activeWisorMode, question: q.question }
            }).catch(err => console.error('DSR wisor review failed:', err));
        }
    };

    const nextWisorQuestion = () => {
        setWisorInput('');
        setWisorEvaluated(false);
        setWisorIsCorrect(false);
        setWisorVideoOpen(false);
        setGeminiVisible(false);
        setGeminiQuery('');
        setCurrentWisorIndex(prev => prev + 1);
    };

    const navigateWisorUnanswered = (direction) => {
        let newIndex = currentWisorIndex + direction;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= allWisors.length) newIndex = allWisors.length - 1;
        setWisorInput('');
        setWisorEvaluated(false);
        setWisorIsCorrect(false);
        setWisorVideoOpen(false);
        setGeminiVisible(false);
        setGeminiQuery('');
        setCurrentWisorIndex(newIndex);
    };

    if (appMode !== 'wisor') return null;

    const isWisor1Mode = activeWisorMode === 'wisor1';
    const wisorDueMastered = isWisor1Mode
        ? Object.keys(completedWisors).length === wisor1.questions.length
        : Object.keys(completedWisorsEco).length === (wisorEco?.questions?.length || 0);

    if (allWisors.length === 0) {
        return (
            <div className="app-container" style={{ zIndex: 10 }}>
                {burgerMenuPortal}
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="card-face quiz-setup-card">
                    {wisorDueMastered && <LocalConfetti />}
                    <h2 style={{ color: 'var(--text-light)', marginBottom: '0.8rem', fontSize: '1.8rem' }}>Alles gemeistert!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem' }}>Du hast alle Fragen in diesem Modus erfolgreich abgerechnet.</p>
                    <button className="btn-primary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
                </div>
            </div>
        );
    }

    if (currentWisorIndex >= allWisors.length) {
        return (
            <div className="app-container" style={{ zIndex: 10 }}>
                {burgerMenuPortal}
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="card-face quiz-setup-card">
                    {((wisorScore.correct === wisorScore.total && wisorScore.total > 0) || (wisorDueMastered && lastWisorCorrect)) && <LocalConfetti />}
                    <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>WisoR Beendet!</h2>
                    <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Ergebnis: {wisorScore.correct} / {wisorScore.total}</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Menü</button>
                    </div>
                </div>
            </div>
        );
    }

    const q = allWisors[currentWisorIndex];
    if (!q) return null;

    return (
        <div className="app-container" style={{ zIndex: 10 }}>
            {pomodoroPortal}
            {burgerMenuPortal}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <header>
                <div className="wisor-header-content">
                    <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
                    <p className="subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        WisoR ({isWisor1Mode ? 'Allgemein' : 'E-Commerce'}) · {currentWisorIndex + 1} / {allWisors.length} offen
                    </p>
                    <div className="score-badge">Score: {wisorScore.correct}</div>
                </div>
            </header>

            <div className="quiz-container">
                <div className="quiz-action-bar">
                    <button
                        className={`btn-secondary quiz-action-btn fade-in ${wisorVideoLoading ? 'loading' : ''}`}
                        onClick={() => handleToggleVideos(q)}
                        style={{ background: wisorVideoOpen ? 'var(--glass-border)' : 'var(--glass-bg)' }}
                    >
                        <span>{wisorVideoOpen ? '🙈' : '📺'}</span>
                        {wisorVideoOpen ? 'Videos ausblenden' : 'Lernvideos ansehen'}
                    </button>

                    <button
                        className="btn-secondary quiz-action-btn fade-in"
                        onClick={() => setGeminiVisible(!geminiVisible)}
                        style={{ background: geminiVisible ? 'var(--glass-border)' : 'var(--glass-bg)' }}
                    >
                        <span>✨</span>
                        {geminiVisible ? 'KI Assistent schließen' : 'KI um Hilfe bitten'}
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
                    query={geminiQuery}
                    onQueryChange={setGeminiQuery}
                    onAsk={() => handleGeminiAsk(q)}
                    isLoading={geminiLoading}
                    response={geminiResponse}
                />

                <div className="quiz-question">
                    {formatLatex(q.question)}
                </div>

                <div className="wisor-nav-controls">
                    <button
                        className="btn-secondary wisor-nav-btn"
                        onClick={() => navigateWisorUnanswered(-1)}
                        disabled={currentWisorIndex === 0}
                        title="Vorherige unbeantwortete Frage"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Frage überspringen / zurück
                    </span>
                    <button
                        className="btn-secondary wisor-nav-btn"
                        onClick={() => navigateWisorUnanswered(1)}
                        disabled={currentWisorIndex === allWisors.length - 1}
                        title="Nächste unbeantwortete Frage"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleWisorSubmit} className="wisor-form">
                    <input
                        type="text"
                        className="wisor-input wisor-answer-input fade-in"
                        value={wisorInput}
                        onChange={e => setWisorInput(e.target.value)}
                        disabled={wisorEvaluated}
                        placeholder={wisorEvaluated ? "Antwort abgegeben" : "Deine Antwort..."}
                        autoFocus
                    />
                    {!wisorEvaluated && (
                        <button
                            type="submit"
                            className="btn-primary wisor-submit-btn fade-in"
                            disabled={!wisorInput.trim()}
                        >
                            Antwort prüfen
                        </button>
                    )}
                </form>

                {wisorEvaluated && (
                    <div
                        className="quiz-rationale wisor-feedback-box fade-in"
                        style={{
                            background: wisorIsCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            borderColor: wisorIsCorrect ? 'var(--success)' : 'var(--danger)'
                        }}
                    >
                        <h3
                            className="wisor-feedback-title"
                            style={{ color: wisorIsCorrect ? 'var(--success)' : 'var(--danger)' }}
                        >
                            {wisorIsCorrect ? '🎉 Richtig!' : '❌ Leider falsch'}
                        </h3>
                        <p style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-light)' }}>
                            Musterlösung: <strong>{q.expectedAnswers.join(', ')}</strong>
                        </p>
                        {q.rationale && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.8rem' }}><strong>Erklärung:</strong> {formatLatex(q.rationale)}</p>
                        )}
                        <button className="btn-primary fade-in" style={{ marginTop: '1.5rem', width: '100%' }} onClick={nextWisorQuestion}>
                            Nächste Frage &rarr;
                        </button>
                    </div>
                )}
            </div>
            <FloatingNotes questionId={`wisor_${activeWisorMode}_${q.id}`} questionText={q.question} />
            <FloatingCalculator />
        </div>
    );
}

export default WisorPage;
