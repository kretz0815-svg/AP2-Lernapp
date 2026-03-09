import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import VideoPanel from '../components/VideoPanel';
import GeminiPanel from '../components/GeminiPanel';
import FloatingNotes from '../components/FloatingNotes';
import FloatingCalculator from '../components/FloatingCalculator';

import { formatLatex } from '../utils/formatting';
import { detectQuizTopic, getQuizTopicGroup } from '../utils/quizTopics';
import { computeNextQuizProgress } from '../utils/quizDue';
import { askGemini } from '../geminiClient';
import { useAppContext } from '../contexts/AppContext';
import { mapQuizAnswerToRating } from '../services/srsFeedbackMapper';
import { reviewTaskWithDSR } from '../services/srsStore';
import { supabase } from '../supabaseClient';
import './QuizPage.css';

function QuizPage({
  appMode,
  setAppMode,
  burgerMenuPortal,
  pomodoroPortal,
  pomodoroActive,
  pomodoroTimeUpSignal,
  setPomodoroSessionLog,
  quizDuePool,
  setQuizProgressView,
  refreshQuizDuePool,
  wisorVideoOpen,
  setWisorVideoOpen,
  wisorVideoLoading,
  setWisorVideoLoading,
  wisorVideos,
  setWisorVideos,
  wisorVideoError,
  setWisorVideoError,
  selectedWisorVideo,
  setSelectedWisorVideo,
  handleToggleVideos,
  geminiVisible,
  setGeminiVisible,
  geminiQuery,
  setGeminiQuery,
  geminiLoading,
  geminiResponse,
  handleGeminiAsk,
  authUser
}) {
  const { appendLearningEvent } = useAppContext();

  const [allQuizzes, setAllQuizzes] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [selectedQuizTopic, setSelectedQuizTopic] = useState('all');
  const [feynmanModeEnabled, setFeynmanModeEnabled] = useState(false);
  const [feynmanInput, setFeynmanInput] = useState('');
  const [feynmanLoading, setFeynmanLoading] = useState(false);
  const [feynmanFeedback, setFeynmanFeedback] = useState('');
  const [feynmanFeedbackLevel, setFeynmanFeedbackLevel] = useState(null);
  const [quizExplanationRevealed, setQuizExplanationRevealed] = useState(false);
  const [quizRevealConfirmVisible, setQuizRevealConfirmVisible] = useState(false);
  const [lastQuizCorrect, setLastQuizCorrect] = useState(false);

  useEffect(() => {
    if (pomodoroTimeUpSignal > 0) {
      setCurrentQuizIndex(allQuizzes.length);
    }
  }, [pomodoroTimeUpSignal, allQuizzes.length]);

  useEffect(() => {
    setWisorVideos([]);
    setSelectedWisorVideo(null);
    setWisorVideoOpen(false);
    setWisorVideoError('');
    setGeminiVisible(false);
    setGeminiQuery('');
  }, [currentQuizIndex, setWisorVideos, setSelectedWisorVideo, setWisorVideoOpen, setWisorVideoError, setGeminiVisible, setGeminiQuery]);

  const getDueQuizzesByTopic = (topic = 'all') => {
    const due = quizDuePool || [];
    if (topic === 'all') return due;
    return due.filter(q => getQuizTopicGroup(q.topic) === topic);
  };

  const startQuizSession = (limit, topic = 'all') => {
    let sessionQs = [...getDueQuizzesByTopic(topic)].sort(() => Math.random() - 0.5);
    const isGuest = !authUser;
    const effectiveLimit = isGuest ? 3 : limit;
    if (effectiveLimit !== 'all') {
      sessionQs = sessionQs.slice(0, effectiveLimit);
    }
    resetQuiz(sessionQs);
    setAppMode('quiz');
  };

  const resetQuiz = (qsToUse = null) => {
    const list = qsToUse || allQuizzes;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setAllQuizzes(shuffled);
    setCurrentQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setSelectedAnswer(null);
    setFeynmanInput('');
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);
    setQuizExplanationRevealed(false);
    setQuizRevealConfirmVisible(false);
  };

  const handleQuizAnswer = (optionIndex) => {
    if (selectedAnswer !== null) return;

    setFeynmanInput('');
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);
    setQuizExplanationRevealed(false);
    setQuizRevealConfirmVisible(false);

    setSelectedAnswer(optionIndex);
    const q = allQuizzes[currentQuizIndex];
    if (!q) return;

    const isCorrect = q.answerOptions[optionIndex].isCorrect;
    const selectedOption = q.answerOptions[optionIndex];
    const expectedOption = q.answerOptions.find(opt => opt.isCorrect);

    if (isCorrect) {
      setQuizScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
      setLastQuizCorrect(true);
    } else {
      setQuizScore(s => ({ ...s, total: s.total + 1 }));
      setLastQuizCorrect(false);
    }

    if (pomodoroActive) {
      const questionText = q.question?.substring(0, 100) || 'Quiz-Frage';
      const topicLabel = getQuizTopicGroup(q.topic || detectQuizTopic(q)) || 'Quiz';
      setPomodoroSessionLog(prev => [...prev, { correct: isCorrect, questionText, topic: topicLabel }]);
    }

    const applyLocalQuizProgress = () => {
      const quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
      const previous = quizProg[q.id] || q.progress || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
      quizProg[q.id] = computeNextQuizProgress(previous, isCorrect);
      localStorage.setItem('ap2_quiz_progress', JSON.stringify(quizProg));
      setQuizProgressView(quizProg);
    };

    applyLocalQuizProgress();
    refreshQuizDuePool().catch(() => { });

    appendLearningEvent({
      mode: 'quiz',
      questionId: q.id,
      questionText: q.question,
      correct: isCorrect,
      userAnswer: selectedOption?.text || '',
      expectedAnswer: expectedOption?.text || '',
      topic: getQuizTopicGroup(q.topic || detectQuizTopic(q))
    });

    if (authUser?.id) {
      const rating = mapQuizAnswerToRating({ isCorrect, attempt: 1 });
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: `quiz:${q.id}`,
        rating,
        taskType: 'quiz',
        category: q.topic || 'quiz',
        metadata: {
          source: q.custom ? 'custom_quiz' : 'default_quiz',
          question: q.question
        }
      })
        .then(() => refreshQuizDuePool())
        .catch(err => {
          console.error('DSR quiz review failed:', err);
          refreshQuizDuePool().catch(() => { });
        });
    }
  };

  const nextQuizQuestion = () => {
    setQuizScore(s => ({ ...s, total: s.total + 1 }));
    setSelectedAnswer(null);
    setFeynmanInput('');
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);
    setQuizExplanationRevealed(false);
    setQuizRevealConfirmVisible(false);
    setCurrentQuizIndex(prev => prev + 1);
  };

  const handleFeynmanCheck = async () => {
    if (!feynmanInput.trim()) return;
    const q = allQuizzes[currentQuizIndex];
    if (!q) return;

    const correctOption = q.answerOptions.find(opt => opt.isCorrect);
    const learnerPrompt = `Bewerte die folgende Lernerklärung eines Azubis auf fachliche Richtigkeit und Tiefe.
Antworte exakt in diesem Format:
STATUS: GUT oder TEILWEISE
FEEDBACK: <maximal 4 kurze Sätze, konkret und lernförderlich>

Erklärung des Azubis:
${feynmanInput}`;

    const solutionContext = `Musterlösung: ${correctOption?.text || 'N/A'} | Begründung: ${correctOption?.rationale || 'N/A'}`;

    setFeynmanLoading(true);
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);

    try {
      const result = await askGemini(learnerPrompt, q.question, solutionContext);
      const statusMatch = result.match(/STATUS\s*:\s*(GUT|TEILWEISE)/i);
      const parsedStatus = statusMatch?.[1]?.toUpperCase() || 'TEILWEISE';
      const cleanedFeedback = result
        .replace(/STATUS\s*:\s*(GUT|TEILWEISE)\s*/ig, '')
        .replace(/FEEDBACK\s*:\s*/i, '')
        .trim();

      setFeynmanFeedbackLevel(parsedStatus === 'GUT' ? 'good' : 'partial');
      setFeynmanFeedback(cleanedFeedback || result);
    } catch (err) {
      console.error('Feynman check failed:', err);
      setFeynmanFeedbackLevel('partial');
      setFeynmanFeedback('Die Überprüfung konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.');
    } finally {
      setFeynmanLoading(false);
    }
  };

  if (appMode === 'quiz_setup') {
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
          <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
        </header>
        <div className="card-face fade-in quiz-setup-card">
          <h2 className="quiz-setup-title">Wieviele Fragen?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Wähle deinen Themenblock innerhalb von „Wissen testen“ und dann die Anzahl fälliger Fragen.</p>

          <div className="quiz-topic-select-container">
            <label className="quiz-topic-label">
              Themenblock
            </label>
            <select
              value={selectedQuizTopic}
              onChange={(e) => setSelectedQuizTopic(e.target.value)}
              className="quiz-topic-select"
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

          <label className="feynman-toggle-container">
            <input
              type="checkbox"
              checked={feynmanModeEnabled}
              onChange={(e) => setFeynmanModeEnabled(e.target.checked)}
              className="feynman-toggle-checkbox"
            />
            <span className="feynman-toggle-text">
              Feynman-Methode: Antworten nach Erfolg selbst erklären (Empfohlen für tieferes Verständnis)
            </span>
          </label>

          <div className="quiz-setup-grid">
            <button className="btn-secondary" onClick={() => startQuizSession(10, selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>10 Fragen</button>
            <button className="btn-secondary" onClick={() => startQuizSession(20, selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>20 Fragen</button>
            <button className="btn-secondary" onClick={() => startQuizSession(50, selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>50 Fragen</button>
            <button className="btn-primary" onClick={() => startQuizSession('all', selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>Alle fälligen</button>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === 'quiz') {
    if (allQuizzes.length === 0) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          {burgerMenuPortal}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face quiz-setup-card">
            <h2 style={{ color: 'var(--text-light)', marginBottom: '0.8rem', fontSize: '1.8rem' }}>Keine fälligen Fragen</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem' }}>Für den gewählten Themenblock ist gerade nichts offen.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAppMode('quiz_setup')}>Themenwahl</button>
              <button className="btn-primary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
            </div>
          </div>
        </div>
      );
    }

    if (currentQuizIndex >= allQuizzes.length) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          {burgerMenuPortal}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face quiz-setup-card">
            <h2 className="quiz-setup-title">Quiz Beendet!</h2>
            <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Ergebnis: {quizScore.correct} / {quizScore.total}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
              <button className="btn-primary" onClick={() => resetQuiz()}>Nochmal spielen</button>
            </div>
          </div>
        </div>
      );
    }

    const q = allQuizzes[currentQuizIndex];
    if (!q) return null;

    const selectedOption = selectedAnswer !== null ? q.answerOptions[selectedAnswer] : null;
    const shouldGateExplanation = selectedAnswer !== null
      && feynmanModeEnabled
      && !!selectedOption?.isCorrect
      && !quizExplanationRevealed;
    const requireFeynmanCompletion = selectedAnswer !== null
      && feynmanModeEnabled
      && !!selectedOption?.isCorrect;
    const canProceedToNextQuizQuestion = !requireFeynmanCompletion
      || quizExplanationRevealed
      || !!feynmanFeedback;
    const remainingInSession = Math.max(allQuizzes.length - currentQuizIndex, 0);

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <div className="quiz-header-content">
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <p className="subtitle">Frage {currentQuizIndex + 1} · {remainingInSession} offen</p>
            <div className="score-badge">Score: {quizScore.correct}</div>
          </div>
        </header>

        <div className="quiz-container">
          <div className="quiz-action-bar">
            <button
              className={`btn-secondary quiz-action-btn fade-in ${wisorVideoLoading ? 'loading' : ''}`}
              onClick={() => handleToggleVideos(q)}
              style={{ background: wisorVideoOpen ? 'var(--glass-border)' : 'var(--glass-bg)' }}
            >
              <span>{wisorVideoOpen ? '🙈' : '📺'}</span>
              {wisorVideoOpen ? 'Videos ausblenden' : 'Lernvideos ansehen'}
            </button>

            <button
              className="btn-secondary quiz-action-btn fade-in"
              onClick={() => setGeminiVisible(!geminiVisible)}
              style={{ background: geminiVisible ? 'var(--glass-border)' : 'var(--glass-bg)' }}
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
            onAsk={handleGeminiAsk}
            isLoading={geminiLoading}
            response={geminiResponse}
          />

          <div className="quiz-question">
            {formatLatex(q.question)}
          </div>
          <div className="quiz-options">
            {q.answerOptions.map((opt, idx) => {
              let btnClass = "quiz-btn";
              if (selectedAnswer !== null) {
                if (opt.isCorrect) btnClass += " correct";
                else if (selectedAnswer === idx) btnClass += " wrong";
              }
              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleQuizAnswer(idx)}
                  disabled={selectedAnswer !== null}
                >
                  {formatLatex(opt.text)}
                </button>
              )
            })}
          </div>

          {selectedAnswer !== null && (
            <div className="quiz-rationale fade-in">
              {!shouldGateExplanation ? (
                <p><strong>Erklärung:</strong> {formatLatex(q.answerOptions[selectedAnswer].rationale)}</p>
              ) : (
                <div className="explanation-gated-box">
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

              {feynmanModeEnabled && q.answerOptions[selectedAnswer].isCorrect && (
                <div className="feynman-check-container">
                  <label className="feynman-check-label">
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
                    onClick={handleFeynmanCheck}
                    disabled={feynmanLoading || !feynmanInput.trim()}
                  >
                    {feynmanLoading ? 'Überprüfung läuft…' : 'Erklärung überprüfen'}
                  </button>

                  {feynmanFeedback && (
                    <div
                      className="feynman-feedback-box"
                      style={{
                        border: `1px solid ${feynmanFeedbackLevel === 'good' ? 'rgba(34,197,94,0.45)' : 'rgba(245,158,11,0.45)'}`,
                        background: feynmanFeedbackLevel === 'good' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'
                      }}
                    >
                      <strong
                        className="feynman-feedback-status"
                        style={{ color: feynmanFeedbackLevel === 'good' ? 'var(--success)' : '#fbbf24' }}
                      >
                        {feynmanFeedbackLevel === 'good' ? 'Gut verstanden' : 'Teilweise richtig / Ergänzung nötig'}
                      </strong>
                      <div className="feynman-feedback-content">{feynmanFeedback}</div>

                      <div className="feynman-feedback-actions">
                        <button
                          className="btn-secondary"
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

              {!(feynmanModeEnabled && q.answerOptions[selectedAnswer]?.isCorrect && feynmanFeedback) && (
                <button
                  className="btn-primary"
                  style={{ marginTop: '1rem' }}
                  onClick={nextQuizQuestion}
                  disabled={!canProceedToNextQuizQuestion || feynmanLoading}
                >
                  Nächste Frage &rarr;
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
            <div className="explanation-reveal-overlay">
              <div className="fade-in explanation-reveal-modal">
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
        <FloatingNotes questionId={`quiz_${currentQuizIndex}`} questionText={q.question || 'Quiz Frage'} />
        <FloatingCalculator />
      </div>
    );
  }

  return null;
}

export default QuizPage;
