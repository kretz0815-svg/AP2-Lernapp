const DAY_MS = 24 * 60 * 60 * 1000;
const ONE_MINUTE_AS_DAYS = 1 / (24 * 60);

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

export function computeNextQuizProgress(previousProgress, isCorrect, now = Date.now()) {
  const prior = previousProgress || DEFAULT_QUIZ_PROGRESS;
  let rep = Number(prior.rep) || 0;
  const ef = Number(prior.ef) || 2.5;
  let interval = Number(prior.interval) || 0;

  if (isCorrect) {
    if (rep === 0) interval = 1;
    else if (rep === 1) interval = 6;
    else interval = Math.round(interval * ef);
    rep += 1;
  } else {
    rep = 0;
    interval = ONE_MINUTE_AS_DAYS;
  }

  return {
    rep,
    ef,
    interval,
    nextReview: now + (interval * DAY_MS)
  };
}
