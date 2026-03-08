import React, { useState, useRef, useEffect } from 'react';
import { fetchYouTubeVideos } from '../youtubeClient';
import { askGemini } from '../geminiClient';
import FloatingNotes from './FloatingNotes';
import FloatingCalculator from './FloatingCalculator';
import Confetti from './Confetti';

// ═══════════════════════════════════════════════════════════════
// KALKULATIONS-BOSS – Interaktives Lernspiel für Handelskalkulation
// ═══════════════════════════════════════════════════════════════

const round2 = (n) => Math.round(n * 100) / 100;
const toCents = (n) => Math.round((Number(n) + Number.EPSILON) * 100);

// ── Kaufmännische Rundung (Source of Truth) ──────────────────
const commercialRound = (v) => Math.round(v * 100) / 100;
const FLAWLESS_COMPLETED_STORAGE_KEY = 'kalk_boss_completed_flawless';

// ── Zufällige glatte Zahl in einem Bereich ──────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPrice = (min, max) => commercialRound(randInt(Math.round(min * 100), Math.round(max * 100)) / 100);

// Format helper for hints
const fmt = (v) => v.toFixed(2).replace('.', ',');

// ── Level-Metadaten (statisch, nur Darstellung) ─────────────
const LEVEL_CONFIG = [
    {
        id: 1, title: 'Vorwärtskalkulation', subtitle: 'Anfänger',
        story: 'Berechne den Angebotspreis für einen Kunden.',
        direction: 'forward', color: '#22c55e',
        youtubeQuery: 'Vorwärtskalkulation Handelskalkulation Kaufmann einfach erklärt',
    },
    {
        id: 2, title: 'Rückwärtskalkulation', subtitle: 'Mittel',
        story: 'Der Marktpreis steht fest. Wie hoch darf dein Einkaufspreis maximal sein?',
        direction: 'backward', color: '#f59e0b',
        youtubeQuery: 'Rückwärtskalkulation Handelskalkulation Kaufmann einfach erklärt',
    },
    {
        id: 3, title: 'Differenzkalkulation', subtitle: 'Schwer',
        story: 'Kunde diktiert den Verkaufspreis, Lieferant den Einkaufspreis. Wie viel Gewinn bleibt?',
        direction: 'diff', color: '#ef4444',
        youtubeQuery: 'Differenzkalkulation Handelskalkulation Kaufmann einfach erklärt',
    },
    {
        id: 4, title: 'Boss-Modus', subtitle: 'Boss',
        story: 'Alle Kalkulationsarten – mit begrenzten Leben! Schaffst du den Deal?',
        direction: 'boss', color: '#a855f7',
        youtubeQuery: 'Handelskalkulation komplett einfach erklärt IHK',
    },
];

// ══════════════════════════════════════════════════════════════
// DYNAMISCHE LEVEL-GENERIERUNG
// ══════════════════════════════════════════════════════════════

