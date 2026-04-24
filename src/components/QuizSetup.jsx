import React, { useEffect, useState } from 'react';
import { MULTI_CHOICE_REPEAT_MODES } from '../utils/quizDue';

const QuizSetup = ({
  selectedQuizTopic,
  setSelectedQuizTopic,
  getDueQuizzesByTopic,
  getQuizTopicGroup,
  feynmanModeEnabled,
  setFeynmanModeEnabled,
  quizCountSelection,
  setQuizCountSelection,
  startQuiz,
  setAppMode,
  burgerMenuPortal,
  title = 'Wieviele Fragen?',
  description = 'Wähle deinen Themenblock innerhalb von „Wissen testen“ und dann die Anzahl fälliger Fragen.',
  showTopicSelect = true,
  backMode = 'dashboard',
  showResetProgressButton = false,
  onResetProgress = null,
  multiChoiceRepeatMode = MULTI_CHOICE_REPEAT_MODES.TWICE,
  onMultiChoiceRepeatModeChange = null
}) => {
  const [feynmanInfoOpen, setFeynmanInfoOpen] = useState(false);

  // Auto-open removed: The Feynman info only opens when the user clicks the (i) button.
  // Previously this auto-opened on first visit, which was disruptive.

  const closeFeynmanInfo = () => {
    setFeynmanInfoOpen(false);
    try {
      localStorage.setItem('ap2_feynman_onboarding_seen', 'true');
    } catch {
      // Ignore localStorage failures and continue silently.
    }
  };

  const dueByTopicMap = getDueQuizzesByTopic('all').reduce((acc, q) => {
    const groupedTopic = getQuizTopicGroup(q.topic);
    acc[groupedTopic] = (acc[groupedTopic] || 0) + 1;
    return acc;
  }, {});
  
  const dueByTopicEntries = Object.entries(dueByTopicMap).sort((a, b) => b[1] - a[1]);
  
  const selectedTopicDueCount = selectedQuizTopic === 'all'
    ? getDueQuizzesByTopic('all').length
    : (dueByTopicMap[selectedQuizTopic] || 0);

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      {burgerMenuPortal}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <header>
        <button className="btn-nav" onClick={() => setAppMode(backMode)}>&larr; Menü</button>
      </header>
      <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>{title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{description}</p>

        {showTopicSelect && (
          <div style={{ marginBottom: '1.3rem', textAlign: 'left' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>
              Themenblock
            </label>
            <select
              value={selectedQuizTopic}
              onChange={(e) => setSelectedQuizTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-light)',
                fontSize: '0.92rem'
              }}
            >
              <option value="all">Alle Themen ({getDueQuizzesByTopic('all').length} fällig)</option>
              {dueByTopicEntries.map(([topic, count]) => (
                <option key={topic} value={topic}>{topic} ({count} fällig)</option>
              ))}
            </select>
            {selectedTopicDueCount === 0 && (
              <p style={{ color: 'var(--text-muted)', marginTop: '0.6rem', marginBottom: 0, fontSize: '0.83rem' }}>
                Für diesen Themenblock sind aktuell keine Fragen fällig.
              </p>
            )}
          </div>
        )}

        {typeof onMultiChoiceRepeatModeChange === 'function' && (
          <div style={{ marginBottom: '1.3rem', textAlign: 'left' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>
              Wiederholrate (Multiple Choice)
            </label>
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {[
                { value: MULTI_CHOICE_REPEAT_MODES.ONCE, label: '1x richtig: Frage faellt raus' },
                { value: MULTI_CHOICE_REPEAT_MODES.TWICE, label: '2x richtig: einmal wiederholen' },
                { value: MULTI_CHOICE_REPEAT_MODES.SPACED, label: 'Space Repetition (zeitversetzt)' }
              ].map((option) => (
                <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-light)', fontSize: '0.88rem', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.03)' }}>
                  <input
                    type="radio"
                    name="quiz-setup-repeat-mode"
                    checked={multiChoiceRepeatMode === option.value}
                    onChange={() => onMultiChoiceRepeatModeChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', marginBottom: '1.3rem', textAlign: 'left', color: 'var(--text-light)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={feynmanModeEnabled}
            onChange={(e) => setFeynmanModeEnabled(e.target.checked)}
            style={{ marginTop: '0.2rem' }}
          />
          <span style={{ fontSize: '0.9rem', lineHeight: '1.4', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            Feynman-Methode: Antworten nach Erfolg selbst erklären (Empfohlen für tieferes Verständnis)
            <button
              type="button"
              className="feynman-info-btn"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setFeynmanInfoOpen(true);
              }}
              aria-label="Feynman-Methode erklären"
              title="Feynman-Methode erklären"
            >
              i
            </button>
          </span>
        </label>

        {feynmanInfoOpen && (
          <div className="feynman-info-overlay" role="dialog" aria-modal="true">
            <div className="feynman-info-modal">
              <h3>Was ist die Feynman-Methode?</h3>
              <p>
                Die Feynman-Methode: Erkläre ein Konzept so einfach, als würdest du es einem Kind beibringen.
                So deckst du eigene Wissenslücken sofort auf.
              </p>
              <button className="btn-primary" onClick={closeFeynmanInfo}>Verstanden</button>
            </div>
          </div>
        )}

        <div className="quiz-select-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.8rem' }}>
          {[5, 10, 15, 20].map(count => (
            <button
              key={count}
              className={`btn-secondary ${quizCountSelection === count ? 'active' : ''}`}
              onClick={() => setQuizCountSelection(count)}
              style={{
                borderRadius: '12px',
                padding: '0.9rem 0',
                border: quizCountSelection === count ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
                background: quizCountSelection === count ? 'rgba(99,102,241,0.15)' : 'var(--glass-bg)',
                color: quizCountSelection === count ? 'var(--primary-light)' : 'var(--text-muted)',
                fontWeight: quizCountSelection === count ? '800' : '500',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {count}
            </button>
          ))}
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem', fontWeight: 700 }}
          onClick={startQuiz}
          disabled={selectedTopicDueCount === 0}
        >
          Los geht's &rarr;
        </button>
        {showResetProgressButton && typeof onResetProgress === 'function' && (
          <button
            className="btn-secondary"
            style={{
              width: '100%',
              marginTop: '0.7rem',
              padding: '1rem',
              fontSize: '0.98rem',
              fontWeight: 700,
              borderColor: 'rgba(239,68,68,0.45)',
              background: 'rgba(239,68,68,0.12)',
              color: '#fecaca'
            }}
            onClick={onResetProgress}
          >
            Lernstand zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(QuizSetup);
