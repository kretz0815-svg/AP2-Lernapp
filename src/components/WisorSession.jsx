import React, { useState, useEffect } from 'react';
import Confetti from './Confetti';
import VideoPanel from './VideoPanel';
import GeminiPanel from './GeminiPanel';
import FloatingNotes from './FloatingNotes';
import FloatingCalculator from './FloatingCalculator';
import FloatingPortal from './FloatingPortal';
import ResetModal from './ResetModal';

const WisorSession = ({
  allWisors,
  activeWisorMode,
  completedWisors,
  completedWisorsEco,
  wisor1,
  wisorEco,
  marketingReview,
  completedMarketingReview,
  onComplete,
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
  setAppMode,
  openResetModal,
  resetModalVisible,
  setResetModalVisible,
  handleResetExecute
}) => {
  const [currentWisorIndex, setCurrentWisorIndex] = useState(0);
  const [wisorInput, setWisorInput] = useState('');
  const [wisorEvaluated, setWisorEvaluated] = useState(false);
  const [wisorIsCorrect, setWisorIsCorrect] = useState(false);
  const [wisorScore, setWisorScore] = useState({ correct: 0, total: 0 });
  const [lastWisorCorrect, setLastWisorCorrect] = useState(false);

  useEffect(() => {
    // Sync external reset or manual index change if needed
    // But mostly we keep it internal
  }, [currentWisorIndex]);

  const isWisor1Mode = activeWisorMode === 'wisor1';
  const isWisorEcoMode = activeWisorMode === 'wisorEco';
  const wisorDueMastered = isWisor1Mode
    ? Object.keys(completedWisors).length === (wisor1?.questions?.length || 0)
    : isWisorEcoMode
      ? Object.keys(completedWisorsEco).length === (wisorEco?.questions?.length || 0)
      : Object.keys(completedMarketingReview || {}).length === (marketingReview?.questions?.length || 0);

  if (allWisors.length === 0) {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          {wisorDueMastered && <Confetti />}
          <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Alles geschafft! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Du hast alle WisoR-Fragen erfolgreich gemeistert.</p>
          <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
          <button className="btn-primary" onClick={(e) => openResetModal(e, isWisor1Mode ? 'wisor' : isWisorEcoMode ? 'wisorEco' : 'marketing_review')} style={{ marginLeft: '1rem' }}>Fortschritt zurücksetzen</button>
        </div>
        <ResetModal
          isOpen={resetModalVisible}
          onClose={() => setResetModalVisible(false)}
          onConfirm={handleResetExecute}
        />
      </div>
    );
  }

  if (currentWisorIndex >= allWisors.length) {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          {((wisorScore.correct === wisorScore.total && wisorScore.total > 0) || (wisorDueMastered && lastWisorCorrect)) && <Confetti />}
          <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Durchgang Beendet!</h2>
          <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Ergebnis: {wisorScore.correct} / {wisorScore.total}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
            <button className="btn-primary" onClick={() => onComplete && onComplete()}>Nächsten offene Fragen</button>
          </div>
        </div>
      </div>
    );
  }

  const q = allWisors[currentWisorIndex];

  const handleWisorSubmit = (e) => {
    if (e) e.preventDefault();
    if (wisorEvaluated || !wisorInput.trim()) return;

    const normalize = (str) => String(str || '').replace(/[[\],.\s&und-]/gi, '').toUpperCase();
    const normalizedInput = normalize(wisorInput);
    
    let correct = false;
    for (const expected of q.expectedAnswers) {
      if (normalizedInput === normalize(expected)) {
        correct = true;
        break;
      }
    }

    setWisorIsCorrect(correct);
    setWisorEvaluated(true);
    setLastWisorCorrect(correct);
    setWisorScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));

    if (onLearningEvent) {
      onLearningEvent({
        mode: isWisor1Mode ? 'wisor' : 'wisorEco',
        questionId: q.id,
        questionText: q.question,
        correct: correct,
        userAnswer: wisorInput,
        expectedAnswer: q.expectedAnswers[0],
        topic: q.topic || ''
      });
    }
  };

  const nextWisorQuestion = () => {
    setWisorInput('');
    setWisorEvaluated(false);
    setWisorIsCorrect(false);
    setWisorVideoOpen(false);
    setGeminiVisible(false);
    setGeminiQuery('');
    // setGeminiResponse(''); // Shared response? Might need clearing
    setCurrentWisorIndex(prev => prev + 1);
  };

  const modeTitle = isWisor1Mode ? 'WisoR Grundlagen' : 
                   isWisorEcoMode ? 'WisoR E-Commerce' : 'IHK Extras';

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      {pomodoroPortal}
      {burgerMenuPortal}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
          <p className="subtitle">{modeTitle} · {currentWisorIndex + 1} / {allWisors.length}</p>
          <div className="score-badge">Score: {wisorScore.correct}</div>
        </div>
      </header>

      <div className="wisor-container">
        <div style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary fade-in ${wisorVideoLoading ? 'loading' : ''}`}
            onClick={() => handleToggleVideos(q)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px' }}
          >
            <span>📺</span> Videos
          </button>
          <button
            className="btn-secondary fade-in"
            onClick={() => setGeminiVisible(!geminiVisible)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px' }}
          >
            <span>✨</span> KI Hilfe
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
          onAsk={() => handleGeminiAsk(q)}
          isLoading={geminiLoading}
          response={geminiResponse}
        />

        <div className="wisor-question">{q.question}</div>

        <form onSubmit={handleWisorSubmit}>
          {q.inputType === 'text' && q.expectedAnswers[0].length > 10 ? (
            <textarea
              className="wisor-input"
              placeholder="Deine Antwort hier detailliert beschreiben..."
              value={wisorInput}
              onChange={(e) => setWisorInput(e.target.value)}
              disabled={wisorEvaluated}
              autoFocus
              style={{ minHeight: '120px', resize: 'vertical', width: '100%', padding: '1.2rem', fontSize: '1.05rem', lineHeight: '1.5' }}
            />
          ) : (
            <input
              className="wisor-input"
              type="text"
              placeholder="Deine Antwort..."
              value={wisorInput}
              onChange={(e) => setWisorInput(e.target.value)}
              disabled={wisorEvaluated}
              autoFocus
              style={{ padding: '1.2rem', fontSize: '1.1rem' }}
            />
          )}
          {!wisorEvaluated ? (
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>Prüfen</button>
          ) : (
            <div className="fade-in">
              <div className={`wisor-feedback ${wisorIsCorrect ? 'correct' : 'wrong'}`} style={{ marginTop: '1rem', padding: '1rem', borderRadius: '12px' }}>
                {wisorIsCorrect ? 'Richtig! 🎉' : `Leider falsch. Die Antwort lautet: ${q.expectedAnswers[0]}`}
              </div>
              <button type="button" className="btn-primary" onClick={nextWisorQuestion} style={{ width: '100%', marginTop: '1rem' }}>Weiter &rarr;</button>
            </div>
          )}
        </form>
      </div>

      <FloatingPortal questionId={`wisor_${q.id}`} questionText={q.question} currentAppMode="wisor" />
    </div>
  );
};

export default React.memo(WisorSession);
