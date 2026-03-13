import React, { useState } from 'react';
import { askGemini } from '../../../geminiClient';
import { useProjectMGame } from '../state/ProjectMGameProvider';
import './projectm-cyber.css';

const LEVEL_XP = { 1: 50, 2: 75, 3: 100 };

const LEVELS = [
    { id: 1, title: 'Level 1', subtitle: 'Phasen-Puzzle' },
    { id: 2, title: 'Level 2', subtitle: 'PSP-Architektur' },
    { id: 3, title: 'Level 3', subtitle: 'Gantt-Detektiv' }
];

const CORRECT_PHASES = [
    'Projektvorbereitung',
    'Marktanalyse',
    'Inhaltsplanung',
    'Kanalauswahl und Optimierung',
    'Umsetzung',
    'Monitoring und Analyse',
    'Optimierung und Anpassung',
    'Abschluss und Bericht'
];

const LEVEL2_FIELDS = [
    { id: '1.1', label: '1.1 Hauptvorgang', keywords: ['projektvorbereitung', 'vorbereitung', 'projektstart', 'initiierung', 'planung'] },
    { id: '1.1.1', label: '1.1.1 Untervorgang', keywords: ['ziel', 'zieldefinition', 'zielsetzung', 'projektauftrag'] },
    { id: '1.1.2', label: '1.1.2 Untervorgang', keywords: ['budget', 'kosten', 'zeit', 'zeitplan', 'team', 'ressourcen'] },
    { id: '1.2', label: '1.2 Hauptvorgang', keywords: ['marktanalyse', 'analyse', 'marktforschung'] },
    { id: '1.2.1', label: '1.2.1 Untervorgang', keywords: ['zielgruppe', 'kundenanalyse'] },
    { id: '1.2.2', label: '1.2.2 Untervorgang', keywords: ['konkurrenz', 'wettbewerb', 'swot', 'marktbegleiter'] },
    { id: '1.3', label: '1.3 Hauptvorgang', keywords: ['inhalt', 'content', 'kanal', 'umsetzung', 'marketing'] },
    { id: '1.3.1', label: '1.3.1 Untervorgang', keywords: ['thema', 'kampagne', 'setup', 'content'] },
    { id: '1.3.2', label: '1.3.2 Untervorgang', keywords: ['seo', 'sea', 'social', 'mail', 'inhalt', 'inhaltserstellung', 'influencer'] }
];

const GANTT_STATEMENTS = [
    { id: 1, text: 'Zieldefinition und Zielgruppenanalyse sind plangemäß erledigt worden.', correct: true },
    { id: 2, text: 'Vorgang SEA ist plangemäß erledigt worden.', correct: false },
    { id: 3, text: 'Vorgang SEA ist verspätet.', correct: true },
    { id: 4, text: 'Der Sammelvorgang ist kritisch und bestimmt den Endtermin.', correct: true },
    { id: 5, text: 'Inhaltsplanung und Kanalauswahl sind logisch falsch parallel eingeplant.', correct: true }
];

const topBarStyle = {
    width: '100%',
    borderRadius: '16px',
    padding: '0.8rem 0.95rem',
    marginBottom: '0.75rem',
    display: 'flex',
    gap: '0.65rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
};

const sectionStyle = {
    width: '100%',
    borderRadius: '16px',
    padding: '1rem',
    marginBottom: '0.85rem'
};

const normalize = (value) => String(value || '').toLowerCase().trim();

function buildFallbackEinstein(eventType) {
    const map = {
        level_start: 'System online. Projekt M wartet auf saubere PM-Logik.',
        wrong_placement: 'Diese Reihenfolge kollidiert mit Abhängigkeiten. Denke an die fachliche Vorleistung.',
        wrong_node: 'Der PSP-Knoten passt noch nicht sauber zum übergeordneten Arbeitspaket.',
        wrong_answer: 'Diese Aussage kippt am Stichtag 21.08.2023. Prüfe Status und Terminlage.',
        level_complete: 'Stabil gelöst. Das nächste Level ist freigeschaltet.',
        game_complete: 'Mission abgeschlossen. Du hast PM-Phasen, PSP und Gantt belastbar trainiert.'
    };
    return map[eventType] || 'Präzision schlägt Tempo. Prüfe den letzten Schritt erneut.';
}

