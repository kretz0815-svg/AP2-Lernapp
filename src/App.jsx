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
import { askGemini, extractFocusTopics } from './geminiClient';
import { fetchYouTubeVideos } from './youtubeClient';
import FloatingNotes from './components/FloatingNotes';
import FloatingCalculator from './components/FloatingCalculator';
import FloatingImage from './components/FloatingImage';
import BurgerMenu from './components/BurgerMenu';
import QuestionManager from './components/QuestionManager';
import PomodoroTimer from './components/PomodoroTimer';
import KalkulationsBoss from './components/KalkulationsBoss';
import BreakEvenPoint from './components/BreakEvenPoint';
import ResetModal from './components/ResetModal';
import VideoPanel from './components/VideoPanel';
import GeminiPanel from './components/GeminiPanel';
import { mapQuizAnswerToRating, mapWisorAnswerToRating, mapFlashcardQualityToRating } from './services/srsFeedbackMapper';
import { reviewTaskWithDSR, getTaskProgressByType, clearTaskProgressByType } from './services/srsStore';

// ─── Extracted Utils ────────────────────────────────────────────
import {
  ANALYTICS_STORAGE_PREFIX, CUSTOM_QUIZ_STORAGE_PREFIX, MEMBER_SYNC_PENDING_PREFIX,
  ACCESS_MODE_KEY, CUSTOM_BACKGROUND_COLOR_KEY, BACKGROUND_SETTINGS_KEY,
  BACKGROUND_PRESETS, createEmptyAnalytics, createEmptyMemberProgressData, generateId
} from './utils/constants';
import {
  getAppearanceKey, getThemeKey,
  getAnalyticsStorageKey, getCustomQuizStorageKey,
  loadAnalyticsForUser, loadCustomQuizForUser, getLearningEventKey
} from './utils/analytics';
import {
  isValidHexColor, applyEffectStrength, applyBackgroundEffectsVisibility,
  applyCustomBackgroundColor, applyPresetBackground, applyUploadedBackground, clearBackgroundLayers
} from './utils/appearance';
import { formatLatex } from './utils/formatting';
import { detectQuizTopic, getQuizTopicGroup } from './utils/quizTopics';
import { computeNextQuizProgress, filterDueQuizzes } from './utils/quizDue';
import { useAuth } from './hooks/useAuth';
import { useAppearance } from './hooks/useAppearance';

