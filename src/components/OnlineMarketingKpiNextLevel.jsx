import React, { useEffect, useMemo, useRef, useState } from 'react';
import { askKpiTutorFeedback, generateKpiTheoryQuestions, generateOnlineMarketingScenario } from '../geminiClient';
import FloatingPortal from './FloatingPortal';
import { computeNextQuizProgress, getRequiredCorrectAnswers, MULTI_CHOICE_REPEAT_MODES } from '../utils/quizDue';

const FALLBACK_THEORY_QUESTIONS = [
  {
    id: 'risk_cpc',
    question: 'Wer trägt das Risiko, wenn User zwar klicken, aber nichts kaufen (CPC)?',
    options: [
      { id: 'a', text: 'Der Merchant / Werbetreibende', isCorrect: true },
      { id: 'b', text: 'Das Affiliate-Netzwerk trägt immer das volle Risiko', isCorrect: false },
      { id: 'c', text: 'Niemand, weil Klicks automatisch Umsatz erzeugen', isCorrect: false }
    ]
  },
  {
    id: 'term_cpm',
    question: 'Wie nennt man den Tausenderkontaktpreis im Englischen?',
    options: [
      { id: 'a', text: 'CPL', isCorrect: false },
      { id: 'b', text: 'CPM', isCorrect: true },
      { id: 'c', text: 'CPO', isCorrect: false }
    ]
  },
  {
    id: 'model_cpo',
    question: 'Wofür steht CPO im Performance Marketing?',
    options: [
      { id: 'a', text: 'Cost per Order', isCorrect: true },
      { id: 'b', text: 'Cost per Opportunity', isCorrect: false },
      { id: 'c', text: 'Campaign per Order', isCorrect: false }
    ]
  },
  {
    id: 'model_cpl',
    question: 'Bei welchem Modell wird pro Lead (Kontaktanfrage) abgerechnet?',
    options: [
      { id: 'a', text: 'CPL', isCorrect: true },
      { id: 'b', text: 'CPM', isCorrect: false },
      { id: 'c', text: 'CPC', isCorrect: false }
    ]
  }
];

const METRIC_LABELS = {
  cpm: 'CPM',
  cpc: 'CPC',
  cpo: 'CPO',
  roas: 'ROAS',
  kur: 'KUR'
};

const FORMULAS = {
  cpm: '(werbekosten_euro / impressions) * 1000',
  cpc: 'werbekosten_euro / klicks',
  cpo: 'werbekosten_euro / bestellungen',
  roas: 'umsatz_euro / werbekosten_euro',
  kur: '(werbekosten_euro / umsatz_euro) * 100'
};

const MODEL_FACTS = {
  CPC: {
    label: 'CPC (Cost per Click)',
    trigger: 'Kosten fallen pro Klick an.',
    risk: 'Das Risiko für ausbleibende Conversions liegt beim Merchant, weil auch erfolglose Klicks bezahlt werden.',
    fit: 'Passend, wenn Reichweite und Traffic im Fokus stehen.'
  },
  CPO: {
    label: 'CPO (Cost per Order)',
    trigger: 'Kosten fallen erst bei einer Bestellung an.',
    risk: 'Das Conversion-Risiko liegt stärker beim Publisher/Partner, weil ohne Order keine Vergütung fällig ist.',
    fit: 'Passend, wenn direkte Sales-Ziele im Mittelpunkt stehen.'
  },
  CPL: {
    label: 'CPL (Cost per Lead)',
    trigger: 'Kosten fallen bei qualifiziertem Lead an (z. B. Anmeldung, Kontakt).',
    risk: 'Das Abschluss-Risiko nach dem Lead liegt meist beim Merchant.',
    fit: 'Passend bei Lead-Generierung statt Sofortverkauf.'
  },
  CPM: {
    label: 'CPM (Cost per Mille)',
    trigger: 'Kosten fallen pro 1.000 Sichtkontakte/Impressions an.',
    risk: 'Merchant trägt ein hohes Effizienzrisiko, weil bereits für Sichtkontakte bezahlt wird.',
    fit: 'Passend für Branding und Reichweitenziele.'
  },
  FLATRATE: {
    label: 'Flatrate/Festpreis',
    trigger: 'Kosten sind pauschal und nicht direkt an Klicks, Leads oder Orders gekoppelt.',
    risk: 'Effizienzrisiko liegt weitgehend beim Merchant, da die Zahlung unabhängig vom Ergebnis erfolgt.',
    fit: 'Passend bei fixen Platzierungen oder Sponsoring.'
  }
};