export default function ProjectMGameHub({ onBack, onLearningEvent }) {
    const { progress, grantXp, unlockLevel, markLevelComplete } = useProjectMGame();
    const [activeLevel, setActiveLevel] = useState(progress.currentLevel || 1);
    const [einsteinMessage, setEinsteinMessage] = useState(buildFallbackEinstein('level_start'));
    const [einsteinLoading, setEinsteinLoading] = useState(false);

    const [l1Slots, setL1Slots] = useState(Array(CORRECT_PHASES.length).fill(''));
    const [l1WrongSlots, setL1WrongSlots] = useState([]);

    const [l2Answers, setL2Answers] = useState(() => (
        LEVEL2_FIELDS.reduce((acc, field) => ({ ...acc, [field.id]: '' }), {})
    ));
    const [l2Hints, setL2Hints] = useState({});

    const [l3Selected, setL3Selected] = useState({});
    const [l3Eval, setL3Eval] = useState({});

    const unlockedLevels = progress.unlockedLevels || [1];
    const completedSet = new Set(progress.completedLevels || []);

    const askEinstein = async ({ eventType, question, contextQuestion, contextAnswer }) => {
        const fallback = buildFallbackEinstein(eventType);
        setEinsteinLoading(true);
        setEinsteinMessage('Cyber-Einstein synchronisiert...');
        try {
            const reply = await askGemini(question, contextQuestion, contextAnswer);
            const compact = String(reply || '').trim();
            setEinsteinMessage(compact || fallback);
        } catch {
            setEinsteinMessage(fallback);
        } finally {
            setEinsteinLoading(false);
        }
    };

    const completeLevel = (levelId, topic, questionText) => {
        if (!completedSet.has(levelId)) {
            grantXp(LEVEL_XP[levelId] || 0);
            markLevelComplete(levelId);
            if (levelId < 3) unlockLevel(levelId + 1);
        }
        askEinstein({
            eventType: levelId === 3 ? 'game_complete' : 'level_complete',
            question: levelId === 3
                ? 'Gib ein kurzes Abschlussfeedback zum Lernfortschritt in 2 Sätzen.'
                : `Gib ein kurzes Levelabschluss-Feedback für Level ${levelId}.`,
            contextQuestion: questionText,
            contextAnswer: topic
        });
        onLearningEvent?.({
            mode: 'projectM',
            questionId: `projectm_l${levelId}_complete`,
            questionText,
            correct: true,
            userAnswer: 'bestanden',
            expectedAnswer: 'bestanden',
            topic
        });
    };

    const handleLevel1Check = () => {
        const wrong = [];
        l1Slots.forEach((phase, idx) => {
            if (phase !== CORRECT_PHASES[idx]) wrong.push(idx);
        });
        setL1WrongSlots(wrong);

        if (wrong.length === 0) {
            completeLevel(1, 'Project M Level 1 · Phasenlogik', 'Project M L1: Phasen in korrekter Reihenfolge');
            return;
        }

        const firstIdx = wrong[0];
        const expected = CORRECT_PHASES[firstIdx];
        const got = l1Slots[firstIdx] || '(leer)';
        askEinstein({
            eventType: 'wrong_placement',
            question: `Warum ist "${got}" auf Position ${firstIdx + 1} falsch? Bitte ohne exakte Lösung zu verraten.`,
            contextQuestion: `Erwartet an Position ${firstIdx + 1}: ${expected}`,
            contextAnswer: `Eingabe: ${got}`
        });

        onLearningEvent?.({
            mode: 'projectM',
            questionId: `projectm_l1_pos_${firstIdx + 1}`,
            questionText: `Project M L1: Position ${firstIdx + 1}`,
            correct: false,
            userAnswer: got,
            expectedAnswer: expected,
            topic: 'Project M Level 1 · Phasenlogik'
        });
    };

    const handleLevel2Check = () => {
        const nextHints = {};
        LEVEL2_FIELDS.forEach((field) => {
            const value = normalize(l2Answers[field.id]);
            if (!value) {
                nextHints[field.id] = 'Feld ist leer.';
                return;
            }
            const hit = field.keywords.some((keyword) => value.includes(keyword) || keyword.includes(value));
            if (!hit) {
                nextHints[field.id] = 'Passt inhaltlich noch nicht sauber zum Knoten.';
            }
        });

        setL2Hints(nextHints);
        const invalidEntries = Object.entries(nextHints);
        if (invalidEntries.length === 0) {
            completeLevel(2, 'Project M Level 2 · PSP-Erstellung', 'Project M L2: PSP-Baum validiert');
            return;
        }

        const [firstId] = invalidEntries[0];
        askEinstein({
            eventType: 'wrong_node',
            question: `Gib einen Hinweis, warum der Node ${firstId} noch nicht stimmig ist.`,
            contextQuestion: `Node ${firstId}: ${l2Answers[firstId] || '(leer)'}`,
            contextAnswer: 'PSP-Struktur prüfen'
        });

        onLearningEvent?.({
            mode: 'projectM',
            questionId: `projectm_l2_${firstId}`,
            questionText: `Project M L2: Node ${firstId}`,
            correct: false,
            userAnswer: l2Answers[firstId] || '(leer)',
            expectedAnswer: 'inhaltlich passender PSP-Knoten',
            topic: 'Project M Level 2 · PSP-Erstellung'
        });
    };

    const handleLevel3Check = () => {
        const selectedIds = GANTT_STATEMENTS.filter((s) => l3Selected[s.id]).map((s) => s.id);
        if (selectedIds.length === 0) {
            askEinstein({
                eventType: 'wrong_answer',
                question: 'Der Nutzer hat noch keine Aussage ausgewählt. Gib einen knappen Startimpuls.',
                contextQuestion: 'Gantt-Analyse zum Stichtag 21.08.2023',
                contextAnswer: 'Status und Termin prüfen'
            });
            return;
        }

        const evalMap = {};
        let hasWrong = false;
        let hasMissed = false;

        GANTT_STATEMENTS.forEach((statement) => {
            const isPicked = Boolean(l3Selected[statement.id]);
            if (statement.correct && isPicked) evalMap[statement.id] = 'correct';
            if (!statement.correct && isPicked) {
                evalMap[statement.id] = 'wrong';
                hasWrong = true;
            }
            if (statement.correct && !isPicked) {
                evalMap[statement.id] = 'missed';
                hasMissed = true;
            }
        });

        setL3Eval(evalMap);

        if (!hasWrong && !hasMissed) {
            completeLevel(3, 'Project M Level 3 · Gantt-Analyse', 'Project M L3: Stichtagsanalyse korrekt');
            return;
        }

        const firstWrong = GANTT_STATEMENTS.find((s) => evalMap[s.id] === 'wrong' || evalMap[s.id] === 'missed');
        askEinstein({
            eventType: 'wrong_answer',
            question: `Erkläre kurz, warum die Aussage "${firstWrong?.text || ''}" nicht korrekt bewertet wurde.`,
            contextQuestion: 'Stichtag: 21.08.2023',
            contextAnswer: 'Balkenstatus und Terminabhängigkeit'
        });

        onLearningEvent?.({
            mode: 'projectM',
            questionId: `projectm_l3_stmt_${firstWrong?.id || 'x'}`,
            questionText: `Project M L3: Aussage ${firstWrong?.id || '?'}`,
            correct: false,
            userAnswer: 'fehlerhafte Auswahl',
            expectedAnswer: 'korrekte Stichtagsbewertung',
            topic: 'Project M Level 3 · Gantt-Analyse'
        });
    };

    const renderLevel1 = () => (
        <div className="projectm-wire" style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Level 1: Phasen-Puzzle</h2>
            <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                Weise jeder Position die passende Projektphase zu. Das trainiert Abhängigkeiten in der Prozesslogik.
            </p>
            <div className="projectm-phase-grid">
                {CORRECT_PHASES.map((_, idx) => (
                    <div key={`slot_${idx}`} className="projectm-wire" style={{ borderRadius: '12px', padding: '0.55rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Position {idx + 1}</strong>
                        <select
                            value={l1Slots[idx]}
                            onChange={(e) => {
                                const value = e.target.value;
                                setL1Slots((prev) => {
                                    const next = [...prev];
                                    const existingIdx = next.findIndex((item, i) => item === value && i !== idx);
                                    if (existingIdx >= 0) next[existingIdx] = '';
                                    next[idx] = value;
                                    return next;
                                });
                            }}
                            className="wisor-input"
                            style={{
                                width: '100%',
                                borderColor: l1WrongSlots.includes(idx) ? 'rgba(248,113,113,0.8)' : undefined
                            }}
                        >
                            <option value="">Bitte wählen</option>
                            {CORRECT_PHASES.map((phase) => (
                                <option key={phase} value={phase}>{phase}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                    className="btn-primary"
                    disabled={l1Slots.some((slot) => !slot)}
                    onClick={handleLevel1Check}
                >
                    Reihenfolge prüfen
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        setL1Slots(Array(CORRECT_PHASES.length).fill(''));
                        setL1WrongSlots([]);
                    }}
                >
                    Zurücksetzen
                </button>
            </div>
        </div>
    );

    const renderLevel2 = () => (
        <div className="projectm-wire" style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Level 2: PSP-Architektur</h2>
            <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                Fülle die Haupt- und Untervorgänge so, dass sie logisch zusammenpassen.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.55rem' }}>
                {LEVEL2_FIELDS.map((field) => (
                    <div key={field.id} className="projectm-wire" style={{ borderRadius: '12px', padding: '0.55rem' }}>
                        <label htmlFor={`pm_${field.id}`} style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
                            {field.label}
                        </label>
                        <input
                            id={`pm_${field.id}`}
                            type="text"
                            className="wisor-input"
                            value={l2Answers[field.id]}
                            onChange={(e) => {
                                const value = e.target.value;
                                setL2Answers((prev) => ({ ...prev, [field.id]: value }));
                            }}
                            placeholder="Eintrag..."
                            style={{
                                width: '100%',
                                borderColor: l2Hints[field.id] ? 'rgba(248,113,113,0.8)' : undefined
                            }}
                        />
                        {l2Hints[field.id] && (
                            <p style={{ margin: '0.35rem 0 0', color: '#fca5a5', fontSize: '0.82rem' }}>{l2Hints[field.id]}</p>
                        )}
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={handleLevel2Check}>PSP validieren</button>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        setL2Answers(LEVEL2_FIELDS.reduce((acc, field) => ({ ...acc, [field.id]: '' }), {}));
                        setL2Hints({});
                    }}
                >
                    Felder leeren
                </button>
            </div>
        </div>
    );

    const renderLevel3 = () => (
        <div className="projectm-wire" style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Level 3: Gantt-Detektiv</h2>
            <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                Wähle alle Aussagen, die zum Stichtag 21.08.2023 zutreffen.
            </p>
            <div style={{ display: 'grid', gap: '0.55rem' }}>
                {GANTT_STATEMENTS.map((statement) => {
                    const state = l3Eval[statement.id];
                    const cls = state ? `projectm-statement projectm-statement--${state}` : 'projectm-statement';
                    return (
                        <label key={statement.id} className={cls}>
                            <input
                                type="checkbox"
                                checked={Boolean(l3Selected[statement.id])}
                                onChange={(e) => setL3Selected((prev) => ({ ...prev, [statement.id]: e.target.checked }))}
                                style={{ marginRight: '0.55rem' }}
                            />
                            {statement.text}
                        </label>
                    );
                })}
            </div>
            <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={handleLevel3Check}>Auswertung prüfen</button>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        setL3Selected({});
                        setL3Eval({});
                    }}
                >
                    Auswahl leeren
                </button>
            </div>
        </div>
    );

    return (
        <div className="projectm-cyber-theme" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            <div style={{ maxWidth: '1120px', width: '100%', margin: '0 auto', padding: '1rem 0.9rem 4.2rem' }}>
                <div className="projectm-wire" style={topBarStyle}>
                    <button className="btn-nav" onClick={onBack}>&larr; Menü</button>
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>Project M: Sneaker Drop</strong>
                        <span className="chip">XP: {progress.xp || 0}</span>
                        <span className="chip">Freigeschaltet: {unlockedLevels.length}/3</span>
                    </div>
                </div>

                <div className="projectm-wire" style={sectionStyle}>
                    <h1 style={{ marginTop: 0, marginBottom: '0.1rem' }}>Projektmanagement-Mission</h1>
                    <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                        Plane die Kampagne Schritt für Schritt und meistere alle drei Missionen.
                    </p>
                    <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                        {LEVELS.map((level) => {
                            const unlocked = unlockedLevels.includes(level.id);
                            const done = completedSet.has(level.id);
                            return (
                                <button
                                    key={level.id}
                                    className={level.id === activeLevel ? 'btn-primary' : 'btn-secondary'}
                                    disabled={!unlocked}
                                    onClick={() => setActiveLevel(level.id)}
                                    style={{ minWidth: '170px', opacity: unlocked ? 1 : 0.45 }}
                                >
                                    {level.title} {done ? '✓' : ''}<br />
                                    <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>{level.subtitle}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeLevel === 1 && renderLevel1()}
                {activeLevel === 2 && renderLevel2()}
                {activeLevel === 3 && renderLevel3()}

                <div className="projectm-wire" style={{ ...sectionStyle, marginBottom: 0 }}>
                    <h3 style={{ marginTop: 0, marginBottom: '0.45rem' }}>Cyber-Einstein</h3>
                    <p style={{ margin: 0, color: einsteinLoading ? '#bfdbfe' : 'var(--text-light)' }}>
                        {einsteinMessage}
                    </p>
                </div>
            </div>
        </div>
    );
}
