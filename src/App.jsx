import React, { useState, useEffect } from 'react';
import './index.css';
import flashcards1 from './data/flashcards_1.json';
import flashcards2 from './data/flashcards_2.json';
import flashcards3 from './data/flashcards_3.json';

import quiz1 from './data/quiz_1.json';
import quiz2 from './data/quiz_2.json';
import quiz3 from './data/quiz_3.json';

import wisor1 from './data/wisor_1.json';

import { supabase } from './supabaseClient';

const generateId = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `card_${Math.abs(hash)}`;
};

function App() {
  const [appMode, setAppMode] = useState(localStorage.getItem('masterpat_auth') === 'true' ? 'dashboard' : 'auth'); // 'auth', 'dashboard', 'quiz', 'wisor'

  // --- AUTH STATE ---
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const SECRET_PIN = '261115'; // Das Passwort, das du später ändern kannst

  // --- FLASHCARD STATE ---
  const [allCards, setAllCards] = useState([]);
  const [learningQueue, setLearningQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState({ learnedToday: 0, totalDue: 0 });

  // --- QUIZ STATE ---
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  // --- WISOR STATE ---
  const [allWisors, setAllWisors] = useState([]);
  const [currentWisorIndex, setCurrentWisorIndex] = useState(0);
  const [wisorInput, setWisorInput] = useState('');
  const [wisorEvaluated, setWisorEvaluated] = useState(false);
  const [wisorIsCorrect, setWisorIsCorrect] = useState(false);
  const [wisorScore, setWisorScore] = useState({ correct: 0, total: 0 });
  const [wisorVideoOpen, setWisorVideoOpen] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // 1. Get or Generate Device ID
      let deviceId = localStorage.getItem('masterpat_device_id');
      if (!deviceId) {
        deviceId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substr(2, 12);
        localStorage.setItem('masterpat_device_id', deviceId);
      }

      // 2. Fetch from Supabase
      let progressData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};

      try {
        const { data } = await supabase
          .from('user_data')
          .select('progress_data')
          .eq('device_id', deviceId)
          .single();

        if (data && data.progress_data) {
          progressData = { ...progressData, ...data.progress_data };
          localStorage.setItem('ap2_srs_progress', JSON.stringify(progressData));
        } else if (!data) {
          // Init empty row
          await supabase.from('user_data').insert([{ device_id: deviceId, progress_data: progressData }]);
        }
      } catch (err) {
        console.error("Supabase load error: ", err);
      }

      // 3. Setup Flashcards with loaded progress
      const rawCards = [
        ...(flashcards1.cards || []),
        ...(flashcards2.cards || []),
        ...(flashcards3.cards || [])
      ];

      const mergedCards = rawCards.map(c => {
        const id = generateId(c.front);
        const progress = progressData[id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
        return { ...c, id, progress };
      });
      setAllCards(mergedCards);
      rebuildQueue(mergedCards);

      // 4. Setup Quizzes
      const rawQuizzes = [
        ...(quiz1.questions || []),
        ...(quiz2.questions || []),
        ...(quiz3.questions || [])
      ];
      const shuffledQuizzes = rawQuizzes.sort(() => Math.random() - 0.5);
      setAllQuizzes(shuffledQuizzes);

      // 5. Setup Wisor
      const rawWisors = [
        ...(wisor1.questions || [])
      ];
      const shuffledWisors = rawWisors.sort(() => Math.random() - 0.5);
      setAllWisors(shuffledWisors);
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rebuildQueue = (cards) => {
    const now = Date.now();
    const dueCards = cards.filter(c => c.progress.nextReview <= now);
    dueCards.sort(() => Math.random() - 0.5);
    setLearningQueue(dueCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStats({ learnedToday: 0, totalDue: dueCards.length });
  };

  const forceReloadAll = () => {
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setLearningQueue(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStats({ learnedToday: 0, totalDue: shuffled.length });
  }

  const handleRating = (quality, e) => {
    e.stopPropagation();
    const currentCard = learningQueue[currentIndex];
    let { rep, ef, interval } = currentCard.progress;

    if (quality < 3) {
      rep = 0;
      interval = 1 / (24 * 60);
    } else {
      if (rep === 0) {
        interval = quality === 3 ? (10 / (24 * 60)) : 1;
      } else if (rep === 1) {
        interval = quality === 3 ? 1 : 6;
      } else {
        interval = Math.round(interval * ef);
      }
      rep += 1;
    }

    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ef < 1.3) ef = 1.3;

    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
    const newProgress = { rep, ef, interval, nextReview };

    const updatedAllCards = allCards.map(c =>
      c.id === currentCard.id ? { ...c, progress: newProgress } : c
    );
    setAllCards(updatedAllCards);

    const storageData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
    storageData[currentCard.id] = newProgress;
    localStorage.setItem('ap2_srs_progress', JSON.stringify(storageData));

    // Sync to Supabase in background
    const deviceId = localStorage.getItem('masterpat_device_id');
    if (deviceId) {
      supabase.from('user_data').update({ progress_data: storageData, updated_at: new Date().toISOString() }).eq('device_id', deviceId).then();
    }

    let newQueue = [...learningQueue];
    if (quality < 3) {
      const cardToRequeue = newQueue.splice(currentIndex, 1)[0];
      cardToRequeue.progress = newProgress;
      newQueue.push(cardToRequeue);
    } else {
      newQueue.splice(currentIndex, 1);
      setStats(s => ({ ...s, learnedToday: s.learnedToday + 1 }));
    }

    setLearningQueue(newQueue);
    setIsFlipped(false);
  };

  const handleQuizAnswer = (optionIndex) => {
    if (selectedAnswer !== null) return; // already answered

    setSelectedAnswer(optionIndex);
    const isCorrect = allQuizzes[currentQuizIndex].answerOptions[optionIndex].isCorrect;

    if (isCorrect) {
      setQuizScore(s => ({ ...s, correct: s.correct + 1 }));
    }
  };

  const nextQuizQuestion = () => {
    setQuizScore(s => ({ ...s, total: s.total + 1 }));
    setSelectedAnswer(null);
    setCurrentQuizIndex(prev => prev + 1);
  };

  const resetQuiz = () => {
    const shuffled = [...allQuizzes].sort(() => Math.random() - 0.5);
    setAllQuizzes(shuffled);
    setCurrentQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setSelectedAnswer(null);
  };

  const resetWisor = () => {
    const shuffled = [...allWisors].sort(() => Math.random() - 0.5);
    setAllWisors(shuffled);
    setCurrentWisorIndex(0);
    setWisorScore({ correct: 0, total: 0 });
    setWisorInput('');
    setWisorEvaluated(false);
    setWisorIsCorrect(false);
    setWisorVideoOpen(false);
  };

  const handleWisorSubmit = (e) => {
    if (e) e.preventDefault();
    if (wisorEvaluated || !wisorInput.trim()) return;

    const q = allWisors[currentWisorIndex];
    const normalizedInput = wisorInput.toString().trim().toUpperCase();

    let correct = false;
    for (const expected of q.expectedAnswers) {
      if (normalizedInput === expected.toString().trim().toUpperCase()) {
        correct = true;
        break;
      }
    }

    setWisorIsCorrect(correct);
    setWisorEvaluated(true);
    if (correct) {
      setWisorScore(s => ({ ...s, correct: s.correct + 1 }));
    }
  };

  const nextWisorQuestion = () => {
    setWisorScore(s => ({ ...s, total: s.total + 1 }));
    setWisorInput('');
    setWisorEvaluated(false);
    setWisorIsCorrect(false);
    setWisorVideoOpen(false);
    setCurrentWisorIndex(prev => prev + 1);
  };

  const navigateWisorUnanswered = (direction) => {
    let newIndex = currentWisorIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= allWisors.length) newIndex = allWisors.length - 1;
    setWisorInput('');
    setWisorEvaluated(false);
    setWisorIsCorrect(false);
    setWisorVideoOpen(false);
    setCurrentWisorIndex(newIndex);
  };

  // --- RENDERERS ---

  if (appMode === 'auth') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '2rem' }}>Geschlossener Bereich</h2>
          <p style={{ color: '#cbd5e1', marginBottom: '2rem' }}>Bitte gib deine PIN ein, um fortzufahren.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pinInput === SECRET_PIN) {
              setAuthError(false);
              localStorage.setItem('masterpat_auth', 'true');
              setAppMode('dashboard');
            } else {
              setAuthError(true);
              setPinInput('');
            }
          }}>
            <input
              type="password"
              className="wisor-input"
              placeholder="PIN eingeben"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{ textAlign: 'center', letterSpacing: '0.2rem', marginBottom: '1rem' }}
              autoFocus
            />
            {authError && <p style={{ color: 'var(--color-error)', marginBottom: '1rem', fontWeight: 'bold' }}>Falsche PIN!</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Entsperren</button>
          </form>
        </div>
      </div>
    );
  }

  if (appMode === 'dashboard') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <h1>MasterPat APP</h1>
          <p className="subtitle">Wähle deinen Lernmodus</p>
        </header>
        <div className="dashboard-grid">
          <div className="dash-card" onClick={() => { resetQuiz(); setAppMode('quiz'); }}>
            <div className="dash-icon">🎯</div>
            <h2>Wissen testen (Quiz)</h2>
            <p>Multiple-Choice Fragen zum Überprüfen deines Wissensstands.</p>
            <div className="chip">{allQuizzes.length} Fragen verfügbar</div>
          </div>
          <div className="dash-card" onClick={() => { resetWisor(); setAppMode('wisor'); }}>
            <div className="dash-icon">⌨️</div>
            <h2>Wisor (Eingabe)</h2>
            <p>Freitext Eingabe für Zahlen und Fakten (mit Erklärung bei Fehler).</p>
            <div className="chip">{allWisors.length} Fragen verfügbar</div>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === 'quiz') {
    if (allQuizzes.length === 0) return <div style={{ color: 'white', zIndex: 10 }}>Lade Quiz...</div>;

    if (currentQuizIndex >= allQuizzes.length) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h2 style={{ color: 'white', marginBottom: '1rem', fontSize: '2rem' }}>Quiz Beendet!</h2>
            <p style={{ fontSize: '1.5rem', color: '#cbd5e1', marginBottom: '2rem' }}>Ergebnis: {quizScore.correct} / {quizScore.total}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
              <button className="btn-primary" onClick={resetQuiz}>Nochmal spielen</button>
            </div>
          </div>
        </div>
      );
    }

    const q = allQuizzes[currentQuizIndex];

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <p className="subtitle">Frage {currentQuizIndex + 1} von {allQuizzes.length}</p>
            <div className="score-badge">Score: {quizScore.correct}</div>
          </div>
        </header>

        <div className="quiz-container">
          <div className="quiz-question">
            {q.question}
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
                  {opt.text}
                </button>
              )
            })}
          </div>

          {selectedAnswer !== null && (
            <div className="quiz-rationale fade-in">
              <p><strong>Erklärung:</strong> {q.answerOptions[selectedAnswer].rationale}</p>
              <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={nextQuizQuestion}>Nächste Frage &rarr;</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (appMode === 'wisor') {
    if (allWisors.length === 0) return <div style={{ color: 'white', zIndex: 10 }}>Lade Wisor...</div>;

    if (currentWisorIndex >= allWisors.length) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h2 style={{ color: 'white', marginBottom: '1rem', fontSize: '2rem' }}>Wisor Beendet!</h2>
            <p style={{ fontSize: '1.5rem', color: '#cbd5e1', marginBottom: '2rem' }}>Ergebnis: {wisorScore.correct} / {wisorScore.total}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
              <button className="btn-primary" onClick={resetWisor}>Nochmal spielen</button>
            </div>
          </div>
        </div>
      );
    }

    const q = allWisors[currentWisorIndex];

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <p className="subtitle">Frage {currentWisorIndex + 1} von {allWisors.length}</p>
            <div className="score-badge">Score: {wisorScore.correct}</div>
          </div>
        </header>

        <div className="quiz-container">
          {q.videoUrl && (
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <button
                className="btn-secondary fade-in"
                onClick={() => setWisorVideoOpen(!wisorVideoOpen)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: wisorVideoOpen ? 'rgba(255, 255, 255, 0.1)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
              >
                <span>{wisorVideoOpen ? '🙈' : '📺'}</span>
                {wisorVideoOpen ? 'Lernvideo ausblenden' : 'Lernvideo ansehen'}
              </button>

              {wisorVideoOpen && (
                <div className="fade-in" style={{ marginTop: '1rem', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
                  <iframe
                    width="100%"
                    height="280"
                    src={q.videoUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>
          )}

          <div className="quiz-question">
            {q.question}
          </div>

          <form className="wisor-form" onSubmit={handleWisorSubmit}>
            <input
              type={q.inputType === 'number' ? 'number' : 'text'}
              className="wisor-input"
              value={wisorInput}
              onChange={(e) => setWisorInput(e.target.value)}
              disabled={wisorEvaluated}
              placeholder="Antwort eingeben..."
              autoFocus
            />
            {!wisorEvaluated && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%' }}>
                <button
                  type="button"
                  className="btn-secondary fade-in"
                  onClick={() => navigateWisorUnanswered(-1)}
                  disabled={currentWisorIndex === 0}
                  style={{ flex: '1', padding: '0.8rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  title="Vorherige Frage"
                >
                  &larr;
                </button>
                <button type="submit" className="btn-primary" style={{ flex: '3' }} disabled={!wisorInput.trim()}>
                  Antworten
                </button>
                <button
                  type="button"
                  className="btn-secondary fade-in"
                  onClick={() => navigateWisorUnanswered(1)}
                  disabled={currentWisorIndex === allWisors.length - 1}
                  style={{ flex: '1', padding: '0.8rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  title="Nächste Frage überspringen"
                >
                  &rarr;
                </button>
              </div>
            )}
          </form>

          {wisorEvaluated && (
            <div className={`quiz-rationale fade-in ${wisorIsCorrect ? 'correct-rationale' : 'wrong-rationale'}`}>
              <h3 style={{ color: wisorIsCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
                {wisorIsCorrect ? 'Richtig!' : 'Leider Falsch!'}
              </h3>
              {!wisorIsCorrect && (
                <p style={{ marginBottom: '0.5rem' }}><strong>Richtige Antwort(en):</strong> {q.expectedAnswers.join(' oder ')}</p>
              )}
              <p><strong>Erklärung:</strong> {q.rationale}</p>

              {q.videoUrl && (
                <div style={{ marginTop: '1rem', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                  <iframe
                    width="100%"
                    height="315"
                    src={q.videoUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={nextWisorQuestion} autoFocus>Nächste Frage &rarr;</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- FLASHCARDS RENDERER ---
  if (learningQueue.length === 0) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '10vh', zIndex: 10 }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <button className="btn-nav" style={{ marginBottom: '2rem' }} onClick={() => setAppMode('dashboard')}>&larr; Zum Menü</button>
          <h1>MasterPat APP</h1>
        </header>
        <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
          <h2 style={{ color: 'white', marginBottom: '1rem', fontSize: '2rem' }}>🎉 Glückwunsch! 🎉</h2>
          <p style={{ margin: '1rem 0', color: '#cbd5e1', fontSize: '1.2rem' }}>Du hast alle fälligen Karten für heute gelernt.</p>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Dein Gehirn baut jetzt die neuronalen Verbindungen aus. Komm später wieder!</p>
          <button className="btn-primary" onClick={forceReloadAll}>
            Trotzdem alle Karten neu laden
          </button>
        </div>
      </div>
    );
  }

  const currentCard = learningQueue[0];
  const progressPercentage = (stats.learnedToday / (stats.totalDue || 1)) * 100;

  return (
    <>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="app-container" style={{ zIndex: 10 }}>
        <header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Spaced Repetition</h1>
            <div style={{ width: '80px' }}></div> {/* spacer */}
          </div>
        </header>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="progress-text">{stats.learnedToday} gelernt / {stats.totalDue} ausstehend</p>
        </div>

        <div className="flashcard-wrapper" onClick={() => !isFlipped && setIsFlipped(true)}>
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>

            <div className="card-face card-front">
              <span className="card-label">Frage</span>
              <p className="card-content">{currentCard.front}</p>
              {!isFlipped && <p style={{ position: 'absolute', bottom: '1.5rem', fontSize: '0.9rem', color: '#94a3b8', animation: 'pulse 2s infinite' }}>Tippe zum Umdrehen</p>}
            </div>

            <div className="card-face card-back">
              <span className="card-label">Antwort</span>
              <p className="card-content">{currentCard.back}</p>
            </div>

          </div>
        </div>

        <div className="controls">
          {!isFlipped ? (
            <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} style={{ width: '200px' }}>
              Antwort zeigen
            </button>
          ) : (
            <div className="rating-controls fade-in">
              <button className="btn-rating btn-bad" onClick={(e) => handleRating(1, e)}>
                <span className="emoji">🔴</span>
                <span>Kann ich nicht</span>
                <span className="time-hint">&lt; 1 Min</span>
              </button>
              <button className="btn-rating btn-ok" onClick={(e) => handleRating(3, e)}>
                <span className="emoji">🟡</span>
                <span>Kann ich etwas</span>
                <span className="time-hint">10 Min</span>
              </button>
              <button className="btn-rating btn-good" onClick={(e) => handleRating(5, e)}>
                <span className="emoji">🟢</span>
                <span>Kann ich</span>
                <span className="time-hint">&gt; 1 Tag</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
