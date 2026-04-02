import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Confetti from './Confetti';
import { evaluateNutzwertanalyse } from '../geminiClient';

// ── Kaufmännische Rundung auf 2 Nachkommastellen ─────────────
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Formatierung ─────────────────────────────────────────────
const fmtParams = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const fmt = (v) => typeof v === 'number' && !isNaN(v) ? v.toLocaleString('de-DE', fmtParams) : v;

// ── CRITERIA POOL ────────────────────────────────────────────
const CRITERIA_POOL = [
  {
    key: 'kosten', name: 'Anschaffungskosten', type: 'quantitativ',
    texts: {
      1: 'sehr hohe Anschaffungskosten',
      2: 'eher hohe Anschaffungskosten',
      3: 'Anschaffungskosten im Mittelfeld',
      4: 'gute Anschaffungskosten',
      5: 'sehr niedrige Anschaffungskosten'
    }
  },
  {
    key: 'support', name: 'Support & Service', type: 'qualitativ',
    texts: {
      1: 'praktisch kein Support verfügbar',
      2: 'nur rudimentärer E-Mail-Support',
      3: 'solider Standard-Support',
      4: 'guter Support mit Hotline',
      5: 'sehr starker 24/7 Premium-Support'
    }
  },
  {
    key: 'usability', name: 'Usability (Bedienbarkeit)', type: 'qualitativ',
    texts: {
      1: 'sehr unübersichtliche Bedienung',
      2: 'umständliche Einarbeitung',
      3: 'durchschnittliche Bedienbarkeit',
      4: 'intuitive und klare Bedienung',
      5: 'sehr hohe Nutzerfreundlichkeit'
    }
  },
  {
    key: 'funktionsumfang', name: 'Funktionsumfang', type: 'quantitativ',
    texts: {
      1: 'nur Basisfunktionen verfügbar',
      2: 'überschaubarer Funktionsumfang',
      3: 'deckt Standardfunktionen ab',
      4: 'viele Zusatzmodule vorhanden',
      5: 'sehr umfangreicher All-in-One-Funktionsumfang'
    }
  },
  {
    key: 'schnittstellen', name: 'Schnittstellen & Integration', type: 'qualitativ',
    texts: {
      1: 'keine vorgefertigten Schnittstellen',
      2: 'nur wenige grundlegende Integrationen',
      3: 'wichtige Standardschnittstellen vorhanden',
      4: 'gute Auswahl inkl. REST-APIs',
      5: 'nahtlose Integration mit offener API-Architektur'
    }
  }
];

// ── SCENARIO GENERATOR ───────────────────────────────────────
function buildScenarioText(criteriaData, providers, includeScores) {
  let text = `Für ein neues E-Commerce-Projekt stehen drei Anbieter zur Auswahl: ${providers.join(', ')}.\n\n`;
  text += `Folgende Gewichtungen wurden festgelegt: ${criteriaData.map((c) => `${c.name} (${c.weight}%)`).join(', ')}.\n\n`;
  text += 'Bewertungen je Anbieter:\n';

  providers.forEach((providerName, pIdx) => {
    const compactRatings = criteriaData
      .map((criterion) => {
        const description = criterion.texts[criterion.scores[pIdx]];
        if (!includeScores) return `${criterion.name}: ${description}`;
        return `${criterion.name}: ${description} (${criterion.scores[pIdx]} Pt.)`;
      })
      .join('; ');
    text += `- ${providerName}: ${compactRatings}.\n`;
  });

  text += '\nBerechnen Sie die Teilnutzwerte und Gesamtnutzwerte und wählen Sie den besten Anbieter mit kurzer Begründung.';
  return text;
}

function generateUtilityTask() {
  const providers = ["ShopTrade", "CommerceHub", "eSell Pro"];
  
  // pick 4 random criteria
  const selectedCriteria = [...CRITERIA_POOL].sort(() => 0.5 - Math.random()).slice(0, 4);
  
  // random weights summing to 100
  let weights = [0, 0, 0, 0];
  let remaining = 100;
  for (let i = 0; i < 3; i++) {
    const maxVal = remaining - ((3 - i) * 10);
    const weightRaw = Math.max(10, Math.floor((Math.random() * maxVal) / 5) * 5);
    weights[i] = weightRaw || 10;
    remaining -= weights[i];
  }
  weights[3] = remaining;
  weights.sort(() => 0.5 - Math.random());
  
  const criteriaData = selectedCriteria.map((c, i) => {
    return {
      ...c,
      weight: weights[i],
      scores: providers.map(() => Math.floor(Math.random() * 5) + 1)
    }
  });

  // Calculate master solution
  const masterSolution = {
    providers,
    criteria: criteriaData.map(c => ({
      name: c.name,
      type: c.type,
      weight: c.weight,
      scores: c.scores, // Array of points per provider
      partials: c.scores.map(s => round2((c.weight / 100) * s))
    })),
    totals: [0, 0, 0] // sums
  };

  masterSolution.criteria.forEach(c => {
    c.partials.forEach((partial, pIdx) => {
      masterSolution.totals[pIdx] = round2(masterSolution.totals[pIdx] + partial);
    });
  });

  let winnerIdx = 0;
  for (let i = 1; i < masterSolution.totals.length; i++) {
    if (masterSolution.totals[i] > masterSolution.totals[winnerIdx]) {
      winnerIdx = i;
    }
  }
  masterSolution.winner = providers[winnerIdx];

  return {
    providers,
    criteriaData,
    masterSolution
  };
}

