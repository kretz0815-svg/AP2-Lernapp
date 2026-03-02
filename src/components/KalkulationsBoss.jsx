import React, { useState, useRef, useEffect } from 'react';
import { fetchYouTubeVideos } from '../youtubeClient';
import { askGemini } from '../geminiClient';

// ═══════════════════════════════════════════════════════════════
// KALKULATIONS-BOSS – Interaktives Lernspiel für Handelskalkulation
// ═══════════════════════════════════════════════════════════════

const round2 = (n) => Math.round(n * 100) / 100;

// ── Level-Definitionen ──────────────────────────────────────────

const LEVELS = [
    // ─── Level 1: Vorwärtskalkulation ───
    {
        id: 1,
        title: 'Vorwärtskalkulation',
        subtitle: 'Anfänger',
        story: 'Berechne den Angebotspreis für einen Kunden.',
        direction: 'forward',
        color: '#22c55e',
        youtubeQuery: 'Vorwärtskalkulation Handelskalkulation Kaufmann einfach erklärt',
        given: { einstandspreis: 441.20, hk_pct: 20, gewinn_pct: 10, skonto_pct: 2, rabatt_pct: 15 },
        steps: [
            { key: 'einstandspreis', label: 'Einstandspreis', value: 441.20, given: true },
            {
                key: 'handlungskosten', label: 'Handlungskosten', sublabel: '20 % vom EP', value: 88.24, given: false,
                hint: '441,20 ÷ 100 × 20 = 88,24 €\n(Vom Hundert: Basis = Einstandspreis)'
            },
            {
                key: 'selbstkosten', label: '= Selbstkosten', value: 529.44, given: false, isSum: true,
                hint: '441,20 + 88,24 = 529,44 €'
            },
            {
                key: 'gewinn', label: 'Gewinn', sublabel: '10 % der SK', value: 52.94, given: false,
                hint: '529,44 ÷ 100 × 10 = 52,94 €\n(Vom Hundert: Basis = Selbstkosten)'
            },
            {
                key: 'bvp', label: '= Barverkaufspreis', value: 582.38, given: false, isSum: true,
                hint: '529,44 + 52,94 = 582,38 €'
            },
            {
                key: 'skonto', label: 'Kundenskonto', sublabel: '2 %', value: 11.89, given: false, danger: true,
                hint: '⚠️ Im Hundert rechnen!\nBVP ÷ 98 × 2 = 11,89 €\n(BVP = 98% des ZVP, also ZVP = BVP ÷ 98 × 100)'
            },
            {
                key: 'zvp', label: '= Zielverkaufspreis', value: 594.27, given: false, isSum: true,
                hint: '582,38 + 11,89 = 594,27 €'
            },
            {
                key: 'rabatt', label: 'Kundenrabatt', sublabel: '15 %', value: 104.87, given: false, danger: true,
                hint: '⚠️ Im Hundert rechnen!\nZVP ÷ 85 × 15 = 104,87 €\n(ZVP = 85% des LVP, also LVP = ZVP ÷ 85 × 100)'
            },
            {
                key: 'lvp', label: '= Listenverkaufspreis', value: 699.14, given: false, isSum: true,
                hint: '594,27 + 104,87 = 699,14 €'
            },
        ]
    },
    // ─── Level 2: Rückwärtskalkulation ───
    {
        id: 2,
        title: 'Rückwärtskalkulation',
        subtitle: 'Mittel',
        story: 'Der Marktpreis steht fest. Wie hoch darf dein Einkaufspreis maximal sein?',
        direction: 'backward',
        color: '#f59e0b',
        youtubeQuery: 'Rückwärtskalkulation Handelskalkulation Kaufmann einfach erklärt',
        given: { lvp: 699.14, rabatt_pct: 15, skonto_pct: 2, gewinn_pct: 10, hk_pct: 20 },
        steps: [
            { key: 'lvp', label: 'Listenverkaufspreis', value: 699.14, given: true },
            {
                key: 'rabatt', label: 'Kundenrabatt', sublabel: '15 %', value: 104.87, given: false,
                hint: '699,14 ÷ 100 × 15 = 104,87 €\n(Vom Hundert: Basis = LVP)'
            },
            {
                key: 'zvp', label: '= Zielverkaufspreis', value: 594.27, given: false, isSum: true,
                hint: '699,14 − 104,87 = 594,27 €'
            },
            {
                key: 'skonto', label: 'Kundenskonto', sublabel: '2 %', value: 11.89, given: false,
                hint: '594,27 ÷ 100 × 2 = 11,89 €\n(Vom Hundert: Basis = ZVP)'
            },
            {
                key: 'bvp', label: '= Barverkaufspreis', value: 582.38, given: false, isSum: true,
                hint: '594,27 − 11,89 = 582,38 €'
            },
            {
                key: 'gewinn', label: 'Gewinn', sublabel: '10 %', value: 52.94, given: false, danger: true,
                hint: '⚠️ Im Hundert rechnen!\nBVP ÷ 110 × 10 = 52,94 €\n(BVP = 110% der SK, also SK = BVP ÷ 110 × 100)'
            },
            {
                key: 'selbstkosten', label: '= Selbstkosten', value: 529.44, given: false, isSum: true,
                hint: '582,38 − 52,94 = 529,44 €'
            },
            {
                key: 'handlungskosten', label: 'Handlungskosten', sublabel: '20 %', value: 88.24, given: false, danger: true,
                hint: '⚠️ Im Hundert rechnen!\nSK ÷ 120 × 20 = 88,24 €\n(SK = 120% des EP, also EP = SK ÷ 120 × 100)'
            },
            {
                key: 'einstandspreis', label: '= Einstandspreis', value: 441.20, given: false, isSum: true,
                hint: '529,44 − 88,24 = 441,20 €'
            },
        ]
    },
    // ─── Level 3: Differenzkalkulation ───
    {
        id: 3,
        title: 'Differenzkalkulation',
        subtitle: 'Schwer',
        story: 'Kunde diktiert den Verkaufspreis, Lieferant den Einkaufspreis. Wie viel Gewinn bleibt?',
        direction: 'diff',
        color: '#ef4444',
        youtubeQuery: 'Differenzkalkulation Handelskalkulation Kaufmann einfach erklärt',
        given: { einstandspreis: 441.20, hk_pct: 20, lvp: 650.00, rabatt_pct: 15, skonto_pct: 2 },
        steps: [
            // Schritt 1: Vorwärts
            { key: 'einstandspreis', label: 'Einstandspreis', value: 441.20, given: true, phase: 1 },
            {
                key: 'handlungskosten', label: 'Handlungskosten', sublabel: '20 % vom EP', value: 88.24, given: false, phase: 1,
                hint: '441,20 ÷ 100 × 20 = 88,24 €'
            },
            {
                key: 'selbstkosten', label: '= Selbstkosten', value: 529.44, given: false, isSum: true, phase: 1,
                hint: '441,20 + 88,24 = 529,44 €'
            },
            // Schritt 2: Rückwärts
            { key: 'lvp', label: 'Listenverkaufspreis', value: 650.00, given: true, phase: 2 },
            {
                key: 'rabatt', label: 'Kundenrabatt', sublabel: '15 %', value: 97.50, given: false, phase: 2,
                hint: '650,00 ÷ 100 × 15 = 97,50 €'
            },
            {
                key: 'zvp', label: '= Zielverkaufspreis', value: 552.50, given: false, isSum: true, phase: 2,
                hint: '650,00 − 97,50 = 552,50 €'
            },
            {
                key: 'skonto', label: 'Kundenskonto', sublabel: '2 %', value: 11.05, given: false, phase: 2,
                hint: '552,50 ÷ 100 × 2 = 11,05 €'
            },
            {
                key: 'bvp', label: '= Barverkaufspreis', value: 541.45, given: false, isSum: true, phase: 2,
                hint: '552,50 − 11,05 = 541,45 €'
            },
            // Schritt 3: Differenz
            {
                key: 'gewinn', label: 'Gewinn (absolut)', value: 12.01, given: false, isSum: true, phase: 3,
                hint: 'BVP − SK = 541,45 − 529,44 = 12,01 €'
            },
            // Schritt 4: Gewinnzuschlagssatz
            {
                key: 'gewinn_pct', label: 'Gewinn in %', value: 2.27, given: false, phase: 4, isPercent: true,
                hint: '(12,01 ÷ 529,44) × 100 = 2,27 %\n(Gewinn ÷ Selbstkosten × 100)'
            },
        ]
    }
];