function detectModelKey(text) {
  const source = String(text || '').toUpperCase();
  if (source.includes('CPC')) return 'CPC';
  if (source.includes('CPO')) return 'CPO';
  if (source.includes('CPL')) return 'CPL';
  if (source.includes('CPM') || source.includes('MILLE')) return 'CPM';
  if (source.includes('FLATRATE') || source.includes('FESTPREIS')) return 'FLATRATE';
  return null;
}

function buildTheoryExplanation(selectedOption, correctOption) {
  if (!selectedOption || !correctOption) return '';
  const selectedKey = detectModelKey(selectedOption.text);
  const correctKey = detectModelKey(correctOption.text);
  const selectedFact = selectedKey ? MODEL_FACTS[selectedKey] : null;
  const correctFact = correctKey ? MODEL_FACTS[correctKey] : null;

  if (selectedOption.id === correctOption.id) {
    return [
      `Richtig entschieden: ${correctOption.text}.`,
      correctFact
        ? `${correctFact.label}: ${correctFact.trigger} ${correctFact.risk} ${correctFact.fit}`
        : 'Die Option passt zur Aufgabenlogik und zur gefragten Risikoverteilung/Abrechnung.',
      `Prüfungslogik: Ordne immer erst die auslösende Aktion (Impression, Klick, Lead, Order) und leite dann die Risikoverteilung ab.`
    ].join(' ');
  }

  return [
    `Deine Auswahl ${selectedOption.text} ist hier fachlich nicht passend.`,
    selectedFact
      ? `${selectedFact.label}: ${selectedFact.trigger} ${selectedFact.risk}`
      : 'Diese Option löst ein anderes Abrechnungsmodell aus als in der Frage beschrieben.',
    `Korrekt ist ${correctOption.text}, weil hier genau die in der Frage beschriebene Aktion/Logik getroffen wird.`,
    correctFact
      ? `${correctFact.label}: ${correctFact.trigger} ${correctFact.risk} ${correctFact.fit}`
      : 'Die korrekte Option passt konsistent zur geforderten KPI- bzw. Risiko-Logik.',
    `Merksatz für die IHK: Erst die Aktion identifizieren, dann das Modell zuordnen, erst danach Risiko und Zielwirkung begründen.`
  ].join(' ');
}

function normalizeNumericInput(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/€/g, '')
    .replace(',', '.');
}

