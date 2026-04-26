import React, { useState, useEffect, useRef } from 'react';
import Confetti from './Confetti';
import VideoPanel from './VideoPanel';
import GeminiPanel from './GeminiPanel';
import FloatingPortal from './FloatingPortal';
import { formatLatex } from '../utils/formatting';
import { createPortal } from 'react-dom';

const QuizSession = ({
  quizDuePool = [],
  initialSessionPool = [], // renamed from allQuizzes to match App.jsx
  onComplete,
  onCancel,
  feynmanModeEnabled,
  onLearningEvent,
  pomodoroPortal,
  burgerMenuPortal,
  handleToggleVideos,
  wisorVideoOpen,
  setWisorVideoOpen,
  wisorVideoLoading,
  wisorVideos,
  wisorVideoError,
  selectedWisorVideo,
  setSelectedWisorVideo,
  geminiVisible,
  setGeminiVisible,
  geminiQuery,
  setGeminiQuery,
  handleGeminiAsk,
  geminiLoading,
  geminiResponse,
  showConfetti,
  triggerConfetti,
  lastQuizCorrect,
  setAppMode,
  handleFeynmanCheck,
  onQuizAnswer,
  onFinish,
  learningMode = 'quiz',
  setupMode = 'quiz_setup',
  floatingAppMode = null,
  dbRemainingCount = null
}) => {
  const safeQuizDuePool = Array.isArray(quizDuePool) ? quizDuePool : [];

  const sanitizeQuestion = (question, index) => {
    const fallbackId = `fallback_${learningMode}_${index}`;
    const rawOptions = Array.isArray(question?.answerOptions) ? question.answerOptions : [];
    const cleanOptions = rawOptions
      .filter((opt) => opt && typeof opt === 'object')
      .map((opt) => ({
        text: String(opt.text || '').trim(),
        isCorrect: !!opt.isCorrect,
        rationale: String(opt.rationale || '').trim()
      }))
      .filter((opt) => opt.text.length > 0);

    return {
      ...question,
      id: question?.id || fallbackId,
      question: String(question?.question || 'Fragetext fehlt.'),
      answerOptions: cleanOptions,
      topic: String(question?.topic || '')
    };
  };

  const [internalQuizzes] = useState(() => (Array.isArray(initialSessionPool)
    ? initialSessionPool.map((q, index) => sanitizeQuestion(q, index))
    : []));
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  // Umbau: Mehrfachauswahl unterstützen
  const [selectedAnswers, setSelectedAnswers] = useState([]); // Array von Indizes
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [feynmanInput, setFeynmanInput] = useState('');
  const [feynmanLoading, setFeynmanLoading] = useState(false);
  const [feynmanFeedback, setFeynmanFeedback] = useState('');
  const [feynmanFeedbackLevel, setFeynmanFeedbackLevel] = useState(null);
  const [quizExplanationRevealed, setQuizExplanationRevealed] = useState(false);
  const [quizRevealConfirmVisible, setQuizRevealConfirmVisible] = useState(false);
  const [answerHistory, setAnswerHistory] = useState([]);
  const shuffledAnswersRef = useRef({});
  const autoAdvanceLastRef = useRef(false);
  const recordedAnswerKeysRef = useRef(new Set());
  const quizScoreRef = useRef({ correct: 0, total: 0 });
  const answerHistoryRef = useRef([]);

  const q = internalQuizzes[currentQuizIndex] || null;

  if (q && !shuffledAnswersRef.current[q.id]) {
    const opts = (q.answerOptions || []).map((opt, originalIndex) => ({ ...opt, originalIndex }));
    shuffledAnswersRef.current[q.id] = opts.sort(() => Math.random() - 0.5);
  }

  const currentAnswers = q && Array.isArray(shuffledAnswersRef.current[q.id]) ? shuffledAnswersRef.current[q.id] : [];
  const correctIndices = currentAnswers.map((a, i) => a.isCorrect ? i : null).filter(i => i !== null);
  const isMultipleChoice = correctIndices.length > 1;
  const selectedOptions = selectedAnswers.map(idx => currentAnswers[idx]);
  const selectedAnswerText = selectedOptions.map(opt => opt?.text).filter(Boolean).join(', ');
  const correctAnswerText = correctIndices.map(i => currentAnswers[i]?.text).filter(Boolean).join(', ');
  const allSelected = isMultipleChoice ? (selectedAnswers.length === correctIndices.length) : (selectedAnswers.length === 1);
  const isSelectionCorrect = allSelected &&
    correctIndices.length === selectedAnswers.length &&
    correctIndices.every(idx => selectedAnswers.includes(idx));

  const shouldGateExplanation = allSelected && feynmanModeEnabled && isSelectionCorrect && !quizExplanationRevealed;
  const requireFeynmanCompletion = allSelected && feynmanModeEnabled && isSelectionCorrect;
  const canProceedToNextQuizQuestion = !requireFeynmanCompletion || quizExplanationRevealed || !!feynmanFeedback;
  const remainingInSession = Math.max(internalQuizzes.length - currentQuizIndex, 0);
  const remainingOpen = Number.isFinite(dbRemainingCount) ? Math.max(dbRemainingCount, 0) : remainingInSession;
  const completionPercent = internalQuizzes.length > 0
    ? Math.round((Math.min(currentQuizIndex, internalQuizzes.length) / internalQuizzes.length) * 100)
    : 0;

  const commitCurrentAnswerIfNeeded = () => {
    if (!q || !allSelected) return;

    const answerKey = `${currentQuizIndex}:${q.id}`;
    if (recordedAnswerKeysRef.current.has(answerKey)) return;
    recordedAnswerKeysRef.current.add(answerKey);

    if (onLearningEvent) {
      try {
        onLearningEvent({
          mode: learningMode,
          questionId: q.id,
          questionText: q.question,
          correct: isSelectionCorrect,
          userAnswer: selectedAnswers.map(i => currentAnswers[i]?.text).join(', '),
          expectedAnswer: correctIndices.map(i => currentAnswers[i]?.text).join(', '),
          topic: q.topic || ''
        });
      } catch (err) {
        console.error('onLearningEvent failed in QuizSession:', err);
      }
    }

    if (isSelectionCorrect && currentQuizIndex === internalQuizzes.length - 1) {
      if (triggerConfetti) triggerConfetti();
    }

    if (onQuizAnswer) {
      try {
        onQuizAnswer(q, isSelectionCorrect);
      } catch (err) {
        console.error('onQuizAnswer failed in QuizSession:', err);
      }
    }

    const entry = {
      id: q.id,
      question: q.question,
      topic: q.topic || '',
      isCorrect: isSelectionCorrect,
      selectedAnswerText,
      correctAnswerText
    };

    const nextHistory = [...answerHistoryRef.current, entry];
    answerHistoryRef.current = nextHistory;
    setAnswerHistory(nextHistory);

    const nextScore = {
      correct: quizScoreRef.current.correct + (isSelectionCorrect ? 1 : 0),
      total: quizScoreRef.current.total + 1
    };
    quizScoreRef.current = nextScore;
    setQuizScore(nextScore);
  };

  const nextQuizQuestion = () => {
    commitCurrentAnswerIfNeeded();
    const isLastQuestion = currentQuizIndex >= internalQuizzes.length - 1;

    if (isLastQuestion && typeof onFinish === 'function') {
      const safeHistory = Array.isArray(answerHistoryRef.current) ? answerHistoryRef.current : [];
      const finalScore = quizScoreRef.current || { correct: 0, total: 0 };
      onFinish({
        mode: learningMode,
        totalQuestions: internalQuizzes.length,
        answeredQuestions: finalScore.total,
        correct: finalScore.correct,
        incorrect: Math.max(finalScore.total - finalScore.correct, 0),
        incorrectQuestions: safeHistory.filter((entry) => !entry.isCorrect),
        completedAt: new Date().toISOString()
      });
      return;
    }

    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);
    setFeynmanInput('');
    setQuizExplanationRevealed(false);
    setSelectedAnswers([]);
    autoAdvanceLastRef.current = false;
    setCurrentQuizIndex(prev => prev + 1);
  };

  // Auswertung nach vollständiger Auswahl
  useEffect(() => {
    commitCurrentAnswerIfNeeded();
    // eslint-disable-next-line
  }, [allSelected]);

  useEffect(() => {
    const isLastQuestion = currentQuizIndex >= internalQuizzes.length - 1;
    if (currentQuizIndex >= internalQuizzes.length) return;
    if (!isLastQuestion) {
      autoAdvanceLastRef.current = false;
      return;
    }
    if (!allSelected || !canProceedToNextQuizQuestion || feynmanLoading) return;
    if (autoAdvanceLastRef.current) return;

    autoAdvanceLastRef.current = true;
    const timer = setTimeout(() => {
      nextQuizQuestion();
    }, 260);

    return () => clearTimeout(timer);
  }, [allSelected, canProceedToNextQuizQuestion, feynmanLoading, currentQuizIndex, internalQuizzes.length]);

  useEffect(() => {
    quizScoreRef.current = quizScore;
  }, [quizScore]);

  useEffect(() => {
    answerHistoryRef.current = answerHistory;
  }, [answerHistory]);

  useEffect(() => {
    if (typeof setWisorVideoOpen === 'function') setWisorVideoOpen(false);
    if (typeof setSelectedWisorVideo === 'function') setSelectedWisorVideo(null);
    if (typeof setGeminiVisible === 'function') setGeminiVisible(false);
    if (typeof setGeminiQuery === 'function') setGeminiQuery('');
  }, [currentQuizIndex, setWisorVideoOpen, setSelectedWisorVideo, setGeminiVisible, setGeminiQuery]);

  if (!internalQuizzes || internalQuizzes.length === 0) {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          {safeQuizDuePool.length === 0 && <Confetti />}
          <h2 style={{ color: 'var(--text-light)', marginBottom: '0.8rem', fontSize: '1.8rem' }}>Keine fälligen Fragen</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem' }}>Für den gewählten Themenblock ist gerade nichts offen.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setAppMode(setupMode)}>Themenwahl</button>
            <button className="btn-primary" onClick={() => (onCancel ? onCancel() : setAppMode('dashboard'))}>Zurück zum Menü</button>
          </div>
        </div>
      </div>
    );
  }

  if (currentQuizIndex >= internalQuizzes.length) {
    const effectiveScore = {
      correct: Math.max(quizScore.correct, quizScoreRef.current?.correct || 0),
      total: Math.max(quizScore.total, quizScoreRef.current?.total || 0)
    };

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
        {(showConfetti || ((effectiveScore.correct === effectiveScore.total && effectiveScore.total > 0) || (safeQuizDuePool.length === 0 && lastQuizCorrect))) && <Confetti />}
          <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Quiz Beendet!</h2>
          <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Ergebnis: {effectiveScore.correct} / {effectiveScore.total}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => (onCancel ? onCancel() : setAppMode('dashboard'))}>Zurück zum Menü</button>
            <button className="btn-primary" onClick={() => onComplete && onComplete()}>Nochmal spielen</button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null; // Safety check

  const handleQuizAnswer = (idx) => {
    if (allSelected) return; // Nach Auswertung keine weitere Auswahl
    // Toggle Auswahl
    setSelectedAnswers(prev => {
      if (prev.includes(idx)) {
        // Deselektieren
        return prev.filter(i => i !== idx);
      } else {
        // Hinzufügen (maximal so viele wie richtige Antworten)
        if (isMultipleChoice && prev.length < correctIndices.length) {
          return [...prev, idx];
        } else if (!isMultipleChoice && prev.length === 0) {
          return [idx];
        }
        return prev;
      }
    });
  };

  const handleCancelWithConfirm = () => {
    const hasProgress =
      quizScore.total > 0 ||
      currentQuizIndex > 0 ||
      answerHistory.length > 0 ||
      selectedAnswers.length > 0 ||
      !!feynmanInput.trim();
    if (!hasProgress) {
      if (onCancel) onCancel();
      else setAppMode('dashboard');
      return;
    }

    const shouldAbort = window.confirm('Möchtest du wirklich abbrechen? Bereits beantwortete Fragen wurden gespeichert.');
    if (!shouldAbort) return;

    if (onCancel) onCancel();
    else setAppMode('dashboard');
  };

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      {pomodoroPortal}
      {burgerMenuPortal}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="btn-nav" onClick={handleCancelWithConfirm}>&larr; Menü</button>
          <p className="subtitle">Frage {Math.min(currentQuizIndex + 1, internalQuizzes.length)} / {internalQuizzes.length} · {remainingOpen} offen</p>
          <div className="score-badge">Score: {quizScore.correct}</div>
        </div>
        <div className="progress-container" style={{ marginTop: '0.75rem', maxWidth: '100%' }}>
          <div className="progress-bar" style={{ width: `${completionPercent}%` }} />
        </div>
      </header>

      <div className="quiz-container">
        <div style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary fade-in ${wisorVideoLoading ? 'loading' : ''}`}
            onClick={() => handleToggleVideos && handleToggleVideos(q)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: wisorVideoOpen ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            <span>{wisorVideoOpen ? '🙈' : '📺'}</span>
            {wisorVideoOpen ? 'Videos ausblenden' : 'Lernvideos ansehen'}
          </button>

          <button
            className="btn-secondary fade-in"
            onClick={() => setGeminiVisible(!geminiVisible)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: geminiVisible ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            <span>✨</span>
            {geminiVisible ? 'KI Assistent schließen' : 'KI um Hilfe bitten'}
          </button>
        </div>

        <VideoPanel
          isOpen={wisorVideoOpen}
          isLoading={wisorVideoLoading}
          videos={wisorVideos}
          error={wisorVideoError}
          selectedVideo={selectedWisorVideo}
          onSelectVideo={setSelectedWisorVideo}
          onCloseVideo={() => setSelectedWisorVideo(null)}
        />

        <GeminiPanel
          isOpen={geminiVisible}
          query={geminiQuery}
          onQueryChange={setGeminiQuery}
          onAsk={() => handleGeminiAsk && handleGeminiAsk(q, {
            isCorrect: allSelected ? isSelectionCorrect : null,
            selectedAnswerText,
            correctAnswerText,
          })}
          isLoading={geminiLoading}
          response={geminiResponse}
        />

        <div className="quiz-question">
          {formatLatex(q.question || '')}
        </div>
        {currentAnswers.length === 0 && (
          <div className="quiz-correct-answer-hint fade-in" role="status" aria-live="polite">
            <strong>Hinweis:</strong> Diese Frage ist unvollständig (keine Antwortoptionen) und wurde übersprungen.
          </div>
        )}
        <div className="quiz-options">
          {currentAnswers.map((opt, idx) => {
            let btnClass = "quiz-btn";
            let verdictIcon = '';
            // Nach Auswertung: Markierung
            if (allSelected) {
              if (opt.isCorrect && selectedAnswers.includes(idx)) {
                btnClass += " correct";
                verdictIcon = ' ✅';
              } else if (!opt.isCorrect && selectedAnswers.includes(idx)) {
                btnClass += " wrong";
                verdictIcon = ' ❌';
              } else if (opt.isCorrect) {
                btnClass += " correct-unselected";
                verdictIcon = ' ✅';
              }
            } else if (selectedAnswers.includes(idx)) {
              btnClass += " selected";
            }
            return (
              <button
                key={(opt?.text || 'option') + idx}
                className={btnClass}
                onClick={() => handleQuizAnswer(idx)}
                disabled={allSelected}
              >
                {formatLatex(opt?.text || 'Option fehlt')}{verdictIcon}
              </button>
            )
          })}
        </div>

        {currentAnswers.length === 0 && (
          <button
            className="btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={nextQuizQuestion}
          >
            {currentQuizIndex >= internalQuizzes.length - 1 ? 'Ergebnis anzeigen' : 'Nächste Frage →'}
          </button>
        )}

        {allSelected && !isSelectionCorrect && (
          <div className="quiz-correct-answer-hint fade-in" role="status" aria-live="polite">
            <strong>Richtig wäre gewesen:</strong> {formatLatex(correctAnswerText || 'Keine Musterlösung hinterlegt.')}
          </div>
        )}

        {allSelected && (
          <div className="quiz-rationale fade-in">
            {!shouldGateExplanation ? (
              <p><strong>Erklärung:</strong> {formatLatex(selectedOptions.map(opt => opt.rationale).filter(Boolean).join(' | ') || 'Keine Erklärung vorhanden.')}</p>
            ) : (
              <div style={{ marginBottom: '0.4rem', textAlign: 'left', border: '1px dashed var(--glass-border)', borderRadius: '10px', padding: '0.85rem', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  Erklärung ist ausgeblendet, damit du zuerst selbst denkst.
                </p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => setQuizRevealConfirmVisible(true)}
                >
                  Erklärung aufklappen
                </button>
              </div>
            )}

            {feynmanModeEnabled && isSelectionCorrect && (
              <div style={{ marginTop: '1rem', textAlign: 'left', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '0.55rem', fontWeight: 600 }}>
                  Feynman-Check
                </label>
                <textarea
                  className="wisor-input"
                  placeholder="Erkläre in deinen eigenen Worten, warum diese Antwort richtig ist..."
                  value={feynmanInput}
                  onChange={(e) => setFeynmanInput(e.target.value)}
                  rows={4}
                  style={{ width: '100%', resize: 'vertical', marginBottom: '0.75rem' }}
                />
                <button
                  className="btn-secondary"
                  onClick={async () => {
                      setFeynmanLoading(true);
                      await handleFeynmanCheck(feynmanInput, q, (res, level) => {
                        setFeynmanFeedback(res);
                        setFeynmanFeedbackLevel(level);
                        setFeynmanLoading(false);
                      });
                  }}
                  disabled={feynmanLoading || !feynmanInput.trim()}
                >
                  {feynmanLoading ? 'Überprüfung läuft…' : 'Erklärung überprüfen'}
                </button>

                {feynmanFeedback && (
                  <div
                    style={{
                      marginTop: '0.8rem',
                      borderRadius: '10px',
                      padding: '0.8rem',
                      border: `1px solid ${feynmanFeedbackLevel === 'good' ? 'rgba(34,197,94,0.45)' : 'rgba(245,158,11,0.45)'}`,
                      background: feynmanFeedbackLevel === 'good' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      color: 'var(--text-light)'
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '0.35rem', color: feynmanFeedbackLevel === 'good' ? 'var(--success)' : '#fbbf24' }}>
                      {feynmanFeedbackLevel === 'good' ? 'Gut verstanden' : 'Teilweise richtig / Ergänzung nötig'}
                    </strong>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>{feynmanFeedback}</div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ flex: 1, lineHeight: 1.3 }}
                        onClick={() => {
                          setFeynmanFeedback('');
                          setFeynmanFeedbackLevel(null);
                          setFeynmanInput('');
                        }}
                        >
                        🔄 Nochmal<br /><span style={{ fontSize: '0.8em', opacity: 0.85 }}>erklären</span>
                      </button>
                      <button
                        className="btn-primary"
                        style={{ flex: 1 }}
                        onClick={nextQuizQuestion}
                        disabled={feynmanLoading}
                      >
                        Weiter &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!(feynmanModeEnabled && isSelectionCorrect && feynmanFeedback) && (
              <button
                className="btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={nextQuizQuestion}
                disabled={!canProceedToNextQuizQuestion || feynmanLoading}
              >
                {currentQuizIndex >= internalQuizzes.length - 1 ? 'Ergebnis anzeigen' : 'Nächste Frage →'}
              </button>
            )}
            {!canProceedToNextQuizQuestion && (
              <p style={{ marginTop: '0.55rem', marginBottom: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Für die nächste Frage: erst Feynman-Check absenden oder Erklärung bewusst aufklappen.
              </p>
            )}
          </div>
        )}

        {quizRevealConfirmVisible && typeof document !== 'undefined' && createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.72)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="fade-in" style={{ width: 'min(420px, calc(100% - 2rem))', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', textAlign: 'center', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', boxShadow: '0 18px 45px rgba(0,0,0,0.4)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.6rem', color: 'var(--text-light)' }}>Sicher?</h3>
              <p style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Wenn du jetzt aufklappst, siehst du direkt die Muster-Erklärung.
                Versuche vorher, den Kernpunkt wirklich selbst zu formulieren.
              </p>
              <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setQuizRevealConfirmVisible(false)}>Weiter selbst denken</button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setQuizExplanationRevealed(true);
                    setQuizRevealConfirmVisible(false);
                  }}
                >
                  Ja, aufklappen
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      <FloatingPortal
        questionId={`quiz_${q.id || currentQuizIndex}`}
        questionText={q.question || 'Quiz Frage'}
        currentAppMode={floatingAppMode || learningMode}
      />
    </div>
  );
};

export default React.memo(QuizSession);