// ── Phase Labels für Level 3 ───
const PHASE_LABELS = {
    1: { title: '⬇ Schritt 1: Vorwärts', color: '#22c55e', desc: 'Von oben bis zu den Selbstkosten' },
    2: { title: '⬆ Schritt 2: Rückwärts', color: '#f59e0b', desc: 'Von unten bis zum Barverkaufspreis' },
    3: { title: '🎯 Schritt 3: Differenz', color: '#ef4444', desc: 'Gewinn = BVP − Selbstkosten' },
    4: { title: '📊 Schritt 4: Prozentsatz', color: '#a855f7', desc: 'Gewinnzuschlagssatz berechnen' },
};

// ═══════════════════════════════════════════════════════════════
// KOMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function KalkulationsBoss({ onBack }) {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [inputs, setInputs] = useState({});
    const [validated, setValidated] = useState({});
    const [shaking, setShaking] = useState({});
    const [showHint, setShowHint] = useState({});
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [score, setScore] = useState(0);
    const [attempts, setAttempts] = useState({});
    const inputRefs = useRef({});
    const containerRef = useRef(null);

    // Video & KI state
    const [videoOpen, setVideoOpen] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [geminiVisible, setGeminiVisible] = useState(false);
    const [geminiQuery, setGeminiQuery] = useState('');
    const [geminiResponse, setGeminiResponse] = useState('');
    const [geminiLoading, setGeminiLoading] = useState(false);

    // Completed levels persistent
    const [completedLevels, setCompletedLevels] = useState(() => {
        try { return JSON.parse(localStorage.getItem('kalk_boss_completed') || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('kalk_boss_completed', JSON.stringify(completedLevels));
    }, [completedLevels]);

    const startLevel = (level) => {
        setSelectedLevel(level);
        setInputs({});
        setValidated({});
        setShaking({});
        setShowHint({});
        setActiveStep(0);
        setCompleted(false);
        setScore(0);
        setAttempts({});
        // Reset video/KI
        setVideoOpen(false);
        setVideos([]);
        setSelectedVideo(null);
        setGeminiVisible(false);
        setGeminiQuery('');
        setGeminiResponse('');
        // Pre-fill given values
        const pre = {};
        level.steps.forEach((s, i) => {
            if (s.given) { pre[i] = s.value.toFixed(2); }
        });
        setInputs(pre);
        const preVal = {};
        level.steps.forEach((s, i) => {
            if (s.given) preVal[i] = true;
        });
        setValidated(preVal);
        // Find first non-given step
        const firstInput = level.steps.findIndex(s => !s.given);
        setActiveStep(firstInput >= 0 ? firstInput : 0);
    };

    const handleInput = (idx, value) => {
        // Allow comma as decimal separator
        const cleaned = value.replace(',', '.');
        setInputs(prev => ({ ...prev, [idx]: cleaned }));
    };

    const validateStep = (idx) => {
        if (!selectedLevel) return;
        const step = selectedLevel.steps[idx];
        const userVal = parseFloat(inputs[idx]);
        if (isNaN(userVal)) return;

        const correct = round2(step.value);
        const userRounded = round2(userVal);

        if (Math.abs(userRounded - correct) < 0.015) {
            // CORRECT
            setValidated(prev => ({ ...prev, [idx]: true }));
            setInputs(prev => ({ ...prev, [idx]: correct.toFixed(2) }));
            setShowHint(prev => ({ ...prev, [idx]: false }));

            // Score: First try = 2pts, second = 1pt, third+ = 0
            const att = (attempts[idx] || 0);
            if (att === 0) setScore(prev => prev + 2);
            else if (att === 1) setScore(prev => prev + 1);

            // Find next un-validated step 
            const nextIdx = selectedLevel.steps.findIndex((s, i) => i > idx && !s.given && !validated[i]);
            if (nextIdx >= 0) {
                setActiveStep(nextIdx);
                setTimeout(() => {
                    inputRefs.current[nextIdx]?.focus();
                    inputRefs.current[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            } else {
                // All done!
                setCompleted(true);
                if (!completedLevels.includes(selectedLevel.id)) {
                    setCompletedLevels(prev => [...prev, selectedLevel.id]);
                }
            }
        } else {
            // WRONG
            setShaking(prev => ({ ...prev, [idx]: true }));
            setAttempts(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
            setTimeout(() => setShaking(prev => ({ ...prev, [idx]: false })), 600);

            // Show hint after 2 wrong attempts
            if ((attempts[idx] || 0) >= 1) {
                setShowHint(prev => ({ ...prev, [idx]: true }));
            }
        }
    };

    const handleKeyDown = (e, idx) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            validateStep(idx);
        }
    };

    const totalSteps = selectedLevel ? selectedLevel.steps.filter(s => !s.given).length : 0;
    const completedSteps = selectedLevel ? selectedLevel.steps.filter((s, i) => !s.given && validated[i]).length : 0;
    const maxScore = totalSteps * 2;

    // ─── Video toggle handler ───
    const handleToggleVideos = async () => {
        if (videoOpen) {
            setVideoOpen(false);
            setSelectedVideo(null);
            return;
        }
        setVideoOpen(true);
        if (videos.length === 0) {
            setVideoLoading(true);
            const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
            const query = selectedLevel.youtubeQuery || selectedLevel.title;
            const fetched = await fetchYouTubeVideos(query, apiKey, 4);
            setVideos(fetched);
            setVideoLoading(false);
        }
    };

    // ─── Gemini KI handler ───
    const handleGeminiAsk = async () => {
        if (!geminiQuery.trim()) return;
        setGeminiLoading(true);
        setGeminiResponse('');
        const currentStep = selectedLevel.steps[activeStep];
        const contextQuestion = `${selectedLevel.title}: ${currentStep?.label || selectedLevel.story}`;
        const contextAnswer = currentStep?.hint || 'Kalkulationsschema anwenden';
        const response = await askGemini(geminiQuery, contextQuestion, contextAnswer);
        setGeminiResponse(response);
        setGeminiLoading(false);
    };

    // ─── Level Select Screen ───
    if (!selectedLevel) {
        return (
            <div className="app-container" style={{ zIndex: 10 }}>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>

                <header style={{ width: '100%', textAlign: 'center' }}>
                    <button onClick={onBack} className="btn-nav" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>← Zurück</button>
                    <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '2.5rem', transform: 'scaleY(1.15)', color: 'var(--text-light)', marginBottom: '0.3rem', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                        Kalkulations-Boss
                    </h1>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>Meistere die Handelskalkulation Schritt für Schritt</p>
                </header>

                <div className="dashboard-grid" style={{ maxWidth: '900px' }}>
                    {LEVELS.map(level => {
                        const done = completedLevels.includes(level.id);
                        return (
                            <div key={level.id} className="dash-card" onClick={() => startLevel(level)}
                                style={{ borderColor: done ? level.color : undefined, boxShadow: done ? `0 0 20px ${level.color}33` : undefined }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                                    {level.id === 1 ? '⬇️' : level.id === 2 ? '⬆️' : '🔀'}
                                </div>
                                <h2 style={{ color: 'var(--text-light)', margin: 0 }}>Level {level.id}</h2>
                                <h3 style={{ color: level.color, margin: '0.2rem 0', fontWeight: 700, fontSize: '1.1rem' }}>{level.title}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{level.story}</p>
                                <div className="chip" style={{
                                    background: done ? `${level.color}33` : undefined,
                                    color: done ? level.color : undefined,
                                    borderColor: done ? level.color : undefined,
                                }}>
                                    {done ? '✅ Abgeschlossen' : level.subtitle}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ─── Completed Screen ───
    if (completed) {
        const pct = Math.round((score / maxScore) * 100);
        const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
        return (
            <div className="app-container" style={{ zIndex: 10 }}>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '500px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: `2px solid ${selectedLevel.color}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                        {stars === 3 ? '🏆' : stars === 2 ? '⭐' : '💪'}
                    </div>
                    <h2 style={{ color: 'var(--text-light)', fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                        Level {selectedLevel.id} geschafft!
                    </h2>
                    <p style={{ color: selectedLevel.color, fontWeight: 700, fontSize: '1.2rem', margin: '0.5rem 0' }}>
                        {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
                    </p>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        {score} / {maxScore} Punkte ({pct}%)
                    </p>

                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => startLevel(selectedLevel)}>🔄 Nochmal</button>
                        <button className="btn-secondary" onClick={() => setSelectedLevel(null)}>📋 Level-Auswahl</button>
                        {selectedLevel.id < 3 && (
                            <button className="btn-primary" style={{ background: LEVELS[selectedLevel.id].color }}
                                onClick={() => startLevel(LEVELS[selectedLevel.id])}>
                                ➡️ Level {selectedLevel.id + 1}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Game Screen ───
    const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    let currentPhase = null;

    return (
        <div className="app-container" style={{ zIndex: 10, maxWidth: '650px' }}>
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            {/* Header */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <button onClick={() => setSelectedLevel(null)} className="btn-nav">← Level-Auswahl</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ color: selectedLevel.color, fontWeight: 700, fontSize: '0.9rem' }}>
                        ⭐ {score}/{maxScore}
                    </span>
                </div>
            </div>

            {/* Level Title */}
            <div style={{ textAlign: 'center', marginBottom: '1rem', width: '100%' }}>
                <h2 style={{ color: 'var(--text-light)', margin: '0 0 0.3rem 0', fontSize: '1.5rem' }}>
                    <span style={{ color: selectedLevel.color }}>{selectedLevel.direction === 'forward' ? '⬇' : selectedLevel.direction === 'backward' ? '⬆' : '🔀'}</span>
                    {' '}Level {selectedLevel.id}: {selectedLevel.title}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{selectedLevel.story}</p>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fortschritt</span>
                    <span style={{ fontSize: '0.8rem', color: selectedLevel.color, fontWeight: 700 }}>{completedSteps}/{totalSteps}</span>
                </div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progressPct}%`, background: selectedLevel.color }} />
                </div>
            </div>

            {/* Video & KI Buttons */}
            <div style={{ marginBottom: '1.2rem', textAlign: 'center', display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                <button
                    className={`btn-secondary fade-in ${videoLoading ? 'loading' : ''}`}
                    onClick={handleToggleVideos}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.55rem 1rem', borderRadius: '12px', background: videoOpen ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                >
                    <span>{videoOpen ? '🙈' : '📺'}</span>
                    {videoOpen ? 'Videos ausblenden' : 'Lernvideos ansehen'}
                </button>

                <button
                    className="btn-secondary fade-in"
                    onClick={() => { setGeminiVisible(!geminiVisible); setGeminiResponse(''); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.55rem 1rem', borderRadius: '12px', background: geminiVisible ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                >
                    <span>✨</span>
                    {geminiVisible ? 'KI schließen' : 'KI um Hilfe bitten'}
                </button>
            </div>

            {/* Video Panel */}
            {videoOpen && (
                <div className="fade-in" style={{ marginBottom: '1.2rem', width: '100%' }}>
                    {!selectedVideo ? (
                        <>
                            {videoLoading ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>Suche passende Videos... ⏳</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                    {videos.length > 0 ? videos.map((video) => (
                                        <div
                                            key={video.id}
                                            className="video-thumbnail-card"
                                            onClick={() => setSelectedVideo(video)}
                                            style={{ background: 'var(--glass-bg)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                                        >
                                            <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                                            <div style={{ padding: '0.6rem' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '0.3rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</div>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{video.channelTitle}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Keine Videos gefunden.</div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ background: 'black', borderRadius: '16px', overflow: 'hidden', position: 'relative', paddingTop: '56.25%' }}>
                            <iframe
                                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            ></iframe>
                            <button
                                onClick={() => setSelectedVideo(null)}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Gemini KI Panel */}
            {geminiVisible && (
                <div className="fade-in" style={{ marginBottom: '1.2rem', width: '100%', borderRadius: '16px', padding: '1.2rem', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)' }}>
                    <p style={{ color: 'var(--text-light)', marginBottom: '0.8rem', fontSize: '1rem', fontWeight: 'bold' }}>Frage an deinen KI-Tutor</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="wisor-input"
                            placeholder="Was verstehst du nicht?"
                            value={geminiQuery}
                            onChange={(e) => setGeminiQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGeminiAsk(); } }}
                            style={{ flex: 1, padding: '0.8rem', margin: 0 }}
                        />
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleGeminiAsk}
                            disabled={geminiLoading || !geminiQuery.trim()}
                            style={{ padding: '0 1.2rem' }}
                        >
                            {geminiLoading ? '⏳' : 'Fragen'}
                        </button>
                    </div>
                    {geminiResponse && (
                        <div className="fade-in" style={{ marginTop: '0.8rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', color: '#e2e8f0', textAlign: 'left', lineHeight: '1.6' }}>
                            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: '0.9rem' }}>{geminiResponse}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* Elevator Schema */}
            <div ref={containerRef} style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                position: 'relative',
            }}>
                {/* Elevator Track Line */}
                <div style={{
                    position: 'absolute',
                    left: '24px',
                    top: '20px',
                    bottom: '20px',
                    width: '3px',
                    background: `linear-gradient(180deg, ${selectedLevel.color}44, ${selectedLevel.color}22)`,
                    borderRadius: '2px',
                    zIndex: 0,
                }} />

                {selectedLevel.steps.map((step, idx) => {
                    const isActive = idx === activeStep;
                    const isDone = validated[idx];
                    const isGiven = step.given;
                    const isShaking = shaking[idx];
                    const hintVisible = showHint[idx];

                    // Phase divider for Level 3
                    let phaseHeader = null;
                    if (selectedLevel.direction === 'diff' && step.phase && step.phase !== currentPhase) {
                        currentPhase = step.phase;
                        const pl = PHASE_LABELS[step.phase];
                        phaseHeader = (
                            <div key={`phase-${step.phase}`} style={{
                                display: 'flex', alignItems: 'center', gap: '0.7rem',
                                padding: '0.6rem 0.8rem', marginBottom: '0.3rem', marginTop: idx > 0 ? '0.8rem' : 0,
                                borderRadius: '10px',
                                background: `${pl.color}15`,
                                border: `1px solid ${pl.color}33`,
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pl.color }}>{pl.title}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pl.desc}</span>
                            </div>
                        );
                    }

                    return (
                        <React.Fragment key={idx}>
                            {phaseHeader}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.6rem 0.8rem 0.6rem 0.5rem',
                                marginLeft: '8px',
                                borderRadius: '14px',
                                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                                border: isActive ? `1px solid ${selectedLevel.color}55` : '1px solid transparent',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                zIndex: 1,
                                animation: isShaking ? 'kalkShake 0.5s ease-in-out' : undefined,
                            }}>
                                {/* Node Dot */}
                                <div style={{
                                    width: '32px', height: '32px', minWidth: '32px',
                                    borderRadius: '50%',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    fontSize: '0.8rem', fontWeight: 700,
                                    background: isDone ? selectedLevel.color : isGiven ? 'rgba(255,255,255,0.15)' : isActive ? `${selectedLevel.color}33` : 'rgba(255,255,255,0.06)',
                                    color: isDone ? '#fff' : isGiven ? 'var(--text-light)' : isActive ? selectedLevel.color : 'var(--text-muted)',
                                    border: isActive ? `2px solid ${selectedLevel.color}` : isDone ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                    transition: 'all 0.3s ease',
                                }}>
                                    {isDone ? '✓' : isGiven ? '📌' : (idx + 1)}
                                </div>

                                {/* Label */}
                                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: step.isSum ? '0.95rem' : '0.85rem',
                                        fontWeight: step.isSum ? 700 : 500,
                                        color: isDone ? 'var(--text-light)' : isActive ? 'var(--text-light)' : 'var(--text-muted)',
                                        lineHeight: 1.3,
                                    }}>
                                        {step.label}
                                        {step.sublabel && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({step.sublabel})</span>}
                                        {step.danger && !isDone && <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem' }}>⚠️</span>}
                                    </div>
                                </div>

                                {/* Input / Value */}
                                <div style={{ width: '140px', minWidth: '140px', textAlign: 'right' }}>
                                    {isGiven || isDone ? (
                                        <div style={{
                                            fontFamily: 'monospace',
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            color: isDone && !isGiven ? selectedLevel.color : 'var(--text-light)',
                                            padding: '0.5rem 0.8rem',
                                            borderRadius: '10px',
                                            background: isDone && !isGiven ? `${selectedLevel.color}15` : 'rgba(255,255,255,0.05)',
                                            border: isDone && !isGiven ? `1px solid ${selectedLevel.color}44` : '1px solid transparent',
                                            textAlign: 'right',
                                        }}>
                                            {step.value.toFixed(2)} {step.isPercent ? '%' : '€'}
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                ref={el => inputRefs.current[idx] = el}
                                                type="text"
                                                inputMode="decimal"
                                                value={inputs[idx] || ''}
                                                onChange={(e) => handleInput(idx, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                                disabled={!isActive}
                                                placeholder={isActive ? '0,00' : '—'}
                                                style={{
                                                    width: '100%',
                                                    fontFamily: 'monospace',
                                                    fontSize: '1.05rem',
                                                    fontWeight: 600,
                                                    color: 'var(--text-light)',
                                                    background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                                    border: isShaking ? '2px solid #ef4444' : isActive ? `2px solid ${selectedLevel.color}` : '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    padding: '0.5rem 2.2rem 0.5rem 0.8rem',
                                                    textAlign: 'right',
                                                    outline: 'none',
                                                    transition: 'all 0.2s ease',
                                                    opacity: isActive ? 1 : 0.4,
                                                    boxShadow: isActive ? `0 0 12px ${selectedLevel.color}22` : 'none',
                                                }}
                                            />
                                            {isActive && (
                                                <span style={{
                                                    position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)',
                                                    color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none', fontWeight: 600,
                                                }}>
                                                    {step.isPercent ? '%' : '€'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Check Button */}
                                {isActive && !isDone && (
                                    <button onClick={() => validateStep(idx)} style={{
                                        background: selectedLevel.color,
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        padding: '0.5rem 0.8rem',
                                        cursor: 'pointer',
                                        minWidth: '50px',
                                        transition: 'all 0.2s ease',
                                        boxShadow: `0 2px 8px ${selectedLevel.color}44`,
                                    }}>
                                        ✓
                                    </button>
                                )}
                            </div>

                            {/* Hint Tooltip */}
                            {hintVisible && !isDone && (
                                <div className="fade-in" style={{
                                    marginLeft: '52px',
                                    marginBottom: '0.3rem',
                                    padding: '0.7rem 1rem',
                                    borderRadius: '10px',
                                    background: step.danger ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                                    border: `1px solid ${step.danger ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
                                    fontSize: '0.8rem',
                                    color: 'var(--text-light)',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-line',
                                }}>
                                    <span style={{ fontWeight: 700, color: step.danger ? '#ef4444' : '#818cf8' }}>💡 Spickzettel:</span>
                                    <br />
                                    {step.hint}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Shake Animation */}
            <style>{`
        @keyframes kalkShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
        </div>
    );
}
