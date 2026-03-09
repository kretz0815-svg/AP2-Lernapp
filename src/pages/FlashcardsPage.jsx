import React from 'react';
import FloatingNotes from '../components/FloatingNotes';
import FloatingCalculator from '../components/FloatingCalculator';
import './FlashcardsPage.css';

function FlashcardsPage({
    learningQueue,
    stats,
    isFlipped,
    setIsFlipped,
    forceReloadAll,
    handleRating,
    setAppMode,
    burgerMenuPortal
}) {
    if (learningQueue.length === 0) {
        return (
            <div className="app-container flashcards-empty-container" style={{ zIndex: 10 }}>
                {burgerMenuPortal}
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <header>
                    <button className="btn-nav" style={{ marginBottom: '2rem' }} onClick={() => setAppMode('dashboard')}>&larr; Zum Menü</button>
                    <h1 className="flashcards-empty-title">MASTERPAT APP</h1>
                </header>
                <div className="card-face flashcards-congrats-card">
                    <h2 className="flashcards-congrats-title">🎉 Glückwunsch! 🎉</h2>
                    <p style={{ margin: '1rem 0', color: 'var(--text-muted)', fontSize: '1.2rem' }}>Du hast alle fälligen Karten für heute gelernt.</p>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Dein Gehirn baut jetzt die neuronalen Verbindungen aus. Komm später wieder!</p>
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
            {burgerMenuPortal}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            <div className="app-container" style={{ zIndex: 10 }}>
                <header>
                    <div className="flashcards-header-content">
                        <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
                        <h1 style={{ margin: 0, fontSize: '2rem' }}>Spaced Repetition</h1>
                        <div style={{ width: '80px' }}></div> {/* spacer */}
                    </div>
                </header>

                <div className="flashcards-progress-wrapper">
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
                            {!isFlipped && <p className="flashcards-tip">Tippe zum Umdrehen</p>}
                        </div>

                        <div className="card-face card-back">
                            <span className="card-label">Antwort</span>
                            <p className="card-content">{currentCard.back}</p>
                        </div>

                    </div>
                </div>

                <div className="controls">
                    {!isFlipped ? (
                        <button className="btn-primary btn-show-answer" onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}>
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
                <FloatingNotes questionId={`flashcard_${currentCard.id}`} questionText={currentCard.front || 'Lernkarte'} />
                <FloatingCalculator />
            </div>
        </>
    );
}

export default FlashcardsPage;