function parseUserNumber(raw) {
  const normalized = normalizeNumericInput(raw).replace(/%/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseRoasInput(raw) {
  const source = String(raw || '');
  const num = parseUserNumber(source);
  if (!Number.isFinite(num)) return null;
  if (source.includes('%')) return num / 100;
  if (num > 20) return num / 100;
  return num;
}

function parseKurInput(raw) {
  const source = String(raw || '');
  const num = parseUserNumber(source);
  if (!Number.isFinite(num)) return null;
  if (source.includes('%')) return num;
  if (num > 1) return num;
  return num * 100;
}

function isCloseEnough(actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  const tolerance = Math.max(0.02, Math.abs(expected) * 0.015);
  return Math.abs(actual - expected) <= tolerance;
}

function fmtNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '-';
  return Number(value).toFixed(digits).replace('.', ',');
}

function buildMetricLocalExplanation(metricKey, actual, expected, scenario) {
  if (!Number.isFinite(actual)) {
    return 'Deine Eingabe ist kein gültiger Zahlenwert. Nutze nur Zahlen (optional mit Komma) und bei Prozenten das %-Zeichen.';
  }

  if (!scenario || !Number.isFinite(expected)) {
    return 'Die Kampagnendaten fehlen. Starte bitte eine neue Kampagne und prüfe erneut.';
  }

  const roundedExpected = fmtNumber(expected, 2);
  const roundedActual = fmtNumber(actual, 2);

  if (metricKey === 'cpm') {
    const step = (scenario.werbekosten_euro / scenario.impressions) * 1000;
    return `Du hast ${roundedActual} eingegeben. Richtig wird CPM mit (Werbekosten / Impressions) * 1000 gerechnet: (${fmtNumber(scenario.werbekosten_euro, 2)} / ${fmtNumber(scenario.impressions, 0)}) * 1000 = ${fmtNumber(step, 2)} EUR.`;
  }
  if (metricKey === 'cpc') {
    const step = scenario.werbekosten_euro / scenario.klicks;
    return `Du hast ${roundedActual} eingegeben. Richtig wird CPC mit Werbekosten / Klicks gerechnet: ${fmtNumber(scenario.werbekosten_euro, 2)} / ${fmtNumber(scenario.klicks, 0)} = ${fmtNumber(step, 2)} EUR pro Klick.`;
  }
  if (metricKey === 'cpo') {
    const step = scenario.werbekosten_euro / scenario.bestellungen;
    return `Du hast ${roundedActual} eingegeben. Richtig wird CPO mit Werbekosten / Bestellungen gerechnet: ${fmtNumber(scenario.werbekosten_euro, 2)} / ${fmtNumber(scenario.bestellungen, 0)} = ${fmtNumber(step, 2)} EUR pro Bestellung.`;
  }
  if (metricKey === 'roas') {
    const step = scenario.umsatz_euro / scenario.werbekosten_euro;
    return `Du hast ${roundedActual} eingegeben. Richtig wird ROAS mit Umsatz / Werbekosten gerechnet: ${fmtNumber(scenario.umsatz_euro, 2)} / ${fmtNumber(scenario.werbekosten_euro, 2)} = ${fmtNumber(step, 2)} (entspricht ${fmtNumber(step * 100, 1)}%).`;
  }
  if (metricKey === 'kur') {
    const step = (scenario.werbekosten_euro / scenario.umsatz_euro) * 100;
    return `Du hast ${roundedActual} eingegeben. Richtig wird KUR mit (Werbekosten / Umsatz) * 100 gerechnet: (${fmtNumber(scenario.werbekosten_euro, 2)} / ${fmtNumber(scenario.umsatz_euro, 2)}) * 100 = ${fmtNumber(step, 2)}%.`;
  }

  return `Du hast ${roundedActual} eingegeben, erwartet ist ca. ${roundedExpected}. Prüfe die Formel und den Nenner erneut.`;
}

const OnlineMarketingKpiNextLevel = ({
  onBack,
  burgerMenuPortal,
  multiChoiceRepeatMode = MULTI_CHOICE_REPEAT_MODES.TWICE,
  onMultiChoiceRepeatModeChange = null
}) => {
  const [phase, setPhase] = useState('theory');
  const [theoryQuestions, setTheoryQuestions] = useState([]);
  const [theoryAnswers, setTheoryAnswers] = useState({});
  const [theoryProgress, setTheoryProgress] = useState({});
  const [theoryResult, setTheoryResult] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [kpiInputs, setKpiInputs] = useState({ cpm: '', cpc: '', cpo: '', roas: '', kur: '' });
  const [validation, setValidation] = useState(null);
  const [tutorHints, setTutorHints] = useState({});
  const [theoryLoading, setTheoryLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState('');
  const theoryLoadRequestRef = useRef(0);

  const expected = useMemo(() => {
    if (!scenario) return null;
    const cpm = (scenario.werbekosten_euro / scenario.impressions) * 1000;
    const cpc = scenario.werbekosten_euro / scenario.klicks;
    const cpo = scenario.werbekosten_euro / scenario.bestellungen;
    const roas = scenario.umsatz_euro / scenario.werbekosten_euro;
    const kur = (scenario.werbekosten_euro / scenario.umsatz_euro) * 100;
    return { cpm, cpc, cpo, roas, kur };
  }, [scenario]);

  const scenarioTextForDisplay = useMemo(() => {
    if (!scenario) return '';
    const raw = String(scenario.kampagnen_szenario || '').trim();
    const hasDigit = /\d/.test(raw);
    if (hasDigit) return raw;

    const impressions = Number(scenario.impressions || 0).toLocaleString('de-DE');
    const klicks = Number(scenario.klicks || 0).toLocaleString('de-DE');
    const bestellungen = Number(scenario.bestellungen || 0).toLocaleString('de-DE');
    const werbekosten = Number(scenario.werbekosten_euro || 0).toFixed(2).replace('.', ',');
    const umsatz = Number(scenario.umsatz_euro || 0).toFixed(2).replace('.', ',');

    return `Du hast ${werbekosten} EUR Werbekosten eingesetzt. Die Kampagne erzielte ${impressions} Impressions, ${klicks} Klicks und ${bestellungen} Bestellungen. Der generierte Umsatz liegt bei ${umsatz} EUR.`;
  }, [scenario]);

  useEffect(() => {
    const bootstrapTheory = async () => {
      if (phase !== 'theory') return;
      const requestId = theoryLoadRequestRef.current + 1;
      theoryLoadRequestRef.current = requestId;
      setTheoryLoading(true);
      try {
        const generated = await generateKpiTheoryQuestions();
        if (requestId !== theoryLoadRequestRef.current) return;
        if (Array.isArray(generated) && generated.length > 0) {
          setTheoryQuestions(generated);
          setTheoryProgress({});
        } else {
          setTheoryQuestions(FALLBACK_THEORY_QUESTIONS);
          setTheoryProgress({});
        }
      } catch {
        if (requestId !== theoryLoadRequestRef.current) return;
        // Keep fallback questions silently when generation fails.
        setTheoryQuestions(FALLBACK_THEORY_QUESTIONS);
        setTheoryProgress({});
      } finally {
        if (requestId !== theoryLoadRequestRef.current) return;
        setTheoryLoading(false);
      }
    };

    bootstrapTheory();
  }, [phase]);

  const handleTheoryChoice = (questionId, optionId) => {
    setTheoryResult(null);
    setTheoryAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const refreshTheoryQuestions = async () => {
    const requestId = theoryLoadRequestRef.current + 1;
    theoryLoadRequestRef.current = requestId;
    setTheoryLoading(true);
    setErrorText('');
    try {
      const generated = await generateKpiTheoryQuestions();
      if (requestId !== theoryLoadRequestRef.current) return;
      if (Array.isArray(generated) && generated.length > 0) {
        setTheoryQuestions(generated);
        setTheoryAnswers({});
        setTheoryProgress({});
        setTheoryResult(null);
      } else {
        setTheoryQuestions(FALLBACK_THEORY_QUESTIONS);
        setTheoryProgress({});
      }
    } catch {
      if (requestId !== theoryLoadRequestRef.current) return;
      setTheoryQuestions(FALLBACK_THEORY_QUESTIONS);
      setTheoryProgress({});
      setErrorText('Neue Theoriefragen konnten nicht geladen werden. Nutze bitte den aktuellen Satz oder versuche es erneut.');
    } finally {
      if (requestId !== theoryLoadRequestRef.current) return;
      setTheoryLoading(false);
    }
  };

  const startScenarioPhase = async () => {
    setBusy(true);
    setErrorText('');
    setPhase('generating');
    try {
      const generated = await generateOnlineMarketingScenario();
      setScenario(generated);
      setValidation(null);
      setTutorHints({});
      setKpiInputs({ cpm: '', cpc: '', cpo: '', roas: '', kur: '' });
      setPhase('calculator');
    } catch (error) {
      setErrorText(error?.message || 'Szenario konnte nicht geladen werden.');
      setPhase('theory');
    } finally {
      setBusy(false);
    }
  };

  const submitTheory = async () => {
    const requiredCorrect = getRequiredCorrectAnswers(multiChoiceRepeatMode);
    const now = Date.now();

    const nextProgress = { ...theoryProgress };
    const checked = theoryQuestions.map((item) => {
      const selected = theoryAnswers[item.id];
      const correct = item.options.find((opt) => opt.isCorrect)?.id;
      const wasCorrect = !!selected && selected === correct;
      const previous = nextProgress[item.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0, correctAnswersCount: 0, isLearned: false };
      const updated = computeNextQuizProgress(previous, wasCorrect, now, multiChoiceRepeatMode);
      nextProgress[item.id] = updated;

      return {
        id: item.id,
        isCorrect: wasCorrect,
        progress: updated
      };
    });

    setTheoryProgress(nextProgress);

    const correctCount = checked.filter((x) => x.isCorrect).length;
    const masteredCount = checked.filter((x) => Number(x.progress?.correctAnswersCount || 0) >= requiredCorrect).length;
    setTheoryResult({
      total: theoryQuestions.length,
      correct: correctCount,
      mastered: masteredCount,
      requiredCorrect,
      checks: checked.reduce((acc, item) => {
        acc[item.id] = item.isCorrect;
        return acc;
      }, {})
    });

    if (masteredCount === theoryQuestions.length) {
      await startScenarioPhase();
      return;
    }

    setTheoryAnswers({});
  };

  const submitCalculation = async () => {
    if (!expected) return;
    setBusy(true);
    setErrorText('');

    const parsed = {
      cpm: parseUserNumber(kpiInputs.cpm),
      cpc: parseUserNumber(kpiInputs.cpc),
      cpo: parseUserNumber(kpiInputs.cpo),
      roas: parseRoasInput(kpiInputs.roas),
      kur: parseKurInput(kpiInputs.kur)
    };

    const result = Object.keys(METRIC_LABELS).reduce((acc, key) => {
      const actual = parsed[key];
      const target = expected[key];
      const isCorrect = isCloseEnough(actual, target);
      acc[key] = {
        actual,
        expected: target,
        isCorrect,
        localExplanation: isCorrect ? '' : buildMetricLocalExplanation(key, actual, target, scenario)
      };
      return acc;
    }, {});

    setValidation(result);

    const wrongMetrics = Object.keys(result).filter((key) => !result[key].isCorrect);
    if (wrongMetrics.length === 0) {
      setTutorHints({});
      setPhase('result');
      setBusy(false);
      return;
    }

    try {
      const tutorResponses = await Promise.all(
        wrongMetrics.map(async (metricKey) => {
          const hint = await askKpiTutorFeedback({
            metric: METRIC_LABELS[metricKey],
            formula: FORMULAS[metricKey],
            userInput: kpiInputs[metricKey]
          });
          return [metricKey, hint];
        })
      );

      setTutorHints(tutorResponses.reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}));
      setPhase('result');
    } catch {
      setErrorText('KI-Feedback konnte nicht geladen werden. Die Markierung der Felder funktioniert trotzdem.');
      setPhase('result');
    } finally {
      setBusy(false);
    }
  };

  const allCorrect = validation
    ? Object.values(validation).every((entry) => entry.isCorrect)
    : false;

  const handleCalculationInputKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!busy) {
      submitCalculation();
    }
  };

  const getTheoryAnswerState = (item) => {
    const selectedId = theoryAnswers[item.id];
    if (!selectedId) return null;
    const selectedOption = item.options.find((opt) => opt.id === selectedId);
    const correctOption = item.options.find((opt) => opt.isCorrect);
    const isCorrect = !!selectedOption && !!correctOption && selectedOption.id === correctOption.id;
    return {
      selectedOption,
      correctOption,
      isCorrect,
      explanation: buildTheoryExplanation(selectedOption, correctOption)
    };
  };

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      {burgerMenuPortal}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <header>
        <button className="btn-nav" onClick={onBack}>&larr; KPI Setup</button>
      </header>

      <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '760px', padding: '2.2rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
        <style>{`@keyframes einsteinThinkFloat { 0% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-8px) scale(1.015); } 100% { transform: translateY(0px) scale(1); } } @keyframes einsteinThinkGlow { 0% { box-shadow: 0 0 0 rgba(99,102,241,0.0); } 50% { box-shadow: 0 0 40px rgba(99,102,241,0.35); } 100% { box-shadow: 0 0 0 rgba(99,102,241,0.0); } }`}</style>
        <h2 style={{ marginTop: 0, marginBottom: '0.55rem', textAlign: 'center' }}>Online-Marketing: Metriken &amp; Abrechnungsmodelle</h2>
        <p style={{ marginTop: 0, color: 'var(--text-muted)', textAlign: 'center' }}>
          Next Level: Erst Theorie-Check, dann Kampagnen-Rechner mit KI-Tutor.
        </p>

        {typeof onMultiChoiceRepeatModeChange === 'function' && (
          <div style={{ marginBottom: '1rem', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.8rem' }}>
            <p style={{ marginTop: 0, marginBottom: '0.55rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Wiederholrate fuer KPI-Theoriefragen (Multiple Choice)
            </p>
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              {[
                { value: MULTI_CHOICE_REPEAT_MODES.ONCE, label: '1x richtig: Frage faellt raus' },
                { value: MULTI_CHOICE_REPEAT_MODES.TWICE, label: '2x richtig: einmal wiederholen' },
                { value: MULTI_CHOICE_REPEAT_MODES.SPACED, label: 'Space Repetition (zeitversetzt)' }
              ].map((option) => (
                <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-light)', fontSize: '0.88rem' }}>
                  <input
                    type="radio"
                    name="kpi-repeat-mode"
                    checked={multiChoiceRepeatMode === option.value}
                    onChange={() => onMultiChoiceRepeatModeChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {errorText && (
          <p style={{ color: '#fca5a5', marginBottom: '0.8rem' }}>{errorText}</p>
        )}

        {phase === 'theory' && (
          <>
            <h3 style={{ marginBottom: '0.9rem' }}>Phase 1: Theorie-Check</h3>
            <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '0.9rem' }}>
              <button className="btn-secondary" onClick={refreshTheoryQuestions} disabled={theoryLoading || busy}>
                {theoryLoading ? 'KI erstellt Fragen...' : 'Neue KI-Theoriefragen'}
              </button>
            </div>
            {theoryLoading ? (
              <div
                style={{
                  border: '1px solid var(--glass-border)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <img
                  src="/einsteinGANZ.webp"
                  alt="Einstein denkt nach"
                  style={{
                    width: 'clamp(120px, 28vw, 190px)',
                    height: 'auto',
                    borderRadius: '14px',
                    animation: 'einsteinThinkFloat 1.8s ease-in-out infinite, einsteinThinkGlow 2.4s ease-in-out infinite'
                  }}
                />
                <p style={{ marginTop: '0.8rem', marginBottom: 0, color: 'var(--text-muted)', fontWeight: 700 }}>
                  Einstein analysiert IHK-Fallen und baut neue Theoriefragen...
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {theoryQuestions.map((item) => (
                  <div key={item.id} style={{ padding: '0.9rem', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                    <p style={{ marginTop: 0, marginBottom: '0.6rem', fontWeight: 700 }}>{item.question}</p>
                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                      {item.options.map((option) => {
                        const selected = theoryAnswers[item.id] === option.id;
                        const hasSelected = !!theoryAnswers[item.id];
                        const showImmediate = hasSelected;
                        const isSelectedWrong = showImmediate && selected && !option.isCorrect;
                        const isSelectedCorrect = showImmediate && selected && option.isCorrect;
                        const isUnselectedCorrectAfterWrong = showImmediate && !selected && option.isCorrect && !isSelectedCorrect;

                        let border = '1px solid var(--glass-border)';
                        let background = 'rgba(255,255,255,0.03)';
                        if (isSelectedCorrect) {
                          border = '1px solid rgba(34,197,94,0.8)';
                          background = 'rgba(34,197,94,0.16)';
                        } else if (isSelectedWrong) {
                          border = '1px solid rgba(239,68,68,0.85)';
                          background = 'rgba(239,68,68,0.16)';
                        } else if (isUnselectedCorrectAfterWrong) {
                          border = '1px solid rgba(34,197,94,0.55)';
                          background = 'rgba(34,197,94,0.08)';
                        } else if (selected) {
                          border = '1px solid var(--primary)';
                          background = 'rgba(99,102,241,0.15)';
                        }

                        const style = {
                          textAlign: 'left',
                          borderRadius: '10px',
                          border,
                          background,
                          color: 'var(--text-light)',
                          padding: '0.55rem 0.7rem'
                        };
                        return (
                          <button
                            key={option.id}
                            className="btn-secondary"
                            style={style}
                            onClick={() => handleTheoryChoice(item.id, option.id)}
                          >
                            {option.text}
                          </button>
                        );
                      })}
                    </div>
                    {!!theoryAnswers[item.id] && (
                      <p
                        style={{
                          marginBottom: 0,
                          marginTop: '0.55rem',
                          color: (item.options.find((opt) => opt.id === theoryAnswers[item.id])?.isCorrect) ? '#86efac' : '#fda4af'
                        }}
                      >
                        {(item.options.find((opt) => opt.id === theoryAnswers[item.id])?.isCorrect)
                          ? 'Richtig.'
                          : 'Nicht ganz. Die korrekte Option ist grün markiert.'}
                      </p>
                    )}
                    {getTheoryAnswerState(item)?.explanation && (
                      <div
                        style={{
                          marginTop: '0.6rem',
                          borderRadius: '10px',
                          border: getTheoryAnswerState(item)?.isCorrect
                            ? '1px solid rgba(34,197,94,0.45)'
                            : '1px solid rgba(239,68,68,0.45)',
                          background: getTheoryAnswerState(item)?.isCorrect
                            ? 'rgba(34,197,94,0.08)'
                            : 'rgba(239,68,68,0.08)',
                          padding: '0.65rem 0.75rem'
                        }}
                      >
                        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {getTheoryAnswerState(item).explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {theoryResult && theoryResult.mastered < theoryResult.total && (
              <p style={{ marginTop: '0.8rem', color: '#fda4af' }}>
                {theoryResult.correct} von {theoryResult.total} in dieser Runde korrekt. Lernstand: {theoryResult.mastered}/{theoryResult.total} Fragen bei Ziel {theoryResult.requiredCorrect}x richtig.
              </p>
            )}

            <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={submitTheory} disabled={busy || theoryLoading}>
              Theorie-Check abschliessen
            </button>
          </>
        )}

        {phase === 'generating' && (
          <div style={{ textAlign: 'center', padding: '2rem 0.5rem' }}>
            <img
              src="/einsteinGANZ.webp"
              alt="Einstein berechnet Kampagnenszenario"
              style={{
                width: 'clamp(120px, 26vw, 180px)',
                height: 'auto',
                borderRadius: '14px',
                marginBottom: '0.8rem',
                animation: 'einsteinThinkFloat 1.8s ease-in-out infinite, einsteinThinkGlow 2.4s ease-in-out infinite'
              }}
            />
            <h3>Phase 2: Kampagne wird generiert...</h3>
            <p style={{ color: 'var(--text-muted)' }}>KI erstellt ein neues, realistisches Szenario mit frischen Zahlen.</p>
          </div>
        )}

        {phase === 'calculator' && scenario && (
          <>
            <h3 style={{ marginBottom: '0.9rem' }}>Phase 3: KPI-Rechner</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>{scenarioTextForDisplay}</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))',
              gap: '0.55rem',
              marginBottom: '0.85rem'
            }}>
              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.55rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Impressions</div>
                <div style={{ fontWeight: 700 }}>{Number(scenario.impressions).toLocaleString('de-DE')}</div>
              </div>
              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.55rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Klicks</div>
                <div style={{ fontWeight: 700 }}>{Number(scenario.klicks).toLocaleString('de-DE')}</div>
              </div>
              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.55rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Bestellungen</div>
                <div style={{ fontWeight: 700 }}>{Number(scenario.bestellungen).toLocaleString('de-DE')}</div>
              </div>
              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.55rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Werbekosten</div>
                <div style={{ fontWeight: 700 }}>{Number(scenario.werbekosten_euro).toFixed(2).replace('.', ',')} EUR</div>
              </div>
              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.55rem', gridColumn: 'span 2' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Umsatz</div>
                <div style={{ fontWeight: 700 }}>{Number(scenario.umsatz_euro).toFixed(2).replace('.', ',')} EUR</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              {[
                ['cpm', 'CPM (Tausenderkontaktpreis) in EUR'],
                ['cpc', 'CPC (Kosten pro Klick) in EUR'],
                ['cpo', 'CPO (Kosten pro Bestellung) in EUR'],
                ['roas', 'ROAS (Faktor oder %)'],
                ['kur', 'KUR (%)']
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: key === 'kur' ? '1 / -1' : 'auto' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>{label}</span>
                  <input
                    value={kpiInputs[key]}
                    onChange={(e) => setKpiInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={handleCalculationInputKeyDown}
                    placeholder={key === 'roas' ? 'z.B. 8 oder 800%' : 'z.B. 2,50'}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-light)'
                    }}
                  />
                </label>
              ))}
            </div>

            <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={submitCalculation} disabled={busy}>
              Abgeben &amp; Prüfen
            </button>
          </>
        )}

        {phase === 'result' && validation && (
          <>
            <h3 style={{ marginBottom: '0.9rem' }}>Phase 4: Validierung &amp; KI-Feedback</h3>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {Object.keys(METRIC_LABELS).map((key) => {
                const entry = validation[key];
                const good = entry?.isCorrect;
                return (
                  <div key={key} style={{ borderRadius: '12px', border: good ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(239,68,68,0.5)', padding: '0.75rem', background: good ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{METRIC_LABELS[key]}: {good ? 'korrekt' : 'nicht korrekt'}</p>
                    {!good && entry?.localExplanation && (
                      <p style={{ marginTop: '0.45rem', marginBottom: 0, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {entry.localExplanation}
                      </p>
                    )}
                    {!good && tutorHints[key] && (
                      <p style={{ marginTop: '0.45rem', marginBottom: 0, color: 'var(--text-muted)' }}>{tutorHints[key]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {allCorrect ? (
              <p style={{ marginTop: '1rem', color: '#86efac' }}>Stark. Alle 5 Kennzahlen sind korrekt berechnet.</p>
            ) : (
              <p style={{ marginTop: '1rem', color: '#fda4af' }}>Nicht schlimm. Nutze die Hinweise, passe deine Formeln an und pruefe erneut.</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => setPhase('calculator')}>Eingaben verbessern</button>
              <button className="btn-primary" onClick={startScenarioPhase}>Neue Kampagne</button>
            </div>
          </>
        )}
      </div>
      <FloatingPortal
        questionId="kpi_next_level"
        questionText="Online-Marketing: Metriken & Abrechnungsmodelle"
        currentAppMode="kpi_next_level"
      />
    </div>
  );
};

export default OnlineMarketingKpiNextLevel;