function generateLevel(config) {
    // Boss-Modus: zufällig eine der 3 Kalkulationsarten wählen
    if (config.direction === 'boss') {
        const types = ['forward', 'backward', 'diff'];
        const pick = types[Math.floor(Math.random() * types.length)];
        const subConfig = { ...config, direction: pick };
        const level = generateLevel(subConfig);
        // Restore boss metadata
        level.id = 4;
        level.title = 'Boss-Modus';
        level.color = '#a855f7';
        level.direction = 'boss';
        level.bossSubType = pick;
        level.subtitle = pick === 'forward' ? '⬇ Vorwärts' : pick === 'backward' ? '⬆ Rückwärts' : '🔀 Differenz';
        return level;
    }

    const hk_pct = randInt(10, 30);
    const gewinn_pct = randInt(5, 20);
    const skonto_pct = randInt(1, 3);
    const rabatt_pct = randInt(5, 15);

    if (config.direction === 'forward') {
        // ── Vorwärtskalkulation: Vollständig Top → Down ──
        const lieferrabatt_pct = randInt(5, 20);
        const lieferskonto_pct = randInt(1, 3);
        const provision_pct = randInt(2, 8);

        // Einkaufsseite
        const lep = randPrice(200, 800);
        const lieferrabatt = commercialRound(lep / 100 * lieferrabatt_pct);
        const zep = commercialRound(lep - lieferrabatt);
        const lieferskonto = commercialRound(zep / 100 * lieferskonto_pct);
        const bep = commercialRound(zep - lieferskonto);
        const bezugskosten = randPrice(10, 80);
        const bezugspreis = commercialRound(bep + bezugskosten);

        // Verkaufsseite
        const hk = commercialRound(bezugspreis / 100 * hk_pct);
        const sk = commercialRound(bezugspreis + hk);
        const gewinn = commercialRound(sk / 100 * gewinn_pct);
        const bvp = commercialRound(sk + gewinn);

        // Im Hundert: BVP = (100 - skonto_pct - provision_pct)% des ZVP
        const combined_pct = skonto_pct + provision_pct;
        const provision = commercialRound(bvp / (100 - combined_pct) * provision_pct);
        const skonto = commercialRound(bvp / (100 - combined_pct) * skonto_pct);
        const zvp = commercialRound(bvp + provision + skonto);

        // Im Hundert: ZVP = (100 - rabatt_pct)% des LVP
        const rabatt = commercialRound(zvp / (100 - rabatt_pct) * rabatt_pct);
        const lvp = commercialRound(zvp + rabatt);

        return {
            ...config, given: { lep, lieferrabatt_pct, lieferskonto_pct, bezugskosten, hk_pct, gewinn_pct, provision_pct, skonto_pct, rabatt_pct },
            steps: [
                { key: 'lep', label: 'Listeneinkaufspreis', value: lep, given: true },
                {
                    key: 'lieferrabatt', label: 'Lieferrabatt', sublabel: `${lieferrabatt_pct} % vom LEP`, value: lieferrabatt, given: false,
                    hint: `${fmt(lep)} ÷ 100 × ${lieferrabatt_pct} = ${fmt(lieferrabatt)} €\n(Vom Hundert: Basis = Listeneinkaufspreis)`
                },
                {
                    key: 'zep', label: '= Zieleinkaufspreis', value: zep, given: false, isSum: true,
                    hint: `${fmt(lep)} − ${fmt(lieferrabatt)} = ${fmt(zep)} €`
                },
                {
                    key: 'lieferskonto', label: 'Lieferskonto', sublabel: `${lieferskonto_pct} % vom ZEP`, value: lieferskonto, given: false,
                    hint: `${fmt(zep)} ÷ 100 × ${lieferskonto_pct} = ${fmt(lieferskonto)} €\n(Vom Hundert: Basis = Zieleinkaufspreis)`
                },
                {
                    key: 'bep', label: '= Bareinkaufspreis', value: bep, given: false, isSum: true,
                    hint: `${fmt(zep)} − ${fmt(lieferskonto)} = ${fmt(bep)} €`
                },
                { key: 'bezugskosten', label: 'Bezugskosten', value: bezugskosten, given: true },
                {
                    key: 'bezugspreis', label: '= Bezugspreis (Einstandspreis)', value: bezugspreis, given: false, isSum: true,
                    hint: `${fmt(bep)} + ${fmt(bezugskosten)} = ${fmt(bezugspreis)} €`
                },
                {
                    key: 'hk', label: 'Handlungskosten', sublabel: `${hk_pct} % vom Bezugspreis`, value: hk, given: false,
                    hint: `${fmt(bezugspreis)} ÷ 100 × ${hk_pct} = ${fmt(hk)} €\n(Vom Hundert: Basis = Bezugspreis)`
                },
                {
                    key: 'sk', label: '= Selbstkosten', value: sk, given: false, isSum: true,
                    hint: `${fmt(bezugspreis)} + ${fmt(hk)} = ${fmt(sk)} €`
                },
                {
                    key: 'gewinn', label: 'Gewinn', sublabel: `${gewinn_pct} % der SK`, value: gewinn, given: false,
                    hint: `${fmt(sk)} ÷ 100 × ${gewinn_pct} = ${fmt(gewinn)} €\n(Vom Hundert: Basis = Selbstkosten)`
                },
                {
                    key: 'bvp', label: '= Barverkaufspreis', value: bvp, given: false, isSum: true,
                    hint: `${fmt(sk)} + ${fmt(gewinn)} = ${fmt(bvp)} €`
                },
                {
                    key: 'provision', label: 'Vertreterprovision', sublabel: `${provision_pct} %`, value: provision, given: false, danger: true,
                    hint: `⚠️ Im Hundert rechnen!\n${fmt(bvp)} ÷ ${100 - combined_pct} × ${provision_pct} = ${fmt(provision)} €\n(BVP = ${100 - combined_pct}% des ZVP)`
                },
                {
                    key: 'skonto', label: 'Kundenskonto', sublabel: `${skonto_pct} %`, value: skonto, given: false, danger: true,
                    hint: `⚠️ Im Hundert rechnen!\n${fmt(bvp)} ÷ ${100 - combined_pct} × ${skonto_pct} = ${fmt(skonto)} €\n(BVP = ${100 - combined_pct}% des ZVP)`
                },
                {
                    key: 'zvp', label: '= Zielverkaufspreis', value: zvp, given: false, isSum: true,
                    hint: `${fmt(bvp)} + ${fmt(provision)} + ${fmt(skonto)} = ${fmt(zvp)} €`
                },
                {
                    key: 'rabatt', label: 'Kundenrabatt', sublabel: `${rabatt_pct} %`, value: rabatt, given: false, danger: true,
                    hint: `⚠️ Im Hundert rechnen!\n${fmt(zvp)} ÷ ${100 - rabatt_pct} × ${rabatt_pct} = ${fmt(rabatt)} €\n(ZVP = ${100 - rabatt_pct}% des LVP)`
                },
                {
                    key: 'lvp', label: '= Listenverkaufspreis', value: lvp, given: false, isSum: true,
                    hint: `${fmt(zvp)} + ${fmt(rabatt)} = ${fmt(lvp)} €`
                },
            ]
        };
    }

    if (config.direction === 'backward') {
        // ── Rückwärtskalkulation: Bottom → Up ──
        const lvp = randPrice(400, 900);
        // Vom Hundert: Rabatt vom LVP
        const rabatt = commercialRound(lvp / 100 * rabatt_pct);
        const zvp = commercialRound(lvp - rabatt);
        // Vom Hundert: Skonto vom ZVP
        const skonto = commercialRound(zvp / 100 * skonto_pct);
        const bvp = commercialRound(zvp - skonto);
        // Auf Hundert: BVP = (100 + gewinn_pct)% der SK
        const gewinn = commercialRound(bvp / (100 + gewinn_pct) * gewinn_pct);
        const sk = commercialRound(bvp - gewinn);
        // Auf Hundert: SK = (100 + hk_pct)% des EP
        const hk = commercialRound(sk / (100 + hk_pct) * hk_pct);
        const ep = commercialRound(sk - hk);

        return {
            ...config, given: { lvp, hk_pct, gewinn_pct, skonto_pct, rabatt_pct },
            steps: [
                { key: 'lvp', label: 'Listenverkaufspreis', value: lvp, given: true },
                {
                    key: 'rabatt', label: 'Kundenrabatt', sublabel: `${rabatt_pct} %`, value: rabatt, given: false,
                    hint: `${fmt(lvp)} ÷ 100 × ${rabatt_pct} = ${fmt(rabatt)} €\n(Vom Hundert: Basis = LVP)`
                },
                {
                    key: 'zvp', label: '= Zielverkaufspreis', value: zvp, given: false, isSum: true,
                    hint: `${fmt(lvp)} − ${fmt(rabatt)} = ${fmt(zvp)} €`
                },
                {
                    key: 'skonto', label: 'Kundenskonto', sublabel: `${skonto_pct} %`, value: skonto, given: false,
                    hint: `${fmt(zvp)} ÷ 100 × ${skonto_pct} = ${fmt(skonto)} €\n(Vom Hundert: Basis = ZVP)`
                },
                {
                    key: 'bvp', label: '= Barverkaufspreis', value: bvp, given: false, isSum: true,
                    hint: `${fmt(zvp)} − ${fmt(skonto)} = ${fmt(bvp)} €`
                },
                {
                    key: 'gewinn', label: 'Gewinn', sublabel: `${gewinn_pct} %`, value: gewinn, given: false, danger: true,
                    hint: `⚠️ Auf Hundert rechnen!\n${fmt(bvp)} ÷ ${100 + gewinn_pct} × ${gewinn_pct} = ${fmt(gewinn)} €\n(BVP = ${100 + gewinn_pct}% der SK)`
                },
                {
                    key: 'sk', label: '= Selbstkosten', value: sk, given: false, isSum: true,
                    hint: `${fmt(bvp)} − ${fmt(gewinn)} = ${fmt(sk)} €`
                },
                {
                    key: 'hk', label: 'Handlungskosten', sublabel: `${hk_pct} %`, value: hk, given: false, danger: true,
                    hint: `⚠️ Auf Hundert rechnen!\n${fmt(sk)} ÷ ${100 + hk_pct} × ${hk_pct} = ${fmt(hk)} €\n(SK = ${100 + hk_pct}% des EP)`
                },
                {
                    key: 'ep', label: '= Einstandspreis', value: ep, given: false, isSum: true,
                    hint: `${fmt(sk)} − ${fmt(hk)} = ${fmt(ep)} €`
                },
            ]
        };
    }

    // ── Differenzkalkulation: Zangengriff ──
    const ep = randPrice(100, 500);
    const lvp = randPrice(Math.max(ep + 50, ep * 1.1), ep * 1.8);
    // Phase 1: Vorwärts (EP → SK)
    const hk = commercialRound(ep / 100 * hk_pct);
    const sk = commercialRound(ep + hk);
    // Phase 2: Rückwärts (LVP → BVP) — vom Hundert
    const rabatt = commercialRound(lvp / 100 * rabatt_pct);
    const zvp = commercialRound(lvp - rabatt);
    const skonto = commercialRound(zvp / 100 * skonto_pct);
    const bvp = commercialRound(zvp - skonto);
    // Phase 3: Differenz
    const gewinn = commercialRound(bvp - sk);
    // Phase 4: Prozentsatz
    const gewinn_pct_result = commercialRound((gewinn / sk) * 100);

    return {
        ...config, given: { ep, hk_pct, lvp, rabatt_pct, skonto_pct },
        steps: [
            { key: 'ep', label: 'Einstandspreis', value: ep, given: true, phase: 1 },
            {
                key: 'hk', label: 'Handlungskosten', sublabel: `${hk_pct} % vom EP`, value: hk, given: false, phase: 1,
                hint: `${fmt(ep)} ÷ 100 × ${hk_pct} = ${fmt(hk)} €`
            },
            {
                key: 'sk', label: '= Selbstkosten', value: sk, given: false, isSum: true, phase: 1,
                hint: `${fmt(ep)} + ${fmt(hk)} = ${fmt(sk)} €`
            },
            { key: 'lvp', label: 'Listenverkaufspreis', value: lvp, given: true, phase: 2 },
            {
                key: 'rabatt', label: 'Kundenrabatt', sublabel: `${rabatt_pct} %`, value: rabatt, given: false, phase: 2,
                hint: `${fmt(lvp)} ÷ 100 × ${rabatt_pct} = ${fmt(rabatt)} €`
            },
            {
                key: 'zvp', label: '= Zielverkaufspreis', value: zvp, given: false, isSum: true, phase: 2,
                hint: `${fmt(lvp)} − ${fmt(rabatt)} = ${fmt(zvp)} €`
            },
            {
                key: 'skonto', label: 'Kundenskonto', sublabel: `${skonto_pct} %`, value: skonto, given: false, phase: 2,
                hint: `${fmt(zvp)} ÷ 100 × ${skonto_pct} = ${fmt(skonto)} €`
            },
            {
                key: 'bvp', label: '= Barverkaufspreis', value: bvp, given: false, isSum: true, phase: 2,
                hint: `${fmt(zvp)} − ${fmt(skonto)} = ${fmt(bvp)} €`
            },
            {
                key: 'gewinn', label: 'Gewinn (absolut)', value: gewinn, given: false, isSum: true, phase: 3,
                hint: `BVP − SK = ${fmt(bvp)} − ${fmt(sk)} = ${fmt(gewinn)} €`
            },
            {
                key: 'gewinn_pct', label: 'Gewinn in %', value: gewinn_pct_result, given: false, phase: 4, isPercent: true,
                hint: `(${fmt(gewinn)} ÷ ${fmt(sk)}) × 100 = ${fmt(gewinn_pct_result)} %\n(Gewinn ÷ Selbstkosten × 100)`
            },
        ]
    };
}

