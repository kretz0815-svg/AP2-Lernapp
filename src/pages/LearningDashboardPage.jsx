import React, { useEffect, useState, useRef } from 'react';
import flashcards1 from '../data/flashcards_1.json';
import flashcards2 from '../data/flashcards_2.json';
import flashcards3 from '../data/flashcards_3.json';
import quiz1 from '../data/quiz_1.json';
import quiz2 from '../data/quiz_2.json';
import quiz3 from '../data/quiz_3.json';
import quizUForm2 from '../data/uform2_quiz.json';
import wisor1 from '../data/wisor_1.json';
import wisorEcoJson from '../data/wisor_eco.json';
import { getLearningEventKey } from '../utils/analytics';
import { generateId } from '../utils/constants';
import { detectQuizTopic, getQuizTopicGroup } from '../utils/quizTopics';
import { useAppContext } from '../contexts/AppContext';
import { extractFocusTopics, extractCalculationInsights } from '../geminiClient';
import './LearningDashboardPage.css';

function LearningDashboardPage() {
    const {
        authUser,
        learningAnalytics,
        burgerMenuPortal,
        setAppMode,
        refreshMistakeAnalysis
    } = useAppContext();

    const [dashboardAiTopics, setDashboardAiTopics] = useState([]);
    const [dashboardAiLoading, setDashboardAiLoading] = useState(false);
    const [calcAiInsights, setCalcAiInsights] = useState([]);
    const [calcAiLoading, setCalcAiLoading] = useState(false);

    // Einstein tilt state
    const einsteinRef = useRef(null);
    const [einsteinTilt, setEinsteinTilt] = useState({ rotateX: 0, rotateY: 0 });

    useEffect(() => {
        const prefersCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const handleMouseMove = (e) => {
            if (!einsteinRef.current) return;
            const rect = einsteinRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (window.innerWidth / 2);
            const dy = (e.clientY - cy) / (window.innerHeight / 2);
            const maxTilt = 18;
            setEinsteinTilt({ rotateY: dx * maxTilt, rotateX: -dy * maxTilt * 0.6 });
        };

        if (!prefersCoarsePointer) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (authUser?.email) {
            const mistakes = learningAnalytics?.mistakes || {};
            const allMistakeData = Object.values(mistakes)
                .filter(m => (m.count || 0) >= 2)
                .sort((a, b) => (b.count || 0) - (a.count || 0))
                .slice(0, 10)
                .map(m => ({
                    questionText: m.questionText,
                    expectedAnswer: m.expectedAnswer || '',
                    lastUserAnswer: m.lastUserAnswer || '',
                    topic: m.mode === 'quiz' ? '' : m.mode === 'wisor' ? 'WisoR Grundlagen' : m.mode === 'wisorEco' ? 'WisoR E-Commerce' : m.mode === 'klr' ? 'KLR' : ''
                }));

            if (allMistakeData.length > 0) {
                setDashboardAiLoading(true);
                extractFocusTopics(allMistakeData).then(result => {
                    setDashboardAiTopics(result.topics || []);
                    setDashboardAiLoading(false);
                }).catch(() => setDashboardAiLoading(false));
            } else {
                setDashboardAiTopics([]);
                setDashboardAiLoading(false);
            }
        }
    }, [authUser?.email, learningAnalytics?.mistakes]);

    useEffect(() => {
        if (!authUser?.email) return;

        const events = learningAnalytics?.events || [];
        const wrongCalcEvents = events
            .filter((event) => (event.mode === 'kalkulation' || event.mode === 'breakEven' || event.mode === 'klr') && !event.correct)
            .slice(-30);

        if (wrongCalcEvents.length === 0) {
            setCalcAiInsights([]);
            setCalcAiLoading(false);
            return;
        }

        setCalcAiLoading(true);
        extractCalculationInsights(wrongCalcEvents)
            .then((result) => {
                setCalcAiInsights(result?.insights || []);
            })
            .finally(() => {
                setCalcAiLoading(false);
            });
    }, [authUser?.email, learningAnalytics?.events]);

    const getAllQuizQuestions = () => [
        ...(quiz1.questions || []),
        ...(quiz2.questions || []),
        ...(quiz3.questions || []),
        ...(quizUForm2.questions || [])
    ];

    if (!authUser?.email) {
        return (
            <div className="app-container" style={{ zIndex: 10 }}>
                {burgerMenuPortal}
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="note-card unauthorized-card" style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--text-light)', marginTop: 0 }}>Nur für registrierte Accounts</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Die Lernkarten-Analyse ist nur mit E-Mail-Login verfügbar. Pro E-Mail wird ein eigener Lernstand geführt.
                    </p>
                    <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
                </div>
            </div>
        );
    }

    const events = learningAnalytics?.events || [];
    const mistakes = learningAnalytics?.mistakes || {};
    const nowTs = Date.now();

    const periodStart = {
        day: nowTs - (24 * 60 * 60 * 1000),
        week: nowTs - (7 * 24 * 60 * 60 * 1000),
        month: nowTs - (30 * 24 * 60 * 60 * 1000)
    };

    const getCounts = (startTs) => {
        const inRange = events.filter(e => e.ts >= startTs);
        const byMode = (mode) => {
            const modeEvents = inRange.filter(e => e.mode === mode);
            return { correct: modeEvents.filter(e => e.correct).length, wrong: modeEvents.filter(e => !e.correct).length };
        };
        return {
            quiz: byMode('quiz'),
            wisor: byMode('wisor'),
            wisorEco: byMode('wisorEco'),
            flashcard: byMode('flashcard'),
            kalkulation: byMode('kalkulation'),
            breakEven: byMode('breakEven'),
            klr: byMode('klr'),
        };
    };

    const day = getCounts(periodStart.day);
    const week = getCounts(periodStart.week);
    const month = getCounts(periodStart.month);

    const topMistakes = Object.values(mistakes)
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 12);

    const modeTotals = events.reduce((acc, event) => {
        const mode = event.mode || 'unknown';
        if (!acc[mode]) acc[mode] = { correct: 0, wrong: 0 };
        if (event.correct) acc[mode].correct += 1;
        else acc[mode].wrong += 1;
        return acc;
    }, {});

    const questionEvents = events.filter(e => e.mode === 'quiz' || e.mode === 'wisor' || e.mode === 'wisorEco' || e.mode === 'kalkulation' || e.mode === 'breakEven' || e.mode === 'klr');
    const totalAnswers = events.length;
    const totalCorrect = events.filter(e => e.correct).length;
    const hitRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    const totalPoolSize =
        (flashcards1.cards || []).length +
        (flashcards2.cards || []).length +
        (flashcards3.cards || []).length +
        getAllQuizQuestions().length +
        (wisor1.questions || []).length +
        (wisorEcoJson.questions || []).length;

    const latestByQuestion = {};
    for (const ev of events) {
        const key = getLearningEventKey({
            mode: ev.mode,
            questionId: ev.questionId,
            questionText: ev.questionText
        });
        if (!latestByQuestion[key] || ev.ts > latestByQuestion[key].ts) {
            latestByQuestion[key] = ev;
        }
    }
    const uniqueAnswered = Object.keys(latestByQuestion).length;
    const uniqueCorrect = Object.values(latestByQuestion).filter(e => e.correct).length;
    const overallAccuracy = totalPoolSize > 0 ? Math.round((uniqueCorrect / totalPoolSize) * 100) : 0;

    const recentWeekAnswers = events.filter(e => e.ts >= periodStart.week).length;
    const recentWeekAccuracy = recentWeekAnswers > 0
        ? Math.round((events.filter(e => e.ts >= periodStart.week && e.correct).length / recentWeekAnswers) * 100)
        : 0;

    const quizTopicById = new Map(
        getAllQuizQuestions().map((q) => {
            const id = String(q.id || generateId(q.question));
            return [id, getQuizTopicGroup(q.topic || detectQuizTopic(q))];
        })
    );

    const resolveTopic = (event) => {
        if (!event) return 'Allgemein';
        if (event.topic && event.topic !== 'Allgemein') return event.topic;
        if (event.mode === 'quiz') return quizTopicById.get(String(event.questionId)) || getQuizTopicGroup(detectQuizTopic({ question: event.questionText || '', hint: '', youtubeQuery: '' })) || 'Quiz Allgemein';
        if (event.mode === 'wisor') return 'WisoR Grundlagen';
        if (event.mode === 'wisorEco') return 'WisoR E-Commerce';
        if (event.mode === 'kalkulation') return 'Kalkulations-Boss';
        if (event.mode === 'breakEven') return 'Break-Even-Point';
        if (event.mode === 'klr') return event.topic || 'KLR-Modul';
        return 'Allgemein';
    };

    const topicTotals = questionEvents.reduce((acc, event) => {
        const topic = resolveTopic(event);
        if (!acc[topic]) acc[topic] = { correct: 0, wrong: 0, total: 0, lastAt: 0 };
        if (event.correct) acc[topic].correct += 1;
        else acc[topic].wrong += 1;
        acc[topic].total += 1;
        acc[topic].lastAt = Math.max(acc[topic].lastAt || 0, event.ts || 0);
        return acc;
    }, {});

    const topicRows = Object.entries(topicTotals)
        .map(([topic, stats]) => {
            const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            return { topic, ...stats, accuracy };
        })
        .sort((a, b) => b.total - a.total);

    const radarTopicTotals = questionEvents.reduce((acc, event) => {
        let topic = resolveTopic(event);
        if (topic.startsWith('KLR')) topic = 'KLR';
        if (!acc[topic]) acc[topic] = { correct: 0, wrong: 0, total: 0 };
        if (event.correct) acc[topic].correct += 1;
        else acc[topic].wrong += 1;
        acc[topic].total += 1;
        return acc;
    }, {});

    const radarTopics = Object.entries(radarTopicTotals)
        .map(([topic, stats]) => {
            const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            return { topic, ...stats, accuracy };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

    const radarSize = 270;
    const radarCenter = radarSize / 2;
    const radarRadius = 96;
    const radarRings = [25, 50, 75, 100];
    const polarToCartesian = (angleDeg, valuePct = 100) => {
        const angle = ((angleDeg - 90) * Math.PI) / 180;
        const radius = (Math.max(0, Math.min(100, valuePct)) / 100) * radarRadius;
        return {
            x: radarCenter + (Math.cos(angle) * radius),
            y: radarCenter + (Math.sin(angle) * radius)
        };
    };

    const radarPolygonPoints = radarTopics.length > 2
        ? radarTopics.map((row, idx) => {
            const angle = (360 / radarTopics.length) * idx;
            const point = polarToCartesian(angle, row.accuracy);
            return `${point.x},${point.y}`;
        }).join(' ')
        : '';

    const strongestTopics = topicRows.filter(row => row.total >= 3 && row.accuracy >= 75).sort((a, b) => b.accuracy - a.accuracy).slice(0, 4);
    const weakestTopics = topicRows.filter(row => row.total >= 3 && row.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);

    const einsteinNeonColor = overallAccuracy >= 75 ? '#22c55e' : overallAccuracy >= 35 ? '#f59e0b' : '#ef4444';
    const einsteinGlow = overallAccuracy >= 75 ? 'rgba(34,197,94,0.6)' : overallAccuracy >= 35 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.6)';
    const einsteinImage = overallAccuracy >= 100 ? '/EinsteinGold.webp' : overallAccuracy >= 75 ? '/einstein.webp' : overallAccuracy >= 35 ? '/EinsteinOrange.webp' : '/EinsteinRot.webp';
    const circleRadius = 62;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const circleOffset = circleCircumference * (1 - overallAccuracy / 100);

    const allModeKeys = ['quiz', 'wisor', 'wisorEco', 'kalkulation', 'breakEven', 'klr', 'flashcard'];
    const trendBars = [
        { label: 'Heute', accuracy: Math.round((allModeKeys.reduce((s, m) => s + day[m].correct, 0) / (allModeKeys.reduce((s, m) => s + day[m].correct + day[m].wrong, 0) || 1)) * 100), total: allModeKeys.reduce((s, m) => s + day[m].correct + day[m].wrong, 0) },
        { label: '7 Tage', accuracy: Math.round((allModeKeys.reduce((s, m) => s + week[m].correct, 0) / (allModeKeys.reduce((s, m) => s + week[m].correct + week[m].wrong, 0) || 1)) * 100), total: allModeKeys.reduce((s, m) => s + week[m].correct + week[m].wrong, 0) },
        { label: '30 Tage', accuracy: Math.round((allModeKeys.reduce((s, m) => s + month[m].correct, 0) / (allModeKeys.reduce((s, m) => s + month[m].correct + month[m].wrong, 0) || 1)) * 100), total: allModeKeys.reduce((s, m) => s + month[m].correct + month[m].wrong, 0) }
    ];

    return (
        <div className="app-container learning-analytics-dashboard">
            {burgerMenuPortal}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            <header className="hide-on-print">
                <div className="dashboard-header-nav">
                    <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
                </div>
                <div className="dashboard-header-actions">
                    <button className="btn-secondary" onClick={refreshMistakeAnalysis}>🔄 Analyse aktualisieren</button>
                    <button className="btn-primary" onClick={() => window.print()}>📄 Lernstand als PDF</button>
                </div>
            </header>

            <h1 className="print-only-title">MasterPat APP – Lernanalyse</h1>

            <section className="note-card analytics-main-card" style={{ border: `1px solid ${einsteinNeonColor}44` }}>
                <div className="analytics-stats-grid">
                    <div className="einstein-container">
                        <div ref={einsteinRef} className="einstein-wrapper">
                            <img
                                src={einsteinImage}
                                alt="Einstein"
                                className="einstein-img"
                                style={{ transform: `rotateX(${einsteinTilt.rotateX}deg) rotateY(${einsteinTilt.rotateY}deg)`, filter: `drop-shadow(0 0 18px ${einsteinGlow})` }}
                            />
                        </div>
                    </div>

                    <div className="progress-circle-container">
                        <svg width="160" height="160">
                            <circle cx="80" cy="80" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                            <circle cx="80" cy="80" r={circleRadius} fill="none" stroke={einsteinNeonColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circleCircumference} strokeDashoffset={circleOffset} transform="rotate(-90 80 80)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                        </svg>
                        <div className="progress-circle-info">
                            <span className="overall-accuracy-text" style={{ color: einsteinNeonColor }}>{overallAccuracy}%</span>
                            <span className="overall-accuracy-label">Gesamtfortschritt</span>
                        </div>
                    </div>

                    <div className="quick-stats-vertical">
                        <div><p className="stat-item-label">Bearbeitet</p><p className="stat-item-value">{uniqueAnswered} / {totalPoolSize}</p></div>
                        <div><p className="stat-item-label">Trefferquote</p><p className="stat-item-value" style={{ color: hitRate >= 70 ? 'var(--success)' : '#f59e0b' }}>{hitRate}%</p></div>
                    </div>
                </div>
            </section>

            <div className="analytics-secondary-grid">
                <section className="note-card analytics-sub-card">
                    <h3>Themenkompetenz</h3>
                    {radarTopics.length < 3 ? <p className="stat-item-label">Noch nicht genug Daten...</p> : (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <svg viewBox="0 0 270 270" style={{ width: '100%', maxWidth: '280px' }}>
                                {radarRings.map(ring => (
                                    <polygon key={ring} points={radarTopics.map((_, idx) => {
                                        const a = (360 / radarTopics.length) * idx;
                                        const pt = polarToCartesian(a, ring);
                                        return `${pt.x},${pt.y}`;
                                    }).join(' ')} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                                ))}
                                <polygon points={radarPolygonPoints} fill="rgba(99,102,241,0.3)" stroke="var(--primary)" strokeWidth="2" />
                            </svg>
                        </div>
                    )}
                </section>

                <section className="note-card analytics-sub-card">
                    <h3>Trend & Performance</h3>
                    <div className="trend-container">
                        {trendBars.map(bar => (
                            <div key={bar.label} className="trend-bar-wrapper">
                                <span className="trend-bar-value" style={{ color: bar.accuracy >= 75 ? 'var(--success)' : '#f59e0b' }}>{bar.accuracy}%</span>
                                <div className="trend-bar" style={{ height: `${Math.max(bar.accuracy, 10)}px` }} />
                                <span className="trend-bar-label">{bar.label}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="note-card strategic-focus-card">
                <h3>Strategischer Fokus</h3>
                <div className="swot-grid">
                    <div className="swot-panel swot-strength">
                        <h4 style={{ color: 'var(--success)', margin: '0 0 0.5rem 0' }}>Stärken</h4>
                        {strongestTopics.map(t => <div key={t.topic} style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>✅ {t.topic} ({t.accuracy}%)</div>)}
                    </div>
                    <div className="swot-panel swot-weakness">
                        <h4 style={{ color: 'var(--error)', margin: '0 0 0.5rem 0' }}>Schwächen</h4>
                        {weakestTopics.map(t => <div key={t.topic} style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>⚠️ {t.topic} ({t.accuracy}%)</div>)}
                    </div>
                </div>
            </section>

            {dashboardAiTopics.length > 0 && (
                <section className="ai-focus-card">
                    <h3>🤖 KI-Themenfokus</h3>
                    <div className="ai-focus-tags">
                        {dashboardAiTopics.map(t => <span key={t} className="ai-focus-tag">{t}</span>)}
                    </div>
                </section>
            )}
        </div>
    );
}

export default LearningDashboardPage;
