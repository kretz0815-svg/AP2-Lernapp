export function mapInteractionToRating({
  isCorrect,
  attempt = 1,
  responseMs = null,
  wasSecondTry = false,
} = {}) {
  if (!isCorrect) return 1;

  const lateResponse = typeof responseMs === 'number' && responseMs > 9000;
  const veryFastResponse = typeof responseMs === 'number' && responseMs < 2500;

  if (attempt > 1 || wasSecondTry || lateResponse) return 2;
  if (veryFastResponse) return 4;
  return 3;
}

export function mapQuizAnswerToRating({ isCorrect, attempt = 1, responseMs = null } = {}) {
  return mapInteractionToRating({ isCorrect, attempt, responseMs });
}

export function mapWisorAnswerToRating({ isCorrect, attempt = 1, responseMs = null } = {}) {
  return mapInteractionToRating({ isCorrect, attempt, responseMs });
}

export function mapFlashcardQualityToRating(quality) {
  if (quality <= 1) return 1;
  if (quality <= 2) return 2;
  if (quality <= 4) return 3;
  return 4;
}
