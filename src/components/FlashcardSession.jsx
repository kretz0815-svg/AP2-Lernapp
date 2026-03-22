import React, { useState, useEffect } from 'react';
import FloatingNotes from './FloatingNotes';
import { formatLatex } from '../utils/formatting';

import { reviewTaskWithDSR } from '../services/srsStore';
import { mapFlashcardQualityToRating } from '../services/srsFeedbackMapper';

const FlashcardSession = ({
  allCards = [],
  stats,
  setStats,
  onBack,
  pomodoroPortal,
  burgerMenuPortal,
  authUser,
  supabase,
  appendLearningEvent
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learningQueue, setLearningQueue] = useState([]);

  useEffect(() => {
    // Basic queue filtering: just show some cards or filter by due date if metadata exists
    // For now, let's just use allCards as the "queue" if it's the first load
    if (allCards.length > 0 && learningQueue.length === 0) {
      setLearningQueue([...allCards].sort(() => Math.random() - 0.5));
    }
  }, [allCards, learningQueue.length]);

  const onToggleFlip = () => setIsFlipped(!isFlipped);

  const handleRating = async (quality, e) => {
    if (e) e.stopPropagation();
    const currentCard = learningQueue[internalIndex];
    if (!currentCard) return;

    // 1. Calculate the rating (0-5)
    const rating = mapFlashcardQualityToRating(quality);

    // 2. Log event for global analytics
    if (appendLearningEvent) {
      appendLearningEvent({
        mode: 'flashcard',
        questionId: currentCard.id,
        questionText: currentCard.front,
        correct: quality >= 3,
        userAnswer: `Rating: ${quality}`,
        expectedAnswer: 'N/A',
        topic: currentCard.topic || 'Flashcard'
      });
    }

    // 3. Update DSR progress via Supabase
    if (authUser?.id && supabase) {
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: `card:${currentCard.id}`,
        rating,
        taskType: 'flashcard',
        metadata: { front: currentCard.front }
      }).catch(err => console.error('Flashcard DSR failed:', err));
    }

    // 4. Update local stats
    if (setStats) {
      setStats(prev => ({ ...prev, learnedToday: prev.learnedToday + 1 }));
    }

    // 5. Move to next
    setIsFlipped(false);
    setInternalIndex(prev => prev + 1);
  };

  const currentCard = learningQueue[internalIndex];

  if (learningQueue.length === 0 || internalIndex >= learningQueue.length) {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--text-light)' }}>Super!</h1>
          <p style={{ color: 'var(--text-muted)' }}>Alle fälligen Karten für heute gelernt.</p>
        </header>
        <button className="btn-primary" onClick={onBack}>Zum Menü</button>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      {pomodoroPortal}
      {burgerMenuPortal}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
        <button className="btn-nav" onClick={onBack}>&larr; Menü</button>
        <div className="stats-badge">
          Heute: {stats.learnedToday} | Offen: {learningQueue.length - internalIndex}
        </div>
      </header>

      <div className="flashcard-container">
        <div 
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={onToggleFlip}
        >
          <div className="flashcard-inner">
            <div className="flashcard-front">
              <div className="card-content">
                {formatLatex(currentCard.front)}
              </div>
              <div className="card-hint">Klicken zum Wenden</div>
            </div>
            <div className="flashcard-back">
              <div className="card-content">
                {formatLatex(currentCard.back)}
              </div>
            </div>
          </div>
        </div>

        {isFlipped && (
          <div className="rating-buttons fade-in">
            <button className="btn-rating btn-rating-0" onClick={(e) => handleRating(0, e)}>Garnicht</button>
            <button className="btn-rating btn-rating-3" onClick={(e) => handleRating(3, e)}>Mittel</button>
            <button className="btn-rating btn-rating-5" onClick={(e) => handleRating(5, e)}>Perfekt</button>
          </div>
        )}
      </div>

      <FloatingNotes 
        questionId={currentCard.id} 
        questionText={currentCard.front} 
      />
    </div>
  );
};

export default React.memo(FlashcardSession);