// ── Phase Labels für Level 3 ───
const PHASE_LABELS = {
    1: { title: '⬇ Schritt 1: Vorwärts', color: '#22c55e', desc: 'Vom Einstandspreis bis zu den Selbstkosten' },
    2: { title: '⬆ Schritt 2: Rückwärts', color: '#f59e0b', desc: 'Vom Listenverkaufspreis bis zum Barverkaufspreis' },
    3: { title: '🎯 Schritt 3: Differenz', color: '#ef4444', desc: 'Gewinn = BVP − Selbstkosten' },
    4: { title: '📊 Schritt 4: Prozentsatz', color: '#a855f7', desc: 'Gewinnzuschlagssatz berechnen' },
};

// ═══════════════════════════════════════════════════════════════
// KOMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function KalkulationsBoss({ onBack, onLearningEvent, isGuest }) {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [inputs, setInputs] = useState({});
    const [validated, setValidated] = useState({});
    const [shaking, setShaking] = useState({});
    const [showHint, setShowHint] = useState({});
    const [wrongSteps, setWrongSteps] = useState({});
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [score, setScore] = useState(0);
    const [attempts, setAttempts] = useState({});
    const [levelHadErrors, setLevelHadErrors] = useState(false);

    // Boss-Modus Gamification
    const [lives, setLives] = useState(3);
    const [streak, setStreak] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [floatingPoints, setFloatingPoints] = useState(null); // { idx, points }
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
        try { return JSON.parse(localStorage.getItem(FLAWLESS_COMPLETED_STORAGE_KEY) || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem(FLAWLESS_COMPLETED_STORAGE_KEY, JSON.stringify(completedLevels));
    }, [completedLevels]);

    const startLevel = (config) => {
        const level = generateLevel(config);
        setSelectedLevel(level);
        setInputs({});
        setValidated({});
        setShaking({});
        setShowHint({});
        setWrongSteps({});
        setActiveStep(0);
        setCompleted(false);
        setScore(0);
        setAttempts({});
        setLevelHadErrors(false);
        // Boss-Modus reset
        setLives(3);
        setStreak(0);
        setGameOver(false);
        setFloatingPoints(null);
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
        setWrongSteps(prev => ({ ...prev, [idx]: false }));
    };

    const isBoss = selectedLevel?.id === 4;

    const validateStep = (idx) => {
        if (!selectedLevel) return;
        const step = selectedLevel.steps[idx];
        const rawInput = String(inputs[idx] ?? '').trim().replace(',', '.').replace(/[^0-9.-]/g, '');
        const userVal = parseFloat(rawInput);
        if (isNaN(userVal)) return;

        const correct = round2(step.value);
        const correctCents = toCents(correct);
        const userCents = toCents(userVal);

        if (userCents === correctCents) {
            // ✅ CORRECT
            if (onLearningEvent) onLearningEvent({ mode: 'kalkulation', questionId: `kalk_${selectedLevel.id}_${idx}`, questionText: `${selectedLevel.name}: ${step.label}`, correct: true, userAnswer: rawInput, expectedAnswer: correct.toFixed(2) });
            setValidated(prev => ({ ...prev, [idx]: true }));
            setInputs(prev => ({ ...prev, [idx]: correct.toFixed(2) }));
            setShowHint(prev => ({ ...prev, [idx]: false }));
            setWrongSteps(prev => ({ ...prev, [idx]: false }));

            if (isBoss) {
                // Boss scoring: 100 × streak multiplier
                const newStreak = streak + 1;
                setStreak(newStreak);
                const pts = 100 * newStreak;
                setScore(prev => prev + pts);
                setFloatingPoints({ idx, points: pts });
                setTimeout(() => setFloatingPoints(null), 1200);
            } else {
                // Normal scoring: First try = 2pts, second = 1pt
                const att = (attempts[idx] || 0);
                if (att === 0) setScore(prev => prev + 2);
                else if (att === 1) setScore(prev => prev + 1);
            }

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
                if (!levelHadErrors && !completedLevels.includes(selectedLevel.id)) {
                    setCompletedLevels(prev => [...prev, selectedLevel.id]);
                }
            }
        } else {
            // ❌ WRONG
            if (onLearningEvent) onLearningEvent({ mode: 'kalkulation', questionId: `kalk_${selectedLevel.id}_${idx}`, questionText: `${selectedLevel.name}: ${step.label}`, correct: false, userAnswer: rawInput, expectedAnswer: correct.toFixed(2) });
            setShaking(prev => ({ ...prev, [idx]: true }));
            setAttempts(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
            setWrongSteps(prev => ({ ...prev, [idx]: true }));
            setLevelHadErrors(true);
            setTimeout(() => setShaking(prev => ({ ...prev, [idx]: false })), 600);

            if (isBoss) {
                setStreak(0);
                const newLives = lives - 1;
                setLives(newLives);
                if (newLives <= 0) {
                    setGameOver(true);
                    return;
                }
                // Show hint immediately in boss mode
                setShowHint(prev => ({ ...prev, [idx]: true }));
            } else {
                // Show hint after 2 wrong attempts
                if ((attempts[idx] || 0) >= 1) {
                    setShowHint(prev => ({ ...prev, [idx]: true }));
                }
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

                <header style={{ width: '100%', textAlign: 'center', position: 'relative', zIndex: 20, paddingTop: '3.5rem' }}>
                    <button
                        onClick={onBack}
                        className="btn-nav"
                        style={{
                            position: 'absolute',
                            top: '0',
                            left: '3rem',
                            zIndex: 50,
                            pointerEvents: 'auto',
                            minHeight: '42px',
                            padding: '0.55rem 1rem'
                        }}
                    >
                        ← Zurück
                    </button>
                    <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '2.5rem', transform: 'scaleY(1.15)', color: 'var(--text-light)', marginBottom: '0.3rem', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                        Kalkulations-Boss
                    </h1>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>Meistere die Handelskalkulation Schritt für Schritt</p>
                </header>

                <div className="dashboard-grid" style={{ maxWidth: '900px' }}>
                    {LEVEL_CONFIG.map(config => {
                        const done = completedLevels.includes(config.id);
                        const locked = isGuest && config.id > 1;
                        return (
                            <div key={config.id} className="dash-card" onClick={() => { if (!locked) startLevel(config); }}
                                style={{ borderColor: done ? config.color : undefined, boxShadow: done ? `0 0 20px ${config.color}33` : undefined, opacity: locked ? 0.55 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                                    {locked ? '🔒' : config.id === 1 ? '⬇️' : config.id === 2 ? '⬆️' : config.id === 3 ? '🔀' : '👑'}
                                </div>
                                <h2 style={{ color: 'var(--text-light)', margin: 0 }}>Level {config.id}</h2>
                                <h3 style={{ color: config.color, margin: '0.2rem 0', fontWeight: 700, fontSize: '1.1rem' }}>{config.title}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{locked ? 'Nur mit Account verfügbar' : config.story}</p>
                                <div className="chip" style={{
                                    background: done ? `${config.color}33` : undefined,
                                    color: done ? config.color : undefined,
                                    borderColor: done ? config.color : undefined,
                                }}>
                                    {locked ? '🔒 Gesperrt' : done ? '✅ Abgeschlossen' : config.subtitle}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ─── Game Over Screen (Boss-Modus) ───
    if (gameOver && isBoss) {
        return (
            <div className="app-container" style={{ zIndex: 10 }}>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '500px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '2px solid #ef4444', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💥</div>
                    <h2 style={{ color: '#ef4444', fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                        Deal geplatzt!
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Die Geduld deines Verhandlungspartners ist aufgebraucht.
                    </p>
                    <p style={{ color: '#a855f7', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                        Endpunktzahl: {score} Punkte
                    </p>
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn-primary" style={{ background: '#a855f7' }} onClick={() => startLevel(LEVEL_CONFIG[3])}>🔄 Neuen Deal starten</button>
                        <button className="btn-secondary" onClick={() => setSelectedLevel(null)}>📋 Level-Auswahl</button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Completed Screen ───
    if (completed) {
        const bossStars = lives >= 3 ? 3 : lives >= 2 ? 2 : 1;
        const normalPct = Math.round((score / maxScore) * 100);
        const normalStars = normalPct >= 90 ? 3 : normalPct >= 60 ? 2 : 1;
        const stars = isBoss ? bossStars : normalStars;
        return (
            <div className="app-container" style={{ zIndex: 10 }}>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '500px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: `2px solid ${selectedLevel.color}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                        {stars === 3 ? '🏆' : stars === 2 ? '⭐' : '💪'}
                    </div>
                    <h2 style={{ color: 'var(--text-light)', fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                        {isBoss ? 'Deal erfolgreich abgeschlossen!' : `Level ${selectedLevel.id} geschafft!`}
                    </h2>
                    {isBoss && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.3rem 0' }}>
                            Kalkulationstyp: {selectedLevel.subtitle}
                        </p>
                    )}
                    <p style={{ color: selectedLevel.color, fontWeight: 700, fontSize: '1.2rem', margin: '0.5rem 0' }}>
                        {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
                    </p>
                    <p style={{ color: 'var(--text-muted)', marginBottom: isBoss ? '0.3rem' : '1.5rem' }}>
                        {isBoss ? `${score} Punkte` : `${score} / ${maxScore} Punkte (${normalPct}%)`}
                    </p>
                    {isBoss && (
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            {'☕'.repeat(lives)}{'🤍'.repeat(3 - lives)} {lives}/3 Leben übrig
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => startLevel(LEVEL_CONFIG[selectedLevel.id - 1])}>🔄 {isBoss ? 'Nächster Deal' : 'Nochmal'}</button>
                        <button className="btn-secondary" onClick={() => setSelectedLevel(null)}>📋 Level-Auswahl</button>
                        {!isBoss && selectedLevel.id < 4 && (
                            <button className="btn-primary" style={{ background: LEVEL_CONFIG[selectedLevel.id].color }}
                                onClick={() => startLevel(LEVEL_CONFIG[selectedLevel.id])}>
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
    const shouldMirrorPhase2InDiff = selectedLevel?.id === 3 && selectedLevel?.direction === 'diff';
    const stepIndices = selectedLevel.steps.map((_, index) => index);
    const renderStepIndices = shouldMirrorPhase2InDiff
        ? [
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 1),
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 3),
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 2).reverse(),
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 4),
        ]
        : stepIndices;

    return (
        <div className="app-container" style={{ zIndex: 10, maxWidth: '650px' }}>
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            {/* Header with Lives & Score */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', padding: '0 0.5rem', position: 'relative', zIndex: 30 }}>
                <button
                    onClick={() => setSelectedLevel(null)}
                    className="btn-nav"
                    style={{ position: 'relative', zIndex: 31, minHeight: '40px', padding: '0.55rem 1rem', pointerEvents: 'auto' }}
                >
                    ← Auswahl
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isBoss && (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '1.1rem' }}>{Array.from({ length: 3 }).map((_, i) => (
                                <span key={i} style={{ opacity: i < lives ? 1 : 0.2, filter: i < lives ? 'none' : 'grayscale(1)', transition: 'all 0.4s' }}>☕</span>
                            ))}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Geduld</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: selectedLevel.color, fontWeight: 800, fontSize: '1.2rem', textShadow: `0 0 10px ${selectedLevel.color}44` }}>
                            {score} <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>PTS</span>
                        </span>
                        {streak > 1 && (
                            <span className="fade-in" style={{ fontSize: '0.7rem', background: 'linear-gradient(45deg, #f59e0b, #ef4444)', padding: '1px 6px', borderRadius: '4px', color: 'black', fontWeight: 900 }}>
                                {streak}× COMBO
                            </span>
                        )}
                    </div>
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
                flexDirection: selectedLevel.direction === 'backward' ? 'column-reverse' : 'column',
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
                    background: selectedLevel.direction === 'backward'
                        ? `linear-gradient(0deg, ${selectedLevel.color}44, ${selectedLevel.color}22)`
                        : `linear-gradient(180deg, ${selectedLevel.color}44, ${selectedLevel.color}22)`,
                    borderRadius: '2px',
                    zIndex: 0,
                }} />

                {renderStepIndices.map((stepIndex, renderIndex) => {
                    const step = selectedLevel.steps[stepIndex];
                    const prevStepIndex = renderIndex > 0 ? renderStepIndices[renderIndex - 1] : null;
                    const previousPhase = prevStepIndex !== null ? selectedLevel.steps[prevStepIndex]?.phase : null;
                    const isActive = stepIndex === activeStep;
                    const isDone = validated[stepIndex];
                    const isGiven = step.given;
                    const isShaking = shaking[stepIndex];
                    const hintVisible = showHint[stepIndex];
                    const stepStatusColor = isDone ? '#22c55e' : (wrongSteps[stepIndex] ? '#ef4444' : '#f59e0b');
                    const isMirroredDiffPhase2 = shouldMirrorPhase2InDiff && step.phase === 2;
                    const showPhase2HeaderUnderLvp = isMirroredDiffPhase2 && step.key === 'lvp';
                    const isInlineDiffPhase3 = shouldMirrorPhase2InDiff && step.phase === 3;

                    // Phase divider for Level 3
                    let phaseHeader = null;
                    if (selectedLevel.direction === 'diff' && step.phase && step.phase !== previousPhase) {
                        const pl = PHASE_LABELS[step.phase];
                        if (shouldMirrorPhase2InDiff && step.phase === 2) {
                            phaseHeader = null;
                        } else if (shouldMirrorPhase2InDiff && step.phase === 3) {
                            phaseHeader = null;
                        } else {
                            phaseHeader = (
                                <div key={`phase-${step.phase}`} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.7rem',
                                    padding: '0.6rem 0.8rem', marginBottom: '0.3rem', marginTop: renderIndex > 0 ? '0.8rem' : 0,
                                    borderRadius: '10px',
                                    background: `${pl.color}15`,
                                    border: `1px solid ${pl.color}33`,
                                }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pl.color }}>{pl.title}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pl.desc}</span>
                                </div>
                            );
                        }
                    }

                    return (
                        <div key={stepIndex} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0',
                            position: 'relative'
                        }}>
                            {phaseHeader}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.6rem 0.8rem 0.6rem 0.5rem',
                                marginLeft: '8px',
                                borderRadius: '14px',
                                background: isInlineDiffPhase3 ? `${stepStatusColor}14` : isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                                border: isInlineDiffPhase3 ? `1px solid ${stepStatusColor}66` : isActive ? `1px solid ${stepStatusColor}55` : '1px solid transparent',
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
                                    background: isDone ? stepStatusColor : isGiven ? 'rgba(255,255,255,0.15)' : isActive ? `${stepStatusColor}33` : 'rgba(255,255,255,0.06)',
                                    color: isDone ? '#fff' : isGiven ? 'var(--text-light)' : isActive ? stepStatusColor : 'var(--text-muted)',
                                    border: isActive ? `2px solid ${stepStatusColor}` : isDone ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                    transition: 'all 0.3s ease',
                                }}>
                                    {isDone ? '✓' : isGiven ? '📌' : (stepIndex + 1)}
                                </div>

                                {/* Label */}
                                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: step.isSum ? '0.95rem' : '0.85rem',
                                        fontWeight: step.isSum ? 700 : 500,
                                        color: isDone ? 'var(--text-light)' : isActive ? 'var(--text-light)' : 'var(--text-muted)',
                                        lineHeight: 1.3,
                                    }}>
                                        {isInlineDiffPhase3 && (
                                            <span style={{ fontWeight: 800, color: stepStatusColor, marginRight: '0.7rem' }}>
                                                {PHASE_LABELS[3].title}
                                            </span>
                                        )}
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
                                            color: isDone && !isGiven ? stepStatusColor : 'var(--text-light)',
                                            padding: '0.5rem 0.8rem',
                                            borderRadius: '10px',
                                            background: isDone && !isGiven ? `${stepStatusColor}15` : 'rgba(255,255,255,0.05)',
                                            border: isDone && !isGiven ? `1px solid ${stepStatusColor}44` : '1px solid transparent',
                                            textAlign: 'right',
                                        }}>
                                            {step.value.toFixed(2)} {step.isPercent ? '%' : '€'}
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                ref={el => inputRefs.current[stepIndex] = el}
                                                type="text"
                                                inputMode="decimal"
                                                value={inputs[stepIndex] || ''}
                                                onChange={(e) => handleInput(stepIndex, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, stepIndex)}
                                                disabled={!isActive}
                                                placeholder={isActive ? '0,00' : '—'}
                                                style={{
                                                    width: '100%',
                                                    fontFamily: 'monospace',
                                                    fontSize: '1.05rem',
                                                    fontWeight: 600,
                                                    color: 'var(--text-light)',
                                                    background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                                    border: isActive ? `2px solid ${stepStatusColor}` : '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    padding: '0.5rem 2.2rem 0.5rem 0.8rem',
                                                    textAlign: 'right',
                                                    outline: 'none',
                                                    transition: 'all 0.2s ease',
                                                    opacity: isActive ? 1 : 0.4,
                                                    boxShadow: isActive ? `0 0 12px ${stepStatusColor}22` : 'none',
                                                }}
                                            />
                                            {/* Floating Points Animation */}
                                            {floatingPoints?.idx === stepIndex && (
                                                <div className="fade-out-up" style={{
                                                    position: 'absolute',
                                                    right: '-2rem',
                                                    top: '0',
                                                    color: '#fbbf24',
                                                    fontWeight: 900,
                                                    fontSize: '1.2rem',
                                                    zIndex: 20,
                                                    pointerEvents: 'none',
                                                    textShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
                                                }}>
                                                    +{floatingPoints.points}
                                                </div>
                                            )}
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
                                    <button onClick={() => validateStep(stepIndex)} style={{
                                        background: stepStatusColor,
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        padding: '0.5rem 0.8rem',
                                        marginLeft: '0.5rem',
                                        cursor: 'pointer',
                                        boxShadow: `0 4px 10px ${stepStatusColor}44`,
                                    }}>
                                        ✓
                                    </button>
                                )}
                            </div>

                            {/* Hint Tooltip */}
                            {hintVisible && !isDone && (
                                <div className="fade-in" style={{
                                    marginLeft: '52px',
                                    marginBottom: '0.6rem',
                                    padding: '0.7rem 1rem',
                                    borderRadius: '10px',
                                    background: step.danger ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                                    border: `1px solid ${step.danger ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
                                    fontSize: '0.8rem',
                                    color: 'var(--text-light)',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-line',
                                    zIndex: 5
                                }}>
                                    <span style={{ fontWeight: 700, color: step.danger ? '#ef4444' : '#818cf8' }}>💡 Spickzettel:</span>
                                    <br />
                                    {step.hint}
                                </div>
                            )}

                            {showPhase2HeaderUnderLvp && (() => {
                                const pl = PHASE_LABELS[2];
                                return (
                                    <div key="phase-2-relocated" style={{
                                        display: 'flex', alignItems: 'center', gap: '0.7rem',
                                        padding: '0.6rem 0.8rem',
                                        marginLeft: '52px',
                                        marginRight: '8px',
                                        marginBottom: '0.3rem',
                                        marginTop: '0.35rem',
                                        borderRadius: '10px',
                                        background: `${pl.color}15`,
                                        border: `1px solid ${pl.color}33`,
                                    }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pl.color }}>{pl.title}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pl.desc}</span>
                                    </div>
                                );
                            })()}
                        </div>
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
            <FloatingNotes label="Kalkulations-Notizen" />
            <FloatingCalculator label="Kalkulations-Hilfe" />
        </div>
    );
}
