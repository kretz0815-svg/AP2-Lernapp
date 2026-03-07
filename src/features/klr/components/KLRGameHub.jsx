import React, { useMemo, useState } from 'react';
import { useKLRGame } from '../state/KLRGameProvider';

const LEVELS = [
    {
        id: 1,
        title: 'Das Rechnungs-Tinder',
        subtitle: 'Kostenartenrechnung',
        objective: 'Ordne Kosten korrekt zu: Fixkosten oder variable Kosten.'
    },
    {
        id: 2,
        title: 'Der Betriebsabrechnungsbogen',
        subtitle: 'Kostenstellenrechnung',
        objective: 'Verteile Gemeinkosten korrekt auf Lager, Packstation und Büro.'
    },
    {
        id: 3,
        title: 'Der Produkt-Kalkulator',
        subtitle: 'Kostenträgerrechnung',
        objective: 'Berechne Selbstkosten für dein Produkt sauber durch.'
    },
    {
        id: 4,
        title: 'Survival-Modus',
        subtitle: 'Break-Even-Analyse',
        objective: 'Halte dein Startup am Leben und erreiche die Gewinnschwelle.'
    }
];

const COST_ITEM_POOL = [
    { label: 'Shopify-Abo', amountMin: 20, amountMax: 50, step: 5, category: 'fix' },
    { label: 'Lager-Miete', amountMin: 500, amountMax: 1500, step: 50, category: 'fix' },
    { label: 'Cloud-Server', amountMin: 100, amountMax: 500, step: 10, category: 'fix' },
    { label: 'Steuerberater-Flatrate', amountMin: 120, amountMax: 300, step: 10, category: 'fix' },
    { label: 'Versandkarton pro Bestellung', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
    { label: 'Wareneinsatz pro Hoodie', amountMin: 10, amountMax: 24, step: 2, category: 'variable' },
    { label: 'Payment-Gebühr pro Sale', amountMin: 1, amountMax: 6, step: 1, category: 'variable' },
    { label: 'Retourenlabel pro Rücksendung', amountMin: 3, amountMax: 8, step: 1, category: 'variable' }
];

const randStepValue = (min, max, step) => {
    const count = Math.floor((max - min) / step);
    const idx = Math.floor(Math.random() * (count + 1));
    return min + (idx * step);
};

const euro = (n) => `${Number(n).toLocaleString('de-DE')} €`;

const generateLevel1Run = () => {
    const shuffled = [...COST_ITEM_POOL].sort(() => Math.random() - 0.5);
    return shuffled.map((item, idx) => ({
        id: `${item.label}-${idx}-${Date.now()}`,
        label: item.label,
        amount: randStepValue(item.amountMin, item.amountMax, item.step),
        category: item.category
    }));
};

export default function KLRGameHub() {
    const { progress, setStartupName, grantXp, unlockLevel } = useKLRGame();
    const [nameInput, setNameInput] = useState(progress.startupName);
    const [screen, setScreen] = useState('home'); // home | level1 | pending
    const [pendingLevelId, setPendingLevelId] = useState(null);

    const [level1Items, setLevel1Items] = useState(() => generateLevel1Run());
    const [level1Index, setLevel1Index] = useState(0);
    const [level1Correct, setLevel1Correct] = useState(0);
    const [level1Mistakes, setLevel1Mistakes] = useState(0);
    const [level1Feedback, setLevel1Feedback] = useState('');

    const level1Done = level1Index >= level1Items.length;
    const currentItem = level1Items[level1Index];

    const level1ScorePct = useMemo(() => {
        if (!level1Items.length) return 0;
        return Math.round((level1Correct / level1Items.length) * 100);
    }, [level1Correct, level1Items.length]);

    const startLevel1 = () => {
        setLevel1Items(generateLevel1Run());
        setLevel1Index(0);
        setLevel1Correct(0);
        setLevel1Mistakes(0);
        setLevel1Feedback('');
        setScreen('level1');
    };

    const submitLevel1Choice = (choice) => {
        if (level1Done || !currentItem) return;

        const isCorrect = choice === currentItem.category;
        if (isCorrect) {
            setLevel1Correct((n) => n + 1);
            setLevel1Feedback('Richtig. Saubere Einordnung.');
        } else {
            setLevel1Mistakes((n) => n + 1);
            setLevel1Feedback(
                currentItem.category === 'fix'
                    ? 'Falsch: Das bleibt unabhängig von der Bestellmenge meist konstant.'
                    : 'Falsch: Das steigt oder fällt mit jeder Bestellung.'
            );
        }
        setLevel1Index((n) => n + 1);
    };

    const finishLevel1 = () => {
        const baseXp = 40;
        const bonusXp = Math.max(0, level1Correct * 6 - level1Mistakes * 2);
        grantXp(baseXp + bonusXp);
        if (level1ScorePct >= 75) unlockLevel(2);
        setScreen('home');
    };

    const openPendingLevel = (levelId) => {
        setPendingLevelId(levelId);
        setScreen('pending');
    };

    if (screen === 'level1') {
        return (
            <div className="card-face" style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0 }}>Level 1: Rechnungs-Tinder</h2>
                    <button className="btn-secondary" onClick={() => setScreen('home')}>Abbrechen</button>
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.45rem' }}>
                    Entscheide für jede Karte: links = <strong>Fixkosten</strong>, rechts = <strong>Variable Kosten</strong>.
                </p>

                {!level1Done ? (
                    <div className="note-card" style={{ margin: '0.8rem 0 0 0' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '0.7rem' }}>
                            Aufgabe {level1Index + 1} von {level1Items.length}
                        </div>
                        <h3 style={{ marginTop: 0, marginBottom: '0.3rem' }}>{currentItem.label}</h3>
                        <p style={{ marginTop: 0, marginBottom: '0.9rem', fontSize: '1.25rem', fontWeight: 800 }}>
                            {euro(currentItem.amount)}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <button className="btn-secondary" onClick={() => submitLevel1Choice('fix')}>
                                ⬅️ Fixkosten
                            </button>
                            <button className="btn-primary" onClick={() => submitLevel1Choice('variable')}>
                                Variable Kosten ➡️
                            </button>
                        </div>
                        {!!level1Feedback && (
                            <p style={{ marginTop: '0.8rem', marginBottom: 0, color: 'var(--text-muted)' }}>{level1Feedback}</p>
                        )}
                    </div>
                ) : (
                    <div className="note-card" style={{ margin: '0.8rem 0 0 0' }}>
                        <h3 style={{ marginTop: 0 }}>Level abgeschlossen</h3>
                        <p style={{ marginBottom: '0.5rem' }}>
                            Treffer: <strong>{level1Correct}</strong> / {level1Items.length}
                        </p>
                        <p style={{ marginTop: 0, marginBottom: '0.8rem' }}>
                            Fehler: <strong>{level1Mistakes}</strong> · Score: <strong>{level1ScorePct}%</strong>
                        </p>
                        <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                            Ab 75% wird Level 2 freigeschaltet.
                        </p>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={finishLevel1}>Belohnung einsammeln</button>
                            <button className="btn-secondary" onClick={startLevel1}>Nochmal spielen</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (screen === 'pending') {
        const level = LEVELS.find((x) => x.id === pendingLevelId);
        return (
            <div className="card-face" style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '1rem' }}>
                <h2 style={{ marginTop: 0 }}>{level?.title}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{level?.objective}</p>
                <div className="note-card" style={{ margin: 0 }}>
                    <h3 style={{ marginTop: 0 }}>Nächster Build-Schritt</h3>
                    <p style={{ marginBottom: 0 }}>
                        Dieses Level ist als nächstes dran und wird jetzt als echte Spielansicht umgesetzt
                        (kein JSON-Dump mehr, echte Interaktion).
                    </p>
                </div>
                <div style={{ marginTop: '0.8rem' }}>
                    <button className="btn-secondary" onClick={() => setScreen('home')}>Zurück</button>
                </div>
            </div>
        );
    }

    return (
        <div className="card-face" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>KLR Startup Survival</h2>
            <p style={{ color: 'var(--text-muted)' }}>
                Du rettest ein E-Commerce-Startup vor der Pleite. Jedes Level trainiert einen KLR-Baustein.
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="wisor-input"
                    style={{ maxWidth: '280px' }}
                    placeholder="Startup Name"
                />
                <button className="btn-primary" onClick={() => setStartupName(nameInput)}>Startup speichern</button>
            </div>

            <div style={{ display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1rem' }}>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>STARTUP</div>
                    <div style={{ fontWeight: 800, marginTop: '0.2rem' }}>{progress.startupName}</div>
                </div>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>XP</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.xp}</div>
                </div>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>AKTUELLES LEVEL</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.currentLevel}</div>
                </div>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>FREIGESCHALTET</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.unlockedLevels.join(', ')}</div>
                </div>
            </div>

            <div className="note-card" style={{ margin: '0 0 1rem 0' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>So spielst du</h3>
                <p style={{ margin: '0 0 0.35rem 0' }}>1. Wähle ein freigeschaltetes Level.</p>
                <p style={{ margin: '0 0 0.35rem 0' }}>2. Löse die Aufgaben ohne Taschenrechner-Fehlerkette.</p>
                <p style={{ margin: 0 }}>3. Sammle XP und schalte das nächste Level frei.</p>
            </div>

            <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {LEVELS.map((lvl) => {
                    const unlocked = progress.unlockedLevels.includes(lvl.id);
                    return (
                        <div key={lvl.id} className="note-card" style={{ margin: 0, opacity: unlocked ? 1 : 0.6 }}>
                            <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Level {lvl.id}: {lvl.title}</h3>
                            <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{lvl.subtitle}</p>
                            <p style={{ marginTop: 0 }}>{lvl.objective}</p>
                            {lvl.id === 1 ? (
                                <button className="btn-primary" onClick={startLevel1}>Jetzt starten</button>
                            ) : unlocked ? (
                                <button className="btn-secondary" onClick={() => openPendingLevel(lvl.id)}>Öffnen</button>
                            ) : (
                                <div className="chip">🔒 Erst Level {lvl.id - 1} abschließen</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