const TOLERANCE_CENTS = 2; // +/- 0.02
const isWithinTolerance = (userVal, expectedVal) => {
  if (!Number.isFinite(userVal) || !Number.isFinite(expectedVal)) return false;
  return Math.abs(parseFloat(userVal) - parseFloat(expectedVal)) <= (TOLERANCE_CENTS / 100);
};

const EMPTY_FIELDS_MESSAGE = 'Bitte fülle alle Eingabefelder aus, bevor du abgibst.';

// ── COMPONENT ────────────────────────────────────────────────
export default function NutzwertanalyseSimulator({ onBack, onLearningEvent }) {
  const rootRef = useRef(null);
  const [task, setTask] = useState(() => generateUtilityTask());
  const [inputs, setInputs] = useState({});
  const [partialWarnings, setPartialWarnings] = useState({});
  const [totalWarnings, setTotalWarnings] = useState({});
  const [dropdownChoice, setDropdownChoice] = useState('');
  const [justification, setJustification] = useState('');
  const [recommendationError, setRecommendationError] = useState('');
  const [justificationError, setJustificationError] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState(2); // 1 = Lern, 2 = Übung, 3 = Prüfung
  
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [validationStates, setValidationStates] = useState({}); // 'correct' | 'wrong'
  const [showConfetti, setShowConfetti] = useState(false);

  const [activeHintId, setActiveHintId] = useState(null);

  const parseInput = (raw) => {
    let source = String(raw ?? '').trim();
    if (!source) return NaN;

    source = source.replace(/\s+/g, '').replace(/[−–]/g, '-');

    // Accept optional trailing percent sign (e.g. "45%") for weighting fields.
    if (source.endsWith('%')) {
      source = source.slice(0, -1);
    }
    if (!source || source.includes('%')) return NaN;

    // Accept typical numeric formats like 1, 1.0, 1,0, 1.00, 1.000,50.
    if (!/^[+-]?[0-9.,]+$/.test(source)) return NaN;

    let sign = '';
    if (source[0] === '+' || source[0] === '-') {
      sign = source[0];
      source = source.slice(1);
    }

    const lastComma = source.lastIndexOf(',');
    const lastDot = source.lastIndexOf('.');
    const decimalSep = Math.max(lastComma, lastDot) >= 0
      ? (lastComma > lastDot ? ',' : '.')
      : null;

    let intPart = source;
    let decPart = '';
    if (decimalSep) {
      const idx = source.lastIndexOf(decimalSep);
      intPart = source.slice(0, idx);
      decPart = source.slice(idx + 1);
    }

    intPart = intPart.replace(/[.,]/g, '');
    if (!intPart && !decPart) return NaN;

    const normalized = `${sign}${intPart || '0'}${decPart ? `.${decPart}` : ''}`;
    if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) return NaN;

    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const scenarioText = useMemo(
    () => buildScenarioText(task.criteriaData, task.providers, difficultyLevel === 1),
    [task.criteriaData, task.providers, difficultyLevel]
  );

  const hasUserProgress = useMemo(() => {
    const hasInputValues = Object.values(inputs).some((val) => String(val ?? '').trim() !== '');
    return hasInputValues || dropdownChoice !== '' || justification.trim() !== '';
  }, [inputs, dropdownChoice, justification]);

  const expectedMatrixKeys = useMemo(() => {
    const keys = [];
    task.criteriaData.forEach((_, cIdx) => {
      if (difficultyLevel > 1) {
        keys.push(`w_${cIdx}`);
      }
      task.providers.forEach((__, pIdx) => {
        if (difficultyLevel > 1) {
          keys.push(`pt_${cIdx}_${pIdx}`);
        }
        keys.push(`par_${cIdx}_${pIdx}`);
      });
    });

    if (difficultyLevel > 1) {
      task.providers.forEach((__, pIdx) => keys.push(`total_${pIdx}`));
    }

    return keys;
  }, [difficultyLevel, task.criteriaData, task.providers]);

  const resetWorkState = useCallback(() => {
    setInputs({});
    setPartialWarnings({});
    setTotalWarnings({});
    setDropdownChoice('');
    setJustification('');
    setRecommendationError('');
    setJustificationError('');
    setAiFeedback(null);
    setValidationStates({});
    setShowConfetti(false);
    setActiveHintId(null);
  }, []);

  const handleNewTask = useCallback(() => {
    if (hasUserProgress) {
      const shouldDiscard = window.confirm('Willst du wirklich eine neue Aufgabe generieren? Deine Eingaben gehen verloren.');
      if (!shouldDiscard) return;
    }
    setTask(generateUtilityTask());
    resetWorkState();
  }, [hasUserProgress, resetWorkState]);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleChange = (key, val) => {
    setInputs(prev => ({ ...prev, [key]: val }));
    setValidationStates(prev => ({ ...prev, [key]: undefined }));
    setAiFeedback(null);
    if (key.startsWith('total_')) {
      setTotalWarnings(prev => ({ ...prev, [key]: undefined }));
    }
    if (key.startsWith('par_')) {
      setPartialWarnings(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const handleFieldFocus = useCallback((key) => {
    setValidationStates(prev => ({ ...prev, [key]: undefined }));
    if (key.startsWith('total_')) {
      setTotalWarnings(prev => ({ ...prev, [key]: undefined }));
    }
    if (key.startsWith('par_')) {
      setPartialWarnings(prev => ({ ...prev, [key]: undefined }));
    }
  }, []);

  const shouldWarnWeightOnly = (criterion, cIdx, pIdx, partialRaw, pointRaw = null) => {
    const partialVal = parseInput(partialRaw);
    if (!Number.isFinite(partialVal)) return false;

    const weightDecimal = round2(criterion.weight / 100);
    if (!isWithinTolerance(partialVal, weightDecimal)) return false;

    const pointVal = pointRaw ?? (difficultyLevel === 1
      ? criterion.scores[pIdx]
      : parseInput(inputs[`pt_${cIdx}_${pIdx}`]));

    // If points are exactly 1, partial can validly equal the weighting.
    if (Number.isFinite(pointVal) && isWithinTolerance(pointVal, 1)) return false;
    return true;
  };

  const handlePartialChange = (criterion, cIdx, pIdx, val) => {
    const key = `par_${cIdx}_${pIdx}`;
    handleChange(key, val);
    setPartialWarnings((prev) => ({
      ...prev,
      [key]: shouldWarnWeightOnly(criterion, cIdx, pIdx, val)
        ? 'Achtung: Du hast nur die Gewichtung eingetragen. Multipliziere sie mit der Punktzahl!'
        : undefined
    }));
  };

  const handlePointsChange = (criterion, cIdx, pIdx, val) => {
    const pointKey = `pt_${cIdx}_${pIdx}`;
    const partialKey = `par_${cIdx}_${pIdx}`;

    handleChange(pointKey, val);
    setPartialWarnings((prev) => {
      const currentPartial = inputs[partialKey];
      if (!currentPartial) return prev;
      return {
        ...prev,
        [partialKey]: shouldWarnWeightOnly(criterion, cIdx, pIdx, currentPartial, parseInput(val))
          ? 'Achtung: Du hast nur die Gewichtung eingetragen. Multipliziere sie mit der Punktzahl!'
          : undefined
      };
    });
  };

  const handleInsertMasterSolution = useCallback(() => {
    const newInputs = {};

    task.criteriaData.forEach((c, cIdx) => {
      newInputs[`w_${cIdx}`] = String(c.weight);
      task.providers.forEach((_, pIdx) => {
        newInputs[`pt_${cIdx}_${pIdx}`] = String(c.scores[pIdx]);
        newInputs[`par_${cIdx}_${pIdx}`] = String(round2((c.weight / 100) * c.scores[pIdx]));
      });
    });

    task.masterSolution.totals.forEach((t, i) => {
      newInputs[`total_${i}`] = String(round2(t));
    });

    setInputs(newInputs);
    setDropdownChoice(task.masterSolution.winner);
    setRecommendationError('');
    setJustificationError('');
    setValidationStates({});
    setPartialWarnings({});
    setTotalWarnings({});
    setAiFeedback(null);
  }, [task]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) return;
      const clickedHintElement = event.target.closest('.utility-hint-toggle, .utility-hint-box');
      if (!clickedHintElement) {
        setActiveHintId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const validateAll = async () => {
    const missingKeys = expectedMatrixKeys.filter((key) => String(inputs[key] ?? '').trim() === '');
    if (missingKeys.length > 0) {
      const missingStates = {};
      missingKeys.forEach((key) => {
        missingStates[key] = 'wrong';
      });

      setValidationStates(missingStates);
      setTotalWarnings({});
      setAiFeedback({
        isPassed: false,
        exact: false,
        examinerFeedback: EMPTY_FIELDS_MESSAGE
      });
      return;
    }

    if (difficultyLevel > 1) {
      const enteredWeights = task.criteriaData.map((_, cIdx) => parseInput(inputs[`w_${cIdx}`]));
      const sumWeights = enteredWeights.reduce((sum, val) => sum + (Number.isFinite(val) ? val : 0), 0);
      if (!isWithinTolerance(sumWeights, 100)) {
        const weightStates = {};
        task.criteriaData.forEach((_, cIdx) => {
          weightStates[`w_${cIdx}`] = 'wrong';
        });
        setValidationStates(weightStates);
        setAiFeedback({
          isPassed: false,
          exact: false,
          examinerFeedback: `Achtung: Deine Gewichtungen ergeben ${fmt(sumWeights)} %, nicht 100 %.`
        });
        return;
      }
    }

    const trimmedJustification = justification.trim();
    const hasRecommendation = Boolean(dropdownChoice);
    const hasValidJustification = trimmedJustification.length >= 30;

    setRecommendationError(hasRecommendation ? '' : 'Bitte wähle einen Anbieter aus.');
    setJustificationError(hasValidJustification ? '' : 'Bitte begründe deine Entscheidung mit mindestens 30 Zeichen.');

    if (!hasRecommendation || !hasValidJustification) {
      setAiFeedback({
        isPassed: false,
        exact: false,
        examinerFeedback: !hasRecommendation
          ? 'Bitte wähle zuerst einen empfohlenen Anbieter aus.'
          : 'Bitte ergänze eine sinnvolle Begründung mit mindestens 30 Zeichen.'
      });
      return;
    }

    let allOk = true;
    const newStates = {};
    const newTotalWarnings = {};

    // Build the user matrix for AI and exact comparison
    const userMatrix = task.criteriaData.map((c, cIdx) => {
      const uWeight = parseInput(inputs[`w_${cIdx}`]);
      
      const providerScores = task.providers.map((p, pIdx) => {
        const uPts = difficultyLevel === 1 ? c.scores[pIdx] : parseInput(inputs[`pt_${cIdx}_${pIdx}`]);
        const uPartial = parseInput(inputs[`par_${cIdx}_${pIdx}`]);
        return { points: uPts, partial: uPartial };
      });

      return {
        criterion: c.name,
        userWeight: uWeight,
        userProviderScores: providerScores
      };
    });

    // Validate the user's arithmetic consistency inside their own matrix.
    task.criteriaData.forEach((c, cIdx) => {
      const uWeight = difficultyLevel === 1 ? c.weight : parseInput(inputs[`w_${cIdx}`]);
      if (difficultyLevel > 1) {
        if (!Number.isFinite(uWeight)) {
          newStates[`w_${cIdx}`] = 'wrong';
          allOk = false;
        } else {
          newStates[`w_${cIdx}`] = 'correct';
        }
      }

      task.providers.forEach((p, pIdx) => {
        const uPts = difficultyLevel === 1 ? c.scores[pIdx] : parseInput(inputs[`pt_${cIdx}_${pIdx}`]);

        if (difficultyLevel > 1) {
          if (!Number.isFinite(uPts)) {
            newStates[`pt_${cIdx}_${pIdx}`] = 'wrong';
            allOk = false;
          } else {
            newStates[`pt_${cIdx}_${pIdx}`] = 'correct';
          }
        }

        const uPartial = parseInput(inputs[`par_${cIdx}_${pIdx}`]);
        const expectedPartialFromUserInputs = Number.isFinite(uWeight) && Number.isFinite(uPts)
          ? round2((uWeight / 100) * uPts)
          : NaN;

        if (!isWithinTolerance(uPartial, expectedPartialFromUserInputs)) {
          newStates[`par_${cIdx}_${pIdx}`] = 'wrong';
          allOk = false;
        } else {
          newStates[`par_${cIdx}_${pIdx}`] = 'correct';
        }
      });
    });

    task.providers.forEach((p, pIdx) => {
      const providerPartialsAreCorrect = task.criteriaData.every((c, cIdx) => {
        const uWeight = difficultyLevel === 1 ? c.weight : parseInput(inputs[`w_${cIdx}`]);
        const uPts = difficultyLevel === 1 ? c.scores[pIdx] : parseInput(inputs[`pt_${cIdx}_${pIdx}`]);
        const uPartial = parseInput(inputs[`par_${cIdx}_${pIdx}`]);
        const expectedPartialFromUserInputs = Number.isFinite(uWeight) && Number.isFinite(uPts)
          ? round2((uWeight / 100) * uPts)
          : NaN;
        return isWithinTolerance(uPartial, expectedPartialFromUserInputs);
      });

      const expectedUserTotal = round2(task.criteriaData.reduce((sum, _, cIdx) => {
        const partial = parseInput(inputs[`par_${cIdx}_${pIdx}`]);
        return sum + (Number.isFinite(partial) ? partial : 0);
      }, 0));

      const uTotal = difficultyLevel === 1 ? task.masterSolution.totals[pIdx] : parseInput(inputs[`total_${pIdx}`]);
      if (!isWithinTolerance(uTotal, expectedUserTotal)) {
        newStates[`total_${pIdx}`] = 'wrong';
        allOk = false;
        const providerName = task.providers[pIdx];
        newTotalWarnings[`total_${pIdx}`] = providerPartialsAreCorrect
          ? `Dein Gesamtnutzwert für ${providerName} stimmt nicht. Deine Teilwerte sind korrekt, aber du hast dich beim Zusammenrechnen der Summe vertippt.`
          : `Dein Gesamtnutzwert für ${providerName} stimmt nicht. Überprüfe deine Berechnung.`;
      } else {
        newStates[`total_${pIdx}`] = 'correct';
      }
    });

    const userTotals = task.providers.map((p, pIdx) => (
      difficultyLevel === 1 ? task.masterSolution.totals[pIdx] : parseInput(inputs[`total_${pIdx}`])
    ));
    const bestTotal = Math.max(...userTotals.map((v) => Number.isFinite(v) ? v : Number.NEGATIVE_INFINITY));
    const userCalculatedWinner = Number.isFinite(bestTotal)
      ? task.providers.find((_, idx) => isWithinTolerance(userTotals[idx], bestTotal)) || null
      : null;

    const recommendationConsistentWithUserTotals = Boolean(userCalculatedWinner) && dropdownChoice === userCalculatedWinner;
    const localExact = allOk && recommendationConsistentWithUserTotals;

    setValidationStates(newStates);
    setTotalWarnings(newTotalWarnings);

    // Wenn nicht 100% korrekt (also Abweichungen bei Punkten oder finaler Auswahl),
    // fragen wir die KI als IHK-Prüfer.
    setIsAiLoading(true);

    try {
      const response = await evaluateNutzwertanalyse({
        scenarioText,
        masterSolution: task.masterSolution,
        userMatrix: {
          rows: userMatrix,
          totals: userTotals
        },
        userCalculatedWinner,
        userRecommendation: dropdownChoice,
        userJustification: trimmedJustification
      });

      if (response && response.isPassed) {
        const exactByMathAndChoice = localExact;
        if (exactByMathAndChoice) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5500);
        }
        setAiFeedback({
           isPassed: true,
           exact: exactByMathAndChoice,
           examinerFeedback: response.examinerFeedback || (exactByMathAndChoice
             ? 'Hervorragend! Die Analyse entspricht dem Erwartungshorizont.'
             : 'Trotz kleiner Abweichungen wurde deine Lösung akzeptiert!')
        });
        if (onLearningEvent) {
          onLearningEvent({
            mode: 'nutzwertanalyse',
            questionId: 'nutzwert',
            correct: true,
            topic: 'Nutzwertanalyse'
          });
        }
      } else if (localExact) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5500);
        setAiFeedback({
          isPassed: true,
          exact: true,
          examinerFeedback: response?.examinerFeedback || 'Rechnerisch ist deine Nutzwertanalyse stimmig und deine Empfehlung passt zu deinen Gesamtnutzwerten. Die Lösung ist damit fachlich nachvollziehbar.'
        });
        if (onLearningEvent) {
          onLearningEvent({
            mode: 'nutzwertanalyse',
            questionId: 'nutzwert',
            correct: true,
            topic: 'Nutzwertanalyse'
          });
        }
      } else {
        setAiFeedback({
           isPassed: false,
           exact: false,
           examinerFeedback: response?.examinerFeedback || 'Die Lösung weicht leider zu stark ab oder enthält logische/mathematische Fehler. Bitte die roten Felder überprüfen.'
        });
        if (onLearningEvent) {
          onLearningEvent({
            mode: 'nutzwertanalyse',
            questionId: 'nutzwert',
            correct: false,
            topic: 'Nutzwertanalyse'
          });
        }
      }
    } catch(e) {
      console.error(e);
      setAiFeedback({
        isPassed: false,
        exact: false,
        examinerFeedback: "Ups, die KI konnte momentan nicht zur Prüfung erreicht werden. Korrigiere einfach die roten Felder weiter nach IHK-Standard."
      });
    }

    setIsAiLoading(false);
  };

  const COLORS = {
    primary: '#6366f1',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  const getStateColor = (key) => {
    if (validationStates[key] === 'correct') return COLORS.success;
    if (validationStates[key] === 'wrong') return COLORS.error;
    return 'rgba(255,255,255,0.1)';
  };

  return (
    <div ref={rootRef} className="app-container" style={{ zIndex: 10, maxWidth: '1120px' }}>
      {showConfetti && <Confetti />}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="utility-back-row" style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', padding: '0.5rem 0 0.5rem 3.5rem', marginBottom: '0.5rem', position: 'relative', zIndex: 30 }}>
        <button type="button" className="btn-nav" style={{ minHeight: '42px', zIndex: 30, padding: '0.4rem 1rem', position: 'relative' }} onClick={handleBack}>
          ← Zurück
        </button>
      </div>

      <header style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
        <h1 style={{
          fontFamily: '"Anton", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          fontSize: '2rem',
          transform: 'scaleY(1.15)',
          color: 'var(--text-light)',
          marginBottom: '0.3rem',
          textShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          Nutzwertanalyse
        </h1>
        <p className="subtitle" style={{ marginBottom: '0.8rem' }}>
          KI-gestützter IHK Prüfungs-Simulator
        </p>
      </header>

      {/* ── Level Selector ──────────────────── */}
      <div className="utility-level-selector" style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.2rem', marginTop: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
        {[
          { level: 1, label: 'Lernmodus', desc: 'Punkte gegeben, fokussiertes Rechnen' },
          { level: 2, label: 'Übungsmodus', desc: 'Leere Matrix, Tipps verfügbar' },
          { level: 3, label: 'Prüfungsmodus', desc: 'Leere Matrix, keine Tipps' },
        ].map(lvl => (
          <button
            key={lvl.level}
            onClick={() => {
              setDifficultyLevel(lvl.level);
              resetWorkState();
            }}
            className="utility-level-button"
            style={{
              flex: '1', minWidth: '130px', maxWidth: '200px',
              padding: '0.6rem 0.5rem',
              background: difficultyLevel === lvl.level ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${difficultyLevel === lvl.level ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              color: difficultyLevel === lvl.level ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{lvl.label}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{lvl.desc}</div>
          </button>
        ))}
      </div>

      <div className="quiz-container utility-quiz-container" style={{ width: '100%' }}>
        {/* ── Szenario ─────────────────────── */}
        <div className="utility-scenario-box" style={{
          marginBottom: '1.5rem',
          padding: '1.2rem 1.4rem',
          borderRadius: '12px',
          border: '1px solid rgba(99,102,241,0.3)',
          background: 'rgba(99,102,241,0.08)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.8rem' }}>
            Szenario & Aufgabenstellung
          </div>
          <div className="utility-scenario-text" style={{
            color: 'var(--text-light)',
            fontSize: '0.95rem',
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            maxHeight: 'min(30vh, 250px)',
            overflowY: 'auto',
            paddingRight: '0.35rem'
          }}>
            {scenarioText}
          </div>
        </div>

        {/* ── Tabelle ──────────────────────── */}
        <div className="utility-table-scroll" style={{ overflowX: 'auto', marginBottom: '2rem', paddingBottom: '1rem', whiteSpace: 'nowrap' }}>
          <table className="utility-matrix-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--text-light)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                <th className="utility-th utility-th-criterion" style={{ padding: '1rem', borderBottom: '2px solid rgba(99,102,241,0.5)', width: '22%' }}>Kriterium (Typ)</th>
                <th className="utility-th utility-th-weight" style={{ padding: '1rem', borderBottom: '2px solid rgba(99,102,241,0.5)', width: '12%', textAlign: 'center' }}>Gewichtung</th>
                {task.providers.map(p => (
                  <th className="utility-th utility-th-provider" key={p} style={{ padding: '1rem', borderBottom: '2px solid rgba(99,102,241,0.5)', width: '22%', textAlign: 'center' }}>
                    {p}<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>Pt. | NW</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {task.criteriaData.map((c, cIdx) => (
                <tr key={c.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                  {/* Name & Typ */}
                  <td className="utility-criterion-cell" style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{c.name}</span>
                      {difficultyLevel < 3 && (
                        <button
                                type="button"
                                className="utility-hint-toggle"
                                onClick={() => setActiveHintId((prev) => prev === `hint_${cIdx}` ? null : `hint_${cIdx}`)} 
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.7 }}>💡</button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: c.type === 'quantitativ' ? '#38bdf8' : '#a78bfa', textTransform: 'uppercase', marginTop: '0.2rem', letterSpacing: '0.5px' }}>
                      {c.type}
                    </div>
                      {activeHintId === `hint_${cIdx}` && difficultyLevel < 3 && (
                        <div className="utility-hint-box" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                         Lies im Text nach den Schlagwörtern zu "{c.name}". Weiche Fakten (qualitativ) lassen etwas Interpretationsspielraum, harte (quantitativ) nicht.
                       </div>
                    )}
                  </td>

                  {/* Weighting */}
                  <td className="utility-weight-cell" style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <input 
                        className="wisor-input utility-input utility-input-weight" 
                        type="text" 
                        placeholder="%" 
                        disabled={difficultyLevel === 1 || validationStates[`w_${cIdx}`] === 'correct'}
                        value={difficultyLevel === 1 ? c.weight : inputs[`w_${cIdx}`] || ''}
                        onChange={(e) => handleChange(`w_${cIdx}`, e.target.value)}
                        onFocus={() => handleFieldFocus(`w_${cIdx}`)}
                        style={{ padding: '0.4rem', textAlign: 'center', fontSize: '0.9rem', borderColor: difficultyLevel === 1 ? 'transparent' : getStateColor(`w_${cIdx}`) }}
                      />
                    </div>
                  </td>

                  {/* Providers: Points and Partials */}
                  {task.providers.map((p, pIdx) => (
                    <td className="utility-provider-cell" key={pIdx} style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div className="utility-provider-inputs" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                         <input 
                           className="wisor-input utility-input utility-input-point" 
                           type="text" 
                           placeholder="Pt." 
                           disabled={difficultyLevel === 1 || validationStates[`pt_${cIdx}_${pIdx}`] === 'correct'}
                           value={difficultyLevel === 1 ? c.scores[pIdx] : inputs[`pt_${cIdx}_${pIdx}`] || ''}
                           onChange={(e) => handlePointsChange(c, cIdx, pIdx, e.target.value)}
                           onFocus={() => handleFieldFocus(`pt_${cIdx}_${pIdx}`)}
                           style={{ padding: '0.4rem', textAlign: 'center', fontSize: '0.9rem', backgroundColor: difficultyLevel === 1 ? 'rgba(255,255,255,0.05)' : undefined, borderColor: difficultyLevel === 1 ? 'transparent' : getStateColor(`pt_${cIdx}_${pIdx}`) }}
                         />
                         <span className="utility-multiply-symbol" style={{ color: 'var(--text-muted)' }}>=</span>
                         <input 
                           className="wisor-input utility-input utility-input-partial" 
                           type="text" 
                           placeholder="NW" 
                           disabled={validationStates[`par_${cIdx}_${pIdx}`] === 'correct'}
                           value={inputs[`par_${cIdx}_${pIdx}`] || ''}
                           onChange={(e) => handlePartialChange(c, cIdx, pIdx, e.target.value)}
                           onFocus={() => handleFieldFocus(`par_${cIdx}_${pIdx}`)}
                           style={{ padding: '0.4rem', textAlign: 'center', fontSize: '0.9rem', borderColor: getStateColor(`par_${cIdx}_${pIdx}`) }}
                         />
                      </div>
                      {partialWarnings[`par_${cIdx}_${pIdx}`] && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.67rem', lineHeight: 1.35, color: '#fbbf24' }}>
                          {partialWarnings[`par_${cIdx}_${pIdx}`]}
                        </div>
                      )}
                      {difficultyLevel === 1 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                          Formel: {(c.weight / 100).toFixed(2)} × {c.scores[pIdx]}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              
              {/* Totals Row */}
              <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                <td className="utility-total-label" colSpan={2} style={{ padding: '1.2rem 1rem', fontWeight: 600, color: 'var(--text-light)', textAlign: 'right', fontSize: '1rem' }}>
                  Gesamtnutzwert:
                </td>
                {task.providers.map((p, pIdx) => (
                  <td key={pIdx} style={{ padding: '1rem', textAlign: 'center' }}>
                    {(() => {
                      const totalKey = `total_${pIdx}`;
                      const levelOneAutoTotal = fmt(task.masterSolution.totals[pIdx]);
                      return (
                    <input 
                      className="wisor-input utility-input utility-input-total" 
                      type="text" 
                      placeholder="Total" 
                      disabled={difficultyLevel === 1 || validationStates[totalKey] === 'correct'}
                      value={difficultyLevel === 1 ? levelOneAutoTotal : (inputs[totalKey] || '')}
                      onChange={(e) => handleChange(totalKey, e.target.value)}
                      onFocus={() => handleFieldFocus(totalKey)}
                      style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', borderColor: getStateColor(totalKey), boxShadow: `0 0 10px ${getStateColor(totalKey)}44`, backgroundColor: difficultyLevel === 1 ? 'rgba(255,255,255,0.05)' : undefined }}
                    />
                      );
                    })()}
                    {totalWarnings[`total_${pIdx}`] && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.68rem', lineHeight: 1.35, color: '#fca5a5' }}>
                        {totalWarnings[`total_${pIdx}`]}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Conclusion ──────────────── */}
        <div className="utility-conclusion" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-light)' }}>Welchen Anbieter empfehlen Sie?</label>
          <select 
            className="wisor-input" 
            value={dropdownChoice}
            onChange={e => {
              setDropdownChoice(e.target.value);
              setRecommendationError('');
            }}
            onFocus={() => setRecommendationError('')}
            style={{ width: '100%', maxWidth: '400px', cursor: 'pointer', padding: '0.8rem', fontSize: '1rem', marginBottom: '0.5rem', borderColor: recommendationError ? '#ef4444' : undefined }}
          >
            <option value="">Aussagekräftige Wahl treffen...</option>
            {task.providers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {recommendationError && (
            <div style={{ marginTop: '-0.2rem', marginBottom: '0.35rem', fontSize: '0.82rem', color: '#fca5a5' }}>
              {recommendationError}
            </div>
          )}
          
          <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Kurze Begründung (IHK-Style):</label>
          <textarea
            className="wisor-input utility-justification"
            value={justification}
            onChange={e => {
              setJustification(e.target.value);
              setJustificationError('');
            }}
            onFocus={() => setJustificationError('')}
            placeholder="z.B. Anbieter X hat den höchsten Nutzwert (3.8) und erfüllt insbesondere das wichtige Kriterium Y am besten..."
            style={{ width: '100%', minHeight: '80px', fontSize: '0.9rem', padding: '0.8rem', borderColor: justificationError ? '#ef4444' : undefined }}
          />
          {justificationError && (
            <div style={{ fontSize: '0.82rem', color: '#fca5a5' }}>
              {justificationError}
            </div>
          )}
        </div>

        {/* ── KI Feedback ─────────────── */}
        {aiFeedback && (
          <div className="fade-in" style={{
            marginBottom: '1.5rem',
            padding: '1.2rem',
            borderRadius: '12px',
            background: aiFeedback.isPassed 
                ? (aiFeedback.exact ? 'rgba(34,197,94,0.1)' : 'rgba(234, 179, 8, 0.1)') 
                : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${aiFeedback.isPassed ? (aiFeedback.exact ? '#22c55e' : '#eab308') : '#ef4444'}`
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.6rem', color: aiFeedback.isPassed ? (aiFeedback.exact ? '#22c55e' : '#eab308') : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {aiFeedback.isPassed ? (aiFeedback.exact ? '🎯 Exakt richtig!' : '📝 Akzeptiert mit Hinweis') : '❌ Noch nicht ganz!'}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-light)', lineHeight: 1.5, fontSize: '0.95rem' }}>
              {aiFeedback.examinerFeedback}
            </p>
          </div>
        )}

        {/* ── Action Buttons ──────────── */}
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={validateAll} disabled={isAiLoading} style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff',
            border: 'none',
            padding: '0.85rem 1.8rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            opacity: isAiLoading ? 0.7 : 1
          }}>
            {isAiLoading ? 'KI prüft...' : 'Abgeben & Prüfen'}
          </button>
          
          {difficultyLevel === 3 && aiFeedback && !aiFeedback.isPassed && (
             <button className="btn-secondary" onClick={handleInsertMasterSolution}>
               Musterlösung eintragen
             </button>
          )}

          <button className="btn-secondary" onClick={handleNewTask} style={{ marginLeft: 'auto' }}>
            🔄 Neue Aufgabe
          </button>
        </div>
      </div>
    </div>
  );
}
