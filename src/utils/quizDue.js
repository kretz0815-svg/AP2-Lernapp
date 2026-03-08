const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_QUIZ_PROGRESS = {
  rep: 0,
  ef: 2.5,
  interval: 0,
  nextReview: 0
};

export function isQuizDue(progress, now = Date.now()) {
  return (progress?.nextReview || 0) <= now;
}

export function filterDueQuizzes(quizzes, progressById = {}, now = Date.now()) {
  return (quizzes || []).filter((quiz) => {
    const effectiveProgress = progressById?.[quiz.id] || quiz.progress || DEFAULT_QUIZ_PROGRESS;
    return isQuizDue(effectiveProgress, now);
  });
}

/**
 * Berechnet den nächsten Wiederholungs-Termin nach einer Quiz-Antwort.
 *
 * Regeln (wie vom User gewünscht):
 *   1. Richtig beantwortet (rep 0 → 1): Frage verschwindet für 24 Stunden
 *   2. Richtig beantwortet (rep 1 → 2): Frage verschwindet für 365 Tage (~"raus aus Pool")
 *   3. Nochmal richtig danach: Intervall wächst weiter (ef * vorheriges Intervall)
 *   4. Falsch beantwortet: Reset, Frage kommt sofort wieder (1 Minute Cooldown)
 */
export function computeNextQuizProgress(previousProgress, isCorrect, now = Date.now()) {
  const prior = previousProgress || DEFAULT_QUIZ_PROGRESS;
  let rep = Number(prior.rep) || 0;
  const ef = Number(prior.ef) || 2.5;
  let interval = Number(prior.interval) || 0;

  if (isCorrect) {
    if (rep === 0) {
      // Erste richtige Antwort: 24 Stunden Cooldown
      interval = 1;
    } else if (rep === 1) {
      // Zweite richtige Antwort: raus aus dem Pool (365 Tage)
      interval = 365;
    } else {
      // Danach: normales Spaced-Repetition-Wachstum
      interval = Math.round(interval * ef);
    }
    rep += 1;
  } else {
    // Falsch: komplett zurücksetzen
    rep = 0;
    interval = 1 / (24 * 60); // 1 Minute
  }

  return {
    rep,
    ef,
    interval,
    nextReview: now + (interval * DAY_MS)
  };
}
