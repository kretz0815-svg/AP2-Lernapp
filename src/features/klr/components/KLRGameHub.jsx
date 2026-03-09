import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useKLRGame } from '../state/KLRGameProvider';
import { generateLevel2Math, generateLevel4Math } from '../utils/generateLevelMath';
import { fetchYouTubeVideos } from '../../../youtubeClient';
import { askCyberEinstein, askGemini } from '../../../geminiClient';
import CyberEinsteinMentor from './CyberEinsteinMentor';
import './klr-cyber.css';

// --- Safety: Inlined Confetti to avoid ANY import issues causing a black screen ---
const LocalConfetti = ({ amount = 60 }) => {
  const pieces = useMemo(() => {
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
  { label: 'Shopify-Abo', amountMin: 20, amountMax: 59, step: 1, category: 'fix' },
  { label: 'WooCommerce Hosting', amountMin: 30, amountMax: 99, step: 1, category: 'fix' },
  { label: 'Lager-Miete', amountMin: 500, amountMax: 1800, step: 50, category: 'fix' },
  { label: 'Büro-Miete', amountMin: 300, amountMax: 1200, step: 50, category: 'fix' },
  { label: 'Cloud-Server Flat', amountMin: 80, amountMax: 400, step: 10, category: 'fix' },
  { label: 'CDN Grundgebühr', amountMin: 20, amountMax: 120, step: 5, category: 'fix' },
  { label: 'Buchhaltungssoftware', amountMin: 15, amountMax: 80, step: 5, category: 'fix' },
  { label: 'ERP-Lizenz', amountMin: 60, amountMax: 250, step: 10, category: 'fix' },
  { label: 'Team-Chat Lizenz', amountMin: 10, amountMax: 60, step: 5, category: 'fix' },
  { label: 'Projektmanagement Tool', amountMin: 8, amountMax: 40, step: 2, category: 'fix' },
  { label: 'Steuerberater Pauschale', amountMin: 120, amountMax: 350, step: 10, category: 'fix' },
  { label: 'Rechtsberatung Retainer', amountMin: 100, amountMax: 400, step: 10, category: 'fix' },
  { label: 'Versicherung Betriebshaftpflicht', amountMin: 40, amountMax: 180, step: 5, category: 'fix' },
  { label: 'D&O Versicherung', amountMin: 30, amountMax: 150, step: 5, category: 'fix' },
  { label: 'Internetanschluss', amountMin: 25, amountMax: 70, step: 5, category: 'fix' },
  { label: 'Telefonanlage', amountMin: 15, amountMax: 60, step: 5, category: 'fix' },
  { label: 'Abschreibung Regalsystem', amountMin: 80, amountMax: 260, step: 10, category: 'fix' },
  { label: 'Abschreibung Packtische', amountMin: 40, amountMax: 160, step: 10, category: 'fix' },
  { label: 'Sicherheitsdienst Lager', amountMin: 120, amountMax: 360, step: 20, category: 'fix' },
  { label: 'Alarmanlage Wartung', amountMin: 20, amountMax: 90, step: 5, category: 'fix' },
  { label: 'Abo KI-Tool', amountMin: 15, amountMax: 120, step: 5, category: 'fix' },
  { label: 'Abo Design-Tool', amountMin: 12, amountMax: 60, step: 2, category: 'fix' },
  { label: 'Abo Video-Tool', amountMin: 10, amountMax: 55, step: 5, category: 'fix' },
  { label: 'HR-Software', amountMin: 20, amountMax: 110, step: 5, category: 'fix' },
  { label: 'Monitoring-Tool', amountMin: 25, amountMax: 130, step: 5, category: 'fix' },

  { label: 'Wareneinsatz Hoodie pro Stück', amountMin: 10, amountMax: 28, step: 2, category: 'variable' },
  { label: 'Wareneinsatz Gadget pro Stück', amountMin: 8, amountMax: 24, step: 2, category: 'variable' },
  { label: 'Verpackungskarton pro Bestellung', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Seidenpapier pro Bestellung', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Sticker-Beilage pro Bestellung', amountMin: 1, amountMax: 2, step: 1, category: 'variable' },
  { label: 'Versandlabel pro Paket', amountMin: 3, amountMax: 8, step: 1, category: 'variable' },
  { label: 'Pick-&-Pack Kosten pro Order', amountMin: 2, amountMax: 6, step: 1, category: 'variable' },
  { label: 'Payment Fee pro Transaktion', amountMin: 1, amountMax: 5, step: 1, category: 'variable' },
  { label: 'Zahlungsanbieter %-Gebühr je Verkauf', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Retourenlabel pro Retoure', amountMin: 3, amountMax: 9, step: 1, category: 'variable' },
  { label: 'Reinigungsaufwand pro Rückläufer', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Neuverpackung pro Rückläufer', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Kommission für Marktplatzverkauf', amountMin: 2, amountMax: 9, step: 1, category: 'variable' },
  { label: 'Affiliate-Provision je Sale', amountMin: 2, amountMax: 10, step: 1, category: 'variable' },
  { label: 'Influencer-Provision je Code-Sale', amountMin: 3, amountMax: 12, step: 1, category: 'variable' },
  { label: 'Klarna-Gebühr je Bestellung', amountMin: 1, amountMax: 5, step: 1, category: 'variable' },
  { label: 'Kreditkarten-Processing je Kauf', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Customs Handling je Auslandssendung', amountMin: 2, amountMax: 9, step: 1, category: 'variable' },
  { label: 'Einlagekarte pro Premium-Box', amountMin: 1, amountMax: 2, step: 1, category: 'variable' },
  { label: 'Schutzfolie pro Gadget', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Batterie-Beilage pro Bundle', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Montage-Minuten pro Spezialprodukt', amountMin: 2, amountMax: 8, step: 1, category: 'variable' },
  { label: 'Lagerpick pro Position', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Kundensupport pro Bestellung (variabel)', amountMin: 1, amountMax: 5, step: 1, category: 'variable' },
  { label: 'E-Mail Versandkosten je Kampagnenkontakt', amountMin: 1, amountMax: 2, step: 1, category: 'variable' }
];

const randStepValue = (min, max, step) => {
  const count = Math.floor((max - min) / step);
  const idx = Math.floor(Math.random() * (count + 1));
  return min + (idx * step);
};

const euro = (n) => `${Number(n).toLocaleString('de-DE')} €`;
const euroInput = (n) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sampleWithoutReplacement = (arr, count) => {
  const pool = [...arr];
  const out = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
};

const generateLevel1Run = () => {
  const questionCount = 12;
  const sampled = sampleWithoutReplacement(COST_ITEM_POOL, questionCount);
  return sampled.map((item, idx) => ({
    id: `${item.label}-${idx}-${Date.now()}`,
    label: item.label,
    amount: randStepValue(item.amountMin, item.amountMax, item.step),
    category: item.category
  }));
};

const generateLevel3Scenario = () => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const stepValue = (min, max, step) => {
    const steps = Math.floor((max - min) / step);
    return min + (Math.floor(Math.random() * (steps + 1)) * step);
  };

  for (let i = 0; i < 120; i += 1) {
    const materialDirect = stepValue(30, 130, 10);
    const laborDirect = stepValue(20, 110, 10);
    const mgkPct = pick([10, 20, 30, 40, 50, 60]);
    const fgkPct = pick([10, 20, 30, 40, 50, 60]);
    const vwgkPct = pick([10, 20, 30, 40]);
    const vtgkPct = pick([10, 20, 30, 40]);

    const materialOverhead = Math.round((materialDirect * mgkPct) / 100);
    const laborOverhead = Math.round((laborDirect * fgkPct) / 100);
    const materialCost = materialDirect + materialOverhead;
    const laborCost = laborDirect + laborOverhead;
    const productionCost = materialCost + laborCost;
    const adminOverhead = Math.round((productionCost * vwgkPct) / 100);
    const salesOverhead = Math.round((productionCost * vtgkPct) / 100);
    const selfCost = productionCost + adminOverhead + salesOverhead;

    if ([materialOverhead, laborOverhead, adminOverhead, salesOverhead, selfCost].every(Number.isInteger)) {
      return {
        materialDirect,
        laborDirect,
        mgkPct,
        fgkPct,
        vwgkPct,
        vtgkPct,
        materialOverhead,
        laborOverhead,
        productionCost,
        adminOverhead,
        salesOverhead,
        selfCost
      };
    }
  }

  return {
    materialDirect: 80,
    laborDirect: 60,
    mgkPct: 20,
    fgkPct: 30,
    vwgkPct: 10,
    vtgkPct: 10,
    materialOverhead: 16,
    laborOverhead: 18,
    productionCost: 174,
    adminOverhead: 17,
    salesOverhead: 17,
    selfCost: 208
  };
};

const generateLevel4Mission = () => {
  const math = generateLevel4Math();
  const unitsByPrice = math.allowedPrices
    .map((price) => ({ price, units: math.fixedCost / (price - math.variableCostPerUnit) }))
    .sort((a, b) => a.units - b.units);

  const feasibleCaps = unitsByPrice
    .map((entry) => entry.units)
    .filter((units) => Number.isInteger(units) && units >= 120 && units <= 1200);

  const fallbackCap = Math.max(150, Math.min(1200, unitsByPrice[Math.floor(unitsByPrice.length / 2)]?.units || 300));
  const capacity = feasibleCaps.length > 0
    ? feasibleCaps[Math.floor(Math.random() * feasibleCaps.length)]
    : fallbackCap;

  return { math, capacity };
};

export default function KLRGameHub({ onBack, onLearningEvent }) {
  const { progress, setStartupName, grantXp, unlockLevel } = useKLRGame();
  const [nameInput, setNameInput] = useState(progress.startupName);
  const [screen, setScreen] = useState('home');
  const [pendingLevelId, setPendingLevelId] = useState(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [geminiVisible, setGeminiVisible] = useState(false);
  const [geminiQuery, setGeminiQuery] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState('');

  const [level1Items, setLevel1Items] = useState(() => generateLevel1Run());
  const [level1Index, setLevel1Index] = useState(0);
  const [level1Correct, setLevel1Correct] = useState(0);
  const [level1Mistakes, setLevel1Mistakes] = useState(0);
  const [level1Feedback, setLevel1Feedback] = useState('');

  const [level2Math, setLevel2Math] = useState(() => generateLevel2Math());
  const [level2Inputs, setLevel2Inputs] = useState({ lager: '', packstation: '', buero: '' });
  const [level2FieldOk, setLevel2FieldOk] = useState({ lager: null, packstation: null, buero: null });
  const [level2Attempts, setLevel2Attempts] = useState({ lager: 0, packstation: 0, buero: 0 });
  const [level2Status, setLevel2Status] = useState('idle');
  const [level2Feedback, setLevel2Feedback] = useState('');
  const level2InputRefs = useRef({ lager: null, packstation: null, buero: null });
  const [level3Scenario, setLevel3Scenario] = useState(() => generateLevel3Scenario());
  const [level3Rates, setLevel3Rates] = useState({ mgkPct: 0, fgkPct: 0, vwgkPct: 0, vtgkPct: 0 });
  const [level3SelfCostInput, setLevel3SelfCostInput] = useState('');
  const [level3Status, setLevel3Status] = useState('idle');
  const [level3Feedback, setLevel3Feedback] = useState('');
  const [level3HelpOpen, setLevel3HelpOpen] = useState(false);
  const LEVEL4_MISSIONS_PER_RUN = 3;
  const [level4MissionIndex, setLevel4MissionIndex] = useState(0);
  const [level4Mission, setLevel4Mission] = useState(() => generateLevel4Mission());
  const [level4Price, setLevel4Price] = useState(level4Mission.math.allowedPrices[0] || 0);
  const [level4BreakEvenInput, setLevel4BreakEvenInput] = useState('');
  const [level4Status, setLevel4Status] = useState('idle');
  const [level4Feedback, setLevel4Feedback] = useState('');
  const [level4CompleteScreen, setLevel4CompleteScreen] = useState(false);
  const [mentorState, setMentorState] = useState('booting');
  const [mentorMessage, setMentorMessage] = useState('Hologramm-System fährt hoch...');
  const mentorTimeoutRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const level1Done = level1Index >= level1Items.length;
  const currentItem = level1Items[level1Index];

  const level1ScorePct = useMemo(() => {
    if (!level1Items.length) return 0;
    return Math.round((level1Correct / level1Items.length) * 100);
  }, [level1Correct, level1Items.length]);

  const level2CorrectCount = useMemo(() => {
    return ['lager', 'packstation', 'buero'].filter((k) => level2FieldOk[k] === true).length;
  }, [level2FieldOk]);

  useEffect(() => {
    const t = setTimeout(() => {
      setMentorState('idle');
      setMentorMessage('System online. Zeig mir saubere KLR-Logik.');
    }, 950);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => {
    if (mentorTimeoutRef.current) {
      clearTimeout(mentorTimeoutRef.current);
    }
  }, []);

  const setMentorTransient = (state, message, ms = 2600) => {
    if (mentorTimeoutRef.current) clearTimeout(mentorTimeoutRef.current);
    setMentorState(state);
    setMentorMessage(message);
    mentorTimeoutRef.current = setTimeout(() => {
      setMentorState('idle');
    }, ms);
  };

  const successLine = () => {
    const lines = [
      'Exzellent. Diese Rechnung ist relativitätssicher.',
      'Sehr gut. Dein Startup bleibt im grünen Bereich.',
      'Sauber gelöst. Genau so skaliert man ohne Chaos.'
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  };

  const requestMentorError = async (question, expected, userInput) => {
    setMentorState('speaking');
    setMentorMessage('Analyse läuft... ich berechne deinen Denkfehler.');
    try {
      const response = await askCyberEinstein({
        userPrompt: `Meine Antwort: ${userInput || 'leer'}`,
        contextQuestion: question,
        contextAnswer: expected
      });
      setMentorTransient('error', response, 4200);
    } catch {
      setMentorTransient('error', 'Relativitätsbruch erkannt. Prüfe Formel und Bezugsbasis erneut.', 3800);
    }
  };

  const shellStyle = {
    width: '100%',
    maxWidth: '980px',
    margin: '0 auto',
    padding: '0 0 1.2rem 0',
    paddingTop: 'max(0.25rem, env(safe-area-inset-top, 0px))',
    display: 'grid',
    gap: '0.9rem'
  };

  const sectionStyle = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '18px',
    padding: '0.95rem',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)'
  };

  const topBarStyle = {
    ...sectionStyle,
    position: 'relative',
    minHeight: '58px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap'
  };

  const renderScreen = (content, maxWidth = '980px') => (
    <div className={`klr-cyber-theme ${mentorState === 'success' ? 'klr-cyber-theme--success' : ''}`}>
      {showConfetti && <LocalConfetti />}
      <div style={{ ...shellStyle, maxWidth }}>
        {content}
      </div>
      <CyberEinsteinMentor state={mentorState} message={mentorMessage} visible />
    </div>
  );

  const startLevel1 = () => {
    setVideoOpen(false);
    setGeminiVisible(false);
    setGeminiResponse('');
    setSelectedVideo(null);
    setLevel1Items(generateLevel1Run());
    setLevel1Index(0);
    setLevel1Correct(0);
    setLevel1Mistakes(0);
    setLevel1Feedback('');
    setScreen('level1');
  };

  const startLevel2 = () => {
    setVideoOpen(false);
    setGeminiVisible(false);
    setGeminiResponse('');
    setSelectedVideo(null);
    setLevel2Math(generateLevel2Math());
    setLevel2Inputs({ lager: '', packstation: '', buero: '' });
    setLevel2FieldOk({ lager: null, packstation: null, buero: null });
    setLevel2Attempts({ lager: 0, packstation: 0, buero: 0 });
    setLevel2Status('idle');
    setLevel2Feedback('');
    setScreen('level2');
  };

  const submitLevel1Choice = (choice) => {
    if (level1Done || !currentItem) return;

    const isCorrect = choice === currentItem.category;
    onLearningEvent?.({
      mode: 'klr',
      questionId: `klr_l1_${currentItem.label}`,
      questionText: `KLR L1: ${currentItem.label} (${euro(currentItem.amount)})`,
      correct: isCorrect,
      userAnswer: choice === 'fix' ? 'Fixkosten' : 'Variable Kosten',
      expectedAnswer: currentItem.category === 'fix' ? 'Fixkosten' : 'Variable Kosten',
      topic: 'KLR Level 1 · Kostenartenrechnung'
    });
    if (isCorrect) {
      setLevel1Correct((n) => n + 1);
      setLevel1Feedback('Richtig. Saubere Einordnung.');
      setMentorTransient('success', successLine(), 1700);
    } else {
      setLevel1Mistakes((n) => n + 1);
      setLevel1Feedback(
        currentItem.category === 'fix'
          ? 'Falsch: Das bleibt unabhängig von der Bestellmenge meist konstant.'
          : 'Falsch: Das steigt oder fällt mit jeder Bestellung.'
      );
      requestMentorError(
        `KLR Level 1: ${currentItem.label}`,
        currentItem.category === 'fix' ? 'Fixkosten' : 'Variable Kosten',
        choice === 'fix' ? 'Fixkosten' : 'Variable Kosten'
      );
    }

    setLevel1Index((n) => n + 1);
  };

  const finishLevel1 = () => {
    const baseXp = 40;
    const bonusXp = Math.max(0, level1Correct * 6 - level1Mistakes * 2);
    grantXp(baseXp + bonusXp);
    if (level1ScorePct >= 75) unlockLevel(2);
    if (level1Correct === level1Items.length) triggerConfetti();
    setMentorTransient('success', 'Level 1 abgeschlossen. Kostenarten sitzen.', 2200);
    requestAnimationFrame(() => setScreen('home'));
  };

  const parseMoneyInput = (raw) => {
    if (raw == null) return Number.NaN;
    const cleaned = String(raw).trim().replace(/\s/g, '').replace(/€/g, '');
    if (!cleaned) return Number.NaN;
    const normalized = cleaned.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    return Number(normalized);
  };

  const isLevel2FieldCorrect = (fieldKey, value) => {
    if (!Number.isFinite(value)) return false;
    const expected = level2Math.allocations[fieldKey];
    return Math.round(value * 100) === Math.round(expected * 100);
  };

  const validateLevel2Field = (fieldKey, showFieldFeedback = true) => {
    const value = parseMoneyInput(level2Inputs[fieldKey]);
    const ok = isLevel2FieldCorrect(fieldKey, value);
    const fieldLabel = fieldKey === 'lager' ? 'Lager' : fieldKey === 'packstation' ? 'Packstation' : 'Büro';
    onLearningEvent?.({
      mode: 'klr',
      questionId: `klr_l2_${fieldKey}`,
      questionText: `KLR L2: ${fieldLabel} Anteil`,
      correct: ok,
      userAnswer: Number.isFinite(value) ? String(value) : String(level2Inputs[fieldKey] || ''),
      expectedAnswer: String(level2Math.allocations[fieldKey]),
      topic: 'KLR Level 2 · Kostenstellenrechnung'
    });

    setLevel2FieldOk((prev) => ({ ...prev, [fieldKey]: ok }));
    if (ok && Number.isFinite(value)) {
      setLevel2Inputs((prev) => ({ ...prev, [fieldKey]: euroInput(value) }));
    }
    if (!ok) {
      setLevel2Attempts((prev) => ({ ...prev, [fieldKey]: prev[fieldKey] + 1 }));
    }

    const allOkNow = ['lager', 'packstation', 'buero'].every((key) => {
      const parsed = key === fieldKey ? value : parseMoneyInput(level2Inputs[key]);
      return isLevel2FieldCorrect(key, parsed);
    });

    if (allOkNow) {
      setLevel2Status('success');
      setLevel2Feedback('Perfekt verteilt. Genau richtig!');
      setMentorTransient('success', 'Betriebsabrechnungsbogen sauber verteilt.', 2200);
    } else if (showFieldFeedback) {
      if (ok) {
        setLevel2Status('idle');
        setLevel2Feedback(`${fieldLabel} korrekt ✓`);
      } else {
        setLevel2Status('error');
        setLevel2Feedback(`${fieldLabel} noch nicht korrekt.`);
        requestMentorError(
          `KLR Level 2: Anteil ${fieldLabel}`,
          `${level2Math.allocations[fieldKey]} €`,
          Number.isFinite(value) ? String(value) : level2Inputs[fieldKey]
        );
      }
    }

    return ok;
  };

  const handleLevel2Enter = (e, fieldKey, nextFieldKey) => {
    if (e.key !== 'Enter' && e.key !== 'NumpadEnter') return;
    e.preventDefault();
    validateLevel2Field(fieldKey, true);
    if (nextFieldKey && level2InputRefs.current[nextFieldKey]) {
      level2InputRefs.current[nextFieldKey].focus();
      level2InputRefs.current[nextFieldKey].select?.();
    }
  };

  const finishLevel2 = () => {
    if (level2Status !== 'success') return;
    grantXp(90);
    unlockLevel(3);
    triggerConfetti(); // Added confetti trigger
    requestAnimationFrame(() => setScreen('home'));
  };

  const startLevel3 = () => {
    setVideoOpen(false);
    setGeminiVisible(false);
    setGeminiResponse('');
    setSelectedVideo(null);
    setLevel3Scenario(generateLevel3Scenario());
    setLevel3Rates({ mgkPct: 0, fgkPct: 0, vwgkPct: 0, vtgkPct: 0 });
    setLevel3SelfCostInput('');
    setLevel3Status('idle');
    setLevel3Feedback('');
    setLevel3HelpOpen(false);
    setScreen('level3');
  };

  const startLevel4 = () => {
    setVideoOpen(false);
    setGeminiVisible(false);
    setGeminiResponse('');
    setSelectedVideo(null);
    setLevel4CompleteScreen(false);
    setLevel4MissionIndex(0);
    const mission = generateLevel4Mission();
    setLevel4Mission(mission);
    setLevel4Price(mission.math.allowedPrices[0] || 0);
    setLevel4BreakEvenInput('');
    setLevel4Status('idle');
    setLevel4Feedback('');
    setScreen('level4');
  };

  const checkLevel3 = () => {
    const ratesCorrect = (
      level3Rates.mgkPct === level3Scenario.mgkPct
      && level3Rates.fgkPct === level3Scenario.fgkPct
      && level3Rates.vwgkPct === level3Scenario.vwgkPct
      && level3Rates.vtgkPct === level3Scenario.vtgkPct
    );
    const entered = parseMoneyInput(level3SelfCostInput);
    const selfCostCorrect = Number.isFinite(entered) && Math.round(entered * 100) === Math.round(level3Scenario.selfCost * 100);

    if (ratesCorrect && selfCostCorrect) {
      onLearningEvent?.({
        mode: 'klr',
        questionId: 'klr_l3_selfcost',
        questionText: 'KLR L3: Zuschlagskalkulation Selbstkosten',
        correct: true,
        userAnswer: String(entered),
        expectedAnswer: String(level3Scenario.selfCost),
        topic: 'KLR Level 3 · Kostenträgerrechnung'
      });
      setLevel3Status('success');
      setLevel3Feedback('Stark. Zuschlagskalkulation korrekt abgeschlossen.');
      setMentorTransient('success', 'Perfekt. Dein Kalkulationsmodell ist stimmig.', 2200);
      return;
    }

    setLevel3Status('error');
    onLearningEvent?.({
      mode: 'klr',
      questionId: 'klr_l3_selfcost',
      questionText: 'KLR L3: Zuschlagskalkulation Selbstkosten',
      correct: false,
      userAnswer: Number.isFinite(entered) ? String(entered) : String(level3SelfCostInput || ''),
      expectedAnswer: String(level3Scenario.selfCost),
      topic: 'KLR Level 3 · Kostenträgerrechnung'
    });
    if (!ratesCorrect && !selfCostCorrect) {
      setLevel3Feedback('Noch nicht korrekt: Prüfe die Zuschlagssätze und die Selbstkosten.');
      requestMentorError('KLR Level 3: Zuschlagskalkulation', `${level3Scenario.selfCost} €`, level3SelfCostInput);
    } else if (!ratesCorrect) {
      setLevel3Feedback('Die Zuschlagssätze passen noch nicht komplett.');
      requestMentorError('KLR Level 3: Zuschlagssätze', `MGK ${level3Scenario.mgkPct} / FGK ${level3Scenario.fgkPct} / VwGK ${level3Scenario.vwgkPct} / VtGK ${level3Scenario.vtgkPct}`, JSON.stringify(level3Rates));
    } else {
      setLevel3Feedback('Die Selbstkosten sind noch nicht korrekt.');
      requestMentorError('KLR Level 3: Selbstkosten', `${level3Scenario.selfCost} €`, level3SelfCostInput);
    }
  };

  const finishLevel3 = () => {
    if (level3Status !== 'success') return;
    grantXp(120);
    unlockLevel(4);
    triggerConfetti(); // Added confetti trigger
    requestAnimationFrame(() => setScreen('home'));
  };

  const checkLevel4 = () => {
    const selectedPrice = Number(level4Price);
    const math = level4Mission.math;
    if (!math.allowedPrices.includes(selectedPrice)) {
      onLearningEvent?.({
        mode: 'klr',
        questionId: 'klr_l4_bep',
        questionText: 'KLR L4: Break-Even-Menge Survival',
        correct: false,
        userAnswer: `Preis ${selectedPrice} | Menge ${level4BreakEvenInput}`,
        expectedAnswer: 'Erlaubter Preis + korrekte Break-Even-Menge',
        topic: 'KLR Level 4 · Break-Even-Analyse'
      });
      setLevel4Status('error');
      setLevel4Feedback('Bitte einen erlaubten Preis aus der Liste wählen.');
      requestMentorError('KLR Level 4: Preiswahl', `Erlaubte Preise: ${math.allowedPrices.join(', ')}`, String(selectedPrice));
      return;
    }

    const db = selectedPrice - math.variableCostPerUnit;
    const expectedUnits = math.fixedCost / db;
    const enteredUnits = Number.parseInt(String(level4BreakEvenInput).replace(/\D/g, ''), 10);
    const unitsCorrect = Number.isFinite(enteredUnits) && enteredUnits === expectedUnits;
    const goalReached = expectedUnits <= level4Mission.capacity;

    if (!unitsCorrect) {
      onLearningEvent?.({
        mode: 'klr',
        questionId: 'klr_l4_bep',
        questionText: 'KLR L4: Break-Even-Menge Survival',
        correct: false,
        userAnswer: `Preis ${selectedPrice} | Menge ${level4BreakEvenInput}`,
        expectedAnswer: String(expectedUnits),
        topic: 'KLR Level 4 · Break-Even-Analyse'
      });
      setLevel4Status('error');
      setLevel4Feedback(`Die Break-Even-Menge passt noch nicht. Rechne: Fixkosten / Deckungsbeitrag.`);
      requestMentorError('KLR Level 4: Break-Even-Menge', `${expectedUnits} Stück`, level4BreakEvenInput);
      return;
    }

    if (!goalReached) {
      onLearningEvent?.({
        mode: 'klr',
        questionId: 'klr_l4_capacity',
        questionText: 'KLR L4: Kapazitätsziel im Survival-Modus',
        correct: false,
        userAnswer: `${expectedUnits} Stück bei Preis ${selectedPrice}`,
        expectedAnswer: `<= ${level4Mission.capacity} Stück`,
        topic: 'KLR Level 4 · Break-Even-Analyse'
      });
      setLevel4Status('error');
      setLevel4Feedback(`Rechnung korrekt, aber Ziel verfehlt: ${expectedUnits} Stück sind mehr als die Monatskapazität (${level4Mission.capacity}). Wähle einen besseren Preis.`);
      requestMentorError('KLR Level 4: Kapazität', `<= ${level4Mission.capacity} Stück`, `${expectedUnits} Stück`);
      return;
    }

    onLearningEvent?.({
      mode: 'klr',
      questionId: 'klr_l4_survival',
      questionText: 'KLR L4: Survival-Mission bestanden',
      correct: true,
      userAnswer: `${expectedUnits} Stück bei Preis ${selectedPrice}`,
      expectedAnswer: `<= ${level4Mission.capacity} Stück`,
      topic: 'KLR Level 4 · Break-Even-Analyse'
    });
    setLevel4Status('success');
    setLevel4Feedback(`Stark. Break-Even bei ${expectedUnits} Stück und damit innerhalb der Kapazität.`);
    setMentorTransient('success', 'Mission erfüllt. Dein Startup überlebt diesen Monat.', 2400);
  };

  const finishLevel4Mission = () => {
    if (level4Status !== 'success') return;
    if (level4MissionIndex >= LEVEL4_MISSIONS_PER_RUN - 1) {
      grantXp(160);
      triggerConfetti(); // Added confetti trigger
      setLevel4CompleteScreen(true);
    } else {
      const nextMission = generateLevel4Mission();
      setLevel4MissionIndex((i) => i + 1);
      setLevel4Mission(nextMission);
      setLevel4Price(nextMission.math.allowedPrices[0] || 0);
      setLevel4BreakEvenInput('');
      setLevel4Status('idle');
      setLevel4Feedback('');
    }
  };

  const finishLevel4Run = () => {
    setLevel4CompleteScreen(false);
    setLevel4MissionIndex(0);
    requestAnimationFrame(() => setScreen('home'));
  };

  const openPendingLevel = (levelId) => {
    setVideoOpen(false);
    setGeminiVisible(false);
    setGeminiResponse('');
    setSelectedVideo(null);
    setPendingLevelId(levelId);
    setScreen('pending');
  };

  const getSupportContext = () => {
    if (screen === 'level1') {
      return {
        youtubeQuery: 'Fixkosten variable Kosten einfach erklärt',
        contextQuestion: `KLR Level 1: ${currentItem?.label || 'Kosten unterscheiden'}`,
        contextAnswer: 'Fixkosten bleiben meist konstant. Variable Kosten steigen mit Menge/Bestellungen.'
      };
    }
    if (screen === 'level2') {
      return {
        youtubeQuery: 'Betriebsabrechnungsbogen Kostenstellenrechnung einfach',
        contextQuestion: 'KLR Level 2: Gemeinkostenverteilung im Betriebsabrechnungsbogen',
        contextAnswer: `Gesamtkosten ${level2Math.baseCost} €, Schlüssel: Lager ${level2Math.key.lager}, Packstation ${level2Math.key.packstation}, Büro ${level2Math.key.buero}.`
      };
    }
    if (screen === 'level3') {
      return {
        youtubeQuery: 'Zuschlagskalkulation Selbstkosten einfach erklärt',
        contextQuestion: 'KLR Level 3: Zuschlagskalkulation für Hoodie',
        contextAnswer: `MEK ${level3Scenario.materialDirect} €, FEK ${level3Scenario.laborDirect} €, MGK ${level3Scenario.materialOverhead} €, FGK ${level3Scenario.laborOverhead} €, VwGK ${level3Scenario.adminOverhead} €, VtGK ${level3Scenario.salesOverhead} €.`
      };
    }

    if (screen === 'level4') {
      const math = level4Mission.math;
      return {
        youtubeQuery: 'Break-Even-Analyse E-Commerce einfach erklärt',
        contextQuestion: 'KLR Level 4: Survival-Modus Break-Even',
        contextAnswer: `Fixkosten ${math.fixedCost} €, variable Kosten ${math.variableCostPerUnit} €, Zielkapazität ${level4Mission.capacity} Stück.`
      };
    }
    if (screen === 'pending') {
      const lvl = LEVELS.find((x) => x.id === pendingLevelId);
      return {
        youtubeQuery: `${lvl?.title || 'KLR'} ${lvl?.subtitle || 'Lernvideo'}`,
        contextQuestion: `KLR Level ${lvl?.id || ''}: ${lvl?.title || 'Nächstes Level'}`,
        contextAnswer: lvl?.objective || 'Lernhilfe für das nächste Level.'
      };
    }
    return {
      youtubeQuery: 'KLR Grundlagen einfach erklärt',
      contextQuestion: 'KLR Hilfe',
      contextAnswer: 'Kosten- und Leistungsrechnung im Startup-Kontext.'
    };
  };

  const handleToggleVideos = async () => {
    if (videoOpen) {
      setVideoOpen(false);
      setSelectedVideo(null);
      return;
    }
    setVideoError('');
    setVideoOpen(true);
    if (videos.length > 0) return;
    setVideoLoading(true);
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) {
      setVideoError('Kein YouTube API-Key gefunden.');
      setVideoLoading(false);
      return;
    }
    try {
      const { youtubeQuery } = getSupportContext();
      const fetched = await fetchYouTubeVideos(youtubeQuery, apiKey, 4);
      setVideos(fetched || []);
    } catch {
      setVideoError('Videos konnten gerade nicht geladen werden.');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleGeminiAsk = async () => {
    if (!geminiQuery.trim()) return;
    setGeminiLoading(true);
    setGeminiResponse('');
    setMentorState('speaking');
    setMentorMessage('Denkmatrix aktiv... ich formuliere es kurz.');
    try {
      const { contextQuestion, contextAnswer } = getSupportContext();
      const response = await askGemini(geminiQuery, contextQuestion, contextAnswer);
      setGeminiResponse(response);
      setMentorTransient('speaking', response, 3800);
    } catch {
      setGeminiResponse('Die KI-Antwort konnte gerade nicht geladen werden.');
      setMentorTransient('error', 'Signalstörung. Versuche die Frage gleich erneut.', 2800);
    } finally {
      setGeminiLoading(false);
    }
  };

  const renderSupportPanels = () => (
    <>
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

      {videoOpen && (
        <div className="fade-in klr-wire" style={{ marginBottom: '1.2rem', width: '100%', borderRadius: '16px', padding: '0.65rem' }}>
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
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>{videoError || 'Keine Videos gefunden.'}</div>
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

      {geminiVisible && (
        <div className="fade-in klr-wire" style={{ marginBottom: '1.2rem', width: '100%', borderRadius: '16px', padding: '1.2rem', backdropFilter: 'blur(16px)' }}>
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
    </>
  );

  const renderActionBar = (leftText = '← Levelauswahl', leftAction = () => setScreen('home')) => (
    <div className="klr-wire" style={topBarStyle}>
      <button className="btn-secondary" onClick={leftAction}>{leftText}</button>
      <button className="btn-secondary" onClick={() => onBack?.()}>✕ Menü</button>
    </div>
  );

  if (screen === 'level1') {
    return renderScreen(
      <>
        {renderActionBar()}
        {renderSupportPanels()}

        <div className="klr-wire" style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.25rem 0' }}>Level 1: Rechnungs-Tinder</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            Entscheide pro Karte: <strong>Fixkosten</strong> oder <strong>Variable Kosten</strong>.
          </p>

          {!level1Done ? (
            <div className="klr-wire" style={{ marginTop: '0.55rem', borderRadius: '16px', padding: '0.85rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                Aufgabe {level1Index + 1} von {level1Items.length}
              </div>
              <h3 style={{ marginTop: 0, marginBottom: '0.15rem' }}>{currentItem.label}</h3>
              <p style={{ marginTop: 0, marginBottom: '0.9rem', fontSize: '1.25rem', fontWeight: 800 }}>{euro(currentItem.amount)}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => submitLevel1Choice('fix')}
                  style={{
                    border: '1px solid rgba(239,68,68,0.58)',
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.34), rgba(239,68,68,0.16))',
                    color: '#fee2e2',
                    borderRadius: '14px',
                    padding: '0.9rem 0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minHeight: '56px',
                    boxShadow: '0 8px 22px rgba(239,68,68,0.2)'
                  }}
                >
                  ⬅️ Fixkosten
                </button>
                <button
                  type="button"
                  onClick={() => submitLevel1Choice('variable')}
                  style={{
                    border: '1px solid rgba(34,197,94,0.6)',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.34), rgba(34,197,94,0.16))',
                    color: '#dcfce7',
                    borderRadius: '14px',
                    padding: '0.9rem 0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minHeight: '56px',
                    boxShadow: '0 8px 22px rgba(34,197,94,0.2)'
                  }}
                >
                  Variable Kosten ➡️
                </button>
              </div>

              {!!level1Feedback && (
                <p style={{ marginTop: '0.7rem', marginBottom: 0, color: 'var(--text-muted)' }}>{level1Feedback}</p>
              )}
            </div>
          ) : (
            <div className="klr-wire" style={{ marginTop: '0.55rem', borderRadius: '16px', padding: '0.85rem' }}>
              <h3 style={{ marginTop: 0 }}>Level abgeschlossen</h3>
              <p style={{ marginBottom: '0.5rem' }}>Treffer: <strong>{level1Correct}</strong> / {level1Items.length}</p>
              <p style={{ marginTop: 0, marginBottom: '0.8rem' }}>Fehler: <strong>{level1Mistakes}</strong> · Score: <strong>{level1ScorePct}%</strong></p>
              <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>Ab 75% wird Level 2 freigeschaltet.</p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={finishLevel1}>Belohnung einsammeln</button>
                <button className="btn-secondary" onClick={startLevel1}>Nochmal spielen</button>
              </div>
            </div>
          )}
        </div>
      </>,
      '760px'
    );
  }

  if (screen === 'level2') {
    return renderScreen(
      <>
        {renderActionBar()}
        {renderSupportPanels()}

        <div className="klr-wire" style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.3rem 0' }}>Level 2: Betriebsabrechnungsbogen</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Verteile die Gemeinkosten korrekt auf Lager, Packstation und Büro.
          </p>

          <div style={{ marginBottom: '0.6rem', fontSize: '0.86rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Fortschritt:</span>
            <span style={{ fontWeight: 700, color: level2CorrectCount === 3 ? '#86efac' : 'var(--text-light)' }}>
              {level2CorrectCount}/3 Felder korrekt
            </span>
            <div style={{ flex: 1, maxWidth: '120px', height: '6px', background: 'var(--glass-bg)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${(level2CorrectCount / 3) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #86efac)', borderRadius: '999px', transition: 'width 0.25s ease' }} />
            </div>
          </div>

          <div className="klr-wire" style={{ borderRadius: '14px', padding: '0.8rem' }}>
            <p style={{ margin: '0 0 0.3rem 0' }}>Gesamtkosten: <strong>{euro(level2Math.baseCost)}</strong></p>
            <p style={{ margin: '0 0 0.6rem 0' }}>Verteilerschlüssel (m²): Lager <strong>{level2Math.key.lager}</strong> · Packstation <strong>{level2Math.key.packstation}</strong> · Büro <strong>{level2Math.key.buero}</strong></p>

            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <label style={{ display: 'grid', gap: '0.25rem', textAlign: 'left' }}>
                <span>Lager (€)</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wisor-input"
                    inputMode="decimal"
                    ref={(el) => { level2InputRefs.current.lager = el; }}
                    value={level2Inputs.lager}
                    onChange={(e) => setLevel2Inputs((p) => ({ ...p, lager: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    onKeyDown={(e) => handleLevel2Enter(e, 'lager', 'packstation')}
                    onBlur={() => validateLevel2Field('lager', true)}
                    style={
                      level2FieldOk.lager === true
                        ? { borderColor: '#22c55e', boxShadow: '0 0 0 1px rgba(34,197,94,0.45)', paddingRight: '3.2rem' }
                        : level2FieldOk.lager === false
                          ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px rgba(239,68,68,0.35)', paddingRight: '3.2rem' }
                          : { paddingRight: '3.2rem' }
                    }
                  />
                  <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>€</span>
                  {level2FieldOk.lager === true && (
                    <span style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontWeight: 800 }}>✓</span>
                  )}
                </div>
                {level2FieldOk.lager === false && level2Attempts.lager >= 2 && (
                  <small style={{ color: '#fca5a5' }}>Hinweis: Kosten pro m² × Lagerfläche ({level2Math.key.lager}) rechnen.</small>
                )}
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', textAlign: 'left' }}>
                <span>Packstation (€)</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wisor-input"
                    inputMode="decimal"
                    ref={(el) => { level2InputRefs.current.packstation = el; }}
                    value={level2Inputs.packstation}
                    onChange={(e) => setLevel2Inputs((p) => ({ ...p, packstation: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    onKeyDown={(e) => handleLevel2Enter(e, 'packstation', 'buero')}
                    onBlur={() => validateLevel2Field('packstation', true)}
                    style={
                      level2FieldOk.packstation === true
                        ? { borderColor: '#22c55e', boxShadow: '0 0 0 1px rgba(34,197,94,0.45)', paddingRight: '3.2rem' }
                        : level2FieldOk.packstation === false
                          ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px rgba(239,68,68,0.35)', paddingRight: '3.2rem' }
                          : { paddingRight: '3.2rem' }
                    }
                  />
                  <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>€</span>
                  {level2FieldOk.packstation === true && (
                    <span style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontWeight: 800 }}>✓</span>
                  )}
                </div>
                {level2FieldOk.packstation === false && level2Attempts.packstation >= 2 && (
                  <small style={{ color: '#fca5a5' }}>Hinweis: Kosten pro m² × Packstationfläche ({level2Math.key.packstation}) rechnen.</small>
                )}
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', textAlign: 'left' }}>
                <span>Büro (€)</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wisor-input"
                    inputMode="decimal"
                    ref={(el) => { level2InputRefs.current.buero = el; }}
                    value={level2Inputs.buero}
                    onChange={(e) => setLevel2Inputs((p) => ({ ...p, buero: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    onKeyDown={(e) => handleLevel2Enter(e, 'buero', null)}
                    onBlur={() => validateLevel2Field('buero', true)}
                    style={
                      level2FieldOk.buero === true
                        ? { borderColor: '#22c55e', boxShadow: '0 0 0 1px rgba(34,197,94,0.45)', paddingRight: '3.2rem' }
                        : level2FieldOk.buero === false
                          ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px rgba(239,68,68,0.35)', paddingRight: '3.2rem' }
                          : { paddingRight: '3.2rem' }
                    }
                  />
                  <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>€</span>
                  {level2FieldOk.buero === true && (
                    <span style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontWeight: 800 }}>✓</span>
                  )}
                </div>
                {level2FieldOk.buero === false && level2Attempts.buero >= 2 && (
                  <small style={{ color: '#fca5a5' }}>Hinweis: Kosten pro m² × Bürofläche ({level2Math.key.buero}) rechnen.</small>
                )}
              </label>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={startLevel2}>Neue Aufgabe</button>
              {level2Status === 'success' && <button className="btn-primary" onClick={finishLevel2}>Level abschließen</button>}
            </div>

            {!!level2Feedback && (
              <p style={{ marginTop: '0.7rem', color: level2Status === 'success' ? '#86efac' : '#fca5a5' }}>{level2Feedback}</p>
            )}
          </div>
        </div>
      </>,
      '760px'
    );
  }

  if (screen === 'level4' && level4CompleteScreen) {
    return (
      <div className="klr-cyber-theme" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
        {showConfetti && <LocalConfetti />}
        <div style={{ ...shellStyle, maxWidth: '520px', margin: '0 auto', padding: '2rem 1rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div className="klr-wire" style={{ ...sectionStyle, padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-light)' }}>Survival-Modus gemeistert!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Du hast alle {LEVEL4_MISSIONS_PER_RUN} Break-Even-Missionen bestanden. Dein Startup überlebt.
            </p>
            <p style={{ color: '#86efac', fontWeight: 800, marginBottom: '1.5rem' }}>+160 XP</p>
            <button type="button" className="btn-primary" style={{ width: '100%', padding: '0.9rem' }} onClick={finishLevel4Run}>
              Zur Levelübersicht
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'level4') {
    const math = level4Mission.math;
    const selectedPrice = Number(level4Price || 0);
    const db = selectedPrice - math.variableCostPerUnit;
    const breakEvenUnits = db > 0 ? (math.fixedCost / db) : 0;
    const targetReached = breakEvenUnits > 0 && breakEvenUnits <= level4Mission.capacity;

    return renderScreen(
      <>
        {renderActionBar()}
        {renderSupportPanels()}

        <div className="klr-wire" style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.3rem 0' }}>Level 4: Survival-Modus</h2>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Mission {level4MissionIndex + 1} von {LEVEL4_MISSIONS_PER_RUN}
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
            Dein Startup darf diesen Monat maximal <strong>{level4Mission.capacity}</strong> Stück verkaufen. Erreiche Break-Even innerhalb dieser Kapazität.
          </p>

          <div className="klr-wire" style={{ borderRadius: '14px', padding: '0.85rem' }}>
            <p style={{ margin: '0 0 0.25rem 0' }}>Fixkosten (Kf): <strong>{euro(math.fixedCost)}</strong></p>
            <p style={{ margin: '0 0 0.75rem 0' }}>Variable Kosten pro Stück (kv): <strong>{euro(math.variableCostPerUnit)}</strong></p>

            <div className="klr-wire" style={{ marginBottom: '0.8rem', padding: '0.65rem', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700 }}>Formel:</p>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Break-Even-Menge x = Kf / (p - kv)
              </p>
            </div>

            <label style={{ display: 'grid', gap: '0.35rem', textAlign: 'left', marginBottom: '0.8rem' }}>
              <span style={{ fontWeight: 700 }}>Verkaufspreis p wählen (nur glatte, erlaubte Werte)</span>
              <select
                className="wisor-input"
                value={level4Price}
                onChange={(e) => {
                  setLevel4Price(Number(e.target.value));
                  setLevel4Status('idle');
                }}
                style={{ maxWidth: '280px' }}
              >
                {math.allowedPrices.map((price) => (
                  <option key={price} value={price}>{euro(price)}</option>
                ))}
              </select>
            </label>

            <div className="klr-wire" style={{ marginBottom: '0.9rem', padding: '0.65rem', borderRadius: '12px', borderColor: targetReached ? 'rgba(255,212,103,0.58)' : 'var(--glass-border)' }}>
              <p style={{ margin: '0 0 0.2rem 0' }}>Deckungsbeitrag pro Stück: <strong>{euro(Math.max(db, 0))}</strong></p>
              <p style={{ margin: 0, color: targetReached ? '#fef08a' : 'var(--text-muted)' }}>
                Rechnerisch benötigte Break-Even-Menge: <strong>{Number.isFinite(breakEvenUnits) ? breakEvenUnits : 0}</strong> Stück
              </p>
            </div>

            <label style={{ display: 'grid', gap: '0.3rem', textAlign: 'left' }}>
              <span>Break-Even-Menge x eingeben (Stück)</span>
              <input
                className="wisor-input"
                inputMode="numeric"
                value={level4BreakEvenInput}
                onChange={(e) => {
                  setLevel4BreakEvenInput(e.target.value.replace(/\D/g, ''));
                  setLevel4Status('idle');
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== 'NumpadEnter') return;
                  e.preventDefault();
                  checkLevel4();
                }}
                style={{ maxWidth: '240px' }}
              />
            </label>

            <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={checkLevel4}>Prüfen</button>
              <button className="btn-secondary" onClick={startLevel4}>Durchlauf beenden</button>
              {level4Status === 'success' && (
                <button className="btn-primary" onClick={finishLevel4Mission}>
                  {level4MissionIndex < LEVEL4_MISSIONS_PER_RUN - 1 ? 'Nächste Mission' : 'Abschließen'}
                </button>
              )}
            </div>

            {!!level4Feedback && (
              <p style={{ marginTop: '0.7rem', color: level4Status === 'success' ? '#fef08a' : '#fca5a5' }}>{level4Feedback}</p>
            )}
          </div>
        </div>
      </>,
      '840px'
    );
  }

  if (screen === 'pending') {
    const level = LEVELS.find((x) => x.id === pendingLevelId);
    return renderScreen(
      <>
        {renderActionBar()}
        {renderSupportPanels()}

        <div className="klr-wire" style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>{level?.title}</h2>
          <p style={{ color: 'var(--text-muted)' }}>{level?.objective}</p>
          <h3 style={{ marginTop: 0 }}>Nächster Build-Schritt</h3>
          <p style={{ marginBottom: 0 }}>
            Dieses Level ist als nächstes dran und wird als echte Spielansicht umgesetzt.
          </p>
        </div>
      </>,
      '760px'
    );
  }

  if (screen === 'level3') {
    const selectedProductionCost = (
      level3Scenario.materialDirect
      + Math.round((level3Scenario.materialDirect * level3Rates.mgkPct) / 100)
      + level3Scenario.laborDirect
      + Math.round((level3Scenario.laborDirect * level3Rates.fgkPct) / 100)
    );
    const selectedAdminOverhead = Math.round((selectedProductionCost * level3Rates.vwgkPct) / 100);
    const selectedSalesOverhead = Math.round((selectedProductionCost * level3Rates.vtgkPct) / 100);
    const selectedSelfCost = selectedProductionCost + selectedAdminOverhead + selectedSalesOverhead;

    return renderScreen(
      <>
        {renderActionBar()}
        {renderSupportPanels()}

        <div className="klr-wire" style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.3rem 0' }}>Level 3: Produkt-Kalkulator</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.7rem' }}>
            Kontext: Du bist im Controlling eines Streetwear-Startups und kalkulierst den Preis für den neuen Hoodie.
          </p>

          <div className="klr-wire" style={{ borderRadius: '14px', padding: '0.85rem' }}>
            <p style={{ margin: '0 0 0.35rem 0' }}><strong>Mission:</strong> Ermittle die korrekten Zuschlagssätze und berechne die Selbstkosten pro Stück.</p>
            <p style={{ margin: '0 0 0.25rem 0' }}>Produkt: <strong>Hoodie Pro</strong></p>
            <p style={{ margin: '0 0 0.25rem 0' }}>Materialeinzelkosten (MEK): <strong>{euro(level3Scenario.materialDirect)}</strong></p>
            <p style={{ margin: '0 0 0.6rem 0' }}>Fertigungseinzelkosten (FEK): <strong>{euro(level3Scenario.laborDirect)}</strong></p>

            <div className="klr-wire" style={{ marginBottom: '0.8rem', padding: '0.65rem', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 0.35rem 0', fontWeight: 700 }}>Gegeben aus dem Monatsreport:</p>
              <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>Materialgemeinkosten absolut: <strong style={{ color: 'var(--text-light)' }}>{euro(level3Scenario.materialOverhead)}</strong></p>
              <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>Fertigungsgemeinkosten absolut: <strong style={{ color: 'var(--text-light)' }}>{euro(level3Scenario.laborOverhead)}</strong></p>
              <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>Verwaltungsgemeinkosten absolut: <strong style={{ color: 'var(--text-light)' }}>{euro(level3Scenario.adminOverhead)}</strong> (bezogen auf Herstellkosten)</p>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Vertriebsgemeinkosten absolut: <strong style={{ color: 'var(--text-light)' }}>{euro(level3Scenario.salesOverhead)}</strong> (bezogen auf Herstellkosten)</p>
            </div>

            <div style={{ marginBottom: '0.9rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setLevel3HelpOpen((v) => !v)}
                style={{ padding: '0.55rem 0.9rem', borderRadius: '12px' }}
              >
                {level3HelpOpen ? '❓ Hilfe schließen' : '❓ Hilfe: Begriffe & Rechenweg'}
              </button>
              {level3HelpOpen && (
                <div className="klr-wire" style={{ marginTop: '0.55rem', padding: '0.65rem', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 0.35rem 0', fontWeight: 700 }}>Begriffe:</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>MEK = Materialeinzelkosten</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>FEK = Fertigungseinzelkosten</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>MGK = Materialgemeinkosten</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>FGK = Fertigungsgemeinkosten</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>VwGK = Verwaltungsgemeinkosten</p>
                  <p style={{ margin: '0 0 0.45rem 0', color: 'var(--text-muted)' }}>VtGK = Vertriebsgemeinkosten</p>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700 }}>So rechnest du die Sätze:</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>MGK% = MGK absolut / MEK × 100</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>FGK% = FGK absolut / FEK × 100</p>
                  <p style={{ margin: '0 0 0.2rem 0', color: 'var(--text-muted)' }}>VwGK% = VwGK absolut / Herstellkosten × 100</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>VtGK% = VtGK absolut / Herstellkosten × 100</p>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {[
                { key: 'mgkPct', label: 'MGK-Satz (Materialgemeinkosten)', target: level3Scenario.mgkPct, value: level3Rates.mgkPct },
                { key: 'fgkPct', label: 'FGK-Satz (Fertigungsgemeinkosten)', target: level3Scenario.fgkPct, value: level3Rates.fgkPct },
                { key: 'vwgkPct', label: 'VwGK-Satz (Verwaltungsgemeinkosten)', target: level3Scenario.vwgkPct, value: level3Rates.vwgkPct },
                { key: 'vtgkPct', label: 'VtGK-Satz (Vertriebsgemeinkosten)', target: level3Scenario.vtgkPct, value: level3Rates.vtgkPct }
              ].map((row) => {
                const isCorrect = row.value === row.target;
                return (
                  <label key={row.key} style={{ display: 'grid', gap: '0.3rem', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700 }}>{row.label}: <strong>{row.value}%</strong> {isCorrect ? '✓' : ''}</span>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={10}
                      value={row.value}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setLevel3Rates((prev) => ({ ...prev, [row.key]: next }));
                        setLevel3Status('idle');
                      }}
                    />
                  </label>
                );
              })}
            </div>

            <div className="klr-wire" style={{ marginTop: '0.9rem', padding: '0.7rem', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 0.4rem 0' }}>Deine aktuelle Selbstkosten-Rechnung: <strong>{euro(selectedSelfCost)}</strong></p>
              <label style={{ display: 'grid', gap: '0.3rem', textAlign: 'left' }}>
                <span>Selbstkosten eingeben (€)</span>
                <input
                  className="wisor-input"
                  inputMode="decimal"
                  value={level3SelfCostInput}
                  onChange={(e) => {
                    setLevel3SelfCostInput(e.target.value.replace(/[^0-9.,]/g, ''));
                    setLevel3Status('idle');
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== 'NumpadEnter') return;
                    e.preventDefault();
                    checkLevel3();
                  }}
                  style={{ maxWidth: '240px' }}
                />
              </label>
            </div>

            <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={checkLevel3}>Prüfen</button>
              <button className="btn-secondary" onClick={startLevel3}>Neue Aufgabe</button>
              {level3Status === 'success' && <button className="btn-primary" onClick={finishLevel3}>Level abschließen</button>}
            </div>

            {!!level3Feedback && (
              <p style={{ marginTop: '0.7rem', color: level3Status === 'success' ? '#86efac' : '#fca5a5' }}>{level3Feedback}</p>
            )}
          </div>
        </div>
      </>,
      '820px'
    );
  }

  return renderScreen(
    <>
      <div className="klr-wire" style={{ ...topBarStyle, marginBottom: '0.1rem' }}>
        <button className="btn-secondary" onClick={() => onBack?.()}>← Menü</button>
      </div>

      <div className="klr-wire" style={sectionStyle}>
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

        <div style={{ display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '0.8rem' }}>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>STARTUP</div>
            <div style={{ fontWeight: 800, marginTop: '0.2rem' }}>{progress.startupName}</div>
          </div>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>XP</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.xp}</div>
          </div>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>AKTUELLES LEVEL</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.currentLevel}</div>
          </div>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>FREIGESCHALTET</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.unlockedLevels.join(', ')}</div>
          </div>
        </div>

        <div className="klr-wire" style={{ ...sectionStyle, margin: '0 0 0.2rem 0', padding: '0.8rem 0.9rem', borderRadius: '14px' }}>
          <button
            type="button"
            onClick={() => setHowToOpen((v) => !v)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '1.05rem',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <span>So spielst du</span>
            <span style={{ color: 'var(--text-muted)' }}>{howToOpen ? '▾' : '▸'}</span>
          </button>
          {howToOpen && (
            <div style={{ marginTop: '0.65rem' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}>1. Wähle ein freigeschaltetes Level.</p>
              <p style={{ margin: '0 0 0.35rem 0' }}>2. Löse die Aufgaben Schritt für Schritt.</p>
              <p style={{ margin: 0 }}>3. Sammle XP und schalte das nächste Level frei.</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'stretch' }}>
        {LEVELS.map((lvl) => {
          const unlocked = progress.unlockedLevels.includes(lvl.id);
          return (
            <div
              key={lvl.id}
              className="klr-wire"
              style={{
                ...sectionStyle,
                opacity: unlocked ? 1 : 0.78,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '240px',
                padding: '0.95rem',
                borderRadius: '16px'
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Level {lvl.id}: {lvl.title}</h3>
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{lvl.subtitle}</p>
              <p style={{ marginTop: 0, marginBottom: '0.9rem' }}>{lvl.objective}</p>
              <div style={{ marginTop: 'auto' }}>
                {lvl.id === 1 ? (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={startLevel1}>Jetzt starten</button>
                ) : lvl.id === 2 && unlocked ? (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={startLevel2}>Level öffnen</button>
                ) : lvl.id === 3 && unlocked ? (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={startLevel3}>Level öffnen</button>
                ) : lvl.id === 4 && unlocked ? (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={startLevel4}>Level öffnen</button>
                ) : unlocked ? (
                  <button className="btn-secondary" style={{ width: '100%' }} onClick={() => openPendingLevel(lvl.id)}>Level öffnen</button>
                ) : (
                  <button
                    type="button"
                    disabled
                    style={{
                      width: '100%',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '999px',
                      padding: '0.65rem 0.8rem',
                      background: 'rgba(15,23,42,0.35)',
                      color: 'var(--text-muted)',
                      fontWeight: 700
                    }}
                  >
                    🔒 Erst Level {lvl.id - 1} abschließen
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>,
    '980px'
  );
}
