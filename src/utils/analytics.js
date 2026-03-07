import {
    ANALYTICS_STORAGE_PREFIX,
    CUSTOM_QUIZ_STORAGE_PREFIX,
    createEmptyAnalytics
} from './constants';

// ─── Identity Normalization ─────────────────────────────────────
export const normalizeAnalyticsIdentity = (identity) => {
    return String(identity || 'guest')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9@._-]+/g, '_');
};

// ─── Per-User Storage Keys ──────────────────────────────────────
export const getAppearanceKey = (user) => {
    const identity = normalizeAnalyticsIdentity(user?.email || 'guest');
    return `masterpat_appearance_${identity}`;
};

export const getThemeKey = (user) => {
    const identity = normalizeAnalyticsIdentity(user?.email || 'guest');
    return `masterpat_theme_${identity}`;
};

export const getAnalyticsStorageKey = (user) => {
    const identity = user?.email || 'guest';
    return `${ANALYTICS_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
};

export const getCustomQuizStorageKey = (user) => {
    const identity = user?.email || 'guest';
    return `${CUSTOM_QUIZ_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
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
