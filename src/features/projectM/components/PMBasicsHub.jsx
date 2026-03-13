import React, { useMemo, useState } from 'react';
import { askGemini } from '../../../geminiClient';
import PMCyberEinsteinMentor from './PMCyberEinsteinMentor';
import './projectm-cyber.css';

const sectionStyle = {
    width: '100%',
    borderRadius: '16px',
    padding: '1rem',
    marginBottom: '0.85rem'
};

const shuffle = (items) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};
const sanitizeEinsteinText = (input) => String(input || '')
    .replace(/\*\*/g, '')
    .replace(/gute frage[:,!\s]*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const MODULES = [
    { id: 1, title: 'Modul 1: Begriffe-Matcher', summary: 'Ordne die 5 PM-Begriffe den richtigen Definitionen zu.' },
    { id: 2, title: 'Modul 2: Agil vs. Klassisch', summary: 'Sortiere Risiken in die passende Methode.' },
    { id: 3, title: 'Modul 3: Abhängigkeits-Detektiv', summary: 'Erkenne zentrale Abhängigkeiten im Projektplan.' }
];

const DEFINITIONS = [
    {
        id: 'lasten',
        optionLabel: 'D1 · Auftraggeber (WAS)',
        fullLabel: 'D1: Dokument des Auftraggebers – beschreibt WAS erwartet wird (Anforderungen/Wünsche).'
    },
    {
        id: 'pflichten',
        optionLabel: 'D2 · Auftragnehmer (WIE)',
        fullLabel: 'D2: Antwort des Auftragnehmers – beschreibt WIE Anforderungen technisch umgesetzt werden.'
    },
    {
        id: 'wasserfall',
        optionLabel: 'D3 · Lineares Modell',
        fullLabel: 'D3: Lineares Modell – Phasen laufen strikt nacheinander.'
    },
    {
        id: 'scrum',
        optionLabel: 'D4 · Agile Sprints',
        fullLabel: 'D4: Agiles Framework mit kurzen Sprints und iterativen Teilergebnissen.'
    },
    {
        id: 'kollaborativ',
        optionLabel: 'D5 · Teamarbeit mit Tools',
        fullLabel: 'D5: Gemeinsames Arbeiten mehrerer Personen mit digitalen Tools.'
    }
];

const TERM_TASKS = [
    { term: 'Lastenheft', correct: 'lasten' },
    { term: 'Pflichtenheft', correct: 'pflichten' },
    { term: 'Wasserfall-Methode', correct: 'wasserfall' },
    { term: 'Scrum', correct: 'scrum' },
    { term: 'Kollaboratives Arbeiten', correct: 'kollaborativ' }
];

const RISK_CARDS = [
    { id: 'r1', text: 'Unklare Anforderungen durch ständige Änderungen', correct: 'agil' },
    { id: 'r2', text: 'Kostenüberschreitung durch fehlenden Gesamtüberblick', correct: 'agil' },
    { id: 'r3', text: 'Qualitätsprobleme bei zu schnellen Iterationen', correct: 'agil' },
    { id: 'r4', text: 'Kommunikationsprobleme zwischen Team und Stakeholdern', correct: 'agil' },
    { id: 'r5', text: 'Ressourcenkonflikte bei parallelen Aufgaben', correct: 'agil' },
    { id: 'r6', text: 'Fehlende langfristige Planung und Vision', correct: 'agil' },
    { id: 'r7', text: 'Rigidität: Anforderungen können kaum geändert werden', correct: 'klassisch' },
    { id: 'r8', text: 'Lange Time-to-Market: Produkt kommt spät auf den Markt', correct: 'klassisch' },
    { id: 'r9', text: 'Unentdeckte Fehler: Tests erst am Projektende', correct: 'klassisch' },
    { id: 'r10', text: 'Fehlende Kundenbeteiligung bis zum Projektabschluss', correct: 'klassisch' },
    { id: 'r11', text: 'Hohe Änderungskosten in späteren Projektphasen', correct: 'klassisch' },
    { id: 'r12', text: 'Demotivation durch lange Wartezeiten ohne sichtbare Ergebnisse', correct: 'klassisch' }
];

const DEPENDENCY_OPTIONS = [
    { id: 'A>B', label: 'A → B', correct: true },
    { id: 'A>C', label: 'A → C', correct: true },
    { id: 'A>D', label: 'A → D', correct: true },
    { id: 'B>E', label: 'B → E', correct: true },
    { id: 'C>F', label: 'C → F', correct: true },
    { id: 'D>H', label: 'D → H', correct: true },
    { id: 'H>I', label: 'H → I', correct: true },
    { id: 'E>B', label: 'E → B', correct: false },
    { id: 'H>D', label: 'H → D', correct: false },
    { id: 'J>I', label: 'J → I', correct: false },
    { id: 'G>A', label: 'G → A', correct: false },
    { id: 'C>A', label: 'C → A', correct: false }
];

export default function PMBasicsHub({ onBack, onLearningEvent }) {
    const [activeModule, setActiveModule] = useState(1);
    const [completed, setCompleted] = useState({ 1: false, 2: false, 3: false });

    const [m1Answers, setM1Answers] = useState({});
    const [m1Feedback, setM1Feedback] = useState('');
    const [m1ResultByTerm, setM1ResultByTerm] = useState({});
    const [m1LockedByTerm, setM1LockedByTerm] = useState({});
    const [m1HintsByTerm, setM1HintsByTerm] = useState({});
    const [m1EinsteinMessage, setM1EinsteinMessage] = useState('System bereit. Wähle die passenden Definitionen.');
    const [m1TaskOrder, setM1TaskOrder] = useState(() => shuffle(TERM_TASKS));
    const [m1DefOrder, setM1DefOrder] = useState(() => shuffle(DEFINITIONS));

    const [m2Answers, setM2Answers] = useState({});
    const [m2Feedback, setM2Feedback] = useState('');
    const [m2ResultByCard, setM2ResultByCard] = useState({});
    const [m2LockedByCard, setM2LockedByCard] = useState({});
    const [m2HintsByCard, setM2HintsByCard] = useState({});
    const [m2EinsteinMessage, setM2EinsteinMessage] = useState('Sortiere die Risiken präzise in agil oder klassisch.');
    const [m2CardOrder, setM2CardOrder] = useState(() => shuffle(RISK_CARDS));

    const [m3Selected, setM3Selected] = useState({});
    const [m3Feedback, setM3Feedback] = useState('');
    const [m3OptionOrder, setM3OptionOrder] = useState(() => shuffle(DEPENDENCY_OPTIONS));
    const mentorMessage = activeModule === 1
        ? m1EinsteinMessage
        : activeModule === 2
            ? m2EinsteinMessage
            : (m3Feedback || 'Markiere die relevanten Abhängigkeiten sauber und logisch.');
    const mentorState = /analysiert/i.test(mentorMessage)
        ? 'speaking'
        : /perfekt|stark|bestanden|freigeschaltet/i.test(mentorMessage)
            ? 'success'
            : /nicht|falsch|kritisch|noch/i.test(mentorMessage)
                ? 'error'
                : 'idle';

    const unlocked = useMemo(() => ({
        1: true,
        2: completed[1],
        3: completed[2]
    }), [completed]);

    const getDefinitionLabel = (defId) => DEFINITIONS.find((d) => d.id === defId)?.fullLabel || 'Unbekannte Definition';

    const buildLocalHint = (term, pickedId) => {
        const picked = getDefinitionLabel(pickedId);
        const hints = {
            'Lastenheft': `Das passt nicht: "${picked}" beschreibt nicht die Auftraggeber-Sicht. Lastenheft startet bei den Erwartungen des Kunden.`,
            'Pflichtenheft': `Hier fehlt die technische Umsetzungsperspektive. Das Pflichtenheft antwortet konkret auf das Lastenheft.`,
            'Wasserfall-Methode': `Das ist keine lineare Phasenlogik. Beim Wasserfall laufen Phasen strikt nacheinander.`,
            'Scrum': `Das passt methodisch nicht zu Scrum. Scrum arbeitet iterativ in Sprints mit regelmäßigen Anpassungen.`,
            'Kollaboratives Arbeiten': `Hier fehlt der Team- und Tool-Fokus. Kollaboratives Arbeiten bedeutet gemeinsames Arbeiten mehrerer Personen.`
        };
        return hints[term] || 'Zuordnung noch nicht stimmig. Prüfe den Kernbegriff erneut.';
    };

    const buildRiskHint = (card, picked) => {
        if (!card) return 'Diese Zuordnung ist fachlich noch nicht stimmig.';
        if (card.correct === 'agil' && picked === 'klassisch') {
            return 'Dieses Risiko entsteht eher durch iterative/agile Dynamik, nicht durch starre Phasenplanung.';
        }
        if (card.correct === 'klassisch' && picked === 'agil') {
            return 'Das ist typisch für starre klassische Vorgehensmodelle mit später Änderbarkeit.';
        }
        return 'Diese Zuordnung ist fachlich noch nicht stimmig.';
    };

    const handleCheckModule1 = () => {
        const unresolved = TERM_TASKS.filter((task) => !m1LockedByTerm[task.term]);
        if (unresolved.length > 0) {
            setM1Feedback(`Noch ${unresolved.length} Begriff(e) nicht beantwortet.`);
            return;
        }
        const wrong = TERM_TASKS.filter((task) => m1ResultByTerm[task.term] !== 'correct');

        if (wrong.length === 0) {
            setCompleted((prev) => ({ ...prev, 1: true }));
            setM1HintsByTerm({});
            setM1EinsteinMessage('Exzellent. Alle Zuordnungen sitzen sauber.');
            setM1Feedback('Stark! Alle 5 Begriffe sind korrekt zugeordnet. Modul 2 ist freigeschaltet.');
            setActiveModule(2);
            onLearningEvent?.({
                mode: 'projectM',
                questionId: 'pm_basics_modul1',
                questionText: 'PM Basics Modul 1 abgeschlossen',
                correct: true,
                topic: 'PM Basics Modul 1 · Begriffe'
            });
            return;
        }
        setM1EinsteinMessage('Mehrere Zuordnungen sind fachlich noch nicht präzise. Prüfe die Hinweise pro Feld.');
        setM1Feedback(`${wrong.length} Zuordnung(en) sind noch nicht korrekt. Prüfe besonders: ${wrong[0].term}.`);
        onLearningEvent?.({
            mode: 'projectM',
            questionId: 'pm_basics_modul1',
            questionText: 'PM Basics Modul 1 Prüfung',
            correct: false,
            topic: 'PM Basics Modul 1 · Begriffe'
        });

    };

    const handleModule1Select = async (task, value) => {
        if (!task || !value || m1LockedByTerm[task.term]) return;
        const isCorrect = value === task.correct;
        setM1Answers((prev) => ({ ...prev, [task.term]: value }));
        setM1LockedByTerm((prev) => ({ ...prev, [task.term]: true }));
        setM1ResultByTerm((prev) => ({ ...prev, [task.term]: isCorrect ? 'correct' : 'wrong' }));
        if (isCorrect) return;

        const fallbackHint = buildLocalHint(task.term, value);
        setM1HintsByTerm((prev) => ({ ...prev, [task.term]: fallbackHint }));
        setM1EinsteinMessage('Cyber-Einstein analysiert die falsche Zuordnung…');
        onLearningEvent?.({
            mode: 'projectM',
            questionId: `pm_basics_modul1_${task.term}`,
            questionText: `PM Basics Modul 1: ${task.term}`,
            correct: false,
            topic: 'PM Basics Modul 1 · Begriffe'
        });

        try {
            const ai = await askGemini(
                `Warum passt die Zuordnung bei "${task.term}" nicht? Bitte kurz erklären, ohne die Lösung direkt vorzugeben.`,
                `Gewählte Definition: ${getDefinitionLabel(value)}`,
                `Fachbegriff: ${task.term}`
            );
            const hint = sanitizeEinsteinText(ai) || fallbackHint;
            setM1HintsByTerm((prev) => ({ ...prev, [task.term]: hint }));
            setM1EinsteinMessage(hint);
        } catch {
            setM1EinsteinMessage('Hinweis verfügbar. Prüfe das rote Feld erneut.');
        }
    };

    const handleCheckModule2 = () => {
        const unresolved = RISK_CARDS.filter((card) => !m2Answers[card.id]);
        if (unresolved.length > 0) {
            setM2Feedback(`Noch ${unresolved.length} Karte(n) nicht zugeordnet.`);
            return;
        }
        const wrong = RISK_CARDS.filter((card) => m2Answers[card.id] !== card.correct);
        if (wrong.length === 0) {
            setCompleted((prev) => ({ ...prev, 2: true }));
            setM2EinsteinMessage('Stark sortiert. Die methodischen Unterschiede sind sauber erkannt.');
            setM2Feedback('Sauber sortiert. Modul 3 ist freigeschaltet.');
            setActiveModule(3);
            onLearningEvent?.({
                mode: 'projectM',
                questionId: 'pm_basics_modul2',
                questionText: 'PM Basics Modul 2 abgeschlossen',
                correct: true,
                topic: 'PM Basics Modul 2 · Methodenvergleich'
            });
            return;
        }
        setM2EinsteinMessage('Einige Risiken sind methodisch vertauscht. Prüfe die Hinweise unter den roten Karten.');
        setM2Feedback(`${wrong.length} Karte(n) sind in der falschen Methode. Erste kritische Karte: "${wrong[0].text}".`);
        onLearningEvent?.({
            mode: 'projectM',
            questionId: 'pm_basics_modul2',
            questionText: 'PM Basics Modul 2 Prüfung',
            correct: false,
            topic: 'PM Basics Modul 2 · Methodenvergleich'
        });
    };

    const handleModule2Select = async (card, value) => {
        if (!card || !value || m2LockedByCard[card.id]) return;
        const isCorrect = value === card.correct;
        setM2Answers((prev) => ({ ...prev, [card.id]: value }));
        setM2LockedByCard((prev) => ({ ...prev, [card.id]: true }));
        setM2ResultByCard((prev) => ({ ...prev, [card.id]: isCorrect ? 'correct' : 'wrong' }));

        if (isCorrect) return;

        const fallbackHint = buildRiskHint(card, value);
        setM2HintsByCard((prev) => ({ ...prev, [card.id]: fallbackHint }));
        setM2EinsteinMessage('Cyber-Einstein analysiert die falsche Zuordnung…');
        onLearningEvent?.({
            mode: 'projectM',
            questionId: `pm_basics_modul2_${card.id}`,
            questionText: `PM Basics Modul 2: ${card.text}`,
            correct: false,
            topic: 'PM Basics Modul 2 · Methodenvergleich'
        });

        try {
            const ai = await askGemini(
                `Warum gehört "${card.text}" nicht zu "${value === 'agil' ? 'Agiles PM' : 'Klassisches PM'}"?`,
                `Gewählt: ${value === 'agil' ? 'Agiles PM' : 'Klassisches PM'}`,
                `Korrekt: ${card.correct === 'agil' ? 'Agiles PM' : 'Klassisches PM'}`
            );
            const hint = sanitizeEinsteinText(ai) || fallbackHint;
            setM2HintsByCard((prev) => ({ ...prev, [card.id]: hint }));
            setM2EinsteinMessage(hint);
        } catch {
            setM2EinsteinMessage('Hinweis verfügbar. Prüfe die rote Karte erneut inhaltlich.');
        }
    };

    const handleCheckModule3 = () => {
        const selected = DEPENDENCY_OPTIONS.filter((option) => m3Selected[option.id]);
        const selectedCorrect = selected.filter((option) => option.correct).length;
        const selectedWrong = selected.filter((option) => !option.correct).length;

        if (selectedCorrect >= 4 && selectedWrong === 0) {
            setCompleted((prev) => ({ ...prev, 3: true }));
            const allSeven = DEPENDENCY_OPTIONS.filter((option) => option.correct).every((option) => m3Selected[option.id]);
            setM3Feedback(allSeven
                ? 'Perfekt: alle 7 Kernabhängigkeiten korrekt erkannt. Bonus erreicht.'
                : `Bestanden: ${selectedCorrect}/7 richtige Kernabhängigkeiten ohne Fehlpfeile.`);
            onLearningEvent?.({
                mode: 'projectM',
                questionId: 'pm_basics_modul3',
                questionText: 'PM Basics Modul 3 abgeschlossen',
                correct: true,
                topic: 'PM Basics Modul 3 · Abhängigkeiten'
            });
            return;
        }

        setM3Feedback(`Noch nicht bestanden. Aktuell: ${selectedCorrect} richtig, ${selectedWrong} falsch. Ziel: mindestens 4 richtig, 0 falsch.`);
        onLearningEvent?.({
            mode: 'projectM',
            questionId: 'pm_basics_modul3',
            questionText: 'PM Basics Modul 3 Prüfung',
            correct: false,
            topic: 'PM Basics Modul 3 · Abhängigkeiten'
        });
    };

    const renderModule1 = () => (
        <div className="projectm-wire" style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Modul 1: Begriffe-Matcher</h2>
            <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                Ordne jeden Begriff genau einer Definition zu.
            </p>
            <div className="projectm-wire" style={{ borderRadius: '12px', padding: '0.65rem', marginBottom: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <strong>Definitionen</strong>
                {m1DefOrder.map((def) => (
                    <div key={`legend_${def.id}`} style={{ lineHeight: 1.35 }}>{def.fullLabel}</div>
                ))}
            </div>
            <div style={{ display: 'grid', gap: '0.55rem' }}>
                {m1TaskOrder.map((task) => (
                    <div
                        key={task.term}
                        className="projectm-wire"
                        style={{
                            borderRadius: '12px',
                            padding: '0.65rem',
                            borderColor: m1ResultByTerm[task.term] === 'correct'
                                ? 'rgba(52,211,153,0.8)'
                                : m1ResultByTerm[task.term] === 'wrong'
                                    ? 'rgba(248,113,113,0.9)'
                                    : undefined,
                            boxShadow: m1ResultByTerm[task.term] === 'correct'
                                ? '0 0 0 2px rgba(52,211,153,0.62), 0 0 32px rgba(52,211,153,0.5), inset 0 0 0 1px rgba(52,211,153,0.25)'
                                : m1ResultByTerm[task.term] === 'wrong'
                                    ? '0 0 0 2px rgba(248,113,113,0.62), 0 0 32px rgba(248,113,113,0.42), inset 0 0 0 1px rgba(248,113,113,0.2)'
                                    : undefined
                        }}
                    >
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>{task.term}</label>
                        <select
                            className="wisor-input"
                            style={{ width: '100%' }}
                            value={m1Answers[task.term] || ''}
                            disabled={Boolean(m1LockedByTerm[task.term])}
                            onChange={(e) => handleModule1Select(task, e.target.value)}
                        >
                            <option value="">Definition wählen…</option>
                            {m1DefOrder.map((def) => (
                                <option key={def.id} value={def.id}>{def.optionLabel}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={handleCheckModule1}>Modul 1 prüfen</button>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        setM1Answers({});
                        setM1ResultByTerm({});
                        setM1HintsByTerm({});
                        setM1Feedback('');
                        setM1EinsteinMessage('System bereit. Wähle die passenden Definitionen.');
                        setM1LockedByTerm({});
                        setM1TaskOrder(shuffle(TERM_TASKS));
                        setM1DefOrder(shuffle(DEFINITIONS));
                    }}
                >
                    Neu mischen
                </button>
            </div>
            {m1Feedback && <p style={{ marginBottom: 0 }}>{m1Feedback}</p>}
        </div>
    );

    const renderModule2 = () => (
        <div className="projectm-wire" style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Modul 2: Agil vs. Klassisch</h2>
            <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                Ordne jede Risiko-Karte der passenden Methode zu.
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {m2CardOrder.map((card) => (
                    <div
                        key={card.id}
                        className="projectm-wire"
                        style={{
                            borderRadius: '12px',
                            padding: '0.65rem',
                            borderColor: m2ResultByCard[card.id] === 'correct'
                                ? 'rgba(52,211,153,0.8)'
                                : m2ResultByCard[card.id] === 'wrong'
                                    ? 'rgba(248,113,113,0.9)'
                                    : undefined,
                            boxShadow: m2ResultByCard[card.id] === 'correct'
                                ? '0 0 0 2px rgba(52,211,153,0.62), 0 0 32px rgba(52,211,153,0.5), inset 0 0 0 1px rgba(52,211,153,0.25)'
                                : m2ResultByCard[card.id] === 'wrong'
                                    ? '0 0 0 2px rgba(248,113,113,0.62), 0 0 32px rgba(248,113,113,0.42), inset 0 0 0 1px rgba(248,113,113,0.2)'
                                    : undefined
                        }}
                    >
                        <p style={{ margin: '0 0 0.4rem 0' }}>{card.text}</p>
                        <select
                            className="wisor-input"
                            style={{ width: '100%' }}
                            value={m2Answers[card.id] || ''}
                            disabled={Boolean(m2LockedByCard[card.id])}
                            onChange={(e) => handleModule2Select(card, e.target.value)}
                        >
                            <option value="">Methode wählen…</option>
                            <option value="agil">Agiles PM</option>
                            <option value="klassisch">Klassisches PM</option>
                        </select>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={handleCheckModule2}>Modul 2 prüfen</button>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        setM2Answers({});
                        setM2ResultByCard({});
                        setM2LockedByCard({});
                        setM2HintsByCard({});
                        setM2Feedback('');
                        setM2EinsteinMessage('Sortiere die Risiken präzise in agil oder klassisch.');
                        setM2CardOrder(shuffle(RISK_CARDS));
                    }}
                >
                    Neu mischen
                </button>
            </div>
            {m2Feedback && <p style={{ marginBottom: 0 }}>{m2Feedback}</p>}
        </div>
    );

    const renderModule3 = () => (
        <div className="projectm-wire" style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Modul 3: Abhängigkeits-Detektiv</h2>
            <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                Markiere die korrekten Abhängigkeiten. Bestanden ab 4 richtigen ohne Fehlpfeile.
            </p>
            <div className="projectm-wire" style={{ borderRadius: '12px', padding: '0.65rem', marginBottom: '0.65rem' }}>
                <strong>Aufgaben A–J (Kurzfassung)</strong>
                <p style={{ marginBottom: 0, color: 'var(--text-muted)' }}>
                    A Analyse, B Ziele, C Plattformen, D Content, E Zeitplan, F Budget/Ads, G Tracking, H Launch, I Monitoring, J Abschlussanalyse.
                </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                {m3OptionOrder.map((option) => (
                    <label key={option.id} className="projectm-statement" style={{ cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={Boolean(m3Selected[option.id])}
                            onChange={(e) => setM3Selected((prev) => ({ ...prev, [option.id]: e.target.checked }))}
                            style={{ marginRight: '0.45rem' }}
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={handleCheckModule3}>Modul 3 prüfen</button>
                <button
                    className="btn-secondary"
                    onClick={() => {
                        setM3Selected({});
                        setM3Feedback('');
                        setM3OptionOrder(shuffle(DEPENDENCY_OPTIONS));
                    }}
                >
                    Neu mischen
                </button>
            </div>
            {m3Feedback && <p style={{ marginBottom: 0 }}>{m3Feedback}</p>}
        </div>
    );

    return (
        <div className="projectm-cyber-theme" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            <PMCyberEinsteinMentor state={mentorState} message={mentorMessage} visible />
            <div style={{ maxWidth: '980px', width: '100%', margin: '0 auto', padding: '1rem 0.9rem 3.6rem' }}>
                <div className="projectm-wire" style={{ ...sectionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <button className="btn-nav" onClick={onBack}>&larr; PM Modul</button>
                    <span className="chip">Part 2</span>
                </div>

                <div className="projectm-wire" style={sectionStyle}>
                    <h1 style={{ marginTop: 0, marginBottom: '0.2rem' }}>PM Basics</h1>
                    <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                        Jetzt vollständig mit Inhalt: 3 aufeinander aufbauende Module.
                    </p>
                </div>

                <div className="projectm-wire" style={sectionStyle}>
                    <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                        {MODULES.map((module) => (
                            <button
                                key={module.id}
                                className={activeModule === module.id ? 'btn-primary' : 'btn-secondary'}
                                disabled={!unlocked[module.id]}
                                onClick={() => setActiveModule(module.id)}
                                style={{ opacity: unlocked[module.id] ? 1 : 0.45 }}
                            >
                                {module.title}{completed[module.id] ? ' ✓' : ''}
                            </button>
                        ))}
                    </div>
                    <p style={{ marginBottom: 0, marginTop: '0.6rem', color: 'var(--text-muted)' }}>
                        {MODULES.find((module) => module.id === activeModule)?.summary}
                    </p>
                </div>

                {activeModule === 1 && renderModule1()}
                {activeModule === 2 && renderModule2()}
                {activeModule === 3 && renderModule3()}
            </div>
        </div>
    );
}