function App() {
  const [appMode, setAppMode] = useState(localStorage.getItem('masterpat_auth') === 'true' ? 'dashboard' : 'auth'); // 'auth', 'dashboard', 'quiz', 'wisor'
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_HCAPTCHA_SITEKEY || '';

  // Set up auth first

  const {
    authUser,
    setAuthUser,
    pinInput,
    setPinInput,
    authError,
    setAuthError,
    email,
    setEmail,
    password,
    setPassword,
    authLoading,
    authMsg,
    setAuthMsg,
    captchaError,
    setCaptchaError,
    captchaToken,
    setCaptchaToken,
    captchaRef,
    SECRET_PIN,
    handleLogin,
    handleRegister,
    handleGoogleLogin,
    handleLogout,
    clearGuestProgressData
  } = useAuth(setAppMode);

  const {
    themePreference,
    setThemePref,
    toggleTheme,
    isLightMode,
    customBackgroundColor,
    backgroundMode,
    backgroundPresetId,
    backgroundImageData,
    backgroundEffectsEnabled,
    backgroundEffectsIntensity,
    appearanceNotice,
    setAppearanceNotice,
    activeBackgroundColor,
    colorPickerValue,
    handleBackgroundColorChange,
    handleCustomColorTextChange,
    handleBackgroundPresetChange,
    handleBackgroundEffectsIntensityChange,
    handleBackgroundEffectsToggle,
    handleBackgroundUpload,
    resetBackgroundColor
  } = useAppearance(authUser, appMode);

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

  // Force dark mode appearance for auth screen and guests
  useEffect(() => {
    // ... logic is now inside useAppearance
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
  const [questionManagerCategory, setQuestionManagerCategory] = useState(null);
  const [learningAnalytics, setLearningAnalytics] = useState(createEmptyAnalytics());
  const [customQuizQuestions, setCustomQuizQuestions] = useState([]);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroSessionLog, setPomodoroSessionLog] = useState([]);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroForceStop, setPomodoroForceStop] = useState(0);
  const [dashboardAiTopics, setDashboardAiTopics] = useState([]);
  const [dashboardAiLoading, setDashboardAiLoading] = useState(false);
  const wisorInputRef = useRef(null);
  const einsteinRef = useRef(null);
  const [einsteinTilt, setEinsteinTilt] = useState({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    if (appMode !== 'dashboard' && appMode !== 'learning_dashboard') return;
    const handleMouseMove = (e) => {
      if (!einsteinRef.current) return;
      const rect = einsteinRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      const maxTilt = 18;
      setEinsteinTilt({ rotateY: dx * maxTilt, rotateX: -dy * maxTilt * 0.6 });
    };
    window.addEventListener('mousemove', handleMouseMove);

    let orientationGranted = false;
    const handleOrientation = (e) => {
      const gamma = Math.max(-45, Math.min(45, e.gamma || 0));
      const beta = Math.max(-45, Math.min(45, (e.beta || 0) - 45));
      setEinsteinTilt({ rotateY: (gamma / 45) * 20, rotateX: -(beta / 45) * 12 });
    };
    const requestGyro = () => {
      if (orientationGranted) return;
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(state => {
          if (state === 'granted') {
            orientationGranted = true;
            window.addEventListener('deviceorientation', handleOrientation);
          }
        }).catch(() => { });
      } else if ('DeviceOrientationEvent' in window) {
        orientationGranted = true;
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };
    window.addEventListener('touchstart', requestGyro, { once: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('touchstart', requestGyro);
    };
  }, [appMode]);

  // Scroll to top on every mode change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [appMode]);

  useEffect(() => {
    if (appMode === 'learning_dashboard' && authUser?.email) {
      const mistakes = learningAnalytics?.mistakes || {};
      const allMistakeData = Object.values(mistakes)
        .filter(m => (m.count || 0) >= 2)
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 10)
        .map(m => ({
          questionText: m.questionText,
          expectedAnswer: m.expectedAnswer || '',
          lastUserAnswer: m.lastUserAnswer || '',
          topic: m.mode === 'quiz' ? '' : m.mode === 'wisor' ? 'WisoR Grundlagen' : m.mode === 'wisorEco' ? 'WisoR E-Commerce' : ''
        }));
      if (allMistakeData.length > 0) {
        setDashboardAiLoading(true);
        extractFocusTopics(allMistakeData).then(result => {
          setDashboardAiTopics(result.topics || []);
          setDashboardAiLoading(false);
        });
      } else {
        setDashboardAiTopics([]);
      }
    }
  }, [appMode, authUser?.email]);

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
  const [analyticsExpanded, setAnalyticsExpanded] = useState({
    periods: false,
    topics: false,
    radar: false,
    swot: false,
    mistakes: false
  });

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

  // formatLatex imported from utils/formatting.js

  const toggleAnalyticsPanel = (panelKey) => {
    setAnalyticsExpanded(prev => ({
      ...prev,
      [panelKey]: !prev[panelKey]
    }));
  };

  const analyticsToggleButtonStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    padding: '0.45rem 0.6rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  };

  const analyticsToggleBadgeStyle = {
    color: 'var(--text-light)',
    fontWeight: 700,
    fontSize: '1rem',
    minWidth: '1.9rem',
    height: '1.9rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderRadius: '999px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.06)',
    padding: 0
  };

  const getLocalProgressData = (overrides = {}) => {
    const srsProgress = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
    const wisorProgress = JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {};
    const wisorEcoProgress = JSON.parse(localStorage.getItem('ap2_wisor_eco_progress')) || {};
    const savedNotes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
    const analytics = loadAnalyticsForUser(authUser);
    const customQuiz = loadCustomQuizForUser(authUser);
    const appearanceRaw = localStorage.getItem(getAppearanceKey(authUser));
    const appearance = appearanceRaw ? JSON.parse(appearanceRaw) : null;
    const theme = localStorage.getItem(getThemeKey(authUser)) || 'dark';

    return {
      ...srsProgress,
      wisor_progress: wisorProgress,
      wisor_eco_progress: wisorEcoProgress,
      saved_notes: savedNotes,
      learning_analytics: analytics,
      custom_quiz_questions: customQuiz,
      appearance_settings: appearance,
      theme_mode: theme,
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

  const appendLearningEvent = ({ mode, questionId, questionText, correct, userAnswer = '', expectedAnswer = '', topic = '' }) => {
    const now = Date.now();
    const keyBase = getLearningEventKey({ mode, questionId, questionText });

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
        expectedAnswer,
        topic
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
          expectedAnswer,
          topic: topic || mistakes[keyBase]?.topic || ''
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
        const key = getLearningEventKey({
          mode: event.mode,
          questionId: event.questionId,
          questionText: event.questionText
        });
        rebuiltMistakes[key] = {
          mode: event.mode,
          questionId: event.questionId || null,
          questionText: event.questionText || 'Unbekannte Frage',
          count: (rebuiltMistakes[key]?.count || 0) + 1,
          lastAt: event.ts,
          lastUserAnswer: event.userAnswer || '',
          expectedAnswer: event.expectedAnswer || '',
          topic: event.topic || rebuiltMistakes[key]?.topic || ''
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

  // detectQuizTopic and getQuizTopicGroup imported from utils/quizTopics.js

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
      const localDue = filterDueQuizzes(prepared, quizProg, now);
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

      const preparedWithEffectiveProgress = prepared.map(q => ({
        ...q,
        progress: effectiveProgress[q.id] || q.progress
      }));

      const due = filterDueQuizzes(preparedWithEffectiveProgress, effectiveProgress, now);

      setQuizProgressView(effectiveProgress);
      setQuizDuePool(due);
      return due;
    } catch (err) {
      console.error('Failed loading quiz due pool from user_task_progress:', err);
      const fallbackDue = filterDueQuizzes(prepared, quizProg, now);
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
    // Guests: max 3 trial questions
    const isGuest = !authUser;
    const effectiveLimit = isGuest ? 3 : limit;
    if (effectiveLimit !== 'all') {
      sessionQs = sessionQs.slice(0, effectiveLimit);
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
            // Load appearance settings from Supabase
            if (data.progress_data.appearance_settings) {
              localStorage.setItem(getAppearanceKey(session.user), JSON.stringify(data.progress_data.appearance_settings));
            }
            if (data.progress_data.theme_mode) {
              localStorage.setItem(getThemeKey(session.user), data.progress_data.theme_mode);
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
      const topicLabel = getQuizTopicGroup(q.topic || detectQuizTopic(q)) || 'Quiz';
      setPomodoroSessionLog(prev => [...prev, { correct: isCorrect, questionText, topic: topicLabel }]);
    }

    const applyLocalQuizProgress = () => {
      const quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
      const previous = quizProg[q.id] || q.progress || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
      quizProg[q.id] = computeNextQuizProgress(previous, isCorrect);
      localStorage.setItem('ap2_quiz_progress', JSON.stringify(quizProg));
      setQuizProgressView(quizProg);
    };

    // Always keep a local mirror so quiz availability updates immediately,
    // even if remote sync is delayed or temporarily unavailable.
    applyLocalQuizProgress();
    refreshQuizDuePool().catch(() => { });

    appendLearningEvent({
      mode: 'quiz',
      questionId: q.id,
      questionText: q.question,
      correct: isCorrect,
      userAnswer: selectedOption?.text || '',
      expectedAnswer: expectedOption?.text || '',
      topic: getQuizTopicGroup(q.topic || detectQuizTopic(q))
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
        .catch(err => {
          console.error('DSR quiz review failed:', err);
          refreshQuizDuePool().catch(() => { });
        });
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
    setResetModalVisible(true);
  };

  const handleResetExecute = () => {
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
    } else if (resetTarget === 'fullAccount') {
      // Clear progress localStorage (keep custom quiz questions)
      localStorage.removeItem('ap2_srs_progress');
      localStorage.removeItem('ap2_quiz_progress');
      localStorage.removeItem('ap2_wisor_progress');
      localStorage.removeItem('ap2_wisor_eco_progress');
      localStorage.removeItem('ap2_saved_notes');
      localStorage.removeItem(getAnalyticsStorageKey(authUser));

      // Reset progress state (keep customQuizQuestions intact)
      setCompletedWisors({});
      setCompletedWisorsEco({});
      setQuizProgressView({});
      setAllQuizzes([]);
      setLearningAnalytics(createEmptyAnalytics());
      setStats({ learnedToday: 0, totalDue: 0 });

      // Clear Supabase progress but preserve custom questions
      const resetTasks = [];
      if (authUser?.id) {
        const preservedData = { ...createEmptyMemberProgressData(), custom_quiz_questions: customQuizQuestions };
        resetTasks.push(syncProgressToSupabase(preservedData, { queueOnFail: false }));
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'quiz'));
      }

      setResetModalVisible(false);
      Promise.allSettled(resetTasks).then(() => refreshQuizDuePool());
      setAppMode('dashboard');
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
        themePreference={themePreference}
        setThemePref={setThemePref}
        onOpenQuestionManager={(cat) => setQuestionManagerCategory(cat)}
        onOpenLearningDashboard={() => setAppMode('learning_dashboard')}
        onStartPomodoro={() => { setPomodoroActive(true); setPomodoroSessionLog([]); }}
        pomodoroRunning={pomodoroActive}
        pomodoroTimeLeft={pomodoroTimeLeft}
        onStopPomodoro={() => setPomodoroForceStop(Date.now())}
        onOpenAppearanceSettings={() => { if (authUser) setAppMode('appearance_settings'); }}
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
          <div className="einstein-header-row">
            <div
              ref={einsteinRef}
              className="einstein-container"
            >
              <img
                src="/einstein.webp"
                alt="Einstein"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `rotateX(${einsteinTilt.rotateX}deg) rotateY(${einsteinTilt.rotateY}deg)`,
                  transition: 'transform 0.12s ease-out',
                  filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.5))',
                  pointerEvents: 'none'
                }}
              />
            </div>
            <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '0px', fontSize: '3.5rem', transform: 'scaleY(1.2)', transformOrigin: 'bottom', margin: '0 0 0 0', color: 'var(--text-light)', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>MASTERPAT APP</h1>
          </div>
          <p className="subtitle" style={{ marginTop: '0.8rem' }}>Wähle deinen Lernmodus</p>
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
            {!authUser ? (
              <div className="chip">🔒 3 Testfragen (Gast)</div>
            ) : (
              <div className="chip">{quizDuePool.length === 0 ? 'Alles gemeistert! 🎉' : `${quizDuePool.length} Fragen fällig`}</div>
            )}

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

          <div className="dash-card" style={!authUser ? { opacity: 0.55, cursor: 'not-allowed' } : {}} onClick={() => { if (authUser) startWisor('wisor1'); }}>
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
            {!authUser ? (
              <div className="chip">🔒 Nur mit Account</div>
            ) : (
              <div className="chip">{Object.keys(completedWisors).length === wisor1.questions.length ? 'Alles gemeistert! 🎉' : `${wisor1.questions.length - Object.keys(completedWisors).length} Fragen verfügbar`}</div>
            )}

            {authUser && Object.keys(completedWisors).length > 0 && (
              <button
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                onClick={(e) => { e.stopPropagation(); openResetModal(e, 'wisor'); }}
              >
                🔄 Lernfortschritt zurücksetzen
              </button>
            )}
          </div>

          <div className="dash-card" style={!authUser ? { opacity: 0.55, cursor: 'not-allowed' } : {}} onClick={() => { if (authUser) startWisor('wisorEco'); }}>
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
            {!authUser ? (
              <div className="chip">🔒 Nur mit Account</div>
            ) : (
              <div className="chip">{Object.keys(completedWisorsEco).length === (wisorEco?.questions?.length || 0) && (wisorEco?.questions?.length || 0) > 0 ? 'Alles gemeistert! 🎉' : `${(wisorEco?.questions?.length || 0) - Object.keys(completedWisorsEco).length} Fragen verfügbar`}</div>
            )}

            {authUser && Object.keys(completedWisorsEco).length > 0 && (
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
            {!authUser ? (
              <div className="chip">🔒 Level 1 frei (Gast)</div>
            ) : (
              <div className="chip">3 Level</div>
            )}
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

        <ResetModal
          isOpen={resetModalVisible}
          onClose={() => setResetModalVisible(false)}
          onConfirm={handleResetExecute}
        />
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
              onChange={(e) => handleCustomColorTextChange(e.target.value.trim())}
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

          <div className="appearance-slider-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="background-effects-intensity" style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 600 }}>
                Effekt-Staerke
              </label>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{backgroundEffectsIntensity}%</span>
            </div>
            <input
              id="background-effects-intensity"
              type="range"
              min="0"
              max="100"
              step="1"
              value={backgroundEffectsIntensity}
              onChange={(e) => handleBackgroundEffectsIntensityChange(e.target.value)}
              disabled={!backgroundEffectsEnabled}
              className="appearance-effects-slider"
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

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--error, #ef4444)' }}>Gesamten Fortschritt zurücksetzen</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              Setzt deinen kompletten Lernfortschritt auf Null zurück: Quiz, Wisor, Karteikarten, Statistiken und Notizen.
            </p>
            <button
              className="btn-secondary"
              style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'var(--error, #ef4444)', color: 'var(--error, #ef4444)', fontWeight: 700 }}
              onClick={(e) => openResetModal(e, 'fullAccount')}
            >
              Account zurücksetzen
            </button>
          </div>
        </section>

        <ResetModal
          isOpen={resetModalVisible}
          onClose={() => setResetModalVisible(false)}
          onConfirm={handleResetExecute}
          title="Bist du dir sicher?"
          description="Dein gesamter Lernstand wird unwiderruflich auf Null zurückgesetzt. Löse die Aufgabe, um fortzufahren:"
        />
      </div>
    );
  }

  if (appMode === 'kalkulation') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <KalkulationsBoss onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} isGuest={!authUser} />
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
        <BreakEvenPoint onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
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
          <div className="note-card" style={{ position: 'relative', width: '100%', maxWidth: '620px', padding: '2.2rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
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
    const nowTs = Date.now();

    const periodStart = {
      day: nowTs - (24 * 60 * 60 * 1000),
      week: nowTs - (7 * 24 * 60 * 60 * 1000),
      month: nowTs - (30 * 24 * 60 * 60 * 1000)
    };

    const getCounts = (startTs) => {
      const inRange = events.filter(e => e.ts >= startTs);
      const byMode = (mode) => {
        const modeEvents = inRange.filter(e => e.mode === mode);
        return { correct: modeEvents.filter(e => e.correct).length, wrong: modeEvents.filter(e => !e.correct).length };
      };
      return {
        quiz: byMode('quiz'),
        wisor: byMode('wisor'),
        wisorEco: byMode('wisorEco'),
        flashcard: byMode('flashcard'),
        kalkulation: byMode('kalkulation'),
        breakEven: byMode('breakEven'),
      };
    };

    const day = getCounts(periodStart.day);
    const week = getCounts(periodStart.week);
    const month = getCounts(periodStart.month);

    const topMistakes = Object.values(mistakes)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 12);

    const modeLabel = {
      quiz: 'Quiz',
      wisor: 'WisoR',
      wisorEco: 'WisoR E-Commerce',
      flashcard: 'Lernkarten',
      kalkulation: 'Kalkulations-Boss',
      breakEven: 'Break-Even-Point'
    };

    const modeTotals = events.reduce((acc, event) => {
      const mode = event.mode || 'unknown';
      if (!acc[mode]) acc[mode] = { correct: 0, wrong: 0 };
      if (event.correct) acc[mode].correct += 1;
      else acc[mode].wrong += 1;
      return acc;
    }, {});

    const questionEvents = events.filter(e => e.mode === 'quiz' || e.mode === 'wisor' || e.mode === 'wisorEco' || e.mode === 'kalkulation' || e.mode === 'breakEven');
    const totalAnswers = events.length;
    const totalCorrect = events.filter(e => e.correct).length;
    const hitRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    // Gesamtpool: alle verfügbaren Fragen
    const totalPoolSize =
      (flashcards1.cards || []).length +
      (flashcards2.cards || []).length +
      (flashcards3.cards || []).length +
      getAllQuizQuestions().length +
      (wisor1.questions || []).length +
      (wisorEco.questions || []).length;

    // Unique richtig beantwortete Fragen (letzte Antwort pro questionId zählt)
    const latestByQuestion = {};
    for (const ev of events) {
      const key = getLearningEventKey({
        mode: ev.mode,
        questionId: ev.questionId,
        questionText: ev.questionText
      });
      if (!latestByQuestion[key] || ev.ts > latestByQuestion[key].ts) {
        latestByQuestion[key] = ev;
      }
    }
    const uniqueAnswered = Object.keys(latestByQuestion).length;
    const uniqueCorrect = Object.values(latestByQuestion).filter(e => e.correct).length;
    const overallAccuracy = totalPoolSize > 0 ? Math.round((uniqueCorrect / totalPoolSize) * 100) : 0;

    const recentWeekAnswers = events.filter(e => e.ts >= periodStart.week).length;
    const recentWeekAccuracy = recentWeekAnswers > 0
      ? Math.round((events.filter(e => e.ts >= periodStart.week && e.correct).length / recentWeekAnswers) * 100)
      : 0;

    const quizTopicById = new Map(
      getAllQuizQuestions().map((q) => {
        const id = String(q.id || generateId(q.question));
        return [id, getQuizTopicGroup(q.topic || detectQuizTopic(q))];
      })
    );

    const resolveTopic = (event) => {
      if (!event) return 'Allgemein';
      if (event.topic && event.topic !== 'Allgemein') return event.topic;
      if (event.mode === 'quiz') return quizTopicById.get(String(event.questionId)) || getQuizTopicGroup(detectQuizTopic({ question: event.questionText || '', hint: '', youtubeQuery: '' })) || 'Quiz Allgemein';
      if (event.mode === 'wisor') return 'WisoR Grundlagen';
      if (event.mode === 'wisorEco') return 'WisoR E-Commerce';
      if (event.mode === 'kalkulation') return 'Kalkulations-Boss';
      if (event.mode === 'breakEven') return 'Break-Even-Point';
      return 'Allgemein';
    };

    const topicTotals = questionEvents.reduce((acc, event) => {
      const topic = resolveTopic(event);
      if (!acc[topic]) acc[topic] = { correct: 0, wrong: 0, total: 0, lastAt: 0 };
      if (event.correct) acc[topic].correct += 1;
      else acc[topic].wrong += 1;
      acc[topic].total += 1;
      acc[topic].lastAt = Math.max(acc[topic].lastAt || 0, event.ts || 0);
      return acc;
    }, {});

    const topicRows = Object.entries(topicTotals)
      .map(([topic, stats]) => {
        const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        return { topic, ...stats, accuracy };
      })
      .sort((a, b) => b.total - a.total);

    const radarTopics = topicRows.slice(0, 6);
    const radarSize = 270;
    const radarCenter = radarSize / 2;
    const radarRadius = 96;
    const radarRings = [25, 50, 75, 100];
    const polarToCartesian = (angleDeg, valuePct = 100) => {
      const angle = ((angleDeg - 90) * Math.PI) / 180;
      const radius = (Math.max(0, Math.min(100, valuePct)) / 100) * radarRadius;
      return {
        x: radarCenter + (Math.cos(angle) * radius),
        y: radarCenter + (Math.sin(angle) * radius)
      };
    };
    const radarPolygonPoints = radarTopics.length > 2
      ? radarTopics.map((row, idx) => {
        const angle = (360 / radarTopics.length) * idx;
        const point = polarToCartesian(angle, row.accuracy);
        return `${point.x},${point.y}`;
      }).join(' ')
      : '';

    const extractKeyTerms = (input) => {
      const stopWords = new Set(['und', 'oder', 'der', 'die', 'das', 'ein', 'eine', 'einer', 'einem', 'den', 'dem', 'des', 'ist', 'sind', 'mit', 'auf', 'von', 'für', 'im', 'in', 'zu', 'bei', 'aus', 'nach', 'nicht', 'noch', 'wird', 'werden', 'frage', 'bereich']);
      return String(input || '')
        .toLowerCase()
        .replace(/[^a-z0-9äöüß\s-]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length >= 4 && !stopWords.has(token));
    };

    const getMistakeTopic = (entry) => {
      if (!entry) return 'Allgemein';
      if (entry.mode === 'quiz') {
        const byId = quizTopicById.get(String(entry.questionId));
        if (byId) return byId;
        return getQuizTopicGroup(detectQuizTopic({ question: entry.questionText || '', hint: '', youtubeQuery: '' }));
      }
      if (entry.mode === 'wisor') return 'WisoR Grundlagen';
      if (entry.mode === 'wisorEco') return 'WisoR E-Commerce';
      if (entry.mode === 'flashcard') return 'Lernkarten Wissen';
      return 'Allgemein';
    };

    const thematicWeaknessGroups = topMistakes.reduce((acc, entry) => {
      const topic = getMistakeTopic(entry);
      if (!acc[topic]) acc[topic] = { topic, count: 0, entries: [], terms: {} };
      acc[topic].count += (entry.count || 0);
      acc[topic].entries.push(entry);

      extractKeyTerms(entry.questionText || '').forEach(term => {
        acc[topic].terms[term] = (acc[topic].terms[term] || 0) + 1;
      });
      return acc;
    }, {});

    const groupedWeaknessRows = Object.values(thematicWeaknessGroups)
      .map(group => {
        const topTerms = Object.entries(group.terms)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([term]) => term);
        return {
          ...group,
          topTerms,
          sampleQuestions: group.entries
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .slice(0, 2)
        };
      })
      .sort((a, b) => b.count - a.count);

    const strongestTopics = topicRows
      .filter(row => row.total >= 3 && row.accuracy >= 75)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 4);

    const weakestTopics = topicRows
      .filter(row => row.total >= 3 && row.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 4);

    const opportunityTopics = topicRows
      .filter(row => row.total >= 2 && row.accuracy >= 60 && row.accuracy < 75)
      .slice(0, 4);

    const riskEntries = topMistakes
      .filter(item => (item.count || 0) >= 2)
      .slice(0, 4);

    const strategicActions = [];
    if (weakestTopics.length > 0) {
      strategicActions.push(`Priorität 1: ${weakestTopics[0].topic} gezielt trainieren (${weakestTopics[0].accuracy}% Erfolgsquote).`);
    }
    if (opportunityTopics.length > 0) {
      strategicActions.push(`Chance nutzen: ${opportunityTopics[0].topic} steht kurz vor "sicher" - mit 10-15 Zusatzaufgaben stabilisieren.`);
    }
    if (riskEntries.length > 0) {
      strategicActions.push(dashboardAiTopics.length > 0
        ? `KI-Fokus: "${dashboardAiTopics[0]}" gezielt wiederholen und Lernkarten einplanen.`
        : `Risikofrage wiederholt falsch: "${riskEntries[0].questionText?.slice(0, 85) || 'Unbekannt'}" -> Lernkarte + Wiederholung einplanen.`);
    }
    if (recentWeekAnswers > 0) {
      strategicActions.push(`Wochenleistung: ${recentWeekAnswers} Antworten bei ${recentWeekAccuracy}% Treffern. Ziel: > 75% für Prüfungssicherheit.`);
    }

    const swotCards = [
      {
        key: 'strengths',
        title: 'Stärken',
        border: '1px solid rgba(34,197,94,0.35)',
        background: 'rgba(34,197,94,0.08)',
        titleColor: 'var(--success)',
        items: strongestTopics.length > 0
          ? strongestTopics.map(item => `${item.topic}${item.accuracy ? ` (${item.accuracy}%)` : ''}`)
          : ['Noch keine stabilen Stärken']
      },
      {
        key: 'weaknesses',
        title: 'Schwächen',
        border: '1px solid rgba(239,68,68,0.35)',
        background: 'rgba(239,68,68,0.08)',
        titleColor: 'var(--error)',
        items: weakestTopics.length > 0
          ? weakestTopics.map(item => `${item.topic}${item.accuracy ? ` (${item.accuracy}%)` : ''}`)
          : ['Keine kritischen Schwächen erkannt']
      },
      {
        key: 'risks',
        title: 'Risiken',
        border: '1px solid rgba(245,158,11,0.35)',
        background: 'rgba(245,158,11,0.08)',
        titleColor: '#f59e0b',
        items: dashboardAiTopics.length > 0
          ? dashboardAiTopics.map(t => `🎯 ${t}`)
          : riskEntries.length > 0
            ? riskEntries.map(item => `${(item.questionText || '').slice(0, 52)}${(item.questionText || '').length > 52 ? '...' : ''}${item.count ? ` (${item.count}x)` : ''}`)
            : ['Keine akuten Risiko-Fragen gefunden']
      },
      {
        key: 'opportunities',
        title: 'Chancen',
        border: '1px solid rgba(99,102,241,0.35)',
        background: 'rgba(99,102,241,0.08)',
        titleColor: 'var(--primary)',
        items: opportunityTopics.length > 0
          ? opportunityTopics.map(item => `${item.topic}${item.accuracy ? ` (${item.accuracy}%)` : ''}`)
          : ['Nächster Schritt: mehr Trainingsvolumen']
      }
    ];

    // --- Dashboard Layout Computed Values ---
    const einsteinNeonColor = overallAccuracy >= 100 ? '#fbbf24' : overallAccuracy >= 75 ? '#22c55e' : overallAccuracy >= 35 ? '#f59e0b' : '#ef4444';
    const einsteinGlow = overallAccuracy >= 100 ? 'rgba(251,191,36,0.7)' : overallAccuracy >= 75 ? 'rgba(34,197,94,0.6)' : overallAccuracy >= 35 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.6)';
    const einsteinImage = overallAccuracy >= 100 ? '/EinsteinGold.webp' : overallAccuracy >= 75 ? '/einstein.webp' : overallAccuracy >= 35 ? '/EinsteinOrange.webp' : '/EinsteinRot.webp';
    const statusLabel = overallAccuracy >= 100 ? 'Perfekt!' : overallAccuracy >= 75 ? 'Prüfungsbereit' : overallAccuracy >= 35 ? 'Solides Mittelfeld' : 'Viel Nachholbedarf';
    const statusEmoji = overallAccuracy >= 100 ? '\u{1F451}' : overallAccuracy >= 75 ? '\u{1F7E2}' : overallAccuracy >= 35 ? '\u{1F7E1}' : '\u{1F534}';
    const circleRadius = 62;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const circleOffset = circleCircumference * (1 - overallAccuracy / 100);
    const allModeKeys = ['quiz', 'wisor', 'wisorEco', 'kalkulation', 'breakEven', 'flashcard'];
    const dayTotalCount = allModeKeys.reduce((s, m) => s + day[m].correct + day[m].wrong, 0);
    const dayCorrectCount = allModeKeys.reduce((s, m) => s + day[m].correct, 0);
    const dayAccuracy = dayTotalCount > 0 ? Math.round((dayCorrectCount / dayTotalCount) * 100) : 0;
    const weekTotalCount = allModeKeys.reduce((s, m) => s + week[m].correct + week[m].wrong, 0);
    const weekCorrectCount = allModeKeys.reduce((s, m) => s + week[m].correct, 0);
    const weekAccuracy = weekTotalCount > 0 ? Math.round((weekCorrectCount / weekTotalCount) * 100) : 0;
    const monthTotalCount = allModeKeys.reduce((s, m) => s + month[m].correct + month[m].wrong, 0);
    const monthCorrectCount = allModeKeys.reduce((s, m) => s + month[m].correct, 0);
    const monthAccuracy = monthTotalCount > 0 ? Math.round((monthCorrectCount / monthTotalCount) * 100) : 0;
    const trendBars = [
      { label: 'Heute', accuracy: dayAccuracy, total: dayTotalCount, correct: dayCorrectCount },
      { label: '7 Tage', accuracy: weekAccuracy, total: weekTotalCount, correct: weekCorrectCount },
      { label: '30 Tage', accuracy: monthAccuracy, total: monthTotalCount, correct: monthCorrectCount }
    ];
    const trendDirection = weekAccuracy > monthAccuracy ? 'up' : weekAccuracy < monthAccuracy ? 'down' : 'stable';
    // ── Rechenaufgaben-Analyse ──────────────────
    const calcCategories = [
      { key: 'vorwaerts', label: 'Vorwärtskalkulation', icon: '⬇️', color: '#22c55e', prefix: 'Vorwärtskalkulation' },
      { key: 'rueckwaerts', label: 'Rückwärtskalkulation', icon: '⬆️', color: '#f59e0b', prefix: 'Rückwärtskalkulation' },
      { key: 'differenz', label: 'Differenzkalkulation', icon: '🔀', color: '#ef4444', prefix: 'Differenzkalkulation' },
      { key: 'boss', label: 'Boss-Modus', icon: '👾', color: '#a855f7', prefix: 'Boss-Modus' },
      { key: 'breakEven', label: 'Break-Even-Point', icon: '📊', color: '#6366f1', prefix: 'Break-Even' },
    ];
    const calcStats = calcCategories.map(cat => {
      const filtered = cat.key === 'breakEven'
        ? events.filter(e => e.mode === 'breakEven')
        : events.filter(e => e.mode === 'kalkulation' && (e.questionText || '').startsWith(cat.prefix));
      const correct = filtered.filter(e => e.correct).length;
      const wrong = filtered.filter(e => !e.correct).length;
      const total = correct + wrong;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
      return { ...cat, correct, wrong, total, accuracy };
    });
    const calcTotal = calcStats.reduce((s, c) => s + c.total, 0);

    const actionCallText = (() => {
      if (totalAnswers === 0) return 'Starte dein erstes Training, um personalisierte Empfehlungen zu erhalten!';
      const coverage = totalPoolSize > 0 ? Math.round((uniqueAnswered / totalPoolSize) * 100) : 0;
      if (coverage < 20) return `Du hast erst ${uniqueAnswered} von ${totalPoolSize} Fragen bearbeitet (${coverage}%). Arbeite dich durch mehr Themen, um ein vollst\u00e4ndiges Bild zu bekommen!`;
      if (weakestTopics.length > 0) return `Wiederhole "${weakestTopics[0].topic}" \u2014 hier verlierst du die meisten Punkte (${weakestTopics[0].accuracy}%).`;
      if (opportunityTopics.length > 0) return `"${opportunityTopics[0].topic}" steht bei ${opportunityTopics[0].accuracy}%. Mit 10\u201315 Aufgaben erreichst du Pr\u00fcfungsniveau!`;
      if (overallAccuracy >= 75) return 'Starke Leistung! Dein Gesamtfortschritt liegt \u00fcber 75%. Halte das Niveau und trainiere regelm\u00e4\u00dfig.';
      return `Du hast ${uniqueAnswered} von ${totalPoolSize} Fragen bearbeitet. Trainiere regelm\u00e4\u00dfig, um deinen Fortschritt \u00fcber 75% zu bringen.`;
    })();

    return (
      <div className="app-container learning-analytics-dashboard" style={{ zIndex: 10, alignItems: 'stretch' }}>
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>

        {/* Header */}
        <header className="hide-on-print" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto 0.5rem auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '0.5rem' }}>
            <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Men&uuml;</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={refreshMistakeAnalysis}>{'\uD83D\uDD04'} Analyse aktualisieren</button>
            <button className="btn-primary" onClick={() => window.print()}>{'\uD83D\uDCC4'} Lernstand als PDF</button>
          </div>
        </header>

        <h1 className="print-only-title" style={{ margin: 0, textAlign: 'center', color: 'var(--text-light)', fontSize: '2.35rem', fontWeight: 900, letterSpacing: '0.02em' }}>
          MasterPat APP &ndash; Lernanalyse
        </h1>

        {/* 1. BIG PICTURE */}
        <section className="note-card analytics-big-picture" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem', borderRadius: '20px', border: `1px solid ${einsteinNeonColor}44`, background: 'var(--glass-bg)', backdropFilter: 'blur(16px)' }}>
          <div className="analytics-big-picture-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
            {/* Einstein */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div ref={einsteinRef} style={{ width: '120px', height: '120px', perspective: '600px', flexShrink: 0 }}>
                <img src={einsteinImage} alt="Einstein" style={{
                  width: '100%', height: '100%', objectFit: 'contain',
                  transform: `rotateX(${einsteinTilt.rotateX}deg) rotateY(${einsteinTilt.rotateY}deg)`,
                  transition: 'transform 0.12s ease-out, filter 0.3s ease',
                  filter: `drop-shadow(0 0 18px ${einsteinGlow})`,
                  pointerEvents: 'none'
                }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: einsteinNeonColor, fontWeight: 700, textAlign: 'center' }}>{statusEmoji} {statusLabel}</span>
            </div>

            {/* Circular Progress */}
            <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle cx="80" cy="80" r={circleRadius} fill="none" stroke={einsteinNeonColor} strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={circleCircumference} strokeDashoffset={circleOffset}
                  transform="rotate(-90 80 80)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 900, color: einsteinNeonColor, lineHeight: 1 }}>{overallAccuracy}%</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Gesamtfortschritt</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', minWidth: '140px' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>Bearbeitet</p>
                <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '1.6rem', fontWeight: 800 }}>{uniqueAnswered} <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {totalPoolSize}</span></p>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>Trefferquote</p>
                <p style={{ margin: 0, color: hitRate >= 70 ? 'var(--success)' : hitRate >= 40 ? '#f59e0b' : 'var(--error)', fontSize: '1.6rem', fontWeight: 800 }}>{hitRate}%</p>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>Schw&auml;chste Themen</p>
                <p style={{ margin: 0, color: weakestTopics.length > 0 ? 'var(--error)' : 'var(--success)', fontSize: '1.6rem', fontWeight: 800 }}>{weakestTopics.length}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>Top-Risiko-Fehler</p>
                <p style={{ margin: 0, color: riskEntries.length > 0 ? 'var(--error)' : 'var(--success)', fontSize: '1.6rem', fontWeight: 800 }}>{riskEntries.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ACTION CALL */}
        <section className="note-card analytics-action-call" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.2rem 1.5rem', borderRadius: '16px', border: `1px solid ${einsteinNeonColor}55`, background: `linear-gradient(135deg, ${einsteinNeonColor}12, transparent 60%)`, backdropFilter: 'blur(16px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{'\uD83C\uDFAF'}</span>
            <div>
              <h3 style={{ margin: '0 0 0.3rem 0', color: einsteinNeonColor, fontSize: '0.95rem', fontWeight: 700 }}>Dein Fokus f&uuml;r heute</h3>
              <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.92rem', lineHeight: 1.45 }}>{actionCallText}</p>
            </div>
          </div>
        </section>

        {/* 3. FORTSCHRITT & TREND */}
        <section className="note-card" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.2rem 1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-light)', fontSize: '1rem' }}>Fortschritt & Trend</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {trendDirection === 'up' ? '\uD83D\uDCC8 Aufw\u00e4rtstrend' : trendDirection === 'down' ? '\uD83D\uDCC9 Abw\u00e4rtstrend' : '\u27A1\uFE0F Stabil'}
            </span>
          </div>
          <div className="analytics-trend-chart" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1.5rem', height: '180px', padding: '0 1rem' }}>
            {trendBars.map(bar => {
              const barColor = bar.accuracy >= 75 ? 'var(--success)' : bar.accuracy >= 50 ? '#f59e0b' : 'var(--error)';
              const barHeight = Math.max(bar.accuracy * 1.4, 12);
              return (
                <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: '1', maxWidth: '140px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: barColor }}>{bar.accuracy}%</span>
                  <div style={{ width: '100%', height: `${barHeight}px`, background: `linear-gradient(180deg, ${barColor}, ${barColor}66)`, borderRadius: '8px 8px 4px 4px', transition: 'height 0.6s ease', minHeight: '12px', position: 'relative' }}>
                    {bar.total > 0 && <span style={{ position: 'absolute', bottom: '-1.3rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{bar.correct}/{bar.total}</span>}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.8rem' }}>{bar.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. DEEP DIVE */}
        <div className="analytics-deep-dive printable-notes" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
          {/* Radar Chart */}
          <section className="note-card" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
            <h3 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-light)', fontSize: '1rem' }}>Themenkompetenz</h3>
            {radarTopics.length < 3 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.88rem' }}>Mindestens 3 Themen mit Daten n&ouml;tig.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <svg style={{ width: '100%', maxWidth: '280px', height: 'auto' }} viewBox={`0 0 ${radarSize} ${radarSize}`} role="img" aria-label="Radar">
                    {radarRings.map(ring => (
                      <polygon key={`ring_${ring}`} points={radarTopics.map((_, idx) => {
                        const a = (360 / radarTopics.length) * idx;
                        const pt = polarToCartesian(a, ring);
                        return `${pt.x},${pt.y}`;
                      }).join(' ')} fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="1" />
                    ))}
                    {radarTopics.map((row, idx) => {
                      const a = (360 / radarTopics.length) * idx;
                      const edge = polarToCartesian(a, 100);
                      const lbl = polarToCartesian(a, 115);
                      return (
                        <g key={`ax_${row.topic}`}>
                          <line x1={radarCenter} y1={radarCenter} x2={edge.x} y2={edge.y} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
                          <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--text-muted)">
                            {row.topic.length > 14 ? `${row.topic.slice(0, 14)}\u2026` : row.topic}
                          </text>
                        </g>
                      );
                    })}
                    <polygon points={radarPolygonPoints} fill="rgba(99,102,241,0.32)" stroke="var(--primary)" strokeWidth="2" />
                    {radarTopics.map((row, idx) => {
                      const a = (360 / radarTopics.length) * idx;
                      const pt = polarToCartesian(a, row.accuracy);
                      return <circle key={`dot_${row.topic}`} cx={pt.x} cy={pt.y} r="3.4" fill="var(--primary)" />;
                    })}
                  </svg>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.3rem' }}>
                  {radarTopics.map(row => (
                    <div key={`lgnd_${row.topic}`} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
                      <span>{row.topic}</span>
                      <strong style={{ color: row.accuracy >= 75 ? 'var(--success)' : row.accuracy >= 60 ? '#f59e0b' : 'var(--error)' }}>{row.accuracy}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Top / Flop List */}
          <section className="note-card" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
            <h3 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-light)', fontSize: '1rem' }}>St&auml;rken & Schw&auml;chen</h3>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)', fontSize: '0.88rem' }}>{'\uD83D\uDFE2'} Sichere Themen</h4>
              {strongestTopics.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {strongestTopics.map(item => (
                    <div key={`str_${item.topic}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.6rem', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.84rem' }}>{item.topic}</span>
                      <strong style={{ color: 'var(--success)', fontSize: '0.84rem' }}>{item.accuracy}%</strong>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.84rem' }}>Noch keine stabilen St&auml;rken</p>}
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--error)', fontSize: '0.88rem' }}>{'\uD83D\uDD34'} Top-Risiko-Fehler</h4>
              {(weakestTopics.length > 0 || riskEntries.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {weakestTopics.map(item => (
                    <div key={`wk_${item.topic}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.6rem', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.84rem' }}>{item.topic}</span>
                      <strong style={{ color: 'var(--error)', fontSize: '0.84rem' }}>{item.accuracy}%</strong>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.84rem' }}>Keine kritischen Schw&auml;chen</p>}
            </div>
            {/* KI Fokus-Themen */}
            {(dashboardAiLoading || dashboardAiTopics.length > 0) && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa', fontSize: '0.88rem' }}>🎯 KI-Fokus-Themen</h4>
                {dashboardAiLoading ? (
                  <div style={{ padding: '0.8rem', borderRadius: '10px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>🤖 KI analysiert deine Fehler…</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {dashboardAiTopics.map((topic, i) => (
                      <span key={`aitag_${i}`} style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '20px',
                        background: 'rgba(167,139,250,0.12)',
                        border: '1px solid rgba(167,139,250,0.3)',
                        color: '#a78bfa',
                        fontSize: '0.82rem',
                        fontWeight: '600'
                      }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* 4b. RECHENAUFGABEN */}
        <section className="note-card analytics-rechenaufgaben" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.3)', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-light)', fontSize: '1.1rem', textAlign: 'center' }}>🧮 Rechenaufgaben</h3>
          {calcTotal === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.88rem' }}>Noch keine Rechenaufgaben bearbeitet. Starte den Kalkulations-Boss oder Break-Even-Point!</p>
          ) : (
            <div className="analytics-calc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.7rem' }}>
              {calcStats.filter(c => c.total > 0).map(cat => (
                <div key={cat.key} style={{ padding: '0.8rem', borderRadius: '12px', border: `1px solid ${cat.color}33`, background: `${cat.color}08` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                    <span style={{ color: 'var(--text-light)', fontSize: '0.84rem', fontWeight: 700 }}>{cat.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: cat.accuracy >= 75 ? 'var(--success)' : cat.accuracy >= 50 ? '#f59e0b' : 'var(--error)', lineHeight: 1 }}>{cat.accuracy}%</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Trefferquote</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', marginBottom: '0.35rem' }}>
                    <div style={{ width: `${cat.accuracy}%`, height: '100%', background: cat.accuracy >= 75 ? 'var(--success)' : cat.accuracy >= 50 ? '#f59e0b' : 'var(--error)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--success)' }}>{cat.correct} ✓</span> · <span style={{ color: 'var(--error)' }}>{cat.wrong} ✗</span> · {cat.total} gesamt
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. PR&Uuml;FUNGSPROGNOSE */}
        <section className="note-card analytics-prognose" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-light)', fontSize: '1.1rem', textAlign: 'center' }}>Pr&uuml;fungsprognose</h3>
          {/* Gauge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
            <svg width="220" height="130" viewBox="0 0 220 130" style={{ maxWidth: '100%', height: 'auto' }}>
              <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
              <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke={einsteinNeonColor} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${Math.PI * 90}`} strokeDashoffset={Math.PI * 90 * (1 - overallAccuracy / 100)}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              {(() => {
                const na = Math.PI - (overallAccuracy / 100) * Math.PI;
                return <line x1="110" y1="110" x2={110 + 70 * Math.cos(na)} y2={110 - 70 * Math.sin(na)} stroke={einsteinNeonColor} strokeWidth="2.5" strokeLinecap="round" />;
              })()}
              <circle cx="110" cy="110" r="5" fill={einsteinNeonColor} />
              <text x="20" y="126" textAnchor="middle" fontSize="11" fill="var(--text-muted)">0%</text>
              <text x="110" y="14" textAnchor="middle" fontSize="11" fill="var(--text-muted)">50%</text>
              <text x="200" y="126" textAnchor="middle" fontSize="11" fill="var(--text-muted)">100%</text>
              <text x="110" y="95" textAnchor="middle" fontSize="26" fontWeight="900" fill={einsteinNeonColor}>{overallAccuracy}%</text>
              <text x="110" y="112" textAnchor="middle" fontSize="10" fill="var(--text-muted)">Gesamtfortschritt</text>
            </svg>
          </div>
          {/* Mode breakdown */}
          {Object.keys(modeTotals).length > 0 && (
            <div className="analytics-prognose-modes" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
              {Object.entries(modeTotals).map(([mode, counts]) => {
                const total = counts.correct + counts.wrong;
                const acc = total > 0 ? Math.round((counts.correct / total) * 100) : 0;
                const bc = acc >= 75 ? 'var(--success)' : acc >= 50 ? '#f59e0b' : 'var(--error)';
                return (
                  <div key={`prg_${mode}`} style={{ padding: '0.55rem 0.7rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.82rem', fontWeight: 600 }}>{modeLabel[mode] || mode}</span>
                      <span style={{ color: bc, fontWeight: 700, fontSize: '0.82rem' }}>{acc}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ width: `${acc}%`, height: '100%', background: bc, transition: 'width 0.5s ease' }}></div>
                    </div>
                    <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{counts.correct} richtig &middot; {counts.wrong} falsch</div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Strategic Actions */}
          {strategicActions.length > 0 && (
            <div style={{ padding: '0.8rem', borderRadius: '10px', border: '1px dashed var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
              <strong style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-light)', fontSize: '0.88rem' }}>{'\uD83D\uDCCB'} Fokus bis zur Pr&uuml;fung</strong>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                {strategicActions.map((item, idx) => <li key={`act_${idx}`}>{item}</li>)}
              </ul>
            </div>
          )}
        </section>
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

          <VideoPanel
            isOpen={wisorVideoOpen}
            isLoading={wisorVideoLoading}
            videos={wisorVideos}
            error={wisorVideoError}
            selectedVideo={selectedWisorVideo}
            onSelectVideo={setSelectedWisorVideo}
            onCloseVideo={() => setSelectedWisorVideo(null)}
          />

          <GeminiPanel
            isOpen={geminiVisible}
            query={geminiQuery}
            onQueryChange={setGeminiQuery}
            onAsk={handleGeminiAsk}
            isLoading={geminiLoading}
            response={geminiResponse}
          />

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
          <ResetModal
            isOpen={resetModalVisible}
            onClose={() => setResetModalVisible(false)}
            onConfirm={handleResetExecute}
          />
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

          <VideoPanel
            isOpen={wisorVideoOpen}
            isLoading={wisorVideoLoading}
            videos={wisorVideos}
            error={wisorVideoError}
            selectedVideo={selectedWisorVideo}
            onSelectVideo={setSelectedWisorVideo}
            onCloseVideo={() => setSelectedWisorVideo(null)}
          />

          <GeminiPanel
            isOpen={geminiVisible}
            title="Frage an deinen KI-Tutor"
            placeholder="Was genau verstehst du hier nicht?"
            query={geminiQuery}
            onQueryChange={setGeminiQuery}
            onAsk={handleGeminiAsk}
            isLoading={geminiLoading}
            response={geminiResponse}
          />

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
