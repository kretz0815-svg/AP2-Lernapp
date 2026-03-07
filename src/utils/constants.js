// ─── Storage Key Prefixes ───────────────────────────────────────
export const ANALYTICS_STORAGE_PREFIX = 'ap2_learning_analytics_';
export const CUSTOM_QUIZ_STORAGE_PREFIX = 'ap2_custom_quiz_questions_';
export const MEMBER_SYNC_PENDING_PREFIX = 'ap2_member_pending_sync_';
export const ACCESS_MODE_KEY = 'masterpat_access_mode';
export const CUSTOM_BACKGROUND_COLOR_KEY = 'masterpat_custom_background_color';
export const BACKGROUND_SETTINGS_KEY = 'masterpat_background_settings';

// ─── Background Presets ─────────────────────────────────────────
export const BACKGROUND_PRESETS = [
    { id: 'ocean', name: 'Ocean', color: '#0b2239', glow1: 'rgba(34, 211, 238, 0.2)', glow2: 'rgba(59, 130, 246, 0.18)' },
    { id: 'forest', name: 'Forest', color: '#0f2f27', glow1: 'rgba(34, 197, 94, 0.22)', glow2: 'rgba(16, 185, 129, 0.16)' },
    { id: 'sunset', name: 'Sunset', color: '#3b1f2d', glow1: 'rgba(251, 146, 60, 0.24)', glow2: 'rgba(244, 63, 94, 0.16)' },
    { id: 'sand', name: 'Sand', color: '#2a241f', glow1: 'rgba(245, 158, 11, 0.2)', glow2: 'rgba(251, 191, 36, 0.16)' },
    { id: 'graphite', name: 'Graphite', color: '#111827', glow1: 'rgba(148, 163, 184, 0.2)', glow2: 'rgba(99, 102, 241, 0.14)' }
];

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
