import React, { useState, useEffect, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { createPortal } from 'react-dom';
import './index.css';
import flashcards1 from './data/flashcards_1.json';
import flashcards2 from './data/flashcards_2.json';
import flashcards3 from './data/flashcards_3.json';

import quiz1 from './data/quiz_1.json';
import quiz2 from './data/quiz_2.json';
import quiz3 from './data/quiz_3.json';
import quizUForm2 from './data/uform2_quiz.json';
import notesIcon from './assets/book-line-icon.png';

import wisor1 from './data/wisor_1.json';
import wisorEco from './data/wisor_eco.json';

import { supabase } from './supabaseClient';
import { askGemini } from './geminiClient';
import { fetchYouTubeVideos } from './youtubeClient';
import FloatingNotes from './components/FloatingNotes';
import FloatingCalculator from './components/FloatingCalculator';
import FloatingImage from './components/FloatingImage';
import BurgerMenu from './components/BurgerMenu';
import QuestionManager from './components/QuestionManager';
import PomodoroTimer from './components/PomodoroTimer';
import KalkulationsBoss from './components/KalkulationsBoss';
import BreakEvenPoint from './components/BreakEvenPoint';
import { mapQuizAnswerToRating, mapWisorAnswerToRating, mapFlashcardQualityToRating } from './services/srsFeedbackMapper';
import { reviewTaskWithDSR, getTaskProgressByType, clearTaskProgressByType } from './services/srsStore';

const ANALYTICS_STORAGE_PREFIX = 'ap2_learning_analytics_';
const CUSTOM_QUIZ_STORAGE_PREFIX = 'ap2_custom_quiz_questions_';
const MEMBER_SYNC_PENDING_PREFIX = 'ap2_member_pending_sync_';
const ACCESS_MODE_KEY = 'masterpat_access_mode';
const CUSTOM_BACKGROUND_COLOR_KEY = 'masterpat_custom_background_color';
const BACKGROUND_SETTINGS_KEY = 'masterpat_background_settings';

const BACKGROUND_PRESETS = [
  { id: 'ocean', name: 'Ocean', color: '#0b2239', glow1: 'rgba(34, 211, 238, 0.2)', glow2: 'rgba(59, 130, 246, 0.18)' },
  { id: 'forest', name: 'Forest', color: '#0f2f27', glow1: 'rgba(34, 197, 94, 0.22)', glow2: 'rgba(16, 185, 129, 0.16)' },
  { id: 'sunset', name: 'Sunset', color: '#3b1f2d', glow1: 'rgba(251, 146, 60, 0.24)', glow2: 'rgba(244, 63, 94, 0.16)' },
  { id: 'sand', name: 'Sand', color: '#2a241f', glow1: 'rgba(245, 158, 11, 0.2)', glow2: 'rgba(251, 191, 36, 0.16)' },
  { id: 'graphite', name: 'Graphite', color: '#111827', glow1: 'rgba(148, 163, 184, 0.2)', glow2: 'rgba(99, 102, 241, 0.14)' }
];

const createEmptyAnalytics = () => ({
  events: [],
  mistakes: {},
  lastRefreshedAt: null
});

const normalizeAnalyticsIdentity = (identity) => {
  return String(identity || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '_');
};

const getAnalyticsStorageKey = (user) => {
  const identity = user?.email || 'guest';
  return `${ANALYTICS_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
};

const getCustomQuizStorageKey = (user) => {
  const identity = user?.email || 'guest';
  return `${CUSTOM_QUIZ_STORAGE_PREFIX}${normalizeAnalyticsIdentity(identity)}`;
};

const loadAnalyticsForUser = (user) => {
  try {
    return JSON.parse(localStorage.getItem(getAnalyticsStorageKey(user))) || createEmptyAnalytics();
  } catch {
    return createEmptyAnalytics();
  }
};

const loadCustomQuizForUser = (user) => {
  try {
    const raw = JSON.parse(localStorage.getItem(getCustomQuizStorageKey(user)) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const createEmptyMemberProgressData = () => ({
  wisor_progress: {},
  wisor_eco_progress: {},
  saved_notes: {},
  learning_analytics: createEmptyAnalytics(),
  custom_quiz_questions: []
});

const generateId = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `card_${Math.abs(hash)}`;
};

const isValidHexColor = (value) => /^#([A-Fa-f0-9]{6})$/.test(String(value || '').trim());

const hexToRgb = (hexColor) => {
  const clean = hexColor.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
};

const clearBackgroundLayers = () => {
  document.body.style.removeProperty('--app-bg-image');
  document.body.style.removeProperty('--app-bg-image-overlay');
};

const applyBackgroundEffectsVisibility = (enabled) => {
  if (enabled) {
    document.body.classList.remove('no-bg-effects');
  } else {
    document.body.classList.add('no-bg-effects');
  }
};

const applyCustomBackgroundColor = (hexColor) => {
  clearBackgroundLayers();

  if (!isValidHexColor(hexColor)) {
    document.body.style.removeProperty('--app-bg-color');
    document.body.style.removeProperty('--app-glow-1');
    document.body.style.removeProperty('--app-glow-2');
    return;
  }

  const { r, g, b } = hexToRgb(hexColor);
  document.body.style.setProperty('--app-bg-color', hexColor);
  document.body.style.setProperty('--app-glow-1', `rgba(${r}, ${g}, ${b}, 0.22)`);
  document.body.style.setProperty('--app-glow-2', `rgba(${r}, ${g}, ${b}, 0.12)`);
};

const applyPresetBackground = (presetId) => {
  const preset = BACKGROUND_PRESETS.find((item) => item.id === presetId);
  if (!preset) {
    document.body.style.removeProperty('--app-bg-color');
    document.body.style.removeProperty('--app-glow-1');
    document.body.style.removeProperty('--app-glow-2');
    clearBackgroundLayers();
    return;
  }

  clearBackgroundLayers();
  document.body.style.setProperty('--app-bg-color', preset.color);
  document.body.style.setProperty('--app-glow-1', preset.glow1);
  document.body.style.setProperty('--app-glow-2', preset.glow2);
};

const applyUploadedBackground = (imageData, fallbackColor) => {
  if (!imageData) {
    clearBackgroundLayers();
    return;
  }

  const color = isValidHexColor(fallbackColor) ? fallbackColor : '#0f172a';
  const { r, g, b } = hexToRgb(color);

  document.body.style.setProperty('--app-bg-color', color);
  document.body.style.setProperty('--app-glow-1', `rgba(${r}, ${g}, ${b}, 0.24)`);
  document.body.style.setProperty('--app-glow-2', `rgba(${r}, ${g}, ${b}, 0.14)`);
  document.body.style.setProperty('--app-bg-image', `url("${imageData}")`);
  document.body.style.setProperty('--app-bg-image-overlay', 'linear-gradient(135deg, rgba(2, 6, 23, 0.65), rgba(2, 6, 23, 0.35))');
};

function App() {
  const [appMode, setAppMode] = useState(localStorage.getItem('masterpat_auth') === 'true' ? 'dashboard' : 'auth'); // 'auth', 'dashboard', 'quiz', 'wisor'
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_HCAPTCHA_SITEKEY || '';

  // --- THEME STATE ---
  const [isLightMode, setIsLightMode] = useState(false);
  const [customBackgroundColor, setCustomBackgroundColor] = useState('');
  const [backgroundMode, setBackgroundMode] = useState('default');
  const [backgroundPresetId, setBackgroundPresetId] = useState('');
  const [backgroundImageData, setBackgroundImageData] = useState('');
  const [backgroundEffectsEnabled, setBackgroundEffectsEnabled] = useState(true);
  const [appearanceNotice, setAppearanceNotice] = useState('');
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const persistBackgroundSettings = (settings) => {
    try {
      localStorage.setItem(BACKGROUND_SETTINGS_KEY, JSON.stringify(settings));
      localStorage.removeItem(CUSTOM_BACKGROUND_COLOR_KEY);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('masterpat_theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.body.classList.add('light-theme');
    }

    try {
      const savedSettingsRaw = localStorage.getItem(BACKGROUND_SETTINGS_KEY);
      if (savedSettingsRaw) {
        const savedSettings = JSON.parse(savedSettingsRaw);
        const savedMode = savedSettings?.mode || 'default';
        const savedColor = savedSettings?.color || '';
        const savedPreset = savedSettings?.presetId || '';
        const savedImage = savedSettings?.imageData || '';
        const savedEffectsEnabled = savedSettings?.effectsEnabled !== false;

        setBackgroundMode(savedMode);
        setCustomBackgroundColor(savedColor);
        setBackgroundPresetId(savedPreset);
        setBackgroundImageData(savedImage);
        setBackgroundEffectsEnabled(savedEffectsEnabled);
        applyBackgroundEffectsVisibility(savedEffectsEnabled);

        if (savedMode === 'preset' && savedPreset) {
          applyPresetBackground(savedPreset);
        } else if (savedMode === 'upload' && savedImage) {
          applyUploadedBackground(savedImage, savedColor);
        } else if (savedMode === 'color' && isValidHexColor(savedColor)) {
          applyCustomBackgroundColor(savedColor);
        }
        return;
      }
    } catch {
      // Ignore invalid stored settings and continue with legacy key fallback.
    }

    const legacySavedColor = localStorage.getItem(CUSTOM_BACKGROUND_COLOR_KEY);
    if (isValidHexColor(legacySavedColor)) {
      setBackgroundMode('color');
      setCustomBackgroundColor(legacySavedColor);
      setBackgroundEffectsEnabled(true);
      applyBackgroundEffectsVisibility(true);
      applyCustomBackgroundColor(legacySavedColor);
      persistBackgroundSettings({ mode: 'color', color: legacySavedColor, presetId: '', imageData: '', effectsEnabled: true });
    }
  }, []);

  useEffect(() => {
    if (appMode !== 'dashboard') {
      setSettingsMenuOpen(false);
    }
  }, [appMode]);

  const toggleTheme = () => {
    setIsLightMode(prev => {
      const newVal = !prev;
      if (newVal) {
        document.body.classList.add('light-theme');
        localStorage.setItem('masterpat_theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('masterpat_theme', 'dark');
      }
      return newVal;
    });
  };

  const activeBackgroundColor = customBackgroundColor || (isLightMode ? '#f8fafc' : '#0f172a');
  const colorPickerValue = isValidHexColor(activeBackgroundColor) ? activeBackgroundColor : (isLightMode ? '#f8fafc' : '#0f172a');

  const handleBackgroundColorChange = (nextColor) => {
    setBackgroundMode('color');
    setBackgroundPresetId('');
    setBackgroundImageData('');
    setAppearanceNotice('');
    setCustomBackgroundColor(nextColor);
    persistBackgroundSettings({ mode: 'color', color: nextColor, presetId: '', imageData: '', effectsEnabled: backgroundEffectsEnabled });
    applyCustomBackgroundColor(nextColor);
  };

  const handleBackgroundPresetChange = (presetId) => {
    const preset = BACKGROUND_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    setBackgroundMode('preset');
    setBackgroundPresetId(presetId);
    setBackgroundImageData('');
    setCustomBackgroundColor(preset.color);
    setAppearanceNotice('');
    persistBackgroundSettings({ mode: 'preset', color: preset.color, presetId, imageData: '', effectsEnabled: backgroundEffectsEnabled });
    applyPresetBackground(presetId);
  };

  const handleBackgroundEffectsToggle = (enabled) => {
    setBackgroundEffectsEnabled(enabled);
    applyBackgroundEffectsVisibility(enabled);
    setAppearanceNotice('');
    persistBackgroundSettings({
      mode: backgroundMode,
      color: customBackgroundColor,
      presetId: backgroundPresetId,
      imageData: backgroundImageData,
      effectsEnabled: enabled
    });
  };

  const handleBackgroundUpload = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAppearanceNotice('Bitte waehle eine Bilddatei (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 2_500_000) {
      setAppearanceNotice('Datei ist zu gross. Bitte ein Bild unter 2.5 MB waehlen.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:image/')) {
        setAppearanceNotice('Bild konnte nicht geladen werden.');
        return;
      }

      const fallbackColor = isValidHexColor(customBackgroundColor) ? customBackgroundColor : '#0f172a';
      const saved = persistBackgroundSettings({ mode: 'upload', color: fallbackColor, presetId: '', imageData: dataUrl, effectsEnabled: backgroundEffectsEnabled });
      if (!saved) {
        setAppearanceNotice('Speichern fehlgeschlagen. Bitte ein kleineres Bild waehlen.');
        return;
      }

      setBackgroundMode('upload');
      setBackgroundPresetId('');
      setBackgroundImageData(dataUrl);
      setCustomBackgroundColor(fallbackColor);
      setAppearanceNotice('Eigenes Bild gespeichert und aktiviert.');
      applyUploadedBackground(dataUrl, fallbackColor);
    };
    reader.onerror = () => setAppearanceNotice('Bild konnte nicht gelesen werden.');
    reader.readAsDataURL(file);
  };

  const resetBackgroundColor = () => {
    setBackgroundMode('default');
    setBackgroundEffectsEnabled(true);
    setCustomBackgroundColor('');
    setBackgroundPresetId('');
    setBackgroundImageData('');
    setAppearanceNotice('Standard-Hintergrund wieder aktiv.');
    localStorage.removeItem(BACKGROUND_SETTINGS_KEY);
    localStorage.removeItem(CUSTOM_BACKGROUND_COLOR_KEY);
    applyBackgroundEffectsVisibility(true);
    applyCustomBackgroundColor('');
    clearBackgroundLayers();
  };

  // --- AUTH STATE ---
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const SECRET_PIN = '261115'; // Das Passwort, das du später ändern kannst

  const clearGuestProgressData = () => {
    localStorage.removeItem('ap2_srs_progress');
    localStorage.removeItem('ap2_quiz_progress');
    localStorage.removeItem('ap2_wisor_progress');
    localStorage.removeItem('ap2_wisor_eco_progress');
    localStorage.removeItem('ap2_saved_notes');
    localStorage.removeItem(getAnalyticsStorageKey(null));
    localStorage.removeItem(getCustomQuizStorageKey(null));
  };

  const getPendingSyncStorageKey = (userId) => `${MEMBER_SYNC_PENDING_PREFIX}${userId}`;

  const persistPendingMemberSync = (userId, payload) => {
    if (!userId) return;
    localStorage.setItem(getPendingSyncStorageKey(userId), JSON.stringify({
      payload,
      timestamp: Date.now()
    }));
  };

  const readPendingMemberSync = (userId) => {
    if (!userId) return null;
    try {
      return JSON.parse(localStorage.getItem(getPendingSyncStorageKey(userId)) || 'null');
    } catch {
      return null;
    }
  };

  const clearPendingMemberSync = (userId) => {
    if (!userId) return;
    localStorage.removeItem(getPendingSyncStorageKey(userId));
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!captchaToken) { setAuthMsg('Bitte bestätige das Captcha.'); return; }
    setAuthLoading(true);
    setAuthMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    if (error) { setAuthMsg(error.message); setAuthLoading(false); }
    else {
      setAuthMsg('Erfolgreich eingeloggt! Lade Account...');
      if (localStorage.getItem(ACCESS_MODE_KEY) === 'guest') {
        clearGuestProgressData();
      }
      localStorage.setItem('masterpat_auth', 'true');
      localStorage.setItem(ACCESS_MODE_KEY, 'member');
      window.location.reload();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!captchaToken) { setAuthMsg('Bitte bestätige das Captcha.'); return; }
    setAuthLoading(true);
    setAuthMsg('');
    const { error, data } = await supabase.auth.signUp({ email, password, options: { captchaToken } });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    if (error) { setAuthMsg(error.message); setAuthLoading(false); }
    else {
      setAuthMsg('Account erstellt! Logge ein...');
      if (data?.session) {
        if (localStorage.getItem(ACCESS_MODE_KEY) === 'guest') {
          clearGuestProgressData();
        }
        localStorage.setItem('masterpat_auth', 'true');
        localStorage.setItem(ACCESS_MODE_KEY, 'member');
        window.location.reload();
      }
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthMsg('');
    setAuthLoading(true);

    const redirectTo = import.meta.env.VITE_OAUTH_REDIRECT_TO || window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) {
      setAuthMsg('Fehler beim Google-Login: ' + error.message);
      setAuthLoading(false);
    } else {
      localStorage.setItem(ACCESS_MODE_KEY, 'member');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('masterpat_auth');
    localStorage.removeItem(ACCESS_MODE_KEY);
    window.location.reload();
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (localStorage.getItem(ACCESS_MODE_KEY) === 'guest') {
          clearGuestProgressData();
        }
        setAuthUser(session.user);
        localStorage.setItem('masterpat_auth', 'true');
        localStorage.setItem(ACCESS_MODE_KEY, 'member');
        setAppMode(prev => prev === 'auth' ? 'dashboard' : prev);
      } else {
        setAuthUser(null);
        localStorage.removeItem('masterpat_auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- FLASHCARD STATE ---
  const [allCards, setAllCards] = useState([]);
  const [learningQueue, setLearningQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState({ learnedToday: 0, totalDue: 0 });

  // --- QUIZ STATE ---
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [quizDuePool, setQuizDuePool] = useState([]);
  const [quizProgressView, setQuizProgressView] = useState(() => JSON.parse(localStorage.getItem('ap2_quiz_progress') || '{}'));
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [selectedQuizTopic, setSelectedQuizTopic] = useState('all');
  const [feynmanModeEnabled, setFeynmanModeEnabled] = useState(false);
  const [feynmanInput, setFeynmanInput] = useState('');
  const [feynmanLoading, setFeynmanLoading] = useState(false);
  const [feynmanFeedback, setFeynmanFeedback] = useState('');
  const [feynmanFeedbackLevel, setFeynmanFeedbackLevel] = useState(null);
  const [quizExplanationRevealed, setQuizExplanationRevealed] = useState(false);
  const [quizRevealConfirmVisible, setQuizRevealConfirmVisible] = useState(false);

  // --- WISOR STATE ---
  const [allWisors, setAllWisors] = useState([]);
  const [currentWisorIndex, setCurrentWisorIndex] = useState(0);
  const [wisorInput, setWisorInput] = useState('');
  const [wisorEvaluated, setWisorEvaluated] = useState(false);
  const [wisorIsCorrect, setWisorIsCorrect] = useState(false);
  const [wisorScore, setWisorScore] = useState({ correct: 0, total: 0 });
  const [wisorVideoOpen, setWisorVideoOpen] = useState(false);
  const [completedWisors, setCompletedWisors] = useState({});
  const [completedWisorsEco, setCompletedWisorsEco] = useState({});
  const [activeWisorMode, setActiveWisorMode] = useState('wisor1');
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetTarget, setResetTarget] = useState('wisor');
  const [resetMath, setResetMath] = useState({ a: 0, b: 0, input: '' });
  const [questionManagerCategory, setQuestionManagerCategory] = useState(null);
  const [learningAnalytics, setLearningAnalytics] = useState(createEmptyAnalytics());
  const [customQuizQuestions, setCustomQuizQuestions] = useState([]);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroSessionLog, setPomodoroSessionLog] = useState([]);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroForceStop, setPomodoroForceStop] = useState(0);
  const wisorInputRef = useRef(null);

  useEffect(() => {
    if (appMode === 'wisor' && !wisorEvaluated && wisorInputRef.current) {
      // Small timeout to let rendering finish naturally on slower devices or initial mount
      setTimeout(() => {
        if (wisorInputRef.current) {
          wisorInputRef.current.focus({ preventScroll: true });
          window.scrollTo(0, 0);
        }
      }, 0);
    }
  }, [appMode, currentWisorIndex, wisorEvaluated]);

  // --- GEMINI STATE ---
  const [geminiVisible, setGeminiVisible] = useState(false);
  const [geminiQuery, setGeminiQuery] = useState('');
  const [geminiResponse, setGeminiResponse] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [deepLearningLoading, setDeepLearningLoading] = useState(null);

  // --- YOUTUBE STATE ---
  const [wisorVideos, setWisorVideos] = useState([]);
  const [wisorVideoLoading, setWisorVideoLoading] = useState(false);
  const [selectedWisorVideo, setSelectedWisorVideo] = useState(null);
  const [wisorVideoError, setWisorVideoError] = useState('');

  useEffect(() => {
    setWisorVideos([]);
    setSelectedWisorVideo(null);
    setWisorVideoOpen(false);
    setWisorVideoError('');
    setWisorEvaluated(false);
    setWisorInput('');
    setGeminiVisible(false);
    setGeminiQuery('');
    setGeminiResponse('');
  }, [currentWisorIndex, currentQuizIndex]);

  const formatLatex = (text) => {
    if (typeof text !== 'string') return text;
    // Removes the wrapping $ signs and any backslash \ escapes (e.g., \$ -> $, \% -> %)
    return text.replace(/\$([^$]+)\$/g, (match, inner) => inner.replace(/\\/g, '').trim());
  };

  const getLocalProgressData = (overrides = {}) => {
    const srsProgress = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
    const wisorProgress = JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {};
    const wisorEcoProgress = JSON.parse(localStorage.getItem('ap2_wisor_eco_progress')) || {};
    const savedNotes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
    const analytics = loadAnalyticsForUser(authUser);
    const customQuiz = loadCustomQuizForUser(authUser);

    return {
      ...srsProgress,
      wisor_progress: wisorProgress,
      wisor_eco_progress: wisorEcoProgress,
      saved_notes: savedNotes,
      learning_analytics: analytics,
      custom_quiz_questions: customQuiz,
      ...overrides
    };
  };

  const syncProgressToSupabase = async (overrides = {}, options = { queueOnFail: true }) => {
    if (!authUser?.id) return;

    const payload = getLocalProgressData(overrides);
    const userId = authUser.id;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error } = await supabase
          .from('user_data')
          .upsert([
            {
              user_id: userId,
              device_id: userId,
              progress_data: payload,
              updated_at: new Date().toISOString()
            }
          ], { onConflict: 'user_id' });

        if (error) throw error;
        clearPendingMemberSync(userId);
        return;
      } catch (err) {
        lastError = err;
        if (attempt < 3) {
          await sleep(attempt * 350);
        }
      }
    }

    if (options?.queueOnFail !== false) {
      persistPendingMemberSync(userId, payload);
    }
    console.error('Supabase sync failed, payload queued locally:', lastError);
  };

  const flushPendingMemberSync = async () => {
    if (!authUser?.id) return;
    const pending = readPendingMemberSync(authUser.id);
    if (!pending?.payload) return;

    try {
      const { error } = await supabase
        .from('user_data')
        .upsert([
          {
            user_id: authUser.id,
            device_id: authUser.id,
            progress_data: pending.payload,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'user_id' });

      if (error) throw error;
      clearPendingMemberSync(authUser.id);
    } catch (err) {
      console.error('Pending sync flush failed:', err);
    }
  };

  const appendLearningEvent = ({ mode, questionId, questionText, correct, userAnswer = '', expectedAnswer = '' }) => {
    const now = Date.now();
    const keyBase = `${mode}::${questionId || (questionText || '').slice(0, 120).toLowerCase()}`;

    setLearningAnalytics(prev => {
      const safePrev = prev && Array.isArray(prev.events) ? prev : createEmptyAnalytics();
      const events = [...safePrev.events, {
        id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
        ts: now,
        mode,
        questionId,
        questionText,
        correct,
        userAnswer,
        expectedAnswer
      }].slice(-3000);

      const mistakes = { ...(safePrev.mistakes || {}) };
      if (!correct) {
        mistakes[keyBase] = {
          mode,
          questionId: questionId || null,
          questionText: questionText || 'Unbekannte Frage',
          count: (mistakes[keyBase]?.count || 0) + 1,
          lastAt: now,
          lastUserAnswer: userAnswer,
          expectedAnswer
        };
      }

      const nextState = { ...safePrev, events, mistakes };
      localStorage.setItem(getAnalyticsStorageKey(authUser), JSON.stringify(nextState));
      syncProgressToSupabase({ learning_analytics: nextState }).catch(() => { });
      return nextState;
    });
  };

  const refreshMistakeAnalysis = () => {
    setLearningAnalytics(prev => {
      const safePrev = prev && Array.isArray(prev.events) ? prev : createEmptyAnalytics();
      const rebuiltMistakes = {};

      for (const event of safePrev.events) {
        if (event.correct) continue;
        const key = `${event.mode}::${event.questionId || (event.questionText || '').slice(0, 120).toLowerCase()}`;
        rebuiltMistakes[key] = {
          mode: event.mode,
          questionId: event.questionId || null,
          questionText: event.questionText || 'Unbekannte Frage',
          count: (rebuiltMistakes[key]?.count || 0) + 1,
          lastAt: event.ts,
          lastUserAnswer: event.userAnswer || '',
          expectedAnswer: event.expectedAnswer || ''
        };
      }

      const nextState = {
        ...safePrev,
        mistakes: rebuiltMistakes,
        lastRefreshedAt: Date.now()
      };

      localStorage.setItem(getAnalyticsStorageKey(authUser), JSON.stringify(nextState));
      syncProgressToSupabase({ learning_analytics: nextState }).catch(() => { });
      return nextState;
    });
  };

  const detectQuizTopic = (quiz) => {
    if (quiz?.topic) return quiz.topic;

    const topicSource = `${quiz?.question || ''} ${quiz?.hint || ''} ${quiz?.youtubeQuery || ''}`.toLowerCase();

    if (/(a\/b|landingpage|konversion|conversion|metrik)/i.test(topicSource)) return 'A/B-Testing';
    if (/(eye|heatmap|usability|nulltreffer|suchfeld|navigation)/i.test(topicSource)) return 'Usability & UX';
    if (/(dropshipping|amazon|fba)/i.test(topicSource)) return 'Geschäftsmodelle';
    if (/(k[iï]|künstliche intelligenz|markttrend|budgetallokation|garbage in)/i.test(topicSource)) return 'KI im Vertrieb';
    if (/(sortiment|marge|eigenmarke|warenkorb|bundle|cross[- ]selling|rabatt)/i.test(topicSource)) return 'Sortiment & Ertrag';
    if (/(influencer|pay-per|affiliate|likes)/i.test(topicSource)) return 'Influencer Marketing';
    if (/(uwg|wettbewerb|abmahnung|unterlassung)/i.test(topicSource)) return 'Recht (UWG)';
    if (/(online-shop|wartungsmodus|checkout|zahlungsart|impressum|seo)/i.test(topicSource)) return 'Shop-Einrichtung & Checkout';
    if (/(soziale ziele|sachliche ziele|unternehmensziele|betriebswirtschaft|wiso)/i.test(topicSource)) return 'WiSo Grundlagen';

    return 'Allgemein';
  };

  const getQuizTopicGroup = (topic) => {
    const rawTopic = String(topic || '').trim();
    if (!rawTopic) return 'Allgemein';

    if (/auswahlkriterium/i.test(rawTopic)) return 'Auswahlkriterium';
    if (/\bki\b|künstliche intelligenz/i.test(rawTopic)) return 'KI';

    if (/(social media|social-media|instagram|facebook|whatsapp|youtube|pinterest|linkedin|xing|tiktok|kanal-strategie|content-formate|b2b vs)/i.test(rawTopic)) {
      return 'Social Media';
    }

    return rawTopic;
  };

  const getAllQuizQuestions = () => [
    ...(quiz1.questions || []),
    ...(quiz2.questions || []),
    ...(quiz3.questions || []),
    ...(quizUForm2.questions || []),
    ...(customQuizQuestions || [])
  ];

  const buildPreparedQuizzes = (rawQuizzes, quizProg) => {
    return rawQuizzes.map(q => {
      const id = q.id || generateId(q.question);
      return {
        ...q,
        id,
        topic: detectQuizTopic(q),
        progress: quizProg[id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 }
      };
    });
  };

  const refreshQuizDuePool = async ({ customData = null } = {}) => {
    const rawQuizzes = [
      ...(quiz1.questions || []),
      ...(quiz2.questions || []),
      ...(quiz3.questions || []),
      ...(quizUForm2.questions || []),
      ...((customData ?? customQuizQuestions) || [])
    ];

    const quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
    const prepared = buildPreparedQuizzes(rawQuizzes, quizProg);
    const now = Date.now();

    if (!authUser?.id) {
      const localDue = prepared.filter(q => q.progress.nextReview <= now);
      setQuizProgressView(quizProg);
      setQuizDuePool(localDue);
      return localDue;
    }

    try {
      const rows = await getTaskProgressByType(supabase, authUser.id, 'quiz');
      const byTaskId = new Map(rows.map(row => [row.task_id, row]));
      const effectiveProgress = {};
      prepared.forEach(q => {
        const row = byTaskId.get(`quiz:${q.id}`);
        if (row) {
          effectiveProgress[q.id] = {
            rep: row.review_count || 0,
            ef: q.progress?.ef || 2.5,
            interval: row.scheduled_days || 0,
            nextReview: row.due_date ? new Date(row.due_date).getTime() : 0
          };
        } else {
          effectiveProgress[q.id] = quizProg[q.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
        }
      });

      const due = prepared.filter(q => {
        const row = byTaskId.get(`quiz:${q.id}`);
        if (!row?.due_date) return true;
        return new Date(row.due_date).getTime() <= now;
      });

      setQuizProgressView(effectiveProgress);
      setQuizDuePool(due);
      return due;
    } catch (err) {
      console.error('Failed loading quiz due pool from user_task_progress:', err);
      const fallbackDue = prepared.filter(q => q.progress.nextReview <= now);
      setQuizProgressView(quizProg);
      setQuizDuePool(fallbackDue);
      return fallbackDue;
    }
  };

  const handleAddCustomQuizQuestion = async (payload) => {
    const normalizedAnswers = (payload.answerOptions || [])
      .filter(opt => String(opt.text || '').trim())
      .map(opt => ({
        text: String(opt.text || '').trim(),
        isCorrect: !!opt.isCorrect,
        rationale: String(opt.rationale || '').trim()
      }));

    if (!payload.question || !normalizedAnswers.length || !normalizedAnswers.some(opt => opt.isCorrect)) {
      return { ok: false, message: 'Bitte Frage, Antworten und mindestens eine richtige Antwort angeben.' };
    }

    const newQuestion = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question: String(payload.question).trim(),
      topic: String(payload.topic || 'Eigenes Thema').trim(),
      hint: String(payload.hint || '').trim(),
      youtubeQuery: String(payload.youtubeQuery || '').trim(),
      answerOptions: normalizedAnswers,
      custom: true,
      createdAt: new Date().toISOString()
    };

    const updatedCustom = [...(customQuizQuestions || []), newQuestion];
    setCustomQuizQuestions(updatedCustom);
    localStorage.setItem(getCustomQuizStorageKey(authUser), JSON.stringify(updatedCustom));
    await syncProgressToSupabase({ custom_quiz_questions: updatedCustom });

    await refreshQuizDuePool({ customData: updatedCustom });

    return { ok: true };
  };

  const getDueQuizzesByTopic = (topic = 'all') => {
    const due = quizDuePool;
    if (topic === 'all') return due;
    return due.filter(q => getQuizTopicGroup(q.topic) === topic);
  };

  const handleToggleVideos = async (q) => {
    if (wisorVideoOpen) {
      setWisorVideoOpen(false);
      return;
    }

    setWisorVideoOpen(true);

    if (wisorVideos.length === 0 && !wisorVideoLoading) {
      setWisorVideoLoading(true);
      setWisorVideoError('');

      const predefinedVideos = [];
      if (q && q.videoUrl) {
        const videoId = q.videoUrl.split('/').pop().split('?')[0];
        predefinedVideos.push({
          id: 'predefined_' + videoId,
          title: 'Empfohlenes Video',
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          channelTitle: 'Wisor Choice'
        });
      }

      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

      const buildQueryCandidates = () => {
        const candidates = [];
        if (q?.youtubeQuery?.trim()) {
          candidates.push(q.youtubeQuery.trim());
        }

        const extractKeywords = (text, limit = 8) => {
          const stopWords = new Set(['was', 'wie', 'warum', 'wann', 'wo', 'wer', 'welche', 'welcher', 'welches', 'ein', 'eine', 'einer', 'einem', 'eines', 'der', 'die', 'das', 'den', 'dem', 'des', 'als', 'ist', 'sind', 'wird', 'werden', 'kann', 'können', 'für', 'und', 'oder', 'zu', 'im', 'am', 'um', 'auf', 'von', 'bei', 'beim', 'mit', 'gilt', 'es', 'sich', 'in', 'einem', 'einen']);
          return (text || '')
            .normalize('NFKD')
            .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()))
            .slice(0, limit)
            .join(' ');
        };

        let cleanQ = formatLatex(q?.question || '')
          .split(/[\n]/)[0]
          .replace(/^[\d.]+\s*/, '')
          .replace(/„[^“]+“|"[^"]+"/g, ' ')
          .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const keywords = extractKeywords(cleanQ, 8);
        const hintKeywords = extractKeywords(q?.hint || '', 6);
        const correctAnswer = q?.answerOptions?.find(option => option?.isCorrect)?.text || '';
        const correctAnswerKeywords = extractKeywords(correctAnswer, 6);

        if (keywords) candidates.push(keywords);
        if (hintKeywords) candidates.push(hintKeywords);
        if (correctAnswerKeywords) candidates.push(correctAnswerKeywords);

        const fullContext = `${cleanQ} ${q?.hint || ''} ${correctAnswer}`.toLowerCase();
        if (/(online|shop|e-commerce|dropshipping|checkout|warenkorb|seo)/i.test(fullContext)) {
          candidates.push('E-Commerce Grundlagen einfach erklärt');
        } else if (/(rechnung|kalkulation|gewinn|marge|wirtschaft|bwl|marketing)/i.test(fullContext)) {
          candidates.push('Wirtschaft BWL Grundlagen einfach erklärt');
        } else {
          candidates.push('Ausbildung Lernvideo einfach erklärt');
        }

        return [...new Set(candidates.filter(Boolean))];
      };

      const queryCandidates = buildQueryCandidates();

      if (!apiKey) {
        setWisorVideos(predefinedVideos);
        setWisorVideoError('Kein YouTube API-Key gefunden. Bitte VITE_YOUTUBE_API_KEY in der .env setzen.');
        setWisorVideoLoading(false);
        return;
      }

      let fetched = [];
      for (const candidate of queryCandidates) {
        fetched = await fetchYouTubeVideos(candidate, apiKey, 4 - predefinedVideos.length);
        if (fetched.length > 0) break;
      }

      setWisorVideos([...predefinedVideos, ...fetched]);
      if (predefinedVideos.length + fetched.length === 0) {
        setWisorVideoError('Keine passenden Videos gefunden. Versuche die Frage im Question Manager mit einem youtubeQuery zu ergänzen.');
      }
      setWisorVideoLoading(false);
    }
  };

  const handleGeminiAsk = async () => {
    if (!geminiQuery.trim()) return;
    setGeminiLoading(true);
    setGeminiResponse('');

    const q = appMode === 'quiz' ? allQuizzes[currentQuizIndex] : allWisors[currentWisorIndex];
    let expectedAnswers = '';
    if (appMode === 'wisor') {
      expectedAnswers = q.expectedAnswers?.join(', ') || 'N/A';
    } else {
      expectedAnswers = q.answerOptions.find(opt => opt.isCorrect)?.text || 'N/A';
    }
    const answerInfo = "Geforderte Antwort(en): " + expectedAnswers + " | Erklärung: " + (q.rationale || 'N/A');

    const response = await askGemini(geminiQuery, q.question, answerInfo);
    setGeminiResponse(response);
    setGeminiLoading(false);
  };

  const handleFeynmanCheck = async () => {
    if (!feynmanInput.trim()) return;
    const q = allQuizzes[currentQuizIndex];
    if (!q) return;

    const correctOption = q.answerOptions.find(opt => opt.isCorrect);
    const learnerPrompt = `Bewerte die folgende Lernerklärung eines Azubis auf fachliche Richtigkeit und Tiefe.
Antworte exakt in diesem Format:
STATUS: GUT oder TEILWEISE
FEEDBACK: <maximal 4 kurze Sätze, konkret und lernförderlich>

Erklärung des Azubis:
${feynmanInput}`;

    const solutionContext = `Musterlösung: ${correctOption?.text || 'N/A'} | Begründung: ${correctOption?.rationale || 'N/A'}`;

    setFeynmanLoading(true);
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);

    try {
      const result = await askGemini(learnerPrompt, q.question, solutionContext);
      const statusMatch = result.match(/STATUS\s*:\s*(GUT|TEILWEISE)/i);
      const parsedStatus = statusMatch?.[1]?.toUpperCase() || 'TEILWEISE';
      const cleanedFeedback = result
        .replace(/STATUS\s*:\s*(GUT|TEILWEISE)\s*/ig, '')
        .replace(/FEEDBACK\s*:\s*/i, '')
        .trim();

      setFeynmanFeedbackLevel(parsedStatus === 'GUT' ? 'good' : 'partial');
      setFeynmanFeedback(cleanedFeedback || result);
    } catch (err) {
      console.error('Feynman check failed:', err);
      setFeynmanFeedbackLevel('partial');
      setFeynmanFeedback('Die Überprüfung konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.');
    } finally {
      setFeynmanLoading(false);
    }
  };

  const startQuizSession = (limit, topic = 'all') => {
    let sessionQs = [...getDueQuizzesByTopic(topic)].sort(() => Math.random() - 0.5);
    if (limit !== 'all') {
      sessionQs = sessionQs.slice(0, limit);
    }

    resetQuiz(sessionQs);
    setAppMode('quiz');
  };


  useEffect(() => {
    const initApp = async () => {
      // 0. Get current Auth
      const { data: { session } } = await supabase.auth.getSession();
      const storedAccessMode = localStorage.getItem(ACCESS_MODE_KEY);

      if (!session?.user && storedAccessMode === 'guest') {
        clearGuestProgressData();
      }

      if (session?.user) {
        if (storedAccessMode === 'guest') {
          clearGuestProgressData();
        }
        setAuthUser(session.user);
        localStorage.setItem('masterpat_auth', 'true');
        localStorage.setItem(ACCESS_MODE_KEY, 'member');
        setAppMode(prev => prev === 'auth' ? 'dashboard' : prev);
      }

      // 1. Load local progress
      let progressData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
      let analyticsData = loadAnalyticsForUser(session?.user || null);
      let customQuizData = loadCustomQuizForUser(session?.user || null);

      // 2. Fetch from Supabase (only for authenticated users)
      if (session?.user) {
        const userId = session.user.id;
        try {
          const { data } = await supabase
            .from('user_data')
            .select('progress_data')
            .eq('user_id', userId)
            .maybeSingle();

          if (data && data.progress_data) {
            progressData = { ...data.progress_data };
            localStorage.setItem('ap2_srs_progress', JSON.stringify(progressData));
            localStorage.setItem('ap2_quiz_progress', JSON.stringify({}));

            if (data.progress_data.wisor_progress) {
              localStorage.setItem('ap2_wisor_progress', JSON.stringify(data.progress_data.wisor_progress));
            } else {
              localStorage.setItem('ap2_wisor_progress', JSON.stringify({}));
            }
            if (data.progress_data.wisor_eco_progress) {
              localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify(data.progress_data.wisor_eco_progress));
            } else {
              localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify({}));
            }
            if (data.progress_data.learning_analytics) {
              const remoteAnalytics = {
                ...createEmptyAnalytics(),
                ...data.progress_data.learning_analytics
              };
              const localAnalytics = {
                ...createEmptyAnalytics(),
                ...analyticsData
              };

              const mergedEvents = [...(localAnalytics.events || []), ...(remoteAnalytics.events || [])]
                .sort((a, b) => (a.ts || 0) - (b.ts || 0));

              const uniqueEvents = [];
              const seenIds = new Set();
              for (const event of mergedEvents) {
                const eventId = event?.id || `${event?.ts || 0}_${event?.mode || 'x'}_${event?.questionId || ''}_${event?.correct ? '1' : '0'}`;
                if (seenIds.has(eventId)) continue;
                seenIds.add(eventId);
                uniqueEvents.push({ ...event, id: eventId });
              }

              analyticsData = {
                ...createEmptyAnalytics(),
                ...remoteAnalytics,
                ...localAnalytics,
                events: uniqueEvents.slice(-3000),
                mistakes: {
                  ...(remoteAnalytics.mistakes || {}),
                  ...(localAnalytics.mistakes || {})
                }
              };
              localStorage.setItem(getAnalyticsStorageKey(session.user), JSON.stringify(analyticsData));
            }
            if (Array.isArray(data.progress_data.custom_quiz_questions)) {
              customQuizData = data.progress_data.custom_quiz_questions;
              localStorage.setItem(getCustomQuizStorageKey(session.user), JSON.stringify(customQuizData));
            } else {
              customQuizData = [];
              localStorage.setItem(getCustomQuizStorageKey(session.user), JSON.stringify([]));
            }
            // Merge saved notes from Supabase into localStorage
            if (data.progress_data.saved_notes) {
              const localNotes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
              const remoteNotes = data.progress_data.saved_notes;
              let merged = { ...localNotes };
              for (const key of Object.keys(remoteNotes)) {
                const remoteDate = new Date(remoteNotes[key]?.date || 0).getTime();
                const localDate = new Date(localNotes[key]?.date || 0).getTime();
                if (!localNotes[key] || remoteDate > localDate) {
                  merged[key] = remoteNotes[key];
                }
              }
              localStorage.setItem('ap2_saved_notes', JSON.stringify(merged));
            }
          } else if (!data) {
            // Init empty row for this authenticated user
            const emptyProgress = createEmptyMemberProgressData();
            await supabase.from('user_data').upsert([{ user_id: userId, device_id: userId, progress_data: emptyProgress }], { onConflict: 'user_id' });
            progressData = { ...emptyProgress };
            localStorage.setItem('ap2_srs_progress', JSON.stringify(progressData));
            localStorage.setItem('ap2_quiz_progress', JSON.stringify({}));
            localStorage.setItem('ap2_wisor_progress', JSON.stringify({}));
            localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify({}));
            localStorage.setItem('ap2_saved_notes', JSON.stringify({}));
            localStorage.setItem(getAnalyticsStorageKey(session.user), JSON.stringify(createEmptyAnalytics()));
            localStorage.setItem(getCustomQuizStorageKey(session.user), JSON.stringify([]));
            analyticsData = createEmptyAnalytics();
            customQuizData = [];
          }
        } catch (err) {
          console.error("Supabase load error: ", err);
        }
      }

      let wisorProg = JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {};
      setCompletedWisors(wisorProg);

      let wisorEcoProg = JSON.parse(localStorage.getItem('ap2_wisor_eco_progress')) || {};
      setCompletedWisorsEco(wisorEcoProg);
      setLearningAnalytics(analyticsData);
      setCustomQuizQuestions(customQuizData);

      // 3. Setup Flashcards with loaded progress
      const rawCards = [
        ...(flashcards1.cards || []),
        ...(flashcards2.cards || []),
        ...(flashcards3.cards || [])
      ];

      const mergedCards = rawCards.map(c => {
        const id = generateId(c.front);
        const progress = progressData[id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
        return { ...c, id, progress };
      });
      setAllCards(mergedCards);
      rebuildQueue(mergedCards);

      // 4. Setup Quizzes
      await refreshQuizDuePool({ customData: customQuizData });

      // 5. Setup Wisor
      const rawWisors = [
        ...(wisor1.questions || [])
      ].filter(q => !(JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {})[q.id]);
      const shuffledWisors = rawWisors.sort(() => Math.random() - 0.5);
      setAllWisors(shuffledWisors);
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLearningAnalytics(loadAnalyticsForUser(authUser));
    setCustomQuizQuestions(loadCustomQuizForUser(authUser));
  }, [authUser?.email]);

  useEffect(() => {
    refreshQuizDuePool().catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, customQuizQuestions]);

  useEffect(() => {
    if (!authUser?.id) return;

    flushPendingMemberSync();
    const interval = setInterval(() => {
      flushPendingMemberSync();
    }, 20000);

    const handleOnline = () => {
      flushPendingMemberSync();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [authUser?.id]);

  const rebuildQueue = (cards) => {
    const now = Date.now();
    const dueCards = cards.filter(c => c.progress.nextReview <= now);
    dueCards.sort(() => Math.random() - 0.5);
    setLearningQueue(dueCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStats({ learnedToday: 0, totalDue: dueCards.length });
  };

  const forceReloadAll = () => {
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setLearningQueue(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStats({ learnedToday: 0, totalDue: shuffled.length });
  }

  const handleRating = (quality, e) => {
    e.stopPropagation();
    const currentCard = learningQueue[currentIndex];
    let { rep, ef, interval } = currentCard.progress;

    if (quality < 3) {
      rep = 0;
      interval = 1 / (24 * 60);
    } else {
      if (rep === 0) {
        interval = quality === 3 ? (10 / (24 * 60)) : 1;
      } else if (rep === 1) {
        interval = quality === 3 ? 1 : 6;
      } else {
        interval = Math.round(interval * ef);
      }
      rep += 1;
    }

    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ef < 1.3) ef = 1.3;

    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
    const newProgress = { rep, ef, interval, nextReview };

    const updatedAllCards = allCards.map(c =>
      c.id === currentCard.id ? { ...c, progress: newProgress } : c
    );
    setAllCards(updatedAllCards);

    const storageData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
    storageData[currentCard.id] = newProgress;
    localStorage.setItem('ap2_srs_progress', JSON.stringify(storageData));

    appendLearningEvent({
      mode: 'flashcard',
      questionId: currentCard.id,
      questionText: currentCard.front,
      correct: quality >= 3,
      userAnswer: quality >= 3 ? 'Kann ich' : 'Kann ich nicht',
      expectedAnswer: 'Sicher erinnern'
    });

    // Sync to Supabase in background (only for authenticated users)
    syncProgressToSupabase().catch(() => { });

    if (authUser?.id) {
      const rating = mapFlashcardQualityToRating(quality);
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: `flashcard:${currentCard.id}`,
        rating,
        taskType: 'flashcard',
        category: 'spaced_repetition',
        metadata: { source: 'flashcard', front: currentCard.front }
      }).catch(err => console.error('DSR flashcard review failed:', err));
    }

    let newQueue = [...learningQueue];
    if (quality < 3) {
      const cardToRequeue = newQueue.splice(currentIndex, 1)[0];
      cardToRequeue.progress = newProgress;
      newQueue.push(cardToRequeue);
    } else {
      newQueue.splice(currentIndex, 1);
      setStats(s => ({ ...s, learnedToday: s.learnedToday + 1 }));
    }

    setLearningQueue(newQueue);
    setIsFlipped(false);
  };

  const handleQuizAnswer = (optionIndex) => {
    if (selectedAnswer !== null) return; // already answered

    setFeynmanInput('');
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);
    setQuizExplanationRevealed(false);
    setQuizRevealConfirmVisible(false);

    setSelectedAnswer(optionIndex);
    const q = allQuizzes[currentQuizIndex];
    const isCorrect = q.answerOptions[optionIndex].isCorrect;
    const selectedOption = q.answerOptions[optionIndex];
    const expectedOption = q.answerOptions.find(opt => opt.isCorrect);

    if (isCorrect) {
      setQuizScore(s => ({ ...s, correct: s.correct + 1 }));
    }

    // Pomodoro session logging
    if (pomodoroActive) {
      const questionText = q.question?.substring(0, 100) || 'Quiz-Frage';
      setPomodoroSessionLog(prev => [...prev, { correct: isCorrect, questionText, topic: 'Quiz' }]);
    }

    if (!authUser?.id) {
      // Guest fallback only
      const quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
      let { rep, ef, interval } = q.progress;

      if (isCorrect) {
        if (rep === 0) {
          interval = 1;
        } else if (rep === 1) {
          interval = 6;
        } else {
          interval = Math.round(interval * ef);
        }
        rep += 1;
      } else {
        rep = 0;
        interval = 1 / (24 * 60); // 1 minute
      }
      const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
      quizProg[q.id] = { rep, ef, interval, nextReview };
      localStorage.setItem('ap2_quiz_progress', JSON.stringify(quizProg));
      setQuizProgressView(quizProg);
    }

    appendLearningEvent({
      mode: 'quiz',
      questionId: q.id,
      questionText: q.question,
      correct: isCorrect,
      userAnswer: selectedOption?.text || '',
      expectedAnswer: expectedOption?.text || ''
    });

    if (authUser?.id) {
      const rating = mapQuizAnswerToRating({ isCorrect, attempt: 1 });
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: `quiz:${q.id}`,
        rating,
        taskType: 'quiz',
        category: q.topic || 'quiz',
        metadata: {
          source: q.custom ? 'custom_quiz' : 'default_quiz',
          question: q.question
        }
      })
        .then(() => refreshQuizDuePool())
        .catch(err => console.error('DSR quiz review failed:', err));
    } else {
      refreshQuizDuePool().catch(() => { });
    }
  };

  const nextQuizQuestion = () => {
    setQuizScore(s => ({ ...s, total: s.total + 1 }));
    setSelectedAnswer(null);
    setFeynmanInput('');
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);
    setQuizExplanationRevealed(false);
    setQuizRevealConfirmVisible(false);
    setCurrentQuizIndex(prev => prev + 1);
  };

  const resetQuiz = (qsToUse = null) => {
    const list = qsToUse || allQuizzes;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setAllQuizzes(shuffled);
    setCurrentQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setSelectedAnswer(null);
    setFeynmanInput('');
    setFeynmanFeedback('');
    setFeynmanFeedbackLevel(null);
    setQuizExplanationRevealed(false);
    setQuizRevealConfirmVisible(false);
  };

  const startWisor = (mode = 'wisor1') => {
    setActiveWisorMode(mode);
    const rawWisors = mode === 'wisor1' ? [...wisor1.questions] : [...(wisorEco.questions || [])];
    const key = mode === 'wisor1' ? 'ap2_wisor_progress' : 'ap2_wisor_eco_progress';
    const wisorProg = JSON.parse(localStorage.getItem(key)) || {};
    const uncompleted = rawWisors.filter(q => !wisorProg[q.id]);
    const shuffled = mode === 'wisor1' ? [...uncompleted].sort(() => Math.random() - 0.5) : [...uncompleted];

    setAllWisors(shuffled);
    setCurrentWisorIndex(0);
    setWisorScore({ correct: 0, total: 0 });
    setWisorInput('');
    setWisorEvaluated(false);
    setWisorIsCorrect(false);
    setWisorVideoOpen(false);
    setGeminiVisible(false);
    setGeminiQuery('');
    setGeminiResponse('');

    setAppMode('wisor');
  };

  const openResetModal = (e, target = 'wisor') => {
    e.stopPropagation();
    setResetTarget(target);
    setResetMath({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 20) + 1, input: '' });
    setResetModalVisible(true);
  };

  const handleResetConfirm = (e) => {
    e.preventDefault();
    if (parseInt(resetMath.input) === resetMath.a + resetMath.b) {
      if (resetTarget === 'wisor') {
        setCompletedWisors({});
        localStorage.removeItem('ap2_wisor_progress');

        if (authUser?.id) {
          syncProgressToSupabase({ wisor_progress: {} }).catch(() => { });
        }

        setResetModalVisible(false);

        const rawWisors = [...wisor1.questions];
        setAllWisors(rawWisors.sort(() => Math.random() - 0.5));
        setCurrentWisorIndex(0);
        setWisorScore({ correct: 0, total: 0 });
        setWisorInput('');
        setWisorEvaluated(false);
        setWisorIsCorrect(false);
        setWisorVideoOpen(false);
        if (appMode === 'wisor') setAppMode('wisor');
      } else if (resetTarget === 'wisorEco') {
        setCompletedWisorsEco({});
        localStorage.removeItem('ap2_wisor_eco_progress');

        if (authUser?.id) {
          syncProgressToSupabase({ wisor_eco_progress: {} }).catch(() => { });
        }

        setResetModalVisible(false);

        const rawWisors = [...(wisorEco.questions || [])];
        setAllWisors(rawWisors);
        setCurrentWisorIndex(0);
        setWisorScore({ correct: 0, total: 0 });
        setWisorInput('');
        setWisorEvaluated(false);
        setWisorIsCorrect(false);
        setWisorVideoOpen(false);
        if (appMode === 'wisor') setAppMode('wisor');
      } else if (resetTarget === 'quiz') {
        localStorage.removeItem('ap2_quiz_progress');
        setQuizProgressView({});
        const resetTasks = [];

        if (authUser?.id) {
          resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'quiz'));
        }

        setResetModalVisible(false);
        setAllQuizzes([]);

        Promise.allSettled(resetTasks)
          .then(() => refreshQuizDuePool())
          .catch(() => refreshQuizDuePool());

        if (appMode === 'quiz' || appMode === 'quiz_setup') setAppMode('dashboard');
      }
    } else {
      alert("Falsches Ergebnis! Reset abgebrochen.");
      setResetModalVisible(false);
    }
  };

  const handleWisorSubmit = (e) => {
    if (e) e.preventDefault();
    if (wisorEvaluated || !wisorInput.trim()) return;

    const q = allWisors[currentWisorIndex];
    const normalizedInput = wisorInput.toString().trim().toUpperCase();

    let correct = false;
    for (const expected of q.expectedAnswers) {
      if (normalizedInput === expected.toString().trim().toUpperCase()) {
        correct = true;
        break;
      }
    }

    setWisorIsCorrect(correct);
    setWisorEvaluated(true);

    appendLearningEvent({
      mode: activeWisorMode === 'wisor1' ? 'wisor' : 'wisorEco',
      questionId: q.id,
      questionText: q.question,
      correct,
      userAnswer: wisorInput,
      expectedAnswer: (q.expectedAnswers || []).join(' | ')
    });

    // Pomodoro session logging
    if (pomodoroActive) {
      const questionText = q.question?.substring(0, 100) || q.id || 'WisoR-Frage';
      const topicLabel = activeWisorMode === 'wisor1' ? 'WisoR' : 'WisoR E-Commerce';
      setPomodoroSessionLog(prev => [...prev, { correct, questionText, topic: topicLabel }]);
    }

    if (correct) {
      setWisorScore(s => ({ ...s, correct: s.correct + 1 }));

      const updateProg = prev => {
        const next = { ...prev, [q.id]: true };
        const key = activeWisorMode === 'wisor1' ? 'ap2_wisor_progress' : 'ap2_wisor_eco_progress';
        localStorage.setItem(key, JSON.stringify(next));

        if (authUser?.id) {
          const dbKey = activeWisorMode === 'wisor1' ? 'wisor_progress' : 'wisor_eco_progress';
          syncProgressToSupabase({ [dbKey]: next }).catch(() => { });
        }
        return next;
      };

      if (activeWisorMode === 'wisor1') {
        setCompletedWisors(updateProg);
      } else {
        setCompletedWisorsEco(updateProg);
      }
    }

    if (authUser?.id) {
      const rating = mapWisorAnswerToRating({ isCorrect: correct, attempt: 1 });
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: `${activeWisorMode === 'wisor1' ? 'wisor' : 'wisorEco'}:${q.id}`,
        rating,
        taskType: activeWisorMode === 'wisor1' ? 'wisor' : 'wisorEco',
        category: activeWisorMode,
        metadata: { source: activeWisorMode, question: q.question }
      }).catch(err => console.error('DSR wisor review failed:', err));
    }
  };

  const nextWisorQuestion = () => {
    setWisorScore(s => ({ ...s, total: s.total + 1 }));
    setWisorInput('');
    setWisorEvaluated(false);
    setWisorIsCorrect(false);
    setWisorVideoOpen(false);
    setGeminiVisible(false);
    setGeminiQuery('');
    setGeminiResponse('');
    setCurrentWisorIndex(prev => prev + 1);
  };

  const navigateWisorUnanswered = (direction) => {
    let newIndex = currentWisorIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= allWisors.length) newIndex = allWisors.length - 1;
    setWisorInput('');
    setWisorEvaluated(false);
    setWisorIsCorrect(false);
    setWisorVideoOpen(false);
    setGeminiVisible(false);
    setGeminiQuery('');
    setGeminiResponse('');
    setCurrentWisorIndex(newIndex);
  };

  // --- RENDERERS ---

  if (appMode === 'auth') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>

        <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '2rem' }}>Login / Account</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Erstelle einen Account oder logge dich ein, um deinen Lernfortschritt auf all deinen Geräten ("Cloud") synchron zu halten.</p>
          <form autoComplete="on" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <input
              type="email"
              id="login-email"
              name="email"
              autoComplete="email"
              className="wisor-input"
              placeholder="E-Mail Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ fontSize: '1rem', padding: '1rem' }}
            />
            <input
              type="password"
              id="login-password"
              name="password"
              autoComplete="current-password"
              className="wisor-input"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ fontSize: '1rem', padding: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
              {captchaSiteKey ? (
                <HCaptcha
                  ref={captchaRef}
                  sitekey={captchaSiteKey}
                  theme="dark"
                  onLoad={() => setCaptchaError('')}
                  onVerify={(token) => {
                    setCaptchaToken(token);
                    setCaptchaError('');
                  }}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => {
                    setCaptchaToken(null);
                    setCaptchaError(`hCaptcha konnte nicht geladen werden. Prüfe die Domain-Freigabe für "${currentHost}" im hCaptcha-Dashboard und den Sitekey.`);
                  }}
                />
              ) : (
                <p style={{ color: 'var(--error)', fontWeight: 'bold', margin: 0 }}>
                  hCaptcha Sitekey fehlt (VITE_HCAPTCHA_SITE_KEY).
                </p>
              )}
            </div>
            {captchaError && <p style={{ color: 'var(--error)', marginBottom: '0.75rem', fontWeight: 'bold' }}>{captchaError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }} disabled={authLoading || !captchaToken}>Login</button>
              <button type="button" onClick={handleRegister} className="btn-secondary" style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }} disabled={authLoading || !captchaToken}>Registrieren</button>
            </div>

            <button
              id="google-login-btn"
              type="button"
              className="btn-secondary"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
            >
              Mit Google anmelden
            </button>
          </form>

          {authMsg && <p style={{ color: authMsg.includes('Erfolg') || authMsg.includes('erstellt') ? 'var(--success)' : 'var(--error)', marginBottom: '1rem', fontWeight: 'bold' }}>{authMsg}</p>}

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--glass-border)' }} />

          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.8rem' }}>Alternativ: Lokaler Gast Zugang (Nur auf diesem Gerät)</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pinInput === SECRET_PIN) {
              setAuthError(false);
              localStorage.setItem(ACCESS_MODE_KEY, 'guest');
              clearGuestProgressData();
              localStorage.setItem('masterpat_auth', 'true');
              setAppMode('dashboard');
              window.location.reload(); // Zum Laden der User Data vom Device
            } else {
              setAuthError(true);
              setPinInput('');
            }
          }}>
            <input
              type="password"
              className="wisor-input"
              placeholder="App-PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{ textAlign: 'center', letterSpacing: '0.2rem', marginBottom: '1rem', padding: '0.7rem', fontSize: '1rem' }}
            />
            {authError && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontWeight: 'bold' }}>Falsche PIN!</p>}
            <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}>Als Gast (Lokal) fortfahren</button>
          </form>
        </div>
      </div>
    );
  }

  // --- POMODORO PORTAL (renders globally across all modes) ---
  const pomodoroPortal = createPortal(
    <PomodoroTimer
      isActive={pomodoroActive}
      sessionLog={pomodoroSessionLog}
      appMode={appMode}
      onStart={() => { setPomodoroActive(true); setPomodoroSessionLog([]); }}
      onStop={() => { setPomodoroActive(false); setPomodoroTimeLeft(25 * 60); }}
      onTick={(t) => setPomodoroTimeLeft(t)}
      onTimeUp={() => {
        if (appMode === 'quiz') {
          setCurrentQuizIndex(allQuizzes.length);
        } else if (appMode === 'wisor') {
          setCurrentWisorIndex(allWisors.length);
        }
        setPomodoroActive(false);
        setPomodoroTimeLeft(25 * 60);
      }}
      forceStop={pomodoroForceStop}
    />,
    document.body
  );

  // --- GLOBAL STATS + BURGER MENU (available in ALL modes) ---
  const allQuizQuestions = getAllQuizQuestions();
  const quizProg = quizProgressView || {};
  const quizLearnedCount = allQuizQuestions.reduce((count, question) => {
    const questionId = question.id || generateId(question.question);
    const progress = quizProg[questionId];
    if (!progress) return count;
    return count + ((progress.rep || 0) > 0 ? 1 : 0);
  }, 0);
  const wisorQuestions = wisor1.questions || [];
  const wisorEcoQuestions = wisorEco.questions || [];
  const globalStats = {
    quizTotal: allQuizQuestions.length,
    quizLearned: Math.min(quizLearnedCount, allQuizQuestions.length),
    wisorTotal: wisorQuestions.length,
    wisorLearned: Object.keys(completedWisors).length,
    wisorEcoTotal: wisorEcoQuestions.length,
    wisorEcoLearned: Object.keys(completedWisorsEco).length,
  };

  const burgerMenuPortal = createPortal(
    <>
      <BurgerMenu
        authUser={authUser}
        handleLogout={handleLogout}
        stats={globalStats}
        isLightMode={isLightMode}
        toggleTheme={toggleTheme}
        onOpenQuestionManager={(cat) => setQuestionManagerCategory(cat)}
        onOpenLearningDashboard={() => setAppMode('learning_dashboard')}
        onStartPomodoro={() => { setPomodoroActive(true); setPomodoroSessionLog([]); }}
        pomodoroRunning={pomodoroActive}
        pomodoroTimeLeft={pomodoroTimeLeft}
        onStopPomodoro={() => setPomodoroForceStop(Date.now())}
      />
      {questionManagerCategory && (
        <QuestionManager
          category={questionManagerCategory}
          questions={
            questionManagerCategory === 'quiz' ? allQuizQuestions :
              questionManagerCategory === 'wisor' ? wisorQuestions : wisorEcoQuestions
          }
          authUser={authUser}
          progress={
            questionManagerCategory === 'quiz' ? quizProg :
              questionManagerCategory === 'wisor' ? completedWisors : completedWisorsEco
          }
          formatLatex={formatLatex}
          onClose={() => setQuestionManagerCategory(null)}
          onAddCustomQuizQuestion={handleAddCustomQuizQuestion}
          onProgressUpdate={(cat, updatedProgress) => {
            if (cat === 'quiz') refreshQuizDuePool().catch(() => { });
            else if (cat === 'wisor') setCompletedWisors(updatedProgress);
            else if (cat === 'wisorEco') setCompletedWisorsEco(updatedProgress);
          }}
        />
      )}
    </>,
    document.body
  );

  if (appMode === 'dashboard') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header style={{ position: 'relative', width: '100%' }}>
          <div style={{ position: 'absolute', top: '0.2rem', right: 0, zIndex: 15 }}>
            <button
              className="settings-gear-btn"
              onClick={() => setSettingsMenuOpen(prev => !prev)}
              aria-label="Einstellungen"
              title="Einstellungen"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            {settingsMenuOpen && (
              <div className="settings-popover">
                <button
                  className="settings-popover-item"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    setAppMode('appearance_settings');
                  }}
                >
                  Darstellung anpassen
                </button>
              </div>
            )}
          </div>
          <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '0px', fontSize: '3.5rem', transform: 'scaleY(1.2)', transformOrigin: 'bottom', margin: '0 0 1rem 0', color: 'var(--text-light)', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>MASTERPAT APP</h1>
          <p className="subtitle">Wähle deinen Lernmodus</p>
        </header>
        <div className="dashboard-grid">
          <div className="dash-card" onClick={() => { setAppMode('quiz_setup'); }}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="0.9em" height="0.9em" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <circle cx="85" cy="85" r="50" fill="none" stroke="var(--text-light)" strokeWidth="35" />
                <circle cx="85" cy="85" r="25" fill="var(--text-light)" />
                <rect x="190" y="45" width="290" height="80" rx="10" fill="var(--text-light)" />
                <circle cx="85" cy="256" r="50" fill="none" stroke="var(--text-light)" strokeWidth="35" />
                <rect x="190" y="216" width="290" height="80" rx="10" fill="var(--text-light)" />
                <circle cx="85" cy="427" r="50" fill="none" stroke="var(--text-light)" strokeWidth="35" />
                <rect x="190" y="387" width="290" height="80" rx="10" fill="var(--text-light)" />
              </svg>
            </div>
            <h2>Wissen testen<br />(Quiz)</h2>
            <p>Multiple-Choice Fragen zum Überprüfen deines Wissensstands.</p>
            <div className="chip">{quizDuePool.length === 0 ? 'Alles gemeistert! 🎉' : `${quizDuePool.length} Fragen fällig`}</div>

            {(Object.keys(quizProg || {}).length > 0 || !!authUser?.id) && (
              <button
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); openResetModal(e, 'quiz'); }}
              >
                🔄 Lernfortschritt zurücksetzen
              </button>
            )}
          </div>

          <div className="dash-card" onClick={() => startWisor('wisor1')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.2em" height="1.2em" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M 280 200 H 460 V 420 L 420 460 L 380 420 L 340 460 L 300 420 L 260 460 L 220 420 V 320" fill="none" stroke="var(--text-light)" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                <rect x="290" y="270" width="140" height="24" rx="12" fill="var(--text-light)" />
                <rect x="290" y="325" width="140" height="24" rx="12" fill="var(--text-light)" />
                <rect x="290" y="380" width="80" height="24" rx="12" fill="var(--text-light)" />
                <g transform="translate(190, 220) rotate(45)">
                  <rect x="-20" y="40" width="40" height="200" rx="20" fill="var(--text-light)" />
                  <rect x="-60" y="-45" width="120" height="90" rx="5" fill="var(--text-light)" />
                  <rect x="-80" y="-35" width="20" height="70" fill="var(--text-light)" />
                  <rect x="-105" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                  <rect x="60" y="-35" width="20" height="70" fill="var(--text-light)" />
                  <rect x="80" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                </g>
              </svg>
            </div>
            <h2>WisoR<br />(Eingabe)</h2>
            <p>Freitext Eingabe für Zahlen und Fakten. Gekonntes verschwindet!</p>
            <div className="chip">{Object.keys(completedWisors).length === wisor1.questions.length ? 'Alles gemeistert! 🎉' : `${wisor1.questions.length - Object.keys(completedWisors).length} Fragen verfügbar`}</div>

            {Object.keys(completedWisors).length > 0 && (
              <button
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); openResetModal(e, 'wisor'); }}
              >
                🔄 Lernfortschritt zurücksetzen
              </button>
            )}
          </div>

          <div className="dash-card" onClick={() => startWisor('wisorEco')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.2em" height="1.2em" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M 280 200 H 460 V 420 L 420 460 L 380 420 L 340 460 L 300 420 L 260 460 L 220 420 V 320" fill="none" stroke="var(--text-light)" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                <text x="290" y="375" fontSize="130" fontWeight="900" fill="var(--text-light)" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">$</text>
                <rect x="340" y="270" width="100" height="24" rx="12" fill="var(--text-light)" />
                <rect x="340" y="325" width="100" height="24" rx="12" fill="var(--text-light)" />
                <rect x="340" y="380" width="60" height="24" rx="12" fill="var(--text-light)" />
                <g transform="translate(190, 220) rotate(45)">
                  <rect x="-20" y="40" width="40" height="200" rx="20" fill="var(--text-light)" />
                  <rect x="-60" y="-45" width="120" height="90" rx="5" fill="var(--text-light)" />
                  <rect x="-80" y="-35" width="20" height="70" fill="var(--text-light)" />
                  <rect x="-105" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                  <rect x="60" y="-35" width="20" height="70" fill="var(--text-light)" />
                  <rect x="80" y="-55" width="25" height="110" rx="12" fill="var(--text-light)" />
                </g>
              </svg>
            </div>
            <h2>WisoR im<br />E-Commerce</h2>
            <p>Freitext Eingabe für E-Commerce spezifische Aufgaben.</p>
            <div className="chip">{Object.keys(completedWisorsEco).length === (wisorEco?.questions?.length || 0) && (wisorEco?.questions?.length || 0) > 0 ? 'Alles gemeistert! 🎉' : `${(wisorEco?.questions?.length || 0) - Object.keys(completedWisorsEco).length} Fragen verfügbar`}</div>

            {Object.keys(completedWisorsEco).length > 0 && (
              <button
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); openResetModal(e, 'wisorEco'); }}
              >
                🔄 Lernfortschritt zurücksetzen
              </button>
            )}
          </div>

          <div className="dash-card" onClick={() => { setAppMode('notes_manager'); }}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <img
                src={notesIcon}
                alt="Notizen"
                style={{
                  width: '1.05em',
                  height: '1.05em',
                  objectFit: 'contain',
                  filter: isLightMode ? 'none' : 'invert(1)'
                }}
              />
            </div>
            <h2>Meine Notizen</h2>
            <p>Deine gespeicherten Notizen ansehen und als PDF exportieren.</p>
            <div className="chip" style={{ marginTop: 'auto' }}>Gespeichert</div>
          </div>

          <div className="dash-card" onClick={() => setAppMode('kalkulation')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" />
                <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" />
                <line x1="7" y1="5" x2="7" y2="9" />
                <line x1="5" y1="7" x2="9" y2="7" />
                <line x1="15" y1="7" x2="19" y2="7" />
                <line x1="15" y1="15.5" x2="19" y2="19" />
                <line x1="19" y1="15.5" x2="15" y2="19" />
                <line x1="5" y1="16" x2="9" y2="16" />
                <line x1="5" y1="18.5" x2="9" y2="18.5" />
              </svg>
            </div>
            <h2>Kalkulations-<br />Boss</h2>
            <p>Meistere Vorwärts-, Rückwärts- und Differenzkalkulation spielerisch.</p>
            <div className="chip">3 Level</div>
          </div>

          <div className="dash-card" onClick={() => setAppMode('break_even')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="3" x2="3" y2="21" />
                <line x1="3" y1="21" x2="21" y2="21" />
                <line x1="4" y1="17" x2="9" y2="17" />
                <line x1="9" y1="17" x2="13" y2="12" />
                <line x1="13" y1="12" x2="20" y2="12" />
                <circle cx="9" cy="17" r="1.2" fill="var(--text-light)" stroke="none" />
                <circle cx="13" cy="12" r="1.2" fill="var(--text-light)" stroke="none" />
              </svg>
            </div>
            <h2>Break Even<br />Point</h2>
            <p>Trainiere Deckungsbeitrag, Gewinnschwelle in Stück und kritischen Umsatz.</p>
            <div className="chip">Neuer Raum</div>
          </div>
        </div>

        {resetModalVisible && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="card-face fade-in" style={{ padding: '2rem', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center', maxWidth: '350px' }}>
              <h3 style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Fortschritt zurücksetzen?</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Bitte löse folgende Aufgabe, um ein versehentliches Löschen zu verhindern:</p>
              <form onSubmit={handleResetConfirm}>
                <p style={{ fontSize: '1.5rem', color: 'var(--text-light)', marginBottom: '1rem' }}>{resetMath.a} + {resetMath.b} = ?</p>
                <input
                  type="number"
                  className="wisor-input"
                  style={{ textAlign: 'center', marginBottom: '1rem' }}
                  value={resetMath.input}
                  onChange={(e) => setResetMath(s => ({ ...s, input: e.target.value }))}
                  required
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setResetModalVisible(false)} style={{ flex: 1 }}>Abbrechen</button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, background: 'var(--color-error)' }}>Löschen</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (appMode === 'appearance_settings') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>

        <header style={{ width: '100%', maxWidth: '760px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '0.8rem' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
          </div>
          <h1 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--text-light)' }}>Darstellung anpassen</h1>
          <p className="subtitle" style={{ marginTop: '0.5rem' }}>Passe den Hintergrund im Hauptmenu an.</p>
        </header>

        <section className="appearance-panel" style={{ width: '100%', maxWidth: '760px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.9rem', color: 'var(--text-light)' }}>Backgroundfarbe</h3>
          <div className="appearance-row">
            <input
              type="color"
              value={colorPickerValue}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              className="background-color-picker"
              aria-label="Backgroundfarbe auswählen"
            />
            <input
              type="text"
              value={activeBackgroundColor}
              onChange={(e) => {
                const inputValue = e.target.value.trim();
                setCustomBackgroundColor(inputValue);
                if (isValidHexColor(inputValue)) {
                  setBackgroundMode('color');
                  setBackgroundPresetId('');
                  setBackgroundImageData('');
                  persistBackgroundSettings({ mode: 'color', color: inputValue, presetId: '', imageData: '', effectsEnabled: backgroundEffectsEnabled });
                  applyCustomBackgroundColor(inputValue);
                }
              }}
              className="background-color-input"
              placeholder="#0f172a"
            />
          </div>

          <div className="appearance-toggle-row">
            <label htmlFor="background-effects-toggle" style={{ color: 'var(--text-light)', fontSize: '0.92rem', fontWeight: 600 }}>
              Fleckigen Effekt anzeigen
            </label>
            <input
              id="background-effects-toggle"
              type="checkbox"
              checked={backgroundEffectsEnabled}
              onChange={(e) => handleBackgroundEffectsToggle(e.target.checked)}
              className="appearance-effects-toggle"
            />
          </div>

          <h3 style={{ marginTop: '1.1rem', marginBottom: '0.7rem', color: 'var(--text-light)' }}>Preset-Styles</h3>
          <div className="appearance-presets">
            {BACKGROUND_PRESETS.map((preset) => {
              const isSelected = backgroundMode === 'preset' && backgroundPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`appearance-preset-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleBackgroundPresetChange(preset.id)}
                >
                  <span className="appearance-preset-swatch" style={{ background: `linear-gradient(135deg, ${preset.glow1}, ${preset.glow2}), ${preset.color}` }}></span>
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>

          <h3 style={{ marginTop: '1.1rem', marginBottom: '0.7rem', color: 'var(--text-light)' }}>Eigenes Hintergrundbild</h3>
          <label className="appearance-upload-label">
            Bild hochladen
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="appearance-upload-input"
              onChange={(e) => handleBackgroundUpload(e.target.files?.[0])}
            />
          </label>
          <p style={{ marginTop: '0.45rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Empfehlung: max. 2.5 MB, Querformat fuer bestes Ergebnis.</p>
          {backgroundMode === 'upload' && backgroundImageData ? (
            <p style={{ marginTop: '0.35rem', color: 'var(--success)', fontSize: '0.84rem' }}>Eigenes Bild ist aktiv.</p>
          ) : null}
          {appearanceNotice ? (
            <p style={{ marginTop: '0.35rem', color: appearanceNotice.includes('fehl') || appearanceNotice.includes('gross') || appearanceNotice.includes('Bitte') ? 'var(--error)' : 'var(--success)', fontSize: '0.84rem' }}>
              {appearanceNotice}
            </p>
          ) : null}

          <div className="appearance-actions">
            <button className="btn-secondary" onClick={resetBackgroundColor}>Standard wiederherstellen</button>
            <button className="btn-primary" onClick={() => setAppMode('dashboard')}>Fertig</button>
          </div>
        </section>
      </div>
    );
  }

  if (appMode === 'kalkulation') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <KalkulationsBoss onBack={() => setAppMode('dashboard')} />
        <FloatingNotes questionId="kalkulation" questionText="Kalkulations-Boss" />
        <FloatingCalculator />
      </>
    );
  }

  if (appMode === 'break_even') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <BreakEvenPoint onBack={() => setAppMode('dashboard')} />
        <FloatingNotes questionId="break_even_point" questionText="Break-Even-Point Training" />
        <FloatingCalculator />
      </>
    );
  }

  if (appMode === 'notes_manager') {
    const savedNotes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
    const noteKeys = Object.keys(savedNotes).sort((a, b) => new Date(savedNotes[b].date) - new Date(savedNotes[a].date));

    const handleDeleteNote = async (key) => {
      if (window.confirm('Möchtest du diese Notiz wirklich löschen?')) {
        const notes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
        delete notes[key];
        localStorage.setItem('ap2_saved_notes', JSON.stringify(notes));
        // Sync deletion to Supabase (only for authenticated users)
        if (authUser?.id) {
          try {
            await syncProgressToSupabase({ saved_notes: notes });
          } catch (err) { console.error('Supabase note delete sync error:', err); }
        }
        setAppMode('');
        setTimeout(() => setAppMode('notes_manager'), 0);
      }
    };

    const formatNoteContext = (key, contextText) => {
      const parts = key.split('_');
      const typeStr = parts[0] === 'quiz' ? 'Quiz' : parts[0] === 'wisor' ? 'Wisor' : parts[0] === 'wisoreco' ? 'WisoR E-Commerce' : parts[0] === 'flashcard' ? 'Lernkarte' : 'Aufgabe';
      const idNum = parts.length > 1 ? parts[1] : '';
      const parsedNum = parseInt(idNum, 10);
      const numStr = isNaN(parsedNum) ? '' : ` ${parsedNum + 1}`;

      const title = `${typeStr}${numStr}`;

      const cleanText = (contextText || '').replace(/[^\wäöüÄÖÜß]/g, ' ');
      const words = cleanText.split(/\s+/).filter(w => w.length > 3);
      // Try to find Nouns (Start with capital letter) first to use as keywords
      const nouns = words.filter(w => /^[A-ZÄÖÜ]/.test(w));
      const chosenWords = nouns.length >= 2 ? nouns.slice(0, 2) : words.slice(0, 2);

      const keywords = chosenWords.length > 0 ? ` - ${chosenWords.join(', ')}` : '';
      return `${title}${keywords}`;
    };

    const handleGenerateDeepLearning = async (key, note) => {
      setDeepLearningLoading(key);
      const prompt = `Du bist ein genialer, motivierender KI-Tutor. Der Schüler hat sich folgende Prüfungsnotiz gemerkt, weil er es schwer fand:

Kontext/Frage: ${note.context}
Eigene Notiz des Schülers: ${note.text}

Bitte erstelle daraus sofort ein "Deep Learning" Materialset. WICHTIG: Antworte AUSSCHLIESSLICH mit einem puren JSON-Objekt, ohne Markdown-Codeblöcke (\`\`\`) außenrum. Keine Begrüßung.

Die JSON muss exakt diese Struktur haben:
{
  "quiz": [
    {
      "question": "Die präzise Frage hier",
      "options": ["Falsch", "Richtig", "Falsch", "Falsch"],
      "correctAnswer": 1
    },
    ... (insgesamt 3 Fragen)
  ],
  "writeAction": "Hol jetzt einen Stift und schreib dir diesen Kern-Satz auf: [Hier der Kernsatz]"
}`;

      try {
        const response = await askGemini(prompt);
        const notes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
        if (notes[key]) {
          try {
            // Clean markdown enclosing if any
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
              cleanResponse = cleanResponse.substring(7, cleanResponse.length - 3);
            } else if (cleanResponse.startsWith('```')) {
              cleanResponse = cleanResponse.substring(3, cleanResponse.length - 3);
            }
            const parsedData = JSON.parse(cleanResponse);
            notes[key].deepLearningResult = parsedData;
            localStorage.setItem('ap2_saved_notes', JSON.stringify(notes));
            // Sync deep learning result to Supabase (only for authenticated users)
            if (authUser?.id) {
              try {
                await syncProgressToSupabase({ saved_notes: notes });
              } catch (err) { console.error('Supabase deep learning sync error:', err); }
            }
          } catch (e) {
            console.error('Failed to parse JSON', e);
            alert('Die KI hat ein ungültiges Format gesendet.');
          }
        }
      } catch (error) {
        console.error(error);
        alert('Ein Fehler ist bei der Erstellung des Deep Learning Materials aufgetreten.');
      }
      setDeepLearningLoading(null);
      // refresh UI
      setAppMode('');
      setTimeout(() => setAppMode('notes_manager'), 0);
    };

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header className="hide-on-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1.5rem' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px' }} onClick={() => window.print()}>Als PDF drucken</button>
          </div>
          <h1 style={{ margin: 0, color: 'var(--text-light)', fontSize: '2.5rem', textAlign: 'center', width: '100%' }}>Gespeicherte Notizen</h1>
        </header>

        <div className="notes-list-container" style={{ width: '100%' }}>
          {noteKeys.length === 0 ? (
            <div style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '2rem' }}>Noch keine Notizen vorhanden.</div>
          ) : (
            <div className="printable-notes" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
              {noteKeys.map(key => {
                const note = savedNotes[key];
                return (
                  <div key={key} className="note-card" style={{ position: 'relative', padding: '1.5rem', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '16px', border: '1px solid var(--glass-border)', textAlign: 'left', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{new Date(note.date).toLocaleString()}</span>
                      <button
                        className="hide-on-print"
                        onClick={() => handleDeleteNote(key)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '1.2rem' }}
                        title="Notiz löschen"
                      >
                        🗑️
                      </button>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic', fontWeight: 'bold' }}>
                      {formatNoteContext(key, note.context)}
                    </div>
                    <div style={{ color: 'var(--text-light)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {note.text}
                    </div>

                    {note.deepLearningResult && typeof note.deepLearningResult === 'object' ? (
                      <div className="fade-in hide-on-print" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--glass-bg)', borderRadius: '12px', borderLeft: '4px solid var(--primary)', color: 'var(--text-light)' }}>
                        <h3 style={{ color: 'var(--text-light)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>🎯</span> Deep Learning Quiz
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {note.deepLearningResult.quiz?.map((q, qIndex) => (
                            <div key={qIndex} style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px' }}>
                              <p style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-light)' }}>{formatLatex(q.question)}</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {q.options.map((opt, oIndex) => (
                                  <button
                                    key={oIndex}
                                    className="btn-secondary"
                                    onClick={(e) => {
                                      if (oIndex === q.correctAnswer) {
                                        e.target.style.background = '#10b981';
                                        e.target.style.color = '#fff';
                                        e.target.innerText = '✅ ' + formatLatex(opt);
                                      } else {
                                        e.target.style.background = '#ef4444';
                                        e.target.style.color = '#fff';
                                        e.target.innerText = '❌ ' + formatLatex(opt);
                                      }
                                    }}
                                    style={{ textAlign: 'left', padding: '0.8rem', fontSize: '0.9rem', width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', transition: 'all 0.2s' }}
                                  >
                                    {formatLatex(opt)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {note.deepLearningResult.writeAction && (
                          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid #38bdf8', borderRadius: '4px' }}>
                            <h4 style={{ color: '#38bdf8', margin: '0 0 0.5rem 0' }}>✍️ Wichtige Schreibaufgabe:</h4>
                            <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 'bold' }}>{note.deepLearningResult.writeAction}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="hide-on-print" style={{ marginTop: '1.5rem' }}>
                        <button
                          className={`btn-secondary ${deepLearningLoading === key ? 'loading' : ''}`}
                          onClick={() => handleGenerateDeepLearning(key, note)}
                          disabled={deepLearningLoading === key}
                          style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: '100%', background: 'linear-gradient(90deg, #66295c, #2c3170)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                          {deepLearningLoading === key ? '✨ Generiere Quiz...' : '✨ Deep Learning Quiz generieren'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (appMode === 'learning_dashboard') {
    if (!authUser?.email) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          {burgerMenuPortal}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '620px', padding: '2.2rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-light)', marginTop: 0 }}>Nur für registrierte Accounts</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Die Lernkarten-Analyse ist nur mit E-Mail-Login verfügbar. Pro E-Mail wird ein eigener Lernstand geführt.
            </p>
            <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
          </div>
        </div>
      );
    }

    const events = learningAnalytics?.events || [];
    const mistakes = learningAnalytics?.mistakes || {};

    const periodStart = {
      day: Date.now() - (24 * 60 * 60 * 1000),
      week: Date.now() - (7 * 24 * 60 * 60 * 1000),
      month: Date.now() - (30 * 24 * 60 * 60 * 1000)
    };

    const getCounts = (startTs) => {
      const inRange = events.filter(e => e.ts >= startTs);
      const questionEvents = inRange.filter(e => e.mode === 'quiz' || e.mode === 'wisor' || e.mode === 'wisorEco');
      const cardEvents = inRange.filter(e => e.mode === 'flashcard');

      return {
        questionsCorrect: questionEvents.filter(e => e.correct).length,
        questionsWrong: questionEvents.filter(e => !e.correct).length,
        cardsCorrect: cardEvents.filter(e => e.correct).length,
        cardsWrong: cardEvents.filter(e => !e.correct).length,
      };
    };

    const day = getCounts(periodStart.day);
    const week = getCounts(periodStart.week);
    const month = getCounts(periodStart.month);

    const topMistakes = Object.values(mistakes)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 12);

    const modeTotals = events.reduce((acc, event) => {
      const mode = event.mode || 'unknown';
      if (!acc[mode]) acc[mode] = { correct: 0, wrong: 0 };
      if (event.correct) acc[mode].correct += 1;
      else acc[mode].wrong += 1;
      return acc;
    }, {});

    return (
      <div className="app-container learning-analytics-dashboard" style={{ zIndex: 10, alignItems: 'stretch' }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>

        <header className="hide-on-print" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto 1.2rem auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '0.8rem' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
          </div>
          <h1 style={{ margin: 0, color: 'var(--text-light)', fontSize: '2rem', textAlign: 'center', width: '100%' }}>Lernkarten Analyse</h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
            <button className="btn-secondary" onClick={refreshMistakeAnalysis}>🔄 Analyse aktualisieren</button>
            <button className="btn-primary" onClick={() => window.print()}>📄 Lernstand als PDF</button>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.8rem', marginBottom: 0, textAlign: 'center' }}>
            Überblick über richtige/falsche Antworten pro Zeitraum, inkl. Fehlercluster und Schwächen.
          </p>
        </header>

        <h1 className="print-only-title" style={{ margin: 0, textAlign: 'center', color: 'var(--text-light)', fontSize: '2.35rem', fontWeight: 900, letterSpacing: '0.02em' }}>
          MasterPat APP
        </h1>

        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Heute', values: day },
            { label: 'Letzte 7 Tage', values: week },
            { label: 'Letzte 30 Tage', values: month }
          ].map(item => (
            <div key={item.label} className="card-face" style={{ padding: '1.2rem', border: '1px solid var(--glass-border)', borderRadius: '16px', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', textAlign: 'left' }}>
              <h3 style={{ marginTop: 0, color: 'var(--text-light)', marginBottom: '0.9rem' }}>{item.label}</h3>
              <p style={{ margin: '0.35rem 0', color: 'var(--text-muted)' }}>Fragen richtig: <strong style={{ color: 'var(--success)' }}>{item.values.questionsCorrect}</strong></p>
              <p style={{ margin: '0.35rem 0', color: 'var(--text-muted)' }}>Fragen falsch: <strong style={{ color: 'var(--error)' }}>{item.values.questionsWrong}</strong></p>
              <p style={{ margin: '0.35rem 0', color: 'var(--text-muted)' }}>Karten richtig: <strong style={{ color: 'var(--success)' }}>{item.values.cardsCorrect}</strong></p>
              <p style={{ margin: '0.35rem 0', color: 'var(--text-muted)' }}>Karten unsicher/falsch: <strong style={{ color: 'var(--error)' }}>{item.values.cardsWrong}</strong></p>
            </div>
          ))}
        </div>

        <div className="printable-notes" style={{ width: '100%', maxWidth: '1200px', margin: '1rem auto 0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <section className="note-card" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-light)', marginBottom: '0.8rem' }}>Fehler-Analyse (Top Schwächen)</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Letzte Aktualisierung: {learningAnalytics?.lastRefreshedAt ? new Date(learningAnalytics.lastRefreshedAt).toLocaleString() : 'noch nicht ausgeführt'}
            </p>
            {topMistakes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Noch keine Fehlerdaten vorhanden.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {topMistakes.map((entry, idx) => (
                  <div key={`${entry.mode}_${entry.questionId || idx}`} style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <strong style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{entry.questionText}</strong>
                      <span style={{ color: 'var(--error)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{entry.count}× Fehler</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Bereich: {entry.mode} · Letzter Fehler: {entry.lastAt ? new Date(entry.lastAt).toLocaleString() : '-'}
                    </div>
                    {entry.expectedAnswer ? (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Erwartet: {entry.expectedAnswer}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="note-card" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-light)', marginBottom: '0.8rem' }}>Detaillierter Lernstand</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '0.75rem' }}>Gesamte Antworten: <strong style={{ color: 'var(--text-light)' }}>{events.length}</strong></p>
            {Object.keys(modeTotals).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Noch keine Trainingsdaten vorhanden.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(modeTotals).map(([mode, counts]) => {
                  const total = counts.correct + counts.wrong;
                  const accuracy = total > 0 ? Math.round((counts.correct / total) * 100) : 0;
                  return (
                    <div key={mode} style={{ padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: 'var(--text-light)' }}>{mode}</strong>
                        <span style={{ color: accuracy >= 70 ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>{accuracy}% Trefferquote</span>
                      </div>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Richtig: {counts.correct} · Falsch: {counts.wrong} · Gesamt: {total}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '10px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              PDF-Export enthält alle sichtbaren Kennzahlen, Fehlercluster und Bereichs-Trefferquoten.
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (appMode === 'quiz_setup') {
    const dueByTopicMap = getDueQuizzesByTopic('all').reduce((acc, q) => {
      const groupedTopic = getQuizTopicGroup(q.topic);
      acc[groupedTopic] = (acc[groupedTopic] || 0) + 1;
      return acc;
    }, {});
    const dueByTopicEntries = Object.entries(dueByTopicMap).sort((a, b) => b[1] - a[1]);
    const selectedTopicDueCount = selectedQuizTopic === 'all'
      ? getDueQuizzesByTopic('all').length
      : (dueByTopicMap[selectedQuizTopic] || 0);

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
        </header>
        <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Wieviele Fragen?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Wähle deinen Themenblock innerhalb von „Wissen testen“ und dann die Anzahl fälliger Fragen.</p>

          <div style={{ marginBottom: '1.3rem', textAlign: 'left' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>
              Themenblock
            </label>
            <select
              value={selectedQuizTopic}
              onChange={(e) => setSelectedQuizTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-light)',
                fontSize: '0.92rem'
              }}
            >
              <option value="all">Alle Themen ({getDueQuizzesByTopic('all').length} fällig)</option>
              {dueByTopicEntries.map(([topic, count]) => (
                <option key={topic} value={topic}>{topic} ({count} fällig)</option>
              ))}
            </select>
            {selectedTopicDueCount === 0 && (
              <p style={{ color: 'var(--text-muted)', marginTop: '0.6rem', marginBottom: 0, fontSize: '0.83rem' }}>
                Für diesen Themenblock sind aktuell keine Fragen fällig.
              </p>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', marginBottom: '1.3rem', textAlign: 'left', color: 'var(--text-light)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={feynmanModeEnabled}
              onChange={(e) => setFeynmanModeEnabled(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
              Feynman-Methode: Antworten nach Erfolg selbst erklären (Empfohlen für tieferes Verständnis)
            </span>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => startQuizSession(10, selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>10 Fragen</button>
            <button className="btn-secondary" onClick={() => startQuizSession(20, selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>20 Fragen</button>
            <button className="btn-secondary" onClick={() => startQuizSession(50, selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>50 Fragen</button>
            <button className="btn-primary" onClick={() => startQuizSession('all', selectedQuizTopic)} disabled={selectedTopicDueCount === 0}>Alle fälligen</button>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === 'quiz') {
    if (allQuizzes.length === 0) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          {burgerMenuPortal}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-light)', marginBottom: '0.8rem', fontSize: '1.8rem' }}>Keine fälligen Fragen</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem' }}>Für den gewählten Themenblock ist gerade nichts offen.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAppMode('quiz_setup')}>Themenwahl</button>
              <button className="btn-primary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
            </div>
          </div>
        </div>
      );
    }

    if (currentQuizIndex >= allQuizzes.length) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          {burgerMenuPortal}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Quiz Beendet!</h2>
            <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Ergebnis: {quizScore.correct} / {quizScore.total}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
              <button className="btn-primary" onClick={resetQuiz}>Nochmal spielen</button>
            </div>
          </div>
        </div>
      );
    }

    const q = allQuizzes[currentQuizIndex];
    const selectedOption = selectedAnswer !== null ? q.answerOptions[selectedAnswer] : null;
    const shouldGateExplanation = selectedAnswer !== null
      && feynmanModeEnabled
      && !!selectedOption?.isCorrect
      && !quizExplanationRevealed;
    const requireFeynmanCompletion = selectedAnswer !== null
      && feynmanModeEnabled
      && !!selectedOption?.isCorrect;
    const canProceedToNextQuizQuestion = !requireFeynmanCompletion
      || quizExplanationRevealed
      || !!feynmanFeedback;

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <p className="subtitle">Frage {currentQuizIndex + 1} von {allQuizzes.length}</p>
            <div className="score-badge">Score: {quizScore.correct}</div>
          </div>
        </header>

        <div className="quiz-container">
          <div style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className={`btn-secondary fade-in ${wisorVideoLoading ? 'loading' : ''}`}
              onClick={() => handleToggleVideos(q)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: wisorVideoOpen ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <span>{wisorVideoOpen ? '🙈' : '📺'}</span>
              {wisorVideoOpen ? 'Videos ausblenden' : 'Lernvideos ansehen'}
            </button>

            <button
              className="btn-secondary fade-in"
              onClick={() => setGeminiVisible(!geminiVisible)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: geminiVisible ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <span>✨</span>
              {geminiVisible ? 'Gemini schließen' : 'KI um Hilfe bitten'}
            </button>
          </div>

          {wisorVideoOpen && (
            <div className="fade-in" style={{ marginBottom: '1.5rem', width: '100%' }}>
              {!selectedWisorVideo ? (
                <>
                  {wisorVideoLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>Suche passende Videos... ⏳</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {wisorVideos.length > 0 ? wisorVideos.map((video) => (
                        <div
                          key={video.id}
                          className="video-thumbnail-card"
                          onClick={() => setSelectedWisorVideo(video)}
                          style={{ background: 'var(--glass-bg)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                        >
                          <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                          <div style={{ padding: '0.8rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', marginBottom: '0.4rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{video.channelTitle}</span>
                          </div>
                        </div>
                      )) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                          {wisorVideoError || 'Keine Videos gefunden.'}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ background: 'black', borderRadius: '16px', overflow: 'hidden', position: 'relative', paddingTop: '56.25%' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedWisorVideo.id.replace('predefined_', '')}?autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  ></iframe>
                  <button
                    onClick={() => setSelectedWisorVideo(null)}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    X
                  </button>
                </div>
              )}
            </div>
          )}

          {geminiVisible && (
            <div className="fade-in" style={{ marginBottom: '1.5rem', width: '100%', background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="wisor-input"
                  style={{ flex: 1, padding: '0.8rem', fontSize: '0.95rem' }}
                  placeholder="Frag die KI nach einer Erklärung..."
                  value={geminiQuery}
                  onChange={e => setGeminiQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGeminiAsk()}
                />
                <button
                  className="btn-primary"
                  onClick={handleGeminiAsk}
                  disabled={geminiLoading || !geminiQuery.trim()}
                  style={{ padding: '0 1.5rem' }}
                >
                  {geminiLoading ? '...' : 'Fragen'}
                </button>
              </div>

              {geminiResponse && (
                <div style={{ textAlign: 'left', lineHeight: '1.6', fontSize: '0.95rem', color: '#f8fafc', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>
                  {geminiResponse}
                </div>
              )}
            </div>
          )}

          <div className="quiz-question">
            {formatLatex(q.question)}
          </div>
          <div className="quiz-options">
            {q.answerOptions.map((opt, idx) => {
              let btnClass = "quiz-btn";
              if (selectedAnswer !== null) {
                if (opt.isCorrect) btnClass += " correct";
                else if (selectedAnswer === idx) btnClass += " wrong";
              }
              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleQuizAnswer(idx)}
                  disabled={selectedAnswer !== null}
                >
                  {formatLatex(opt.text)}
                </button>
              )
            })}
          </div>

          {selectedAnswer !== null && (
            <div className="quiz-rationale fade-in">
              {!shouldGateExplanation ? (
                <p><strong>Erklärung:</strong> {formatLatex(q.answerOptions[selectedAnswer].rationale)}</p>
              ) : (
                <div style={{ marginBottom: '0.4rem', textAlign: 'left', border: '1px dashed var(--glass-border)', borderRadius: '10px', padding: '0.85rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Erklärung ist ausgeblendet, damit du zuerst selbst denkst.
                  </p>
                  <button
                    className="btn-secondary"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => setQuizRevealConfirmVisible(true)}
                  >
                    Erklärung aufklappen
                  </button>
                </div>
              )}

              {feynmanModeEnabled && q.answerOptions[selectedAnswer].isCorrect && (
                <div style={{ marginTop: '1rem', textAlign: 'left', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                  <label style={{ display: 'block', color: 'var(--text-light)', marginBottom: '0.55rem', fontWeight: 600 }}>
                    Feynman-Check
                  </label>
                  <textarea
                    className="wisor-input"
                    placeholder="Erkläre in deinen eigenen Worten, warum diese Antwort richtig ist..."
                    value={feynmanInput}
                    onChange={(e) => setFeynmanInput(e.target.value)}
                    rows={4}
                    style={{ width: '100%', resize: 'vertical', marginBottom: '0.75rem' }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={handleFeynmanCheck}
                    disabled={feynmanLoading || !feynmanInput.trim()}
                  >
                    {feynmanLoading ? 'Überprüfung läuft…' : 'Erklärung überprüfen'}
                  </button>

                  {feynmanFeedback && (
                    <div
                      style={{
                        marginTop: '0.8rem',
                        borderRadius: '10px',
                        padding: '0.8rem',
                        border: `1px solid ${feynmanFeedbackLevel === 'good' ? 'rgba(34,197,94,0.45)' : 'rgba(245,158,11,0.45)'}`,
                        background: feynmanFeedbackLevel === 'good' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color: 'var(--text-light)'
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '0.35rem', color: feynmanFeedbackLevel === 'good' ? 'var(--success)' : '#fbbf24' }}>
                        {feynmanFeedbackLevel === 'good' ? 'Gut verstanden' : 'Teilweise richtig / Ergänzung nötig'}
                      </strong>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>{feynmanFeedback}</div>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={nextQuizQuestion}
                disabled={!canProceedToNextQuizQuestion || feynmanLoading}
              >
                Nächste Frage &rarr;
              </button>
              {!canProceedToNextQuizQuestion && (
                <p style={{ marginTop: '0.55rem', marginBottom: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Für die nächste Frage: erst Feynman-Check absenden oder Erklärung bewusst aufklappen.
                </p>
              )}
            </div>
          )}

          {quizRevealConfirmVisible && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.72)', zIndex: 120, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="fade-in" style={{ width: 'min(420px, calc(100% - 2rem))', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', textAlign: 'center', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', boxShadow: '0 18px 45px rgba(0,0,0,0.4)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.6rem', color: 'var(--text-light)' }}>Sicher?</h3>
                <p style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Wenn du jetzt aufklappst, siehst du direkt die Muster-Erklärung.
                  Versuche vorher, den Kernpunkt wirklich selbst zu formulieren.
                </p>
                <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center' }}>
                  <button className="btn-secondary" onClick={() => setQuizRevealConfirmVisible(false)}>Weiter selbst denken</button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setQuizExplanationRevealed(true);
                      setQuizRevealConfirmVisible(false);
                    }}
                  >
                    Ja, aufklappen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <FloatingNotes questionId={`quiz_${currentQuizIndex}`} questionText={q.question || 'Quiz Frage'} />
        <FloatingCalculator />
      </div>
    );
  }

  if (appMode === 'wisor') {
    if (allWisors.length === 0) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          {burgerMenuPortal}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Alles geschafft! 🎉</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Du hast alle Wisor-Fragen erfolgreich gemeistert.</p>
            <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
            <button className="btn-primary" onClick={(e) => openResetModal(e, activeWisorMode === 'wisor1' ? 'wisor' : 'wisorEco')} style={{ marginLeft: '1rem' }}>Fortschritt zurücksetzen</button>
          </div>
          {resetModalVisible && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="card-face fade-in" style={{ padding: '2rem', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center', maxWidth: '350px' }}>
                <h3 style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Fortschritt zurücksetzen?</h3>
                <form onSubmit={handleResetConfirm}>
                  <p style={{ fontSize: '1.5rem', color: 'var(--text-light)', marginBottom: '1rem' }}>{resetMath.a} + {resetMath.b} = ?</p>
                  <input type="number" className="wisor-input" style={{ textAlign: 'center', marginBottom: '1rem' }} value={resetMath.input} onChange={(e) => setResetMath(s => ({ ...s, input: e.target.value }))} required autoFocus />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => setResetModalVisible(false)} style={{ flex: 1 }}>Abbrechen</button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, background: 'var(--color-error)' }}>Löschen</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (currentWisorIndex >= allWisors.length) {
      return (
        <div className="app-container" style={{ zIndex: 10 }}>
          {burgerMenuPortal}
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Durchgang Beendet!</h2>
            <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Ergebnis: {wisorScore.correct} / {wisorScore.total}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAppMode('dashboard')}>Zurück zum Menü</button>
              <button className="btn-primary" onClick={() => startWisor(activeWisorMode)}>Nächsten offene Fragen</button>
            </div>
          </div>
        </div>
      );
    }

    const q = allWisors[currentWisorIndex];

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <p className="subtitle">Frage {currentWisorIndex + 1} von {allWisors.length}</p>
            <div className="score-badge">Score: {wisorScore.correct}</div>
          </div>
        </header>

        <div className="quiz-container">
          <div style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className={`btn-secondary fade-in ${wisorVideoLoading ? 'loading' : ''}`}
              onClick={() => handleToggleVideos(q)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: wisorVideoOpen ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <span>{wisorVideoOpen ? '🙈' : '📺'}</span>
              {wisorVideoOpen ? 'Videos ausblenden' : 'Lernvideos ansehen'}
            </button>

            <button
              className="btn-secondary fade-in"
              onClick={() => setGeminiVisible(!geminiVisible)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: geminiVisible ? 'var(--glass-border)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <span>✨</span>
              {geminiVisible ? 'Gemini schließen' : 'KI um Hilfe bitten'}
            </button>
          </div>

          {wisorVideoOpen && (
            <div className="fade-in" style={{ marginBottom: '1.5rem', width: '100%' }}>
              {!selectedWisorVideo ? (
                <>
                  {wisorVideoLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>Suche passende Videos... ⏳</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {wisorVideos.length > 0 ? wisorVideos.map((video) => (
                        <div
                          key={video.id}
                          className="video-thumbnail-card"
                          onClick={() => setSelectedWisorVideo(video.url)}
                          style={{ cursor: 'pointer', background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', transition: 'transform 0.2s' }}
                        >
                          <img src={video.thumbnail} alt={video.title} style={{ width: '100%', borderRadius: '12px', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                          <h4 style={{ color: 'white', fontSize: '0.9rem', lineHeight: '1.2', marginBottom: '0.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</h4>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{video.channelTitle}</span>
                        </div>
                      )) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Keine Videos gefunden oder API-Key fehlt.</div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'black', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontSize: '0.9rem' }}>Video-Player</span>
                    <button className="btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '8px' }} onClick={() => setSelectedWisorVideo(null)}>← Andere Videos</button>
                  </div>
                  <iframe
                    width="100%"
                    height="280"
                    src={selectedWisorVideo}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ display: 'block' }}
                  ></iframe>
                </div>
              )}
            </div>
          )}

          {geminiVisible && (
            <div className="fade-in" style={{ marginBottom: '1.5rem', width: '100%', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)' }}>
              <p style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Frage an deinen KI-Tutor</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="wisor-input"
                  placeholder="Was genau verstehst du hier nicht?"
                  value={geminiQuery}
                  onChange={(e) => setGeminiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGeminiAsk();
                    }
                  }}
                  style={{ flex: 1, padding: '0.8rem', margin: 0 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleGeminiAsk}
                  disabled={geminiLoading || !geminiQuery.trim()}
                  style={{ padding: '0 1.5rem' }}
                >
                  {geminiLoading ? '⏳ Lädt...' : 'Fragen'}
                </button>
              </div>
              {geminiResponse && (
                <div className="fade-in" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', color: '#e2e8f0', textAlign: 'left', lineHeight: '1.6' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{geminiResponse}</pre>
                </div>
              )}
            </div>
          )}

          {/* svgCode now handled by FloatingImage */}
          <div className="quiz-question">
            {formatLatex(q.question)}
          </div>

          <form className="wisor-form" onSubmit={handleWisorSubmit}>
            <input
              type={q.inputType === 'number' ? 'number' : 'text'}
              className="wisor-input"
              value={wisorInput}
              onChange={(e) => setWisorInput(e.target.value)}
              disabled={wisorEvaluated}
              placeholder="Antwort eingeben..."
              ref={wisorInputRef}
            />
            {!wisorEvaluated && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%' }}>
                <button
                  type="button"
                  className="btn-secondary fade-in"
                  onClick={() => navigateWisorUnanswered(-1)}
                  disabled={currentWisorIndex === 0}
                  style={{ flex: '1', padding: '0.8rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  title="Vorherige Frage"
                >
                  &larr;
                </button>
                <button type="submit" className="btn-primary" style={{ flex: '3' }} disabled={!wisorInput.trim()}>
                  Antworten
                </button>
                <button
                  type="button"
                  className="btn-secondary fade-in"
                  onClick={() => navigateWisorUnanswered(1)}
                  disabled={currentWisorIndex === allWisors.length - 1}
                  style={{ flex: '1', padding: '0.8rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  title="Nächste Frage überspringen"
                >
                  &rarr;
                </button>
              </div>
            )}
            <FloatingImage svgCode={q.svgCode} isLightMode={isLightMode} />
          </form>

          {wisorEvaluated && (
            <div className={`quiz-rationale fade-in ${wisorIsCorrect ? 'correct-rationale' : 'wrong-rationale'}`}>
              <h3 style={{ color: wisorIsCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
                {wisorIsCorrect ? 'Richtig!' : 'Leider Falsch!'}
              </h3>
              {!wisorIsCorrect && (
                <p style={{ marginBottom: '0.5rem' }}><strong>Richtige Antwort(en):</strong> {q.expectedAnswers.join(' oder ')}</p>
              )}
              <p><strong>Erklärung:</strong> {q.rationale}</p>

              {q.videoUrl && (
                <div style={{ marginTop: '1rem', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                  <iframe
                    width="100%"
                    height="315"
                    src={q.videoUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={nextWisorQuestion} autoFocus>Nächste Frage &rarr;</button>
            </div>
          )}
        </div>
        <FloatingNotes questionId={`${activeWisorMode === 'wisor1' ? 'wisor' : 'wisoreco'}_${q.id}`} questionText={q.question || 'Wisor Frage'} />
        <FloatingCalculator />
      </div>
    );
  }

  // --- FLASHCARDS RENDERER ---
  if (learningQueue.length === 0) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '10vh', zIndex: 10 }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <button className="btn-nav" style={{ marginBottom: '2rem' }} onClick={() => setAppMode('dashboard')}>&larr; Zum Menü</button>
          <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '0px', fontSize: '3rem', transform: 'scaleY(1.2)', transformOrigin: 'bottom', color: 'var(--text-light)', textShadow: '0 4px 10px rgba(0,0,0,0.3)', margin: '0' }}>MASTERPAT APP</h1>
        </header>
        <div className="card-face" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
          <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>🎉 Glückwunsch! 🎉</h2>
          <p style={{ margin: '1rem 0', color: 'var(--text-muted)', fontSize: '1.2rem' }}>Du hast alle fälligen Karten für heute gelernt.</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Dein Gehirn baut jetzt die neuronalen Verbindungen aus. Komm später wieder!</p>
          <button className="btn-primary" onClick={forceReloadAll}>
            Trotzdem alle Karten neu laden
          </button>
        </div>
      </div>
    );
  }

  const currentCard = learningQueue[0];
  const progressPercentage = (stats.learnedToday / (stats.totalDue || 1)) * 100;

  return (
    <>
      {burgerMenuPortal}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="app-container" style={{ zIndex: 10 }}>
        <header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Spaced Repetition</h1>
            <div style={{ width: '80px' }}></div> {/* spacer */}
          </div>
        </header>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="progress-text">{stats.learnedToday} gelernt / {stats.totalDue} ausstehend</p>
        </div>

        <div className="flashcard-wrapper" onClick={() => !isFlipped && setIsFlipped(true)}>
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>

            <div className="card-face card-front">
              <span className="card-label">Frage</span>
              <p className="card-content">{currentCard.front}</p>
              {!isFlipped && <p style={{ position: 'absolute', bottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', animation: 'pulse 2s infinite' }}>Tippe zum Umdrehen</p>}
            </div>

            <div className="card-face card-back">
              <span className="card-label">Antwort</span>
              <p className="card-content">{currentCard.back}</p>
            </div>

          </div>
        </div>

        <div className="controls">
          {!isFlipped ? (
            <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} style={{ width: '200px' }}>
              Antwort zeigen
            </button>
          ) : (
            <div className="rating-controls fade-in">
              <button className="btn-rating btn-bad" onClick={(e) => handleRating(1, e)}>
                <span className="emoji">🔴</span>
                <span>Kann ich nicht</span>
                <span className="time-hint">&lt; 1 Min</span>
              </button>
              <button className="btn-rating btn-ok" onClick={(e) => handleRating(3, e)}>
                <span className="emoji">🟡</span>
                <span>Kann ich etwas</span>
                <span className="time-hint">10 Min</span>
              </button>
              <button className="btn-rating btn-good" onClick={(e) => handleRating(5, e)}>
                <span className="emoji">🟢</span>
                <span>Kann ich</span>
                <span className="time-hint">&gt; 1 Tag</span>
              </button>
            </div>
          )}
        </div>
        <FloatingNotes questionId={`flashcard_${currentCard.id}`} questionText={currentCard.front || 'Lernkarte'} />
        <FloatingCalculator />
      </div>
    </>
  );
}

export default App;
