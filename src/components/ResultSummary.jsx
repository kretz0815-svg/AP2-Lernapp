import React from 'react';

const ResultSummary = ({
  title = 'Ergebnis',
  summary,
  onRetry,
  onBack,
  weakTopic,
  onPracticeWeakTopic
}) => {
  const safeSummary = summary || {};
  const total = Number(safeSummary.totalQuestions || safeSummary.answeredQuestions || 0);
  const correct = Number(safeSummary.correct || 0);
  const incorrectQuestions = Array.isArray(safeSummary.incorrectQuestions)
    ? safeSummary.incorrectQuestions
    : [];
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="quiz-result-card fade-in">
        <h2 className="quiz-result-title">{title}</h2>
        <p className="quiz-result-score">{correct} von {total} richtig = {percentage} %</p>

        <div className="progress-container" style={{ maxWidth: '100%' }}>
          <div className="progress-bar" style={{ width: `${percentage}%` }} />
        </div>

        <div className="quiz-result-analysis">
          <h3>Fehler-Analyse</h3>
          {incorrectQuestions.length === 0 ? (
            <p className="quiz-result-empty">Stark! Du hast alle Fragen korrekt beantwortet.</p>
          ) : (
            <ul className="quiz-result-list">
              {incorrectQuestions.map((item, index) => (
                <li key={`${item.id || 'wrong'}_${index}`} className="quiz-result-item">
                  <p className="quiz-result-question">{item.question || 'Frage'}</p>
                  <p className="quiz-result-answer"><strong>Richtige Antwort:</strong> {item.correctAnswerText || 'Nicht hinterlegt'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {weakTopic && typeof onPracticeWeakTopic === 'function' && (
          <div className="quiz-result-cta">
            <p>Schwache Themen: <strong>{weakTopic}</strong> - nochmal ueben?</p>
            <button className="btn-secondary" onClick={() => onPracticeWeakTopic(weakTopic)}>
              Schwaches Thema ueben
            </button>
          </div>
        )}

        <div className="quiz-result-actions">
          <button className="btn-secondary" onClick={onBack}>Zum Menue</button>
          <button className="btn-primary" onClick={onRetry}>Nochmal spielen</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ResultSummary);
