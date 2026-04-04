const DAY_MS = 24 * 60 * 60 * 1000;

export const MULTI_CHOICE_REPEAT_MODES = {
  ONCE: 'once',
  TWICE: 'twice',
  SPACED: 'spaced'
};

const normalizeRepeatMode = (mode) => {
  if (mode === MULTI_CHOICE_REPEAT_MODES.ONCE) return MULTI_CHOICE_REPEAT_MODES.ONCE;
  if (mode === MULTI_CHOICE_REPEAT_MODES.SPACED) return MULTI_CHOICE_REPEAT_MODES.SPACED;
  return MULTI_CHOICE_REPEAT_MODES.TWICE;
};

export const getRequiredCorrectAnswers = (mode) => (
  normalizeRepeatMode(mode) === MULTI_CHOICE_REPEAT_MODES.ONCE ? 1 : 2
);

export const DEFAULT_QUIZ_PROGRESS = {
  rep: 0,
  ef: 2.5,
  interval: 0,
  nextReview: 0,
  correctAnswersCount: 0,
  isLearned: false,
  isActive: true
};

export function isQuizDue(progress, now = Date.now(), mode = MULTI_CHOICE_REPEAT_MODES.TWICE) {
  const repeatMode = normalizeRepeatMode(mode);
  const learnedByFlag = !!progress?.isLearned;
  const correctAnswersCount = Number(progress?.correctAnswersCount ?? progress?.rep ?? 0) || 0;
  const requiredCorrectAnswers = getRequiredCorrectAnswers(repeatMode);
  if (learnedByFlag) return false;

  if (repeatMode === MULTI_CHOICE_REPEAT_MODES.SPACED) {
    const nextReview = Number(progress?.nextReview || 0) || 0;
    if (correctAnswersCount > 0 && nextReview > now) {
      return false;
    }
  }

  return correctAnswersCount < requiredCorrectAnswers;
}

export function filterDueQuizzes(quizzes, progressById = {}, now = Date.now(), mode = MULTI_CHOICE_REPEAT_MODES.TWICE) {
  return (quizzes || []).filter((quiz) => {
    const effectiveProgress = progressById?.[quiz.id] || quiz.progress || DEFAULT_QUIZ_PROGRESS;
    return isQuizDue(effectiveProgress, now, mode);
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
export function computeNextQuizProgress(previousProgress, isCorrect, now = Date.now(), mode = MULTI_CHOICE_REPEAT_MODES.TWICE) {
  const repeatMode = normalizeRepeatMode(mode);
  const prior = previousProgress || DEFAULT_QUIZ_PROGRESS;
  let correctAnswersCount = Number(prior.correctAnswersCount ?? prior.rep ?? 0) || 0;
  const ef = Number(prior.ef) || 2.5;
  let interval = Number(prior.interval) || 0;
  const requiredCorrectAnswers = getRequiredCorrectAnswers(repeatMode);

  if (isCorrect) {
    correctAnswersCount += 1;
  }

  const isLearned = correctAnswersCount >= requiredCorrectAnswers;
  let nextReview = isLearned ? now + (36500 * DAY_MS) : 0;

  if (!isLearned && repeatMode === MULTI_CHOICE_REPEAT_MODES.SPACED && isCorrect) {
    const spacingDays = correctAnswersCount >= 2 ? 3 : 1;
    interval = spacingDays;
    nextReview = now + (spacingDays * DAY_MS);
  }

  if (!isLearned && repeatMode !== MULTI_CHOICE_REPEAT_MODES.SPACED) {
    interval = 0;
    nextReview = 0;
  }

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
