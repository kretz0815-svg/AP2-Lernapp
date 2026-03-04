const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const dayMs = 24 * 60 * 60 * 1000;

export const defaultDSRConfig = {
  desiredRetention: 0.9,
  minStabilityDays: 0.08,
  maxStabilityDays: 36500,
  minDifficulty: 1,
  maxDifficulty: 10,
  initialDifficulty: 5.2,
  initialStabilityDays: 0.6,
  maxFuzzPercent: 0.06,
};

export function calculateRetrievability(stabilityDays, elapsedDays) {
  const safeStability = Math.max(stabilityDays, defaultDSRConfig.minStabilityDays);
  const safeElapsed = Math.max(0, elapsedDays);
  return Math.exp(-safeElapsed / safeStability);
}

export function calculateIntervalDays(stabilityDays, desiredRetention = defaultDSRConfig.desiredRetention) {
  const retention = clamp(desiredRetention, 0.7, 0.99);
  const safeStability = Math.max(stabilityDays, defaultDSRConfig.minStabilityDays);
  return Math.max(defaultDSRConfig.minStabilityDays, -safeStability * Math.log(retention));
}

function computeDifficulty(previousDifficulty, rating) {
  const driftByRating = {
    1: 0.45,
    2: 0.18,
    3: -0.08,
    4: -0.22,
  };

  const next = previousDifficulty + (driftByRating[rating] ?? 0);
  return clamp(next, defaultDSRConfig.minDifficulty, defaultDSRConfig.maxDifficulty);
}

function computeStability(previousStability, difficulty, retrievability, rating, overdueRatio) {
  const safeStability = Math.max(previousStability, defaultDSRConfig.minStabilityDays);
  const difficultyPenalty = 1 + ((difficulty - 5) / 10);

  if (rating === 1) {
    const lapsePenalty = 0.22 + (difficulty / 20);
    return clamp(safeStability * (1 - lapsePenalty), defaultDSRConfig.minStabilityDays, defaultDSRConfig.maxStabilityDays);
  }

  const ratingBoost = {
    2: 1.12,
    3: 1.4,
    4: 1.85,
  };

  const recallGainBase = ratingBoost[rating] ?? 1.35;
  const forgettingBonus = 1 + (1 - retrievability) * 0.9;

  const overdueBonus = overdueRatio > 1
    ? 1 + Math.min(1.5, Math.log1p(overdueRatio - 1) * 0.65)
    : 1;

  const growthMultiplier = recallGainBase * forgettingBonus * overdueBonus;
  const next = safeStability + ((safeStability * (growthMultiplier - 1)) / difficultyPenalty);
  return clamp(next, defaultDSRConfig.minStabilityDays, defaultDSRConfig.maxStabilityDays);
}

function applyFuzz(intervalDays, taskId, reviewCount, maxFuzzPercent = defaultDSRConfig.maxFuzzPercent) {
  if (!intervalDays || intervalDays <= 1) return intervalDays;

  const seedSource = `${taskId || 'task'}:${reviewCount || 0}`;
  let hash = 0;
  for (let i = 0; i < seedSource.length; i++) {
    hash = ((hash << 5) - hash) + seedSource.charCodeAt(i);
    hash |= 0;
  }

  const normalized = ((Math.abs(hash) % 1000) / 1000) * 2 - 1;
  const fuzzFactor = 1 + normalized * maxFuzzPercent;
  return Math.max(defaultDSRConfig.minStabilityDays, intervalDays * fuzzFactor);
}

export function initializeDSRState(now = Date.now(), config = {}) {
  const merged = { ...defaultDSRConfig, ...config };
  const initialInterval = calculateIntervalDays(merged.initialStabilityDays, merged.desiredRetention);
  return {
    difficulty: merged.initialDifficulty,
    stability: merged.initialStabilityDays,
    retrievability: 1,
    desiredRetention: merged.desiredRetention,
    reviewCount: 0,
    lapseCount: 0,
    elapsedDays: 0,
    scheduledDays: initialInterval,
    lastRating: null,
    lastOutcome: 'new',
    lastReviewedAt: null,
    dueDate: new Date(now).toISOString(),
  };
}

export function reviewDSRState(previousState, {
  rating,
  reviewedAt = new Date(),
  taskId,
  config = {},
} = {}) {
  const mergedConfig = { ...defaultDSRConfig, ...config };
  const normalizedRating = clamp(Number(rating) || 3, 1, 4);

  const prior = previousState || initializeDSRState(reviewedAt.getTime(), mergedConfig);

  const reviewedAtDate = new Date(reviewedAt);
  const previousReviewDate = prior.lastReviewedAt ? new Date(prior.lastReviewedAt) : reviewedAtDate;
  const previousDueDate = prior.dueDate ? new Date(prior.dueDate) : previousReviewDate;

  const elapsedDays = Math.max(0, (reviewedAtDate.getTime() - previousReviewDate.getTime()) / dayMs);
  const scheduledDays = Math.max(prior.scheduledDays || mergedConfig.minStabilityDays, mergedConfig.minStabilityDays);
  const overdueRatio = elapsedDays > 0 ? elapsedDays / scheduledDays : 0;

  const retrievability = calculateRetrievability(prior.stability || mergedConfig.initialStabilityDays, elapsedDays);
  const difficulty = computeDifficulty(prior.difficulty || mergedConfig.initialDifficulty, normalizedRating);
  const stability = computeStability(
    prior.stability || mergedConfig.initialStabilityDays,
    difficulty,
    retrievability,
    normalizedRating,
    overdueRatio
  );

  const intervalBeforeFuzz = calculateIntervalDays(stability, mergedConfig.desiredRetention);
  const reviewCount = (prior.reviewCount || 0) + 1;
  const intervalDays = applyFuzz(intervalBeforeFuzz, taskId, reviewCount, mergedConfig.maxFuzzPercent);

  const dueDate = new Date(reviewedAtDate.getTime() + intervalDays * dayMs);

  return {
    difficulty,
    stability,
    retrievability,
    desiredRetention: mergedConfig.desiredRetention,
    reviewCount,
    lapseCount: (prior.lapseCount || 0) + (normalizedRating === 1 ? 1 : 0),
    elapsedDays,
    scheduledDays: intervalDays,
    lastRating: normalizedRating,
    lastOutcome: normalizedRating === 1 ? 'forgot' : 'recalled',
    lastReviewedAt: reviewedAtDate.toISOString(),
    dueDate: dueDate.toISOString(),
    wasOverdue: reviewedAtDate > previousDueDate,
    overdueRatio,
  };
}
