/**
 * Zentralisierte Konfiguration für die MasterPat App.
 * Enthält API-Keys, URLs und globale Einstellungen.
 */

export const CONFIG = {
    // Supabase Konfiguration
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || 'https://bvnjhvrgvebrjbizbssv.supabase.co',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmpodnJndmVicmpiaXpic3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzY0MzYsImV4cCI6MjA4NzcxMjQzNn0.6_OwrntdSBJesWHKqm_oKlJ4kXWbUalDrADA3rOK7gk',
    },

    // OAuth Konfiguration
    auth: {
        oauthRedirectTo: import.meta.env.VITE_OAUTH_REDIRECT_TO || undefined,
    },

    // KI-Dienste Konfiguration
    ai: {
        geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
        deepseekApiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
        deepseekUrl: 'https://api.deepseek.com/chat/completions',
        geminiModels: ['gemini-2.5-flash', 'gemini-2.0-flash'],
    },

    // YouTube Konfiguration
    youtube: {
        apiKey: import.meta.env.VITE_YOUTUBE_API_KEY,
    },

    // LocalStorage Keys
    storage: {
        analyticsPrefix: 'ap2_learning_analytics_',
        customQuizPrefix: 'ap2_custom_quiz_questions_',
        syncPendingPrefix: 'ap2_member_pending_sync_',
        accessMode: 'masterpat_access_mode',
        customBgColor: 'masterpat_custom_background_color',
        bgSettings: 'masterpat_background_settings',
        quizProgress: 'ap2_quiz_progress',
        wisorProgress: 'ap2_wisor_progress',
        wisorEcoProgress: 'ap2_wisor_eco_progress',
        savedNotes: 'ap2_saved_notes'
    }
};

export const BACKGROUND_PRESETS = [
    { id: 'ocean', name: 'Ocean', color: '#0b2239', glow1: 'rgba(34, 211, 238, 0.2)', glow2: 'rgba(59, 130, 246, 0.18)' },
    { id: 'forest', name: 'Forest', color: '#0f2f27', glow1: 'rgba(34, 197, 94, 0.22)', glow2: 'rgba(16, 185, 129, 0.16)' },
    { id: 'sunset', name: 'Sunset', color: '#3b1f2d', glow1: 'rgba(251, 146, 60, 0.24)', glow2: 'rgba(244, 63, 94, 0.16)' },
    { id: 'sand', name: 'Sand', color: '#2a241f', glow1: 'rgba(245, 158, 11, 0.2)', glow2: 'rgba(251, 191, 36, 0.16)' },
    { id: 'graphite', name: 'Graphite', color: '#111827', glow1: 'rgba(148, 163, 184, 0.2)', glow2: 'rgba(99, 102, 241, 0.14)' }
];
