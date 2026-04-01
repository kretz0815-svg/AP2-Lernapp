const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_QUIZ_PROGRESS = {
  rep: 0,
  ef: 2.5,
  interval: 0,
  nextReview: 0,
  correctAnswersCount: 0,
  isLearned: false,
  isActive: true
};

export function isQuizDue(progress, now = Date.now()) {
  const learnedByFlag = !!progress?.isLearned;
  const correctAnswersCount = Number(progress?.correctAnswersCount ?? progress?.rep ?? 0) || 0;
  if (learnedByFlag) return false;
  return correctAnswersCount < 2;
}

export function filterDueQuizzes(quizzes, progressById = {}, now = Date.now()) {
  return (quizzes || []).filter((quiz) => {
    const effectiveProgress = progressById?.[quiz.id] || quiz.progress || DEFAULT_QUIZ_PROGRESS;
    return isQuizDue(effectiveProgress, now);
  });
}

/**
 * Berechnet den nächsten Lernstand nach einer Quiz-Antwort.
 *
 * Regeln (wie vom User gewünscht):
 *   1. Nur die Anzahl korrekter Antworten zählt (kein Zeitfaktor)
 *   2. Nach zwei korrekten Antworten gilt eine Frage als gelernt und verlässt den aktiven Pool
 *   3. Falsche Antworten reduzieren den Zähler nicht, die Frage bleibt aktiv bis 2x korrekt
 */
export function computeNextQuizProgress(previousProgress, isCorrect, now = Date.now()) {
  const prior = previousProgress || DEFAULT_QUIZ_PROGRESS;
  let correctAnswersCount = Number(prior.correctAnswersCount ?? prior.rep ?? 0) || 0;
  const ef = Number(prior.ef) || 2.5;
  const interval = Number(prior.interval) || 0;

  if (isCorrect) {
    correctAnswersCount += 1;
  }

  const isLearned = correctAnswersCount >= 2;
  const nextReview = isLearned ? now + (36500 * DAY_MS) : 0;

  return {
    rep: correctAnswersCount,
    ef,
    interval,
    nextReview,
    correctAnswersCount,
    isLearned,
    isActive: !isLearned
  };
}
