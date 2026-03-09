import { CONFIG, BACKGROUND_PRESETS } from '../config';

// ─── Re-export for compatibility ──────────────────────────────────
export { BACKGROUND_PRESETS };
export const ANALYTICS_STORAGE_PREFIX = CONFIG.storage.analyticsPrefix;
export const CUSTOM_QUIZ_STORAGE_PREFIX = CONFIG.storage.customQuizPrefix;
export const MEMBER_SYNC_PENDING_PREFIX = CONFIG.storage.syncPendingPrefix;
export const ACCESS_MODE_KEY = CONFIG.storage.accessMode;
export const CUSTOM_BACKGROUND_COLOR_KEY = CONFIG.storage.customBgColor;
export const BACKGROUND_SETTINGS_KEY = CONFIG.storage.bgSettings;

// ─── Data Factory Functions ─────────────────────────────────────
export const createEmptyAnalytics = () => ({
    events: [],
    mistakes: {},
    lastRefreshedAt: null
});

export const createEmptyMemberProgressData = () => ({
    wisor_progress: {},
    wisor_eco_progress: {},
    saved_notes: {},
    learning_analytics: createEmptyAnalytics(),
    custom_quiz_questions: []
});

// ─── ID Generation ──────────────────────────────────────────────
export const generateId = (text) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `card_${Math.abs(hash)}`;
};
