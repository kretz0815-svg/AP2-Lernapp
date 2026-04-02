import React, { useEffect, useMemo, useState } from 'react';
import { evaluateSwotAnalysis, generateSwotScenario } from '../geminiClient';

const LETTER_CONFIG = [
  { letter: 'S', title: 'Strengths', requiredPerspective: 'Intern', accent: '#22c55e' },
  { letter: 'W', title: 'Weaknesses', requiredPerspective: 'Intern', accent: '#f97316' },
  { letter: 'O', title: 'Opportunities', requiredPerspective: 'Extern', accent: '#38bdf8' },
  { letter: 'T', title: 'Threats', requiredPerspective: 'Extern', accent: '#ef4444' }
];

const createPointEntry = () => ({
  argument: '',
  justification: ''
});

const emptyEntry = (pointCount = 1) => ({
  term: '',
  perspective: '__unset__',
  points: Array.from({ length: pointCount }, () => createPointEntry())
});

const buildInitialForm = (pointCount = 1) => LETTER_CONFIG.reduce((acc, item) => {
  acc[item.letter] = emptyEntry(pointCount);
  return acc;
}, {});

const MODE_CONFIG = [
  { key: 'learning', label: 'Lernmodus', desc: 'Sofort-Feedback, mit Hilfen', helper: 'Sofort-Hinweis bei Perspektive.' },
  { key: 'practice', label: 'Übungsmodus', desc: 'Bewertung nach Abgabe, Tipps', helper: 'Bewertung nach Abgabe.' },
  { key: 'exam', label: 'Prüfungsmodus', desc: 'Keine Hilfen, prüfungsnah', helper: 'Keine Sofort-Hinweise.' }
];

