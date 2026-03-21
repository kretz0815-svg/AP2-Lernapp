import React, { useState, useEffect } from 'react';
import FloatingNotes from './FloatingNotes';
import { formatLatex } from '../utils/formatting';

const FlashcardSession = ({
  learningQueue,
  currentIndex, // We'll manage it internally if possible, or take it as prop
  onRating,
  onBack,
  stats,
  isFlipped,
  setIsFlipped,
  onToggleFlip,
  pomodoroPortal,
  burgerMenuPortal
}) => {
  // If we want it fully self-contained:
  const [internalIndex, setInternalIndex] = useState(currentIndex);
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
            <button className="btn-rating btn-rating-0" onClick={(e) => onRating(0, e)}>Garnicht</button>
            <button className="btn-rating btn-rating-3" onClick={(e) => onRating(3, e)}>Mittel</button>
            <button className="btn-rating btn-rating-5" onClick={(e) => onRating(5, e)}>Perfekt</button>
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
