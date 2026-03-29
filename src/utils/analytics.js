import {
    ANALYTICS_STORAGE_PREFIX,
    CUSTOM_QUIZ_STORAGE_PREFIX,
    CUSTOM_MARKETING_REVIEW_STORAGE_PREFIX,
    PROFILE_SETTINGS_STORAGE_PREFIX,
    createEmptyAnalytics
} from './constants.js';

// ─── Identity Normalization ─────────────────────────────────────
export const normalizeAnalyticsIdentity = (identity) => {
    return String(identity || 'guest')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9@._-]+/g, '_');
};

export const resolveStorageIdentity = (user) => {
    if (!user) return 'guest';
    return user.id || user.email || 'guest';
};

// ─── Per-User Storage Keys ──────────────────────────────────────
export const getAppearanceKey = (user) => {
    const identity = normalizeAnalyticsIdentity(resolveStorageIdentity(user));
    return `masterpat_appearance_${identity}`;
};

export const getThemeKey = (user) => {
    const identity = normalizeAnalyticsIdentity(resolveStorageIdentity(user));
    return `masterpat_theme_${identity}`;
};

export const getAnalyticsStorageKey = (user) => {
    const identity = resolveStorageIdentity(user);
    return `${ANALYTICS_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
};

export const getCustomQuizStorageKey = (user) => {
    const identity = resolveStorageIdentity(user);
    return `${CUSTOM_QUIZ_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
};

export const getCustomMarketingReviewStorageKey = (user) => {
    const identity = resolveStorageIdentity(user);
    return `${CUSTOM_MARKETING_REVIEW_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
};

export const getProfileSettingsStorageKey = (user) => {
    const identity = resolveStorageIdentity(user);
    return `${PROFILE_SETTINGS_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
};

// ─── Load from localStorage ─────────────────────────────────────
export const loadAnalyticsForUser = (user) => {
    try {
        return JSON.parse(localStorage.getItem(getAnalyticsStorageKey(user))) || createEmptyAnalytics();
    } catch {
        return createEmptyAnalytics();
    }
};

export const loadCustomQuizForUser = (user) => {
    try {
        const raw = JSON.parse(localStorage.getItem(getCustomQuizStorageKey(user)) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
};

export const loadCustomMarketingReviewForUser = (user) => {
    try {
        const raw = JSON.parse(localStorage.getItem(getCustomMarketingReviewStorageKey(user)) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
};

export const loadProfileSettingsForUser = (user) => {
    try {
        const raw = JSON.parse(localStorage.getItem(getProfileSettingsStorageKey(user)) || 'null');
        if (!raw || typeof raw !== 'object') return null;
        return {
            displayName: String(raw.displayName || '').trim(),
            avatarDataUrl: String(raw.avatarDataUrl || '').trim(),
            updatedAt: raw.updatedAt || null
        };
    } catch {
        return null;
    }
};

// ─── Learning Event Keys ────────────────────────────────────────
export const getLearningEventKey = ({ mode, questionId, questionText }) => {
    const normalizedMode = String(mode || 'unknown').trim().toLowerCase();
    const normalizedQuestionId = String(questionId || '').trim();
    const fallbackText = String(questionText || '')
        .trim()
        .toLowerCase()
        .slice(0, 120);
    return `${normalizedMode}::${normalizedQuestionId || fallbackText}`;
};