export default function SWOTAnalyseSimulator({ onBack, onLearningEvent }) {
  const [scenario, setScenario] = useState({ branche: '', szenario_text: '' });
  const [mode, setMode] = useState('learning');
  const [entriesPerQuadrant, setEntriesPerQuadrant] = useState(1);
  const [form, setForm] = useState(() => buildInitialForm(1));
  const [feedbackByLetter, setFeedbackByLetter] = useState({});
  const [errorsByLetter, setErrorsByLetter] = useState({});
  const [isScenarioLoading, setIsScenarioLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [scoreSummary, setScoreSummary] = useState(null);

  const panelStyle = {
    width: '100%',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '24px',
    padding: '1rem',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
    position: 'relative'
  };

  const allValidated = useMemo(
    () => LETTER_CONFIG.every((item) => Boolean(feedbackByLetter[item.letter])),
    [feedbackByLetter]
  );

  const resetInputState = (pointCount = entriesPerQuadrant) => {
    setForm(buildInitialForm(pointCount));
    setErrorsByLetter({});
    setFeedbackByLetter({});
    setScoreSummary(null);
    setGlobalError('');
  };

  useEffect(() => {
    let isMounted = true;

    const loadScenario = async () => {
      setIsScenarioLoading(true);
      setGlobalError('');
      try {
        const nextScenario = await generateSwotScenario();
        if (!isMounted) return;
        setScenario({
          branche: String(nextScenario?.branche || '').trim(),
          szenario_text: String(nextScenario?.szenario_text || '').trim()
        });
        setForm(buildInitialForm(entriesPerQuadrant));
        setErrorsByLetter({});
        setFeedbackByLetter({});
        setScoreSummary(null);
        setGlobalError('');
      } catch {
        if (!isMounted) return;
        setGlobalError('Szenario konnte nicht geladen werden. Bitte erneut versuchen.');
      } finally {
        if (isMounted) setIsScenarioLoading(false);
      }
    };

    loadScenario();

    return () => {
      isMounted = false;
    };
  }, [entriesPerQuadrant]);

  const updateEntry = (letter, field, value) => {
    setForm((prev) => ({
      ...prev,
      [letter]: {
        ...prev[letter],
        [field]: value
      }
    }));
  };

  const updatePointEntry = (letter, pointIdx, field, value) => {
    setForm((prev) => {
      const nextPoints = [...(prev[letter]?.points || [])];
      const safePoint = nextPoints[pointIdx] || createPointEntry();
      nextPoints[pointIdx] = {
        ...safePoint,
        [field]: value
      };

      return {
        ...prev,
        [letter]: {
          ...prev[letter],
          points: nextPoints
        }
      };
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    LETTER_CONFIG.forEach(({ letter }) => {
      const entry = form[letter] || emptyEntry();
      if (!entry.term.trim()) nextErrors[`${letter}_term`] = 'Bitte Begriff eintragen.';
      if (!['Intern', 'Extern'].includes(entry.perspective)) nextErrors[`${letter}_perspective`] = 'Bitte Perspektive auswählen.';
      const points = Array.isArray(entry.points) ? entry.points : [];
      for (let idx = 0; idx < entriesPerQuadrant; idx += 1) {
        const point = points[idx] || createPointEntry();
        if (String(point.argument || '').trim().length < 12) {
          nextErrors[`${letter}_argument_${idx}`] = 'Argument bitte konkreter formulieren (mind. 12 Zeichen).';
        }
        if (String(point.justification || '').trim().length < 18) {
          nextErrors[`${letter}_justification_${idx}`] = 'Begründung bitte nachvollziehbar ausführen (mind. 18 Zeichen).';
        }
      }
    });

    setErrorsByLetter(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setGlobalError('Bitte prüfe die markierten Felder vor dem Abgeben.');
      return;
    }

    setGlobalError('');
    setIsSubmitting(true);

    try {
      const swotPayload = LETTER_CONFIG.reduce((acc, cfg) => {
        const entry = form[cfg.letter] || emptyEntry(entriesPerQuadrant);
        const points = Array.isArray(entry.points) ? entry.points : [];
        const argument = points
          .slice(0, entriesPerQuadrant)
          .map((point, idx) => `${idx + 1}) ${String(point?.argument || '').trim()}`)
          .join(' | ');
        const justification = points
          .slice(0, entriesPerQuadrant)
          .map((point, idx) => `${idx + 1}) ${String(point?.justification || '').trim()}`)
          .join(' | ');

        acc[cfg.letter] = {
          term: String(entry.term || '').trim(),
          perspective: String(entry.perspective || '').trim(),
          argument,
          justification
        };
        return acc;
      }, {});

      const response = await evaluateSwotAnalysis({
        scenario,
        swotEntries: swotPayload
      });

      const list = Array.isArray(response?.swot_feedback) ? response.swot_feedback : [];
      const mapped = list.reduce((acc, item) => {
        const letter = String(item?.letter || '').toUpperCase();
        if (!LETTER_CONFIG.some((entry) => entry.letter === letter)) return acc;
        acc[letter] = {
          theoryCorrect: Boolean(item?.theoryCorrect),
          practiceCorrect: Boolean(item?.practiceCorrect),
          theoryFeedback: String(item?.theoryFeedback || '').trim() || 'Kein Theorie-Feedback verfügbar.',
          practiceFeedback: String(item?.practiceFeedback || '').trim() || 'Kein Praxis-Feedback verfügbar.',
          profiTipp: String(item?.profiTipp || '').trim() || 'Kein Profi-Tipp verfügbar.'
        };
        return acc;
      }, {});

      setFeedbackByLetter(mapped);

      const allCorrect = LETTER_CONFIG.every((item) => {
        const current = mapped[item.letter];
        return current?.theoryCorrect && current?.practiceCorrect;
      });

      const theoryPassed = LETTER_CONFIG.filter((item) => mapped[item.letter]?.theoryCorrect).length;
      const practicePassed = LETTER_CONFIG.filter((item) => mapped[item.letter]?.practiceCorrect).length;
      const totalChecks = LETTER_CONFIG.length * 2;
      const passedChecks = theoryPassed + practicePassed;
      setScoreSummary({
        theoryPassed,
        practicePassed,
        passedChecks,
        totalChecks,
        percent: Math.round((passedChecks / totalChecks) * 100)
      });

      if (onLearningEvent) {
        onLearningEvent({
          mode: 'swot_analyse',
          questionId: 'swot_analyse',
          correct: allCorrect,
          topic: 'SWOT-Analyse'
        });
      }
    } catch {
      setGlobalError('Die KI-Bewertung konnte nicht abgeschlossen werden. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewScenario = async () => {
    setIsScenarioLoading(true);
    setGlobalError('');
    setFeedbackByLetter({});
    try {
      const nextScenario = await generateSwotScenario();
      setScenario({
        branche: String(nextScenario?.branche || '').trim(),
        szenario_text: String(nextScenario?.szenario_text || '').trim()
      });
      resetInputState(entriesPerQuadrant);
    } catch {
      setGlobalError('Neues Szenario konnte nicht geladen werden.');
    } finally {
      setIsScenarioLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ zIndex: 10, maxWidth: '1120px' }}>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="utility-back-row" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '0.6rem', padding: '0.5rem 0.6rem', marginBottom: '0.5rem', position: 'relative', zIndex: 30, flexWrap: 'wrap' }}>
        <button type="button" className="btn-nav" style={{ minHeight: '42px', zIndex: 30, padding: '0.4rem 1rem', position: 'relative' }} onClick={onBack}>
          ← Zurück
        </button>
        <button type="button" className="btn-secondary" style={{ minHeight: '42px' }} onClick={handleNewScenario} disabled={isScenarioLoading || isSubmitting}>
          Neues Szenario
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
          SWOT-Analyse
        </h1>
        <p className="subtitle" style={{ marginBottom: '0.8rem' }}>
          Interaktiver IHK-Simulator mit KI-Feedback
        </p>
      </header>

      <div className="utility-level-selector" style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.8rem', marginTop: '0.3rem', flexWrap: 'wrap', width: '100%' }}>
        {MODE_CONFIG.map((cfg) => (
          <button
            key={cfg.key}
            type="button"
            onClick={() => {
              setMode(cfg.key);
              setFeedbackByLetter({});
              setScoreSummary(null);
            }}
            className="utility-level-button"
            style={{
              flex: '1',
              minWidth: '130px',
              maxWidth: '220px',
              padding: '0.6rem 0.5rem',
              background: mode === cfg.key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${mode === cfg.key ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              color: mode === cfg.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{cfg.label}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{cfg.desc}</div>
          </button>
        ))}
      </div>

      <section style={{ ...panelStyle, marginBottom: '1rem', padding: '0.8rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'left' }}>
            {MODE_CONFIG.find((cfg) => cfg.key === mode)?.helper}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Einträge je Quadrant</span>
            <select
              className="wisor-input"
              style={{ minWidth: '80px', padding: '0.45rem 0.7rem' }}
              value={String(entriesPerQuadrant)}
              onChange={(e) => {
                const nextCount = Number(e.target.value) === 2 ? 2 : 1;
                setEntriesPerQuadrant(nextCount);
                resetInputState(nextCount);
              }}
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle, marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Szenario</h3>
        {isScenarioLoading ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Szenario wird generiert...</p>
        ) : (
          <>
            <div className="chip" style={{ marginBottom: '0.6rem', display: 'inline-flex' }}>
              Branche: {scenario.branche || 'Allgemein'}
            </div>
            <p style={{ margin: 0, color: 'var(--text-light)', lineHeight: 1.5 }}>
              {scenario.szenario_text || 'Kein Szenario verfügbar.'}
            </p>
          </>
        )}
      </section>

      <section style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem', alignItems: 'stretch', gridAutoRows: '1fr' }}>
        {LETTER_CONFIG.map((item) => {
          const entry = form[item.letter] || emptyEntry();
          const feedback = feedbackByLetter[item.letter];

          return (
            <article key={item.letter} style={{ ...panelStyle, padding: '1rem', borderColor: `${item.accent}66`, height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h3 style={{ margin: 0, color: item.accent }}>{item.letter} - {item.title}</h3>
              </div>

              <label style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-light)' }}>Begriff</label>
              <input
                className="wisor-input"
                value={entry.term}
                onChange={(e) => updateEntry(item.letter, 'term', e.target.value)}
                placeholder="Englischer SWOT-Begriff (z. B. Strength)"
              />
              {errorsByLetter[`${item.letter}_term`] && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{errorsByLetter[`${item.letter}_term`]}</p>}

              <label style={{ display: 'block', marginBottom: '0.35rem', marginTop: '0.5rem', color: 'var(--text-light)' }}>Perspektive</label>
              <select
                className="wisor-input"
                value={entry.perspective}
                onChange={(e) => updateEntry(item.letter, 'perspective', e.target.value)}
              >
                <option value="__unset__">-</option>
                <option value="Intern">Intern</option>
                <option value="Extern">Extern</option>
              </select>
              {mode === 'learning' && entry.perspective !== '__unset__' && (
                <p style={{ marginTop: '0.35rem', color: entry.perspective === item.requiredPerspective ? '#4ade80' : '#f87171', fontSize: '0.82rem' }}>
                  {entry.perspective === item.requiredPerspective
                    ? 'Richtig zugeordnet.'
                    : `Noch nicht richtig. Denke an die Perspektive von ${item.letter}.`}
                </p>
              )}
              {errorsByLetter[`${item.letter}_perspective`] && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{errorsByLetter[`${item.letter}_perspective`]}</p>}

              {(entry.points || []).slice(0, entriesPerQuadrant).map((point, idx) => (
                <div key={`${item.letter}_point_${idx}`}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', marginTop: '0.5rem', color: 'var(--text-light)' }}>
                    Mein Argument aus dem Text {entriesPerQuadrant > 1 ? `(${idx + 1})` : ''}
                  </label>
                  <textarea
                    className="wisor-input"
                    rows={3}
                    value={typeof point.argument === 'string' ? point.argument : ''}
                    onChange={(e) => updatePointEntry(item.letter, idx, 'argument', e.target.value)}
                    placeholder={mode === 'exam' ? '' : "z. B. 'Der Text nennt: hochqualifizierte Fachkräfte.'"}
                  />
                  {errorsByLetter[`${item.letter}_argument_${idx}`] && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{errorsByLetter[`${item.letter}_argument_${idx}`]}</p>}

                  <label style={{ display: 'block', marginBottom: '0.35rem', marginTop: '0.5rem', color: 'var(--text-light)' }}>
                    Meine Begründung {entriesPerQuadrant > 1 ? `(${idx + 1})` : ''}
                  </label>
                  <textarea
                    className="wisor-input"
                    rows={3}
                    value={typeof point.justification === 'string' ? point.justification : ''}
                    onChange={(e) => updatePointEntry(item.letter, idx, 'justification', e.target.value)}
                    placeholder={mode === 'exam' ? '' : "z. B. 'Das spricht für eine interne Stärke, weil es die Leistungsfähigkeit des Unternehmens zeigt.'"}
                  />
                  {errorsByLetter[`${item.letter}_justification_${idx}`] && <p style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{errorsByLetter[`${item.letter}_justification_${idx}`]}</p>}
                </div>
              ))}

              {feedback && (
                <div style={{ marginTop: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '0.8rem' }}>
                  <p style={{ margin: '0 0 0.4rem', color: feedback.theoryCorrect ? '#4ade80' : '#f87171' }}>
                    {feedback.theoryCorrect ? '✅' : '❌'} Theorie-Check: {feedback.theoryFeedback}
                  </p>
                  <p style={{ margin: '0 0 0.5rem', color: feedback.practiceCorrect ? '#4ade80' : '#f87171' }}>
                    {feedback.practiceCorrect ? '✅' : '❌'} Praxis-Check: {feedback.practiceFeedback}
                  </p>
                  <div style={{
                    background: 'rgba(250, 204, 21, 0.12)',
                    border: '1px solid rgba(250, 204, 21, 0.35)',
                    borderRadius: '10px',
                    padding: '0.55rem 0.7rem',
                    color: '#fde68a'
                  }}>
                    💡 Profi-Tipp: {feedback.profiTipp}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {globalError && (
        <div style={{ ...panelStyle, marginTop: '0.9rem', borderColor: 'rgba(248,113,113,0.4)' }}>
          <p style={{ margin: 0, color: '#fca5a5' }}>{globalError}</p>
        </div>
      )}

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <button className="btn-primary" onClick={handleSubmit} disabled={isScenarioLoading || isSubmitting}>
          {isSubmitting ? 'Prüfe SWOT-Analyse...' : 'Abgeben & Prüfen'}
        </button>
      </div>

      {allValidated && (
        <div style={{ ...panelStyle, marginTop: '0.9rem' }}>
          <p style={{ margin: 0, color: 'var(--text-light)' }}>
            Bewertung abgeschlossen. Nutze die Profi-Tipps, um deine nächste SWOT-Analyse noch präziser zu argumentieren.
          </p>
        </div>
      )}

      {scoreSummary && (
        <div style={{ ...panelStyle, marginTop: '0.9rem', borderColor: 'rgba(34,197,94,0.45)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#4ade80' }}>Ergebnis</h3>
          <p style={{ margin: '0 0 0.2rem', color: 'var(--text-light)' }}>
            Gesamt: {scoreSummary.passedChecks}/{scoreSummary.totalChecks} Checks bestanden ({scoreSummary.percent}%)
          </p>
          <p style={{ margin: '0 0 0.2rem', color: 'var(--text-muted)' }}>
            Theorie: {scoreSummary.theoryPassed}/4
          </p>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Praxis: {scoreSummary.practicePassed}/4
          </p>
        </div>
      )}
    </div>
  );
}
