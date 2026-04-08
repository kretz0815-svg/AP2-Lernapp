import { SLFModal } from './features/stadt-land-fluss';
import React, { useState, useEffect, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { createPortal } from 'react-dom';
import './index.css';
import flashcards1 from './data/flashcards_1.json';
import flashcards2 from './data/flashcards_2.json';
import flashcards3 from './data/flashcards_3.json';

import wissenTesten from './data/wissen_testen.json';

import wisor1 from './data/wisor_1.json';
import wisorEco from './data/wisor_eco.json';
import marketingReview from './data/marketing_review.json';
import klrMcQuiz from './data/klr_mc.json';

import { supabase } from './supabaseClient';
import { askGemini, extractFocusTopics, extractCalculationInsights } from './geminiClient';
import { fetchYouTubeVideos } from './youtubeClient';
import QuizErrorBoundary from './components/QuizErrorBoundary';
import FloatingPortal from './components/FloatingPortal';
import FloatingImage from './components/FloatingImage';
import BurgerMenu from './components/BurgerMenu';
import QuestionManager from './components/QuestionManager';
import PomodoroTimer from './components/PomodoroTimer';
import KalkulationsBoss from './components/KalkulationsBoss';
import BreakEvenPoint from './components/BreakEvenPoint';
import ECommerceKalkulation from './components/ECommerceKalkulation';
import CostCalcBossModuleView from './components/CostCalcBossModuleView';
import NutzwertanalyseSimulator from './components/NutzwertanalyseSimulator';
import SWOTAnalyseSimulator from './components/SWOTAnalyseSimulator';
import ResetModal from './components/ResetModal';
import VideoPanel from './components/VideoPanel';
import GeminiPanel from './components/GeminiPanel';
import Confetti from './components/Confetti';
import { KLRGameHub, useKLRGame } from './features/klr';
import { ProjectMGame, useProjectM } from './features/project-m';
import { JourneyArchitectGame, useJourneyArchitect } from './features/journey-architect';
import { mapWisorAnswerToRating } from './services/srsFeedbackMapper';
import { reviewTaskWithDSR, getUserTaskProgress, upsertUserTaskProgress, clearTaskProgressByType } from './services/srsStore';

const LearningDashboard = React.lazy(() => import('./components/LearningDashboard'));
const QuizSession = React.lazy(() => import('./components/QuizSession'));
const WisorSession = React.lazy(() => import('./components/WisorSession'));
const NotesView = React.lazy(() => import('./components/NotesView'));
const QuizSetup = React.lazy(() => import('./components/QuizSetup'));
const FlashcardSession = React.lazy(() => import('./components/FlashcardSession'));
const ResultSummary = React.lazy(() => import('./components/ResultSummary'));
const OnlineMarketingKpiNextLevel = React.lazy(() => import('./components/OnlineMarketingKpiNextLevel'));


// ─── Extracted Utils ────────────────────────────────────────────
import {
  ANALYTICS_STORAGE_PREFIX, CUSTOM_QUIZ_STORAGE_PREFIX, MEMBER_SYNC_PENDING_PREFIX,
  ACCESS_MODE_KEY, CUSTOM_BACKGROUND_COLOR_KEY, BACKGROUND_SETTINGS_KEY,
  BACKGROUND_PRESETS, createEmptyAnalytics, createEmptyMemberProgressData, generateId
} from './utils/constants';
import {
  getAppearanceKey, getThemeKey,
  getAnalyticsStorageKey, getCustomQuizStorageKey, getCustomMarketingReviewStorageKey, getProfileSettingsStorageKey,
  loadAnalyticsForUser, loadCustomQuizForUser, loadCustomMarketingReviewForUser, loadProfileSettingsForUser, getLearningEventKey
} from './utils/analytics';
import { formatLatex } from './utils/formatting';
import { detectQuizTopic, getQuizTopicGroup } from './utils/quizTopics';
import { computeNextQuizProgress, filterDueQuizzes, getRequiredCorrectAnswers, isQuizDue, MULTI_CHOICE_REPEAT_MODES } from './utils/quizDue';
import { useAuth } from './hooks/useAuth';
import { useAppearance } from './hooks/useAppearance';
import { isRechenTask, categorizeRechenTask, getRechenTasks } from './utils/quizUtils';


function App() {
  const DB_KEY_WISOR_GRUNDLAGEN = 'wisor_grundlagen_progress';
  const DB_KEY_WISOR_ECOMMERCE = 'wisor_ecommerce_progress';
  const LEGACY_DB_KEY_WISOR = 'wisor_progress';
  const LEGACY_DB_KEY_WISOR_ECO = 'wisor_eco_progress';
  const DB_KEY_KLR_MC = 'klr_mc_progress';
  const LOCAL_KEY_KLR_MC = 'ap2_klr_mc_progress';
  const MULTI_CHOICE_REPEAT_MODE_KEY = 'ap2_multi_choice_repeat_mode';
  const WISOR_ECO_REPEAT_MODE = MULTI_CHOICE_REPEAT_MODES.ONCE;
  const MASTERED_DUE_DATE_ISO = '2999-12-31T00:00:00.000Z';

  const [appMode, setAppMode] = useState('auth'); // 'auth', 'dashboard', 'quiz', 'wisor', 'intro'
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_HCAPTCHA_SITEKEY || '';
  const { progress: klrProgress } = useKLRGame() || { progress: { xp: 0 } };
  const { progress: pmProgress } = useProjectM() || { progress: { xp: 0 } };
  const { progress: jaProgress } = useJourneyArchitect() || { progress: { xp: 0 } };

  // Set up auth first

  const {
    authUser,
    setAuthUser,
    setAuthError,
    email,
    setEmail,
    password,
    setPassword,
    authLoading,
    authMsg,
    rememberMe,
    setRememberMe,
    captchaError,
    setCaptchaError,
    captchaToken,
    setCaptchaToken,
    captchaRef,
    handleLogin,
    handleRegister,
    handleGoogleLogin,
    handleLogout,
    clearGuestProgressData
  } = useAuth(setAppMode);

  const {
    themePreference,
    setThemePref,
    isLightMode,
    backgroundMode,
    backgroundPresetId,
    backgroundImageData,
    backgroundEffectsEnabled,
    backgroundEffectsIntensity,
    appearanceNotice,
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


  // --- FLASHCARD STATE ---
  const [allCards, setAllCards] = useState([]);
  const [stats, setStats] = useState({ learnedToday: 0, totalDue: 0 });

  // --- QUIZ STATE ---
  const [quizDuePool, setQuizDuePool] = useState([]);
  const [quizSessionPool, setQuizSessionPool] = useState([]);
  const [quizSessionRepeatMode, setQuizSessionRepeatMode] = useState(MULTI_CHOICE_REPEAT_MODES.TWICE);
  const [quizProgressView, setQuizProgressView] = useState(() => JSON.parse(localStorage.getItem('ap2_quiz_progress') || '{}'));
  const [selectedQuizTopic, setSelectedQuizTopic] = useState('all');
  const [feynmanModeEnabled, setFeynmanModeEnabled] = useState(() => {
    try {
      return localStorage.getItem('ap2_feynman_mode_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [multiChoiceRepeatMode, setMultiChoiceRepeatMode] = useState(() => {
    const stored = localStorage.getItem(MULTI_CHOICE_REPEAT_MODE_KEY);
    return Object.values(MULTI_CHOICE_REPEAT_MODES).includes(stored)
      ? stored
      : MULTI_CHOICE_REPEAT_MODES.TWICE;
  });
  const multiChoiceRepeatModeRef = useRef(multiChoiceRepeatMode);
  const [lastQuizCorrect] = useState(false);
  const [quizCountSelection, setQuizCountSelection] = useState(10);
  const [marketingReviewSessionPool, setMarketingReviewSessionPool] = useState([]);
  const [marketingReviewSessionRepeatMode, setMarketingReviewSessionRepeatMode] = useState(MULTI_CHOICE_REPEAT_MODES.TWICE);
  const [marketingReviewCountSelection, setMarketingReviewCountSelection] = useState(10);
  const [marketingReviewResult, setMarketingReviewResult] = useState(null);
  const [marketingReviewDuePool, setMarketingReviewDuePool] = useState([]);
  const [wisorEcoSessionPool, setWisorEcoSessionPool] = useState([]);
  const [, setWisorEcoSessionRepeatMode] = useState(MULTI_CHOICE_REPEAT_MODES.TWICE);
  const [wisorEcoCountSelection, setWisorEcoCountSelection] = useState(10);
  const [wisorEcoDuePool, setWisorEcoDuePool] = useState([]);
  const [klrMcQuizSessionPool, setKlrMcSessionPool] = useState([]);
  const [klrMcQuizSessionRepeatMode, setKlrMcSessionRepeatMode] = useState(MULTI_CHOICE_REPEAT_MODES.TWICE);
  const [klrMcQuizCountSelection, setKlrMcCountSelection] = useState(10);
  const [klrMcDuePool, setKlrMcDuePool] = useState([]);

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
  const [completedMarketingReview, setCompletedMarketingReview] = useState({});
  const [completedKlrMc, setCompletedKlrMc] = useState({});
  const [activeWisorMode, setActiveWisorMode] = useState('wisor1');
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetTarget, setResetTarget] = useState('wisor');
  const [questionManagerCategory, setQuestionManagerCategory] = useState(null);
  const [learningAnalytics, setLearningAnalytics] = useState(createEmptyAnalytics());
  const [customQuizQuestions, setCustomQuizQuestions] = useState([]);
  const [customMarketingReviewQuestions, setCustomMarketingReviewQuestions] = useState([]);
  const [profileSettings, setProfileSettings] = useState(null);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [appearancePanelOpen, setAppearancePanelOpen] = useState(false);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroSessionLog, setPomodoroSessionLog] = useState([]);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroForceStop, setPomodoroForceStop] = useState(0);
  const [dashboardAiTopics, setDashboardAiTopics] = useState([]);
  const [dashboardAiLoading, setDashboardAiLoading] = useState(false);
  const [calcAiInsights, setCalcAiInsights] = useState([]);
  const [calcAiLoading, setCalcAiLoading] = useState(false);
  const [isSLFOpen, setIsSLFOpen] = useState(false);
  const wisorInputRef = useRef(null);
  const einsteinRef = useRef(null);
  const introVideoRef = useRef(null);
  const [introMuted, setIntroMuted] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [einsteinTilt, setEinsteinTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5500);
  };

  useEffect(() => {
    if (appMode !== 'dashboard' && appMode !== 'learning_dashboard') return;
    const prefersCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

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

    if (!prefersCoarsePointer) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [appMode]);

  useEffect(() => {
    try {
      localStorage.setItem('ap2_feynman_mode_enabled', feynmanModeEnabled ? 'true' : 'false');
    } catch {
      // Ignore storage write failures.
    }
  }, [feynmanModeEnabled]);

  useEffect(() => {
    multiChoiceRepeatModeRef.current = multiChoiceRepeatMode;
  }, [multiChoiceRepeatMode]);

  useEffect(() => {
    if (appMode === 'intro') {
      setIntroMuted(false);
      setIntroStarted(false);
    }
  }, [appMode]);

  useEffect(() => {
    if (appMode !== 'intro' || !introStarted) return;
    const video = introVideoRef.current;
    if (!video) return;

    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      if (cancelled) return;
      video.volume = 1;
      video.muted = introMuted;
      try {
        await video.play();
      } catch {
        if (cancelled) return;
        if (!introMuted) {
          video.muted = true;
          setIntroMuted(true);
          try {
            await video.play();
          } catch {
            // If this also fails, browser policy/device state blocks playback.
          }
        }
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [appMode, introMuted, introStarted]);

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
          topic: m.mode === 'quiz'
            ? ''
            : m.mode === 'wisor'
              ? 'WisoR Grundlagen'
              : m.mode === 'wisorEco'
                ? 'WisoR E-Commerce'
                : m.mode === 'klr'
                  ? 'KLR'
                  : m.mode === 'project_m'
                    ? 'Projekt M'
                    : m.mode === 'klr_mc'
                      ? 'KLR MC'
                    : m.mode === 'journey_architect'
                      ? 'Journey Architect'
                      : ''
        }));
      if (allMistakeData.length > 0) {
        setDashboardAiLoading(true);
        extractFocusTopics(allMistakeData).then(result => {
          setDashboardAiTopics(result.topics || []);
          setDashboardAiLoading(false);
        });
      } else {
        setDashboardAiTopics([]);
        setDashboardAiLoading(false);
      }
    }
  }, [appMode, authUser?.email, learningAnalytics?.mistakes]);

  useEffect(() => {
    if (appMode !== 'learning_dashboard' || !authUser?.email) return;

    const events = learningAnalytics?.events || [];
    const wrongCalcEvents = events
      .filter((event) => (event.mode === 'kalkulation' || event.mode === 'breakEven' || event.mode === 'klr') && !event.correct)
      .slice(-30);

    if (wrongCalcEvents.length === 0) {
      setCalcAiInsights([]);
      setCalcAiLoading(false);
      return;
    }

    setCalcAiLoading(true);
    extractCalculationInsights(wrongCalcEvents)
      .then((result) => {
        setCalcAiInsights(result?.insights || []);
      })
      .finally(() => {
        setCalcAiLoading(false);
      });
  }, [appMode, authUser?.email, learningAnalytics?.events]);

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

  // --- YOUTUBE STATE ---
  const [wisorVideos, setWisorVideos] = useState([]);
  const [wisorVideoQuestionId, setWisorVideoQuestionId] = useState(null);
  const [wisorVideoLoading, setWisorVideoLoading] = useState(false);
  const [lastWisorCorrect, setLastWisorCorrect] = useState(false);
  const [selectedWisorVideo, setSelectedWisorVideo] = useState(null);
  const [wisorVideoError, setWisorVideoError] = useState('');

  useEffect(() => {
    setWisorVideos([]);
    setWisorVideoQuestionId(null);
    setSelectedWisorVideo(null);
    setWisorVideoOpen(false);
    setWisorVideoError('');
    setWisorEvaluated(false);
    setWisorInput('');
    setGeminiVisible(false);
    setGeminiQuery('');
    setGeminiResponse('');
  }, [currentWisorIndex]);

  // formatLatex imported from utils/formatting.js

  const getLocalProgressData = (overrides = {}) => {
    const srsProgress = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
    const wisorProgress = JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {};
    const wisorEcoProgress = JSON.parse(localStorage.getItem('ap2_wisor_eco_progress')) || {};
    const marketingReviewProgress = JSON.parse(localStorage.getItem('ap2_marketing_review_progress')) || {};
    const klrMcQuizProgress = JSON.parse(localStorage.getItem(LOCAL_KEY_KLR_MC) || '{}');
    const savedNotes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
    const analytics = loadAnalyticsForUser(authUser);
    const customQuiz = loadCustomQuizForUser(authUser);
    const customMarketingReview = loadCustomMarketingReviewForUser(authUser);
    const profile = loadProfileSettingsForUser(authUser);
    const appearanceRaw = localStorage.getItem(getAppearanceKey(authUser));
    const appearance = appearanceRaw ? JSON.parse(appearanceRaw) : null;
    const theme = localStorage.getItem(getThemeKey(authUser)) || 'dark';
    const klrProgress = JSON.parse(localStorage.getItem('klr_game_progress_v1') || 'null');
    const projectMProgress = JSON.parse(localStorage.getItem('project_m_progress_v1') || 'null');
    const journeyArchitectProgress = JSON.parse(localStorage.getItem('journey_architect_progress_v1') || 'null');

    return {
      ...srsProgress,
      [LEGACY_DB_KEY_WISOR]: wisorProgress,
      [LEGACY_DB_KEY_WISOR_ECO]: wisorEcoProgress,
      [DB_KEY_WISOR_GRUNDLAGEN]: wisorProgress,
      [DB_KEY_WISOR_ECOMMERCE]: wisorEcoProgress,
      marketing_review_progress: marketingReviewProgress,
      [DB_KEY_KLR_MC]: klrMcQuizProgress,
      saved_notes: savedNotes,
      learning_analytics: analytics,
      custom_quiz_questions: customQuiz,
      custom_marketing_review_questions: customMarketingReview,
      profile_settings: profile,
      appearance_settings: appearance,
      theme_mode: theme,
      klr_progress: klrProgress,
      project_m_progress: projectMProgress,
      journey_architect_progress: journeyArchitectProgress,
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

  const normalizeMasteryProgressEntry = (entry) => {
    const requiredCorrectAnswers = getRequiredCorrectAnswers(multiChoiceRepeatMode);

    if (entry === true) {
      return { correctAnswersCount: requiredCorrectAnswers, isLearned: true, isActive: false };
    }
    if (!entry || typeof entry !== 'object') {
      return { correctAnswersCount: 0, isLearned: false, isActive: true };
    }

    const count = Number(entry.correctAnswersCount ?? entry.rep ?? 0) || 0;
    const learned = entry.isLearned === true || count >= requiredCorrectAnswers;

    return {
      ...entry,
      correctAnswersCount: count,
      isLearned: learned,
      isActive: !learned,
      rep: Number(entry.rep ?? count) || count,
      nextReview: learned ? Number(entry.nextReview || Date.now()) : 0,
    };
  };

  const isMasteryLearned = (entry) => {
    const normalized = normalizeMasteryProgressEntry(entry);
    if (typeof normalized?.isLearned === 'boolean') return normalized.isLearned;
    const count = Number(normalized?.correctAnswersCount ?? normalized?.rep ?? 0) || 0;
    return count >= getRequiredCorrectAnswers(multiChoiceRepeatMode);
  };

  const isMasteryLearnedForMode = (entry, mode) => {
    const requiredCorrectAnswers = getRequiredCorrectAnswers(mode);
    if (entry === true) return true;
    const count = Number(entry?.correctAnswersCount ?? entry?.rep ?? 0) || 0;
    return entry?.isLearned === true || count >= requiredCorrectAnswers;
  };

  const loadProgressObject = (storageKey) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const buildMasteryProgressFromRow = (row) => {
    if (!row) {
      return { rep: 0, ef: 2.5, interval: 0, nextReview: 0, correctAnswersCount: 0, isLearned: false, isActive: true };
    }

    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const correctAnswersCount = Number(metadata.correctStreak ?? metadata.correctAnswersCount ?? 0) || 0;
    const isLearned = metadata.isLearned === true;

    return {
      rep: correctAnswersCount,
      ef: 2.5,
      interval: Number(row.scheduled_days || 0) || 0,
      nextReview: row.due_date ? new Date(row.due_date).getTime() : 0,
      correctAnswersCount,
      isLearned,
      isActive: !isLearned,
    };
  };

  const persistMasteryProgressToSupabase = async ({
    question,
    taskType,
    taskPrefix,
    repeatMode,
    nextProgress,
    isCorrect,
  }) => {
    if (!authUser?.id || !question?.id || !nextProgress) return;

    const taskId = `${taskPrefix}:${question.id}`;
    const existing = await getUserTaskProgress(supabase, authUser.id, taskId);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const dueDate = nextProgress.isLearned
      ? MASTERED_DUE_DATE_ISO
      : repeatMode === MULTI_CHOICE_REPEAT_MODES.SPACED
        ? new Date(Math.max(now, Number(nextProgress.nextReview || now))).toISOString()
        : nowIso;

    const metadata = {
      ...(existing?.metadata || {}),
      question: question.question,
      repeatMode,
      progressMode: 'mastery',
      correctStreak: Number(nextProgress.correctAnswersCount || 0),
      correctAnswersCount: Number(nextProgress.correctAnswersCount || 0),
      isLearned: !!nextProgress.isLearned,
      lastCorrect: !!isCorrect,
      lastAnsweredAt: nowIso,
      nextReview: dueDate,
    };

    await upsertUserTaskProgress(supabase, authUser.id, taskId, {
      taskType,
      category: question.topic || null,
      dueDate,
      difficulty: Number(existing?.difficulty ?? 5.2),
      stability: Number(existing?.stability ?? 4.0),
      retrievability: Number(existing?.retrievability ?? 1),
      desiredRetention: Number(existing?.desired_retention ?? 0.9),
      reviewCount: Number(existing?.review_count ?? 0) + 1,
      lapseCount: Number(existing?.lapse_count ?? 0) + (isCorrect ? 0 : 1),
      elapsedDays: Number(existing?.elapsed_days ?? 0),
      scheduledDays: repeatMode === MULTI_CHOICE_REPEAT_MODES.SPACED && !nextProgress.isLearned
        ? Number(nextProgress.interval || 0)
        : 0,
      lastRating: isCorrect ? 4 : 2,
      lastOutcome: isCorrect ? 'recalled' : 'forgot',
      lastReviewedAt: nowIso,
      metadata,
    });
  };

  const loadDueKpiTheoryQuestions = async (questions, repeatMode = multiChoiceRepeatModeRef.current) => {
    const prepared = (Array.isArray(questions) ? questions : []).map((q) => ({
      ...q,
      id: q.id || generateId(q.question),
      topic: q.topic || 'KPI Theorie',
    }));

    if (!authUser?.id) {
      const localProg = loadProgressObject('ap2_kpi_theory_progress');
      const dueQuestions = filterDueQuizzes(prepared, localProg, Date.now(), repeatMode);
      return { dueQuestions, remainingCount: dueQuestions.length };
    }

    const nowIso = new Date().toISOString();
    const [allRowsRes, dueRowsRes] = await Promise.all([
      supabase
        .from('user_task_progress')
        .select('task_id')
        .eq('user_id', authUser.id)
        .eq('task_type', 'kpi_theory'),
      supabase
        .from('user_task_progress')
        .select('task_id')
        .eq('user_id', authUser.id)
        .eq('task_type', 'kpi_theory')
        .lte('due_date', nowIso)
    ]);

    if (allRowsRes.error) throw allRowsRes.error;
    if (dueRowsRes.error) throw dueRowsRes.error;

    const knownTaskIds = new Set((allRowsRes.data || []).map((row) => row.task_id));
    const dueTaskIds = new Set((dueRowsRes.data || []).map((row) => row.task_id));
    const dueQuestions = prepared.filter((q) => {
      const taskId = `kpi_theory:${q.id}`;
      return !knownTaskIds.has(taskId) || dueTaskIds.has(taskId);
    });

    return { dueQuestions, remainingCount: dueQuestions.length };
  };

  const handleKpiTheoryAnswerUpdate = async (q, isCorrect, repeatMode = multiChoiceRepeatModeRef.current) => {
    if (!q?.id) return { remainingCount: 0 };

    const localProg = loadProgressObject('ap2_kpi_theory_progress');
    const prevEntry = normalizeMasteryProgressEntry(localProg[q.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 });
    const nextEntry = {
      ...computeNextQuizProgress(prevEntry, isCorrect, Date.now(), repeatMode),
      updatedAt: new Date().toISOString(),
    };

    const nextProg = { ...localProg, [q.id]: nextEntry };
    localStorage.setItem('ap2_kpi_theory_progress', JSON.stringify(nextProg));

    if (authUser?.id) {
      try {
        await persistMasteryProgressToSupabase({
          question: q,
          taskType: 'kpi_theory',
          taskPrefix: 'kpi_theory',
          repeatMode,
          nextProgress: nextEntry,
          isCorrect,
        });
      } catch (err) {
        console.error('KPI theory progress save failed:', err);
      }
    }

    return { nextProgress: nextEntry };
  };

  const handleQuizAnswerUpdate = async (q, isCorrect, repeatMode = multiChoiceRepeatModeRef.current) => {
    if (!q?.id) return;

    const localProg = loadProgressObject('ap2_quiz_progress');
    const prevProg = normalizeMasteryProgressEntry(localProg[q.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 });
    const nextProg = computeNextQuizProgress(prevProg, isCorrect, Date.now(), repeatMode);

    localProg[q.id] = nextProg;
    localStorage.setItem('ap2_quiz_progress', JSON.stringify(localProg));
    setQuizProgressView(localProg);

    if (authUser?.id) {
      try {
        await persistMasteryProgressToSupabase({
          question: q,
          taskType: 'quiz',
          taskPrefix: 'quiz',
          repeatMode,
          nextProgress: nextProg,
          isCorrect,
        });
      } catch (err) {
        console.error('Quiz progress save failed:', err);
      }
    }

    await refreshQuizDuePool();
  };

  const handleMarketingReviewAnswerUpdate = async (q, isCorrect, repeatMode = multiChoiceRepeatModeRef.current) => {
    if (!q?.id) return;

    const localProg = loadProgressObject('ap2_marketing_review_progress');
    const prevEntry = normalizeMasteryProgressEntry(localProg[q.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 });
    const nextEntry = {
      ...computeNextQuizProgress(prevEntry, isCorrect, Date.now(), repeatMode),
      updatedAt: new Date().toISOString(),
    };

    const nextProg = { ...localProg, [q.id]: nextEntry };
    localStorage.setItem('ap2_marketing_review_progress', JSON.stringify(nextProg));
    setCompletedMarketingReview(nextProg);

    if (authUser?.id) {
      try {
        await persistMasteryProgressToSupabase({
          question: q,
          taskType: 'marketing_review',
          taskPrefix: 'marketing_review',
          repeatMode,
          nextProgress: nextEntry,
          isCorrect,
        });
      } catch (err) {
        console.error('Marketing review progress save failed:', err);
      }
    }

    await refreshMarketingReviewDuePool();
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
    const excludedModes = new Set(['vip', 'slf', 'premium']);
    setLearningAnalytics(prev => {
      const safePrev = prev && Array.isArray(prev.events) ? prev : createEmptyAnalytics();
      const rebuiltMistakes = {};

      for (const event of safePrev.events) {
        if (excludedModes.has(String(event.mode || '').toLowerCase())) continue;
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


  const [rechenSetup, setRechenSetup] = useState({ topic: 'Alle', count: 10 });

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

  const refreshQuizDuePool = async () => {
    const rawQuizzes = [
      ...(wissenTesten.questions || []),
      ...(customQuizQuestions || []).filter(q => !isRechenTask(q))
    ];

    const quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
    const prepared = buildPreparedQuizzes(rawQuizzes, quizProg);
    const now = Date.now();

    if (!authUser?.id) {
      const localDue = filterDueQuizzes(prepared, quizProg, now, multiChoiceRepeatMode);
      setQuizProgressView(quizProg);
      setQuizDuePool(localDue);
      return localDue;
    }

    try {
      const nowIso = new Date().toISOString();
      const [allRowsRes, dueRowsRes] = await Promise.all([
        supabase
          .from('user_task_progress')
          .select('task_id,due_date,scheduled_days,metadata')
          .eq('user_id', authUser.id)
          .eq('task_type', 'quiz'),
        supabase
          .from('user_task_progress')
          .select('task_id')
          .eq('user_id', authUser.id)
          .eq('task_type', 'quiz')
          .lte('due_date', nowIso)
      ]);

      if (allRowsRes.error) throw allRowsRes.error;
      if (dueRowsRes.error) throw dueRowsRes.error;

      const allRows = Array.isArray(allRowsRes.data) ? allRowsRes.data : [];
      const dueRows = Array.isArray(dueRowsRes.data) ? dueRowsRes.data : [];
      const knownTaskIds = new Set(allRows.map((row) => row.task_id));
      const dueTaskIds = new Set(dueRows.map((row) => row.task_id));
      const effectiveProgress = {};

      allRows.forEach((row) => {
        const taskId = String(row.task_id || '');
        if (!taskId.startsWith('quiz:')) return;
        const questionId = taskId.slice('quiz:'.length);
        effectiveProgress[questionId] = buildMasteryProgressFromRow(row);
      });

      const due = prepared.filter((q) => {
        const taskId = `quiz:${q.id}`;
        return !knownTaskIds.has(taskId) || dueTaskIds.has(taskId);
      });

      setQuizProgressView(effectiveProgress);
      localStorage.setItem('ap2_quiz_progress', JSON.stringify(effectiveProgress));
      setQuizDuePool(due);
      return due;
    } catch (err) {
      console.error('Failed loading quiz due pool from user_task_progress:', err);
      const fallbackDue = filterDueQuizzes(prepared, quizProg, now, multiChoiceRepeatMode);
      setQuizProgressView(quizProg);
      setQuizDuePool(fallbackDue);
      return fallbackDue;
    }
  };

  const handleAddCustomQuizQuestion = async (payload) => {
    const targetCategory = payload?.category === 'marketing_review' ? 'marketing_review' : 'quiz';
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

    if (targetCategory === 'marketing_review') {
      const updatedCustom = [...(customMarketingReviewQuestions || []), newQuestion];
      setCustomMarketingReviewQuestions(updatedCustom);
      localStorage.setItem(getCustomMarketingReviewStorageKey(authUser), JSON.stringify(updatedCustom));
      await syncProgressToSupabase({ custom_marketing_review_questions: updatedCustom });
      return { ok: true };
    }

    const updatedCustom = [...(customQuizQuestions || []), newQuestion];
    setCustomQuizQuestions(updatedCustom);
    localStorage.setItem(getCustomQuizStorageKey(authUser), JSON.stringify(updatedCustom));
    await syncProgressToSupabase({ custom_quiz_questions: updatedCustom });
    await refreshQuizDuePool();

    return { ok: true };
  };

  const getDueQuizzesByTopic = (topic = 'all') => {
    const due = quizDuePool;
    if (topic === 'all') return due;
    return due.filter(q => getQuizTopicGroup(q.topic) === topic);
  };

  const allMarketingReviewQuestions = [
    ...(marketingReview.questions || []),
    ...(customMarketingReviewQuestions || [])
  ];

  const allKlrMcQuestions = [
    ...(klrMcQuiz.questions || [])
  ];

  const parseLegacyWisorEcoAnswerOptions = (questionText, expectedAnswers = []) => {
    const lines = String(questionText || '').split('\n');
    const optionLines = lines
      .map(line => line.trim())
      .filter(line => /^\d+\.\s+/.test(line) && !/aufgabe/i.test(line));

    if (optionLines.length < 2) {
      return { answerOptions: [], cleanedQuestion: String(questionText || '') };
    }

    const expectedSet = new Set(
      (expectedAnswers || [])
        .flatMap(answer => String(answer || '').replace(/\s+/g, '').split(''))
        .filter(char => /^\d$/.test(char))
    );

    const answerOptions = optionLines
      .map((line) => {
        const match = line.match(/^(\d+)\.\s+(.+)$/);
        if (!match) return null;
        const index = match[1];
        const text = match[2].trim();
        return {
          text,
          isCorrect: expectedSet.has(index),
          rationale: ''
        };
      })
      .filter(Boolean);

    const firstOptionLine = lines.findIndex(line => /^\s*\d+\.\s+/.test(line) && !/aufgabe/i.test(line));
    const cleanedQuestion = firstOptionLine > 0
      ? lines.slice(0, firstOptionLine).join('\n').trim()
      : String(questionText || '');

    return { answerOptions, cleanedQuestion };
  };

  const wisorEcoQuizQuestions = (wisorEco.questions || []).map((q) => {
    if (Array.isArray(q.answerOptions) && q.answerOptions.length > 0) {
      return {
        ...q,
        topic: q.topic || 'WisoR E-Commerce'
      };
    }

    const { answerOptions, cleanedQuestion } = parseLegacyWisorEcoAnswerOptions(q.question, q.expectedAnswers);
    return {
      ...q,
      question: cleanedQuestion,
      answerOptions,
      topic: q.topic || 'WisoR E-Commerce'
    };
  });

  const loadDuePoolForTaskType = async ({
    questions,
    taskType,
    taskPrefix,
    repeatMode,
    localStorageKey,
  }) => {
    const safeQuestions = Array.isArray(questions) ? questions : [];
    const localProg = loadProgressObject(localStorageKey);
    const prepared = buildPreparedQuizzes(safeQuestions, localProg);

    if (!authUser?.id) {
      const due = filterDueQuizzes(prepared, localProg, Date.now(), repeatMode);
      return { due, progressById: localProg };
    }

    const nowIso = new Date().toISOString();
    const [allRowsRes, dueRowsRes] = await Promise.all([
      supabase
        .from('user_task_progress')
        .select('task_id,due_date,scheduled_days,metadata')
        .eq('user_id', authUser.id)
        .eq('task_type', taskType),
      supabase
        .from('user_task_progress')
        .select('task_id')
        .eq('user_id', authUser.id)
        .eq('task_type', taskType)
        .lte('due_date', nowIso)
    ]);

    if (allRowsRes.error) throw allRowsRes.error;
    if (dueRowsRes.error) throw dueRowsRes.error;

    const allRows = Array.isArray(allRowsRes.data) ? allRowsRes.data : [];
    const dueRows = Array.isArray(dueRowsRes.data) ? dueRowsRes.data : [];
    const knownTaskIds = new Set(allRows.map((row) => row.task_id));
    const dueTaskIds = new Set(dueRows.map((row) => row.task_id));
    const progressById = {};

    allRows.forEach((row) => {
      const taskId = String(row.task_id || '');
      if (!taskId.startsWith(`${taskPrefix}:`)) return;
      const questionId = taskId.slice(taskPrefix.length + 1);
      progressById[questionId] = buildMasteryProgressFromRow(row);
    });

    const due = prepared.filter((q) => {
      const taskId = `${taskPrefix}:${q.id}`;
      return !knownTaskIds.has(taskId) || dueTaskIds.has(taskId);
    });

    return { due, progressById };
  };

  const refreshMarketingReviewDuePool = async () => {
    try {
      const { due, progressById } = await loadDuePoolForTaskType({
        questions: allMarketingReviewQuestions,
        taskType: 'marketing_review',
        taskPrefix: 'marketing_review',
        repeatMode: multiChoiceRepeatModeRef.current,
        localStorageKey: 'ap2_marketing_review_progress',
      });
      setMarketingReviewDuePool(due);
      setCompletedMarketingReview(progressById);
      localStorage.setItem('ap2_marketing_review_progress', JSON.stringify(progressById));
      return due;
    } catch (err) {
      console.error('Failed loading marketing review due pool:', err);
      const fallbackProg = loadProgressObject('ap2_marketing_review_progress');
      const fallbackPrepared = buildPreparedQuizzes(allMarketingReviewQuestions, fallbackProg);
      const fallbackDue = filterDueQuizzes(fallbackPrepared, fallbackProg, Date.now(), multiChoiceRepeatModeRef.current);
      setMarketingReviewDuePool(fallbackDue);
      return fallbackDue;
    }
  };

  const refreshWisorEcoDuePool = async () => {
    try {
      const { due, progressById } = await loadDuePoolForTaskType({
        questions: wisorEcoQuizQuestions,
        taskType: 'wisorEco',
        taskPrefix: 'wisorEco',
        repeatMode: WISOR_ECO_REPEAT_MODE,
        localStorageKey: 'ap2_wisor_eco_progress',
      });
      setWisorEcoDuePool(due);
      setCompletedWisorsEco(progressById);
      localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify(progressById));
      return due;
    } catch (err) {
      console.error('Failed loading wisor eco due pool:', err);
      const fallbackProg = loadProgressObject('ap2_wisor_eco_progress');
      const fallbackPrepared = buildPreparedQuizzes(wisorEcoQuizQuestions, fallbackProg);
      const fallbackDue = filterDueQuizzes(fallbackPrepared, fallbackProg, Date.now(), WISOR_ECO_REPEAT_MODE);
      setWisorEcoDuePool(fallbackDue);
      return fallbackDue;
    }
  };

  const refreshKlrMcDuePool = async () => {
    try {
      const { due, progressById } = await loadDuePoolForTaskType({
        questions: allKlrMcQuestions,
        taskType: 'klr_mc',
        taskPrefix: 'zahlen',
        repeatMode: multiChoiceRepeatModeRef.current,
        localStorageKey: LOCAL_KEY_KLR_MC,
      });
      setKlrMcDuePool(due);
      setCompletedKlrMc(progressById);
      localStorage.setItem(LOCAL_KEY_KLR_MC, JSON.stringify(progressById));
      return due;
    } catch (err) {
      console.error('Failed loading klr mc due pool:', err);
      const fallbackProg = loadProgressObject(LOCAL_KEY_KLR_MC);
      const fallbackPrepared = buildPreparedQuizzes(allKlrMcQuestions, fallbackProg);
      const fallbackDue = filterDueQuizzes(fallbackPrepared, fallbackProg, Date.now(), multiChoiceRepeatModeRef.current);
      setKlrMcDuePool(fallbackDue);
      return fallbackDue;
    }
  };

  const getDueWisorEcoByTopic = (topic = 'all') => {
    const due = wisorEcoDuePool;
    if (topic === 'all') return due;
    return due.filter(q => getQuizTopicGroup(q.topic) === topic);
  };

  const getDueMarketingReviewByTopic = (topic = 'all') => {
    const due = marketingReviewDuePool;
    if (topic === 'all') return due;
    return due.filter(q => getQuizTopicGroup(q.topic) === topic);
  };

  const getDueKlrMcByTopic = (topic = 'all') => {
    const due = klrMcDuePool;
    if (topic === 'all') return due;
    return due.filter(q => getQuizTopicGroup(q.topic) === topic);
  };

  const normalizeQuizLimit = (limit, poolLength) => {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) return poolLength;
    return Math.min(Math.floor(parsed), poolLength);
  };

  const buildShuffledSession = (pool, limit) => {
    const uniqueById = [];
    const seenIds = new Set();
    for (const item of (pool || [])) {
      const stableId = item?.id || generateId(String(item?.question || ''));
      if (seenIds.has(stableId)) continue;
      seenIds.add(stableId);
      uniqueById.push({ ...item, id: stableId });
    }

    const shuffled = uniqueById.sort(() => Math.random() - 0.5);
    const normalizedLimit = normalizeQuizLimit(limit, shuffled.length);
    if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) {
      return [];
    }
    return shuffled.slice(0, normalizedLimit);
  };

  const getWeakTopicLabel = (summary) => {
    const wrong = Array.isArray(summary?.incorrectQuestions) ? summary.incorrectQuestions : [];
    if (wrong.length === 0) return '';

    const counts = wrong.reduce((acc, entry) => {
      const topic = String(entry?.topic || '').trim();
      if (!topic) return acc;
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '';
  };

  const openPracticeByTopic = (topic) => {
    const safeTopic = String(topic || '').toLowerCase();
    if (/swot/.test(safeTopic)) {
      setAppMode('swot_analyse');
      return;
    }
    if (/nutzwert/.test(safeTopic)) {
      setAppMode('nutzwertanalyse');
      return;
    }
    if (/(kalkulation|deckungsbeitrag|kosten|break.?even)/.test(safeTopic)) {
      setAppMode('kalkulation');
      return;
    }
    if (/(projekt|agil|gantt|psp)/.test(safeTopic)) {
      setAppMode('project_m');
      return;
    }
    setSelectedQuizTopic(getQuizTopicGroup(topic));
    setAppMode('marketing_review_setup');
  };

  const handleToggleVideos = async (q) => {
    const targetQuestionId = q?.id || null;
    const sameQuestion = targetQuestionId !== null && targetQuestionId === wisorVideoQuestionId;

    if (wisorVideoOpen && sameQuestion) {
      setWisorVideoOpen(false);
      return;
    }

    if (!sameQuestion) {
      setWisorVideos([]);
      setSelectedWisorVideo(null);
      setWisorVideoError('');
      setWisorVideoQuestionId(targetQuestionId);
    }

    setWisorVideoOpen(true);

    if ((wisorVideos.length === 0 || !sameQuestion) && !wisorVideoLoading) {
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
        const topicLabel = String(q?.topic || '').trim();

        if (q?.youtubeQuery?.trim()) {
          candidates.push(q.youtubeQuery.trim());
        }

        if (topicLabel && !/^WisoR\s*E-Commerce$/i.test(topicLabel)) {
          candidates.push(`${topicLabel} IHK einfach erklärt`);
        }

        if (/nutzwert/i.test(topicLabel)) {
          candidates.push('Nutzwertanalyse einfach erklärt IHK');
        } else if (/(kalkulation|deckungsbeitrag|break.?even|kostenrechnung)/i.test(topicLabel)) {
          candidates.push('Kalkulation Deckungsbeitrag Break Even IHK erklärt');
        } else if (/(influencer|social media)/i.test(topicLabel)) {
          candidates.push('Influencer Marketing Social Media IHK einfach erklärt');
        } else if (/(targeting|online-marketing|push|pull)/i.test(topicLabel)) {
          candidates.push('Online Marketing Targeting Push Pull IHK');
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

  const handleGeminiAsk = async (activeQuestion = null, answerContext = {}) => {
    if (!geminiQuery.trim()) return;
    setGeminiLoading(true);
    setGeminiResponse('');

    const q = activeQuestion || (appMode === 'wisor' ? allWisors[currentWisorIndex] : null);
    if (!q) {
      setGeminiLoading(false);
      return;
    }

    let expectedAnswers = '';
    if (appMode === 'wisor') {
      expectedAnswers = q.expectedAnswers?.join(', ') || 'N/A';
    } else if (q.answerOptions) {
      expectedAnswers = q.answerOptions.find(opt => opt.isCorrect)?.text || 'N/A';
    } else {
      expectedAnswers = 'N/A';
    }
    const answerInfo = "Geforderte Antwort(en): " + expectedAnswers + " | Erklärung: " + (q.rationale || 'N/A');

    const response = await askGemini(geminiQuery, q.question, answerInfo, {
      isCorrect: typeof answerContext?.isCorrect === 'boolean' ? answerContext.isCorrect : null,
      selectedAnswer: String(answerContext?.selectedAnswerText || '').slice(0, 1200),
      correctAnswer: String(answerContext?.correctAnswerText || expectedAnswers).slice(0, 1200),
    });
    setGeminiResponse(response);
    setGeminiLoading(false);
  };

  const handleFeynmanCheck = async (input, q, callback) => {
    if (!input?.trim() || !q) return;

    const correctOption = q.answerOptions.find(opt => opt.isCorrect);
    const learnerPrompt = `Bewerte die folgende Lernerklärung eines Azubis auf fachliche Richtigkeit und Tiefe.
Antworte exakt in diesem Format:
STATUS: GUT oder TEILWEISE
FEEDBACK: <maximal 4 kurze Sätze, konkret und lernförderlich>

Erklärung des Azubis:
${input}`;

    const solutionContext = `Musterlösung: ${correctOption?.text || 'N/A'} | Begründung: ${correctOption?.rationale || 'N/A'}`;

    try {
      const result = await askGemini(learnerPrompt, q.question, solutionContext);
      const statusMatch = result.match(/STATUS\s*:\s*(GUT|TEILWEISE)/i);
      const parsedStatus = statusMatch?.[1]?.toUpperCase() || 'TEILWEISE';
      const cleanedFeedback = result
        .replace(/STATUS\s*:\s*(GUT|TEILWEISE)\s*/ig, '')
        .replace(/FEEDBACK\s*:\s*/i, '')
        .trim();

      const level = parsedStatus === 'GUT' ? 'good' : 'partial';
      if (callback) callback(cleanedFeedback || result, level);
    } catch (err) {
      console.error('Feynman check failed:', err);
      if (callback) callback('Die Überprüfung konnte gerade nicht abgeschlossen werden.', 'partial');
    }
  };

  const startQuizSession = (limit, topic = 'all') => {
    const duePool = getDueQuizzesByTopic(topic);
    const sessionQs = buildShuffledSession(duePool, limit);

    setQuizSessionRepeatMode(multiChoiceRepeatModeRef.current);
    setQuizSessionPool(sessionQs);
    setAppMode('quiz');
  };

  const startMarketingReviewSession = (limit, topic = 'all') => {
    const duePool = getDueMarketingReviewByTopic(topic);
    const sessionQs = buildShuffledSession(duePool, limit);
    setMarketingReviewSessionRepeatMode(multiChoiceRepeatModeRef.current);
    setMarketingReviewSessionPool(sessionQs);
    setMarketingReviewResult(null);
    setAppMode('marketing_review_quiz');
  };

  const startWisorEcoSession = (limit, topic = 'all') => {
    const duePool = getDueWisorEcoByTopic(topic);
    const sessionQs = buildShuffledSession(duePool, limit);
    setWisorEcoSessionRepeatMode(WISOR_ECO_REPEAT_MODE);
    setWisorEcoSessionPool(sessionQs);
    setAppMode('wisor_eco_quiz');
  };

  const startKlrMcSession = (limit, topic = 'all') => {
    const duePool = getDueKlrMcByTopic(topic);
    const sessionQs = buildShuffledSession(duePool, limit);
    setKlrMcSessionRepeatMode(multiChoiceRepeatModeRef.current);
    setKlrMcSessionPool(sessionQs);
    setAppMode('klr_mc');
  };

  const handleWisorEcoAnswerUpdate = async (q, isCorrect, repeatMode = WISOR_ECO_REPEAT_MODE) => {
    if (!q?.id) return;

    const localProg = loadProgressObject('ap2_wisor_eco_progress');
    const prevEntry = normalizeMasteryProgressEntry(localProg[q.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 });
    const nextEntry = {
      ...computeNextQuizProgress(prevEntry, isCorrect, Date.now(), repeatMode),
      updatedAt: new Date().toISOString(),
    };

    const nextProg = { ...localProg, [q.id]: nextEntry };
    localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify(nextProg));
    setCompletedWisorsEco(nextProg);

    if (authUser?.id) {
      try {
        await persistMasteryProgressToSupabase({
          question: q,
          taskType: 'wisorEco',
          taskPrefix: 'wisorEco',
          repeatMode,
          nextProgress: nextEntry,
          isCorrect,
        });
      } catch (err) {
        console.error('Wisor eco progress save failed:', err);
      }
    }

    await refreshWisorEcoDuePool();
  };

  const handleKlrMcAnswerUpdate = async (q, isCorrect, repeatMode = multiChoiceRepeatModeRef.current) => {
    if (!q?.id) return;

    const localProg = loadProgressObject(LOCAL_KEY_KLR_MC);
    const prevEntry = normalizeMasteryProgressEntry(localProg[q.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 });
    const nextEntry = {
      ...computeNextQuizProgress(prevEntry, isCorrect, Date.now(), repeatMode),
      updatedAt: new Date().toISOString(),
    };

    const nextProg = { ...localProg, [q.id]: nextEntry };
    localStorage.setItem(LOCAL_KEY_KLR_MC, JSON.stringify(nextProg));
    setCompletedKlrMc(nextProg);

    if (authUser?.id) {
      try {
        await persistMasteryProgressToSupabase({
          question: q,
          taskType: 'klr_mc',
          taskPrefix: 'zahlen',
          repeatMode,
          nextProgress: nextEntry,
          isCorrect,
        });
      } catch (err) {
        console.error('KLR MC progress save failed:', err);
      }
    }

    await refreshKlrMcDuePool();
  };

  const resolveDisplayName = (user, settings) => {
    const fromProfile = String(settings?.displayName || '').trim();
    if (fromProfile) return fromProfile;
    const fromMeta = String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
    if (fromMeta) return fromMeta;
    const fromEmail = String(user?.email || '').split('@')[0]?.trim();
    return fromEmail || 'User';
  };

  const saveProfileSettings = async (nextSettings) => {
    setProfileSettings(nextSettings);
    setProfileNameInput(String(nextSettings?.displayName || ''));
    localStorage.setItem(getProfileSettingsStorageKey(authUser), JSON.stringify(nextSettings));
    if (authUser?.id) {
      await syncProgressToSupabase({ profile_settings: nextSettings }).catch(() => { });
    }
  };

  const handleMultiChoiceRepeatModeChange = async (nextMode) => {
    if (!Object.values(MULTI_CHOICE_REPEAT_MODES).includes(nextMode)) return;
    multiChoiceRepeatModeRef.current = nextMode;
    setMultiChoiceRepeatMode(nextMode);
    localStorage.setItem(MULTI_CHOICE_REPEAT_MODE_KEY, nextMode);

    const next = {
      ...(profileSettings || {}),
      displayName: String(profileNameInput || profileSettings?.displayName || '').trim(),
      mcRepeatMode: nextMode,
      updatedAt: new Date().toISOString()
    };

    await saveProfileSettings(next);
    setProfileNotice('Multi-Choice Wiederholrate gespeichert.');
  };

  const handleSaveProfileName = async () => {
    const cleanName = profileNameInput.trim();
    if (!cleanName) {
      setProfileNotice('Bitte gib einen Anzeigenamen ein.');
      return;
    }
    const next = {
      ...(profileSettings || {}),
      displayName: cleanName,
      updatedAt: new Date().toISOString()
    };
    await saveProfileSettings(next);
    setProfileNotice('Anzeigename gespeichert.');
  };

  const handleProfileImageUpload = async (file) => {
    if (!file) return;
    const isImage = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    if (!isImage) {
      setProfileNotice('Bitte nutze PNG, JPG oder WEBP für das Profilbild.');
      return;
    }
    if (file.size > 1.8 * 1024 * 1024) {
      setProfileNotice('Profilbild ist zu groß. Bitte unter 1.8 MB bleiben.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) {
        setProfileNotice('Profilbild konnte nicht geladen werden.');
        return;
      }
      const next = {
        ...(profileSettings || {}),
        displayName: String(profileNameInput || profileSettings?.displayName || '').trim(),
        avatarDataUrl: dataUrl,
        updatedAt: new Date().toISOString()
      };
      await saveProfileSettings(next);
      setProfileNotice('Profilbild gespeichert.');
    };
    reader.onerror = () => setProfileNotice('Profilbild konnte nicht gelesen werden.');
    reader.readAsDataURL(file);
  };

  const handleRemoveProfileImage = async () => {
    const next = {
      ...(profileSettings || {}),
      displayName: String(profileNameInput || profileSettings?.displayName || '').trim(),
      avatarDataUrl: '',
      updatedAt: new Date().toISOString()
    };
    await saveProfileSettings(next);
    setProfileNotice('Profilbild entfernt.');
  };


  useEffect(() => {
    const initApp = async () => {
      // 0. Get current Auth
      const { data: { session } } = await supabase.auth.getSession();
      const storedAccessMode = localStorage.getItem(ACCESS_MODE_KEY);

      if (!session?.user) {
        setAppMode('auth');
      } else {
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
      let customMarketingReviewData = loadCustomMarketingReviewForUser(session?.user || null);
      let profileData = loadProfileSettingsForUser(session?.user || null);

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
            // Removed: localStorage.setItem('ap2_quiz_progress', JSON.stringify({})); // Keep local progress intact as fallback

            const remoteWisorProgress = data.progress_data[DB_KEY_WISOR_GRUNDLAGEN] || data.progress_data[LEGACY_DB_KEY_WISOR];
            if (remoteWisorProgress) {
              localStorage.setItem('ap2_wisor_progress', JSON.stringify(remoteWisorProgress));
            } else {
              localStorage.setItem('ap2_wisor_progress', JSON.stringify({}));
            }
            const remoteWisorEcoProgress = data.progress_data[DB_KEY_WISOR_ECOMMERCE] || data.progress_data[LEGACY_DB_KEY_WISOR_ECO];
            if (remoteWisorEcoProgress) {
              localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify(remoteWisorEcoProgress));
            } else {
              localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify({}));
            }
            if (data.progress_data.marketing_review_progress) {
              localStorage.setItem('ap2_marketing_review_progress', JSON.stringify(data.progress_data.marketing_review_progress));
            } else {
              localStorage.setItem('ap2_marketing_review_progress', JSON.stringify({}));
            }
            if (data.progress_data[DB_KEY_KLR_MC]) {
              localStorage.setItem(LOCAL_KEY_KLR_MC, JSON.stringify(data.progress_data[DB_KEY_KLR_MC]));
            } else {
              localStorage.setItem(LOCAL_KEY_KLR_MC, JSON.stringify({}));
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
            if (Array.isArray(data.progress_data.custom_marketing_review_questions)) {
              customMarketingReviewData = data.progress_data.custom_marketing_review_questions;
              localStorage.setItem(getCustomMarketingReviewStorageKey(session.user), JSON.stringify(customMarketingReviewData));
            } else {
              customMarketingReviewData = [];
              localStorage.setItem(getCustomMarketingReviewStorageKey(session.user), JSON.stringify([]));
            }
            if (data.progress_data.profile_settings && typeof data.progress_data.profile_settings === 'object') {
              profileData = data.progress_data.profile_settings;
              localStorage.setItem(getProfileSettingsStorageKey(session.user), JSON.stringify(profileData));
            } else {
              profileData = null;
              localStorage.removeItem(getProfileSettingsStorageKey(session.user));
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
            if (data.progress_data.appearance_settings) {
              localStorage.setItem(getAppearanceKey(session.user), JSON.stringify(data.progress_data.appearance_settings));
            }
            if (data.progress_data.theme_mode) {
              localStorage.setItem(getThemeKey(session.user), data.progress_data.theme_mode);
            }
            if (data.progress_data.project_m_progress) {
              localStorage.setItem('project_m_progress_v1', JSON.stringify(data.progress_data.project_m_progress));
            } else {
              localStorage.removeItem('project_m_progress_v1');
            }
            if (data.progress_data.klr_progress) {
              localStorage.setItem('klr_game_progress_v1', JSON.stringify(data.progress_data.klr_progress));
            } else {
              localStorage.removeItem('klr_game_progress_v1');
            }
            if (data.progress_data.journey_architect_progress) {
              localStorage.setItem('journey_architect_progress_v1', JSON.stringify(data.progress_data.journey_architect_progress));
            } else {
              localStorage.removeItem('journey_architect_progress_v1');
            }
          } else if (!data) {
            // Init empty row for this authenticated user
            const emptyProgress = createEmptyMemberProgressData();
            await supabase.from('user_data').upsert([{ user_id: userId, device_id: userId, progress_data: emptyProgress }], { onConflict: 'user_id' });
            progressData = { ...emptyProgress };
            localStorage.setItem('ap2_srs_progress', JSON.stringify(progressData));
            // Removed: localStorage.setItem('ap2_quiz_progress', JSON.stringify({})); // Keep local progress intact as fallback
            localStorage.setItem('ap2_wisor_progress', JSON.stringify({}));
            localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify({}));
            localStorage.setItem('ap2_marketing_review_progress', JSON.stringify({}));
            localStorage.setItem(LOCAL_KEY_KLR_MC, JSON.stringify({}));
            localStorage.setItem('ap2_saved_notes', JSON.stringify({}));
            localStorage.removeItem('project_m_progress_v1');
            localStorage.removeItem('klr_game_progress_v1');
            localStorage.removeItem('journey_architect_progress_v1');
            // Trigger local update for providers
            window.dispatchEvent(new Event('storage'));

            if (session?.user) {
              localStorage.setItem(getAnalyticsStorageKey(session.user), JSON.stringify(createEmptyAnalytics()));
              localStorage.setItem(getCustomQuizStorageKey(session.user), JSON.stringify([]));
              localStorage.setItem(getCustomMarketingReviewStorageKey(session.user), JSON.stringify([]));
              localStorage.removeItem(getProfileSettingsStorageKey(session.user));
            }
            analyticsData = createEmptyAnalytics();
            customQuizData = [];
            customMarketingReviewData = [];
            profileData = null;
          }
          // After loading we might want to tell the providers to refresh
          window.dispatchEvent(new CustomEvent('ap2_progress_synced'));
        } catch (err) {
          console.error("Supabase load error: ", err);
        }
      }

      let wisorProg = JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {};
      setCompletedWisors(wisorProg);

      let wisorEcoProg = JSON.parse(localStorage.getItem('ap2_wisor_eco_progress')) || {};
      setCompletedWisorsEco(wisorEcoProg);
      const klrMcQuizProg = JSON.parse(localStorage.getItem(LOCAL_KEY_KLR_MC) || '{}');
      setCompletedKlrMc(klrMcQuizProg);
      setLearningAnalytics(analyticsData);
      setCustomQuizQuestions(customQuizData);
      setCustomMarketingReviewQuestions(customMarketingReviewData);
      setProfileSettings(profileData);
      const profileRepeatMode = profileData?.mcRepeatMode;
      if (Object.values(MULTI_CHOICE_REPEAT_MODES).includes(profileRepeatMode)) {
        setMultiChoiceRepeatMode(profileRepeatMode);
        localStorage.setItem(MULTI_CHOICE_REPEAT_MODE_KEY, profileRepeatMode);
      }
      setProfileNameInput(String(profileData?.displayName || resolveDisplayName(session?.user, profileData)));

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
      const now = Date.now();
      const dueCount = mergedCards.filter(c => c.progress.nextReview <= now).length;
      setStats({ learnedToday: 0, totalDue: dueCount });

      // 4. Setup Quizzes
      await refreshQuizDuePool();
      await refreshWisorEcoDuePool();
      await refreshMarketingReviewDuePool();
      await refreshKlrMcDuePool();

      // 5. Setup Wisor
      const rawWisors = [
        ...(wisor1.questions || [])
      ].filter(q => !(JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {})[q.id]);
      const shuffledWisors = rawWisors.sort(() => Math.random() - 0.5);
      setAllWisors(shuffledWisors);

      // 6. Setup Review
      const reviewProg = JSON.parse(localStorage.getItem('ap2_marketing_review_progress')) || {};
      if (!session?.user) {
        setCompletedMarketingReview(reviewProg);
      }
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLearningAnalytics(loadAnalyticsForUser(authUser));
    setCustomQuizQuestions(loadCustomQuizForUser(authUser));
    setCustomMarketingReviewQuestions(loadCustomMarketingReviewForUser(authUser));
    const loadedProfile = loadProfileSettingsForUser(authUser);
    setProfileSettings(loadedProfile);
    const profileRepeatMode = loadedProfile?.mcRepeatMode;
    if (Object.values(MULTI_CHOICE_REPEAT_MODES).includes(profileRepeatMode)) {
      setMultiChoiceRepeatMode(profileRepeatMode);
      localStorage.setItem(MULTI_CHOICE_REPEAT_MODE_KEY, profileRepeatMode);
    }
    setProfileNameInput(String(loadedProfile?.displayName || resolveDisplayName(authUser, loadedProfile)));
    setProfileNotice('');
  }, [authUser]);

  useEffect(() => {
    refreshQuizDuePool().catch(() => { });
    refreshWisorEcoDuePool().catch(() => { });
    refreshMarketingReviewDuePool().catch(() => { });
    refreshKlrMcDuePool().catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, customQuizQuestions, customMarketingReviewQuestions, multiChoiceRepeatMode]);

  useEffect(() => {
    if (!authUser?.id) return;

    flushPendingMemberSync();
    pullProgressFromSupabase();
    const interval = setInterval(() => {
      flushPendingMemberSync();
      pullProgressFromSupabase();
    }, 20000);

    const handleOnline = () => {
      flushPendingMemberSync();
      pullProgressFromSupabase();
    };

    const handleExternalUpdate = () => {
      syncProgressToSupabase();
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        flushPendingMemberSync();
        pullProgressFromSupabase();
      }
    };

    window.addEventListener('ap2_progress_updated', handleExternalUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('ap2_progress_updated', handleExternalUpdate);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
    // syncProgressToSupabase and flushPendingMemberSync are intentionally not deps here:
    // adding them would recreate the interval/listeners on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const syncProgressToSupabaseAction = async () => {
    await syncProgressToSupabase().catch(() => { });
  };

  const pullProgressFromSupabase = async () => {
    if (!authUser?.id) return;
    try {
      await flushPendingMemberSync();

      const { data, error } = await supabase
        .from('user_data')
        .select('progress_data')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (error || !data?.progress_data) return;

      const remote = data.progress_data;
      const remoteWisorRaw = remote[DB_KEY_WISOR_GRUNDLAGEN] || remote[LEGACY_DB_KEY_WISOR];
      const remoteWisor = remoteWisorRaw && typeof remoteWisorRaw === 'object' ? remoteWisorRaw : {};
      const remoteWisorEcoRaw = remote[DB_KEY_WISOR_ECOMMERCE] || remote[LEGACY_DB_KEY_WISOR_ECO];
      const remoteWisorEco = remoteWisorEcoRaw && typeof remoteWisorEcoRaw === 'object' ? remoteWisorEcoRaw : {};
      const remoteMarketing = remote.marketing_review_progress && typeof remote.marketing_review_progress === 'object' ? remote.marketing_review_progress : {};
      const remoteKlrMc = remote[DB_KEY_KLR_MC] && typeof remote[DB_KEY_KLR_MC] === 'object' ? remote[DB_KEY_KLR_MC] : {};
      const remoteAnalytics = remote.learning_analytics && typeof remote.learning_analytics === 'object'
        ? { ...createEmptyAnalytics(), ...remote.learning_analytics }
        : createEmptyAnalytics();
      const remoteCustomQuiz = Array.isArray(remote.custom_quiz_questions) ? remote.custom_quiz_questions : [];
      const remoteCustomMarketingReview = Array.isArray(remote.custom_marketing_review_questions) ? remote.custom_marketing_review_questions : [];
      const remoteProfile = remote.profile_settings && typeof remote.profile_settings === 'object'
        ? remote.profile_settings
        : null;
      const remoteProjectM = remote.project_m_progress && typeof remote.project_m_progress === 'object'
        ? remote.project_m_progress
        : null;
      const remoteKLR = remote.klr_progress && typeof remote.klr_progress === 'object'
        ? remote.klr_progress
        : null;
      const remoteJourneyArchitect = remote.journey_architect_progress && typeof remote.journey_architect_progress === 'object'
        ? remote.journey_architect_progress
        : null;

      localStorage.setItem('ap2_wisor_progress', JSON.stringify(remoteWisor));
      localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify(remoteWisorEco));
      localStorage.setItem('ap2_marketing_review_progress', JSON.stringify(remoteMarketing));
      localStorage.setItem(LOCAL_KEY_KLR_MC, JSON.stringify(remoteKlrMc));
      localStorage.setItem(getAnalyticsStorageKey(authUser), JSON.stringify(remoteAnalytics));
      localStorage.setItem(getCustomQuizStorageKey(authUser), JSON.stringify(remoteCustomQuiz));
      localStorage.setItem(getCustomMarketingReviewStorageKey(authUser), JSON.stringify(remoteCustomMarketingReview));
      if (remoteProjectM) localStorage.setItem('project_m_progress_v1', JSON.stringify(remoteProjectM));
      else localStorage.removeItem('project_m_progress_v1');
      if (remoteKLR) localStorage.setItem('klr_game_progress_v1', JSON.stringify(remoteKLR));
      else localStorage.removeItem('klr_game_progress_v1');
      if (remoteJourneyArchitect) localStorage.setItem('journey_architect_progress_v1', JSON.stringify(remoteJourneyArchitect));
      else localStorage.removeItem('journey_architect_progress_v1');
      if (remoteProfile) {
        localStorage.setItem(getProfileSettingsStorageKey(authUser), JSON.stringify(remoteProfile));
      } else {
        localStorage.removeItem(getProfileSettingsStorageKey(authUser));
      }

      setCompletedWisors(remoteWisor);
      setCompletedWisorsEco(remoteWisorEco);
      setCompletedMarketingReview(remoteMarketing);
      setCompletedKlrMc(remoteKlrMc);
      setLearningAnalytics(remoteAnalytics);
      setCustomQuizQuestions(remoteCustomQuiz);
      setCustomMarketingReviewQuestions(remoteCustomMarketingReview);
      setProfileSettings(remoteProfile);
      const remoteRepeatMode = remoteProfile?.mcRepeatMode;
      if (Object.values(MULTI_CHOICE_REPEAT_MODES).includes(remoteRepeatMode)) {
        setMultiChoiceRepeatMode(remoteRepeatMode);
        localStorage.setItem(MULTI_CHOICE_REPEAT_MODE_KEY, remoteRepeatMode);
      }
      setProfileNameInput(String(remoteProfile?.displayName || resolveDisplayName(authUser, remoteProfile)));

      await refreshQuizDuePool().catch(() => { });
      await refreshWisorEcoDuePool().catch(() => { });
      await refreshMarketingReviewDuePool().catch(() => { });
      await refreshKlrMcDuePool().catch(() => { });
      window.dispatchEvent(new CustomEvent('ap2_progress_synced'));
    } catch (err) {
      console.error('Pull sync failed:', err);
    }
  };


  const startWisor = (mode = 'wisor1') => {
    setActiveWisorMode(mode);
    const rawWisors = mode === 'wisor1' ? [...wisor1.questions] :
      mode === 'wisorEco' ? [...(wisorEco.questions || [])] :
        [...(marketingReview.questions || [])];

    const key = mode === 'wisor1' ? 'ap2_wisor_progress' :
      mode === 'wisorEco' ? 'ap2_wisor_eco_progress' :
        'ap2_marketing_review_progress';

    const wisorProg = JSON.parse(localStorage.getItem(key)) || {};
    const uncompleted = rawWisors.filter(q => !wisorProg[q.id]);
    const shuffled = (mode === 'wisor1' || mode === 'marketing_review') ? [...uncompleted].sort(() => Math.random() - 0.5) : [...uncompleted];

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
    if (e?.stopPropagation) e.stopPropagation();
    setResetTarget(target);
    setResetModalVisible(true);
  };

  const handleResetExecute = () => {
    const clearAnalyticsByMode = (modeName) => {
      setLearningAnalytics(prev => {
        const remainingEvents = prev.events.filter(e => e.mode !== modeName);
        const next = { ...prev, events: remainingEvents, updatedAt: new Date().toISOString() };
        localStorage.setItem(getAnalyticsStorageKey(authUser), JSON.stringify(next));
        return next;
      });
    };

    if (resetTarget === 'wisor') {
      setCompletedWisors({});
      localStorage.removeItem('ap2_wisor_progress');
      clearAnalyticsByMode('wisor');

      if (authUser?.id) {
        syncProgressToSupabase({
          [LEGACY_DB_KEY_WISOR]: {},
          [DB_KEY_WISOR_GRUNDLAGEN]: {}
        }).catch(() => { });
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
      clearAnalyticsByMode('wisorEco');

      if (authUser?.id) {
        clearTaskProgressByType(supabase, authUser.id, 'wisorEco').catch(() => { });
        syncProgressToSupabase({
          [LEGACY_DB_KEY_WISOR_ECO]: {},
          [DB_KEY_WISOR_ECOMMERCE]: {}
        }).catch(() => { });
      }

      refreshWisorEcoDuePool().catch(() => { });

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
      clearAnalyticsByMode('quiz');
      const resetTasks = [];

      if (authUser?.id) {
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'quiz'));
      }

      setResetModalVisible(false);
      setQuizSessionPool([]);

      Promise.allSettled(resetTasks)
        .then(() => refreshQuizDuePool())
        .catch(() => refreshQuizDuePool());

      if (appMode === 'quiz' || appMode === 'quiz_setup') setAppMode('dashboard');
    } else if (resetTarget === 'marketing_review') {
      localStorage.removeItem('ap2_marketing_review_progress');
      setCompletedMarketingReview({});
      clearAnalyticsByMode('marketing_review');
      if (authUser?.id) {
        clearTaskProgressByType(supabase, authUser.id, 'marketing_review').catch(() => { });
        syncProgressToSupabase({ marketing_review_progress: {} }).catch(() => { });
      }
      refreshMarketingReviewDuePool().catch(() => { });
      setMarketingReviewSessionPool([]);
      setResetModalVisible(false);
    } else if (resetTarget === 'klr_mc') {
      localStorage.removeItem(LOCAL_KEY_KLR_MC);
      setCompletedKlrMc({});
      clearAnalyticsByMode('klr_mc');
      if (authUser?.id) {
        clearTaskProgressByType(supabase, authUser.id, 'klr_mc').catch(() => { });
        syncProgressToSupabase({ [DB_KEY_KLR_MC]: {} }).catch(() => { });
      }
      refreshKlrMcDuePool().catch(() => { });
      setKlrMcSessionPool([]);
      setResetModalVisible(false);
    } else if (resetTarget === 'klr') {
      localStorage.removeItem('klr_game_progress_v1');
      clearAnalyticsByMode('klr');
      setResetModalVisible(false);
      window.location.reload();
    } else if (resetTarget === 'kalkulation') {
      localStorage.removeItem('kalk_boss_completed_flawless');
      clearAnalyticsByMode('kalkulation');
      setResetModalVisible(false);
      window.location.reload();
    } else if (resetTarget === 'breakEven') {
      localStorage.removeItem('break_even_completed_flawless');
      clearAnalyticsByMode('breakEven');
      setResetModalVisible(false);
      window.location.reload();
    } else if (resetTarget === 'project_m') {
      localStorage.removeItem('project_m_progress_v1');
      clearAnalyticsByMode('project_m');
      setResetModalVisible(false);
      window.location.reload();
    } else if (resetTarget === 'journey_architect') {
      localStorage.removeItem('journey_architect_progress_v1');
      clearAnalyticsByMode('journey_architect');
      setResetModalVisible(false);
      window.location.reload();
    } else if (resetTarget === 'fullAccount') {
      // Clear progress localStorage (keep custom quiz questions)
      localStorage.removeItem('ap2_srs_progress');
      localStorage.removeItem('ap2_quiz_progress');
      localStorage.removeItem('ap2_wisor_progress');
      localStorage.removeItem('ap2_wisor_eco_progress');
      localStorage.removeItem('ap2_marketing_review_progress');
      localStorage.removeItem(LOCAL_KEY_KLR_MC);
      localStorage.removeItem('ap2_saved_notes');
      localStorage.removeItem('klr_game_progress_v1');
      localStorage.removeItem('project_m_progress_v1');
      localStorage.removeItem('journey_architect_progress_v1');
      localStorage.removeItem(getAnalyticsStorageKey(authUser));

      // Reset progress state (keep customQuizQuestions intact)
      setCompletedWisors({});
      setCompletedWisorsEco({});
      setCompletedMarketingReview({});
      setCompletedKlrMc({});
      setQuizProgressView({});
      setLearningAnalytics(createEmptyAnalytics());
      setStats({ learnedToday: 0, totalDue: 0 });

      // Clear Supabase progress but preserve custom questions
      const resetTasks = [];
      if (authUser?.id) {
        const preservedData = {
          ...createEmptyMemberProgressData(),
          custom_quiz_questions: customQuizQuestions,
          custom_marketing_review_questions: customMarketingReviewQuestions,
          profile_settings: profileSettings
        };
        resetTasks.push(syncProgressToSupabase(preservedData, { queueOnFail: false }));
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'quiz'));
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'marketing_review'));
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'wisorEco'));
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'klr_mc'));
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'kpi_theory'));
      }

      setResetModalVisible(false);
      Promise.allSettled(resetTasks).then(() => {
        window.location.reload();
      });
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
    setLastWisorCorrect(correct);

    appendLearningEvent({
      mode: activeWisorMode === 'wisor1' ? 'wisor' :
        activeWisorMode === 'wisorEco' ? 'wisorEco' : 'marketing_review',
      questionId: q.id,
      questionText: q.question,
      correct,
      userAnswer: wisorInput,
      expectedAnswer: (q.expectedAnswers || []).join(' | ')
    });

    // Pomodoro session logging
    if (pomodoroActive) {
      const questionText = q.question?.substring(0, 100) || q.id || 'WisoR-Frage';
      const topicLabel = activeWisorMode === 'wisor1' ? 'WisoR Grundlagen' :
        activeWisorMode === 'wisorEco' ? 'WisoR E-Commerce' : 'IHK Extras';
      setPomodoroSessionLog(prev => [...prev, { correct, questionText, topic: topicLabel }]);
    }

    if (correct) {
      setWisorScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
      setLastWisorCorrect(true);
      if (currentWisorIndex === allWisors.length - 1) {
        triggerConfetti();
      }

      const updateProg = prev => {
        const next = { ...prev, [q.id]: true };
        const key = activeWisorMode === 'wisor1'
          ? 'ap2_wisor_progress'
          : activeWisorMode === 'wisorEco'
            ? 'ap2_wisor_eco_progress'
            : 'ap2_marketing_review_progress';
        localStorage.setItem(key, JSON.stringify(next));

        if (authUser?.id) {
          if (activeWisorMode === 'wisor1') {
            syncProgressToSupabase({
              [LEGACY_DB_KEY_WISOR]: next,
              [DB_KEY_WISOR_GRUNDLAGEN]: next
            }).catch(() => { });
          } else if (activeWisorMode === 'wisorEco') {
            syncProgressToSupabase({
              [LEGACY_DB_KEY_WISOR_ECO]: next,
              [DB_KEY_WISOR_ECOMMERCE]: next
            }).catch(() => { });
          } else {
            syncProgressToSupabase({ marketing_review_progress: next }).catch(() => { });
          }
        }
        return next;
      };

      if (activeWisorMode === 'wisor1') {
        setCompletedWisors(updateProg);
      } else if (activeWisorMode === 'wisorEco') {
        setCompletedWisorsEco(updateProg);
      } else {
        setCompletedMarketingReview(updateProg);
      }
    } else {
      setWisorScore(s => ({ ...s, total: s.total + 1 }));
      setLastWisorCorrect(false);
    }

    if (authUser?.id) {
      const rating = mapWisorAnswerToRating({ isCorrect: correct, attempt: 1 });
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: activeWisorMode + ":" + q.id,
        rating,
        taskType: activeWisorMode === 'marketing_review' ? 'marketing_review' :
          activeWisorMode === 'wisorEco' ? 'wisorEco' : 'wisor',
        category: activeWisorMode,
        metadata: { source: activeWisorMode, question: q.question }
      }).catch(err => console.error('DSR wisor review failed:', err));
    }
  };

  const nextWisorQuestion = () => {
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

  // Fallback for unknown appMode
  // (Effect defined here — BEFORE any conditional return — to comply with React hooks rules)
  useEffect(() => {
    if (appMode && !['intro', 'auth', 'dashboard', 'quiz', 'quiz_setup', 'marketing_review_setup', 'marketing_review_quiz', 'marketing_review_result', 'wisor', 'wisor_eco_setup', 'wisor_eco_quiz', 'klr_mc_setup', 'klr_mc', 'rechen_tasks_setup', 'kpi_next_level', 'klr', 'kalkulation', 'break_even', 'ecommerce_kalkulation', 'nutzwertanalyse', 'swot_analyse', 'project_m', 'journey_architect', 'notes_manager', 'learning_dashboard', 'appearance_settings', 'flashcards'].includes(appMode)) {
      setAppMode('dashboard');
    }
  }, [appMode]);

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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Browser merken (automatisch anmelden)
            </label>
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
          // Quiz index is managed inside QuizSession now — just navigate back
          setAppMode('dashboard');
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
  const allQuizQuestions = [
    ...(wissenTesten.questions || []),
    ...(customQuizQuestions || []).filter(q => !isRechenTask(q))
  ];
  const quizProg = quizProgressView || {};
  const nowTs = Date.now();

  const calculateLearnedCount = (questionsArray) => questionsArray.reduce((count, question) => {
    const questionId = question.id || generateId(question.question);
    const progress = quizProg[questionId];
    if (!progress) return count;
    return count + (isMasteryLearned(progress) ? 1 : 0);
  }, 0);

  const quizLearnedCount = calculateLearnedCount(allQuizQuestions);
  const wisorQuestions = wisor1.questions || [];
  const wisorEcoQuestions = wisorEco.questions || [];
  const rechenTasks = getRechenTasks(customQuizQuestions);
  const rechenTotal = rechenTasks.length;
  const rechenLearned = calculateLearnedCount(rechenTasks);

  const globalStats = {
    quizTotal: allQuizQuestions.length,
    quizLearned: Math.min(quizLearnedCount, allQuizQuestions.length),
    wisorTotal: wisorQuestions.length,
    wisorLearned: Object.keys(completedWisors).length,
    wisorEcoTotal: wisorEcoQuestions.length,
    wisorEcoLearned: Math.max(0, wisorEcoQuestions.length - wisorEcoDuePool.length),
    reviewTotal: allMarketingReviewQuestions.length,
    reviewLearned: Math.max(0, allMarketingReviewQuestions.length - marketingReviewDuePool.length),
    rechenTotal,
    rechenLearned
  };

  const burgerMenuPortal = createPortal(
    <>
      <BurgerMenu
        authUser={authUser}
        handleLogout={handleLogout}
        stats={globalStats}
        isLightMode={isLightMode}
        themePreference={themePreference}
        setThemePref={setThemePref}
        onOpenQuestionManager={(cat) => setQuestionManagerCategory(cat)}
        onOpenLearningDashboard={() => setAppMode('learning_dashboard')}
        onStartPomodoro={() => { setPomodoroActive(true); setPomodoroSessionLog([]); }}
        pomodoroRunning={pomodoroActive}
        pomodoroTimeLeft={pomodoroTimeLeft}
        onStopPomodoro={() => setPomodoroForceStop(Date.now())}
        onOpenAppearanceSettings={() => { if (authUser) setAppMode('appearance_settings'); }}
        profileSettings={profileSettings}
      />
      {questionManagerCategory && (
        <QuestionManager
          category={questionManagerCategory}
          questions={
            questionManagerCategory === 'quiz' ? allQuizQuestions :
              questionManagerCategory === 'wisor' ? wisorQuestions :
                questionManagerCategory === 'wisorEco' ? wisorEcoQuestions :
                  questionManagerCategory === 'marketing_review' ? allMarketingReviewQuestions : rechenTasks
          }
          authUser={authUser}
          progress={
            questionManagerCategory === 'quiz' || questionManagerCategory === 'rechen' ? quizProg :
              questionManagerCategory === 'wisor' ? completedWisors :
                questionManagerCategory === 'wisorEco' ? completedWisorsEco : completedMarketingReview
          }
          formatLatex={formatLatex}
          onClose={() => setQuestionManagerCategory(null)}
          onAddCustomQuizQuestion={handleAddCustomQuizQuestion}
          onProgressUpdate={(cat, updatedProgress) => {
            if (cat === 'quiz' || cat === 'rechen') refreshQuizDuePool().catch(() => { });
            else if (cat === 'wisor') setCompletedWisors(updatedProgress);
            else if (cat === 'wisorEco') setCompletedWisorsEco(updatedProgress);
            else if (cat === 'marketing_review') setCompletedMarketingReview(updatedProgress);
          }}
        />
      )}
    </>,
    document.body
  );

  if (appMode === 'intro') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, backgroundColor: '#000' }}>
        <video
          ref={introVideoRef}
          key={window.innerWidth <= 768 ? 'intro-mobile-v2' : 'intro-desktop-v2'}
          src={window.innerWidth <= 768 ? "/intromobile.mp4" : "/intro.mp4"}
          autoPlay={introStarted}
          muted={introMuted}
          playsInline
          preload="auto"
          onEnded={() => setAppMode('dashboard')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {!introStarted && (
          <button
            onClick={async () => {
              const video = introVideoRef.current;
              setIntroMuted(false);
              setIntroStarted(true);
              if (!video) return;
              video.muted = false;
              video.volume = 1;
              try {
                await video.play();
              } catch {
                video.muted = true;
                setIntroMuted(true);
                try {
                  await video.play();
                } catch {
                  // Browser/device blocks playback entirely.
                }
              }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.24)',
              border: 'none',
              color: '#fff',
              zIndex: 10000,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center'
            }}
          >
            <span style={{ background: 'rgba(0,0,0,0.58)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: '12px', padding: '0.75rem 1rem', backdropFilter: 'blur(4px)', fontWeight: 700 }}>
              Tippen zum Starten
            </span>
          </button>
        )}
        <button
          onClick={() => {
            setIntroMuted((prev) => {
              const nextMuted = !prev;
              const video = introVideoRef.current;
              if (video) {
                video.muted = nextMuted;
                video.volume = 1;
                if (!nextMuted) {
                  video.play().catch(() => { });
                }
              }
              return nextMuted;
            });
          }}
          disabled={!introStarted}
          title={introMuted ? 'Ton einschalten' : 'Ton ausschalten'}
          aria-label={introMuted ? 'Ton einschalten' : 'Ton ausschalten'}
          style={{
            position: 'absolute',
            right: '20px',
            bottom: '20px',
            width: '52px',
            height: '52px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0,0,0,0.52)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.24)',
            borderRadius: '999px',
            cursor: introStarted ? 'pointer' : 'not-allowed',
            opacity: introStarted ? 1 : 0.55,
            zIndex: 10000,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
        >
          {introMuted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          )}
        </button>
        {introStarted && (
          <button
            onClick={() => setAppMode('dashboard')}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10000, backdropFilter: 'blur(4px)', fontFamily: 'inherit' }}
          >
            Überspringen
          </button>
        )}
      </div>
    );
  }

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
            <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '0px', fontSize: '3.5rem', transform: 'scaleY(1.2)', transformOrigin: 'bottom', margin: '0 0 0 0', color: 'var(--text-light)', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>ECOM 📚 APP</h1>
          </div>
          <p className="subtitle" style={{ marginTop: '0.8rem' }}>Wähle deinen Lernmodus</p>
        </header>
        <div className="dashboard-grid">
          <div id="card-learning-suite" className="dash-card dash-card-wide">
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <img src="/EinsteinOrange.webp" alt="IHK Lernwelt" style={{ width: '1.05em', height: '1.05em', objectFit: 'contain' }} />
            </div>
            <h2>E-Commerce 2026</h2>
            <p>Trainiere dein Wissen</p>
            <div style={{ display: 'grid', gap: '0.55rem', width: '100%', marginTop: '0.4rem' }}>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('quiz_setup')}>
                Wissen testen ({quizDuePool.length} fällig)
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('project_m')}>
                Projekt M Mastery (XP: {pmProgress?.xp || 0})
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('journey_architect')}>
                Journey Architect (XP: {jaProgress?.xp || 0})
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('wisor_eco_setup')}>
                WiSoR ({wisorEcoDuePool.length} offen)
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('marketing_review_setup')}>
                IHK Extras ({marketingReviewDuePool.length} offen)
              </button>
            </div>
          </div>

          <div id="card-calculation-suite" className="dash-card rechen-card dash-card-wide">
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <img src="/EinsteinRot.webp" alt="Rechenwelt" style={{ width: '1.05em', height: '1.05em', objectFit: 'contain' }} />
            </div>
            <h2>Zahlen</h2>
            <p>KPI's, Break Even, Handelskalkulation, KLR & E-Commerce Kalkulation</p>
            <div style={{ display: 'grid', gap: '0.55rem', width: '100%', marginTop: '0.4rem' }}>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('klr_mc_setup')}>
                KLR MC ({getDueKlrMcByTopic('all').length} fällig)
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('rechen_tasks_setup')}>
                KPI's ({Math.max(0, rechenTotal - rechenLearned)} fällig)
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('kalkulation')}>
                Kalkulations-Boss
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%' }}
                onClick={(event) => {
                  event.preventDefault();
                  setAppMode('cost_calc_module');
                }}
              >
                Kostenrechnung & Preisuntergrenze
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('break_even')}>
                Break Even Point
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('klr')}>
                KLR Startup Survival (XP: {klrProgress?.xp || 0})
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('ecommerce_kalkulation')}>
                E-Commerce Kalkulation
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('nutzwertanalyse')}>
                Nutzwertanalyse
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAppMode('swot_analyse')}>
                SWOT-Analyse
              </button>
            </div>
          </div>

          <div id="card-notes" className="dash-card" onClick={() => { setAppMode('notes_manager'); }}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <img src="/einstein.webp" alt="Meine Notizen" style={{ width: '1.05em', height: '1.05em', objectFit: 'contain' }} />
            </div>
            <h2>Meine Notizen</h2>
            <p>Deine gespeicherten Notizen ansehen und als PDF exportieren.</p>
            <div className="chip" style={{ marginTop: 'auto' }}>Gespeichert</div>
          </div>

          {/* VIP Bereich: Stadt Land Fluss Multiplayer */}
          <div id="card-vip" className="dash-card" onClick={() => setIsSLFOpen(true)}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <img src="/EinsteinGold.webp" alt="VIP Bereich" style={{ width: '1.05em', height: '1.05em', objectFit: 'contain' }} />
            </div>
            <h2>VIP Bereich</h2>
            <p>Exklusive Zusatzfunktionen für MasterPat Premium Mitglieder.</p>
            <div className="chip" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>PRO</div>
          </div>

        </div>

        <ResetModal
          isOpen={resetModalVisible}
          onClose={() => setResetModalVisible(false)}
          onConfirm={handleResetExecute}
        />

        <SLFModal
          isOpen={isSLFOpen}
          onClose={() => setIsSLFOpen(false)}
          authUser={authUser}
          profileSettings={profileSettings}
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
          <p className="subtitle" style={{ marginTop: '0.5rem' }}>Profil und Darstellung im Hauptmenü anpassen.</p>
        </header>

        <section className="appearance-panel" style={{ width: '100%', maxWidth: '760px' }}>
          <div style={{ marginBottom: '1.3rem', padding: '0.9rem', border: '1px solid var(--glass-border)', borderRadius: '14px', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.7rem', color: 'var(--text-light)' }}>Profil</h3>
            <p style={{ margin: 0, marginBottom: '0.8rem', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              Dieser Name wird z. B. in der SLF-Multiplayer-Lobby angezeigt.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '0.8rem', alignItems: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profileSettings?.avatarDataUrl ? (
                  <img src={profileSettings.avatarDataUrl} alt="Profilbild" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-light)' }}>
                    {resolveDisplayName(authUser, profileSettings).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="Dein Anzeigename"
                  style={{
                    padding: '0.62rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-light)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" type="button" onClick={handleSaveProfileName}>Namen speichern</button>
                  <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                    Bild wählen
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      style={{ display: 'none' }}
                      onChange={(e) => handleProfileImageUpload(e.target.files?.[0])}
                    />
                  </label>
                  {profileSettings?.avatarDataUrl ? (
                    <button className="btn-secondary" type="button" onClick={handleRemoveProfileImage}>Bild entfernen</button>
                  ) : null}
                </div>
              </div>
            </div>
            {profileNotice ? (
              <p style={{ marginTop: '0.65rem', marginBottom: 0, color: profileNotice.includes('Bitte') || profileNotice.includes('konnte') || profileNotice.includes('groß') || profileNotice.includes('gro') ? 'var(--error)' : 'var(--success)', fontSize: '0.84rem' }}>
                {profileNotice}
              </p>
            ) : null}
          </div>

          <details
            open={appearancePanelOpen}
            onToggle={(e) => setAppearancePanelOpen(e.currentTarget.open)}
            style={{ marginBottom: '1.3rem', border: '1px solid var(--glass-border)', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}
          >
            <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-light)', fontWeight: 700 }}>
              Darstellungsstil
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{appearancePanelOpen ? '− zuklappen' : '+ aufklappen'}</span>
            </summary>
            <div style={{ padding: '0.2rem 1rem 1rem 1rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--text-light)' }}>Multi-Choice Wiederholrate</h3>
              <p style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                Diese Einstellung gilt global fuer Wissen testen, IHK Extras und KPI-Theoriefragen.
              </p>
              <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.1rem' }}>
                {[
                  { value: MULTI_CHOICE_REPEAT_MODES.ONCE, label: '1x richtig: Frage faellt sofort raus' },
                  { value: MULTI_CHOICE_REPEAT_MODES.TWICE, label: '2x richtig: Frage wird einmal wiederholt' },
                  { value: MULTI_CHOICE_REPEAT_MODES.SPACED, label: 'Space Repetition: Wiederholung zeitversetzt' }
                ].map((option) => (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-light)', fontSize: '0.9rem', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.55rem 0.65rem', background: 'rgba(255,255,255,0.03)' }}>
                    <input
                      type="radio"
                      name="multi-choice-repeat-mode"
                      checked={multiChoiceRepeatMode === option.value}
                      onChange={() => handleMultiChoiceRepeatModeChange(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

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
              <p style={{ marginTop: '0.45rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Empfehlung: max. 2.5 MB, Querformat für bestes Ergebnis.</p>
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
            </div>
          </details>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--error, #ef4444)' }}>Gesamten Fortschritt zurücksetzen</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              Setzt deinen kompletten Lernfortschritt auf Null zurück: Quiz, WisoR, Karteikarten, Statistiken und Notizen.
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

  const startRechenTasks = (count, topic) => {
    let filtered = getRechenTasks(customQuizQuestions);
    if (topic && topic !== 'Alle') {
      filtered = filtered.filter(q => categorizeRechenTask(q) === topic);
    }

    const quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
    const prepared = buildPreparedQuizzes(filtered, quizProg);
    const now = Date.now();

    // If "Alle fälligen", only take due ones
    let pool;
    if (count === 'All') {
      pool = filterDueQuizzes(prepared, quizProg, now, multiChoiceRepeatModeRef.current);
    } else {
      // Prioritize due questions, then fill with unlearned/ready
      const due = filterDueQuizzes(prepared, quizProg, now, multiChoiceRepeatModeRef.current);
      const remaining = prepared.filter(p => !due.some(d => d.id === p.id));
      pool = [...due, ...remaining.sort(() => Math.random() - 0.5)].slice(0, parseInt(count));
    }

    if (pool.length === 0) {
      alert('Keine fälligen Aufgaben für dieses Thema gefunden.');
      return;
    }

    setQuizSessionPool(pool);
    setQuizSessionRepeatMode(multiChoiceRepeatModeRef.current);
    setAppMode('quiz');
  };

  if (appMode === 'rechen_tasks_setup') {
    const calcTasks = getRechenTasks(customQuizQuestions);
    const topics = ['Alle', 'KPI', 'Handelskalkulation', 'Conversion', 'ROAS', 'Allgemein'];

    const now = Date.now();
    const preparedAll = buildPreparedQuizzes(calcTasks, quizProg);
    filterDueQuizzes(preparedAll, quizProg, now, multiChoiceRepeatMode);

    const getTopicStats = (t) => {
      const topicTasks = t === 'Alle' ? calcTasks : calcTasks.filter(q => categorizeRechenTask(q) === t);
      const topicPrepared = buildPreparedQuizzes(topicTasks, quizProg);
      const topicDue = filterDueQuizzes(topicPrepared, quizProg, now, multiChoiceRepeatMode);
      return { total: topicTasks.length, due: topicDue.length };
    };

    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <header>
          <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
        </header>
        <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '2rem' }}>Wieviele Fragen?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Wähle ein Rechen-Thema und dann die Anzahl der Fragen für dein Training.</p>

          <div style={{ marginBottom: '1.3rem', textAlign: 'left' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>
              Themenblock
            </label>
            <select
              value={rechenSetup.topic}
              onChange={(e) => setRechenSetup(prev => ({ ...prev, topic: e.target.value }))}
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
              {topics.map(t => {
                const stats = getTopicStats(t);
                return (
                  <option key={t} value={t}>
                    {t} ({stats.due} fällig / {stats.total} gesamt)
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ marginBottom: '1.3rem', textAlign: 'left' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>
              Wiederholrate (Multiple Choice)
            </label>
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {[
                { value: MULTI_CHOICE_REPEAT_MODES.ONCE, label: '1x richtig: Frage faellt raus' },
                { value: MULTI_CHOICE_REPEAT_MODES.TWICE, label: '2x richtig: einmal wiederholen' },
                { value: MULTI_CHOICE_REPEAT_MODES.SPACED, label: 'Space Repetition (zeitversetzt)' }
              ].map((option) => (
                <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-light)', fontSize: '0.88rem', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.03)' }}>
                  <input
                    type="radio"
                    name="kpi-setup-repeat-mode"
                    checked={multiChoiceRepeatMode === option.value}
                    onChange={() => handleMultiChoiceRepeatModeChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => startRechenTasks(10, rechenSetup.topic)}>10 Aufgaben</button>
            <button className="btn-secondary" onClick={() => startRechenTasks(20, rechenSetup.topic)}>20 Aufgaben</button>
            <button className="btn-secondary" onClick={() => startRechenTasks(50, rechenSetup.topic)}>50 Aufgaben</button>
            <button className="btn-primary" onClick={() => startRechenTasks('All', rechenSetup.topic)}>
              {getTopicStats(rechenSetup.topic).due} fällige starten
            </button>
            <button
              className="btn-secondary"
              style={{ gridColumn: '1 / -1', borderColor: 'rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.12)', color: '#bbf7d0' }}
              onClick={() => setAppMode('kpi_next_level')}
            >
              Next Level: Online-Marketing Modul starten
            </button>
          </div>

          <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Inklusive Video-Vorschlägen & KI-Assistent
          </p>
        </div>
        <FloatingPortal
          questionId="rechen_tasks_setup"
          questionText="KPI Setup"
          currentAppMode="rechen_tasks_setup"
        />
      </div>
    );
  }

  if (appMode === 'klr') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <React.Suspense fallback={<div className="loading-overlay">Lade KLR...</div>}>
          <KLRGameHub onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
        </React.Suspense>
      </div>
    );
  }

  if (appMode === 'project_m') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <React.Suspense fallback={<div className="loading-overlay">Lade Projekt m...</div>}>
          <ProjectMGame onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
        </React.Suspense>
      </div>
    );
  }

  if (appMode === 'journey_architect') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <React.Suspense fallback={<div className="loading-overlay">Lade Journey Architect...</div>}>
          <JourneyArchitectGame onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
        </React.Suspense>
      </div>
    );
  }

  if (appMode === 'kalkulation') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <React.Suspense fallback={<div className="loading-overlay">Lade Kalkulation...</div>}>
          <KalkulationsBoss onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
        </React.Suspense>
      </>
    );
  }

  if (appMode === 'cost_calc_module') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <CostCalcBossModuleView onBack={() => setAppMode('dashboard')} />
      </>
    );
  }

  if (appMode === 'kpi_next_level') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade KPI Next Level...</div>}>
        <OnlineMarketingKpiNextLevel
          onBack={() => setAppMode('rechen_tasks_setup')}
          burgerMenuPortal={burgerMenuPortal}
          multiChoiceRepeatMode={multiChoiceRepeatMode}
          onTheoryAnswer={handleKpiTheoryAnswerUpdate}
          loadDueTheoryQuestions={loadDueKpiTheoryQuestions}
        />
      </React.Suspense>
    );
  }

  if (appMode === 'break_even') {
    return (
      <div className="app-container" style={{ zIndex: 10 }}>
        {pomodoroPortal}
        {burgerMenuPortal}
        <React.Suspense fallback={<div className="loading-overlay">Lade Break-Even...</div>}>
          <BreakEvenPoint onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
        </React.Suspense>
      </div>
    );
  }

  if (appMode === 'ecommerce_kalkulation') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <ECommerceKalkulation onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
      </>
    );
  }

  if (appMode === 'nutzwertanalyse') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <NutzwertanalyseSimulator onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
        <FloatingPortal
          questionId="nutzwertanalyse"
          questionText="Nutzwertanalyse"
          currentAppMode="nutzwertanalyse"
        />
      </>
    );
  }

  if (appMode === 'swot_analyse') {
    return (
      <>
        {pomodoroPortal}
        {burgerMenuPortal}
        <SWOTAnalyseSimulator onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
      </>
    );
  }

  if (appMode === 'notes_manager') {
    return (
      <React.Suspense fallback={<div className="app-container" style={{ zIndex: 10 }}>Lädt Notizen...</div>}>
        <NotesView
          authUser={authUser}
          setAppMode={setAppMode}
          syncProgressToSupabase={syncProgressToSupabase}
          burgerMenuPortal={burgerMenuPortal}
        />
      </React.Suspense>
    );
  }

  if (appMode === 'learning_dashboard') {
    return (
      <React.Suspense fallback={<div className="app-container" style={{ zIndex: 10 }}>Dashboard lädt...</div>}>
        <LearningDashboard
          authUser={authUser}
          setAppMode={setAppMode}
          learningAnalytics={learningAnalytics}
          refreshMistakeAnalysis={refreshMistakeAnalysis}
          onResetLearningProgress={() => openResetModal(null, 'fullAccount')}
          dashboardAiTopics={dashboardAiTopics}
          dashboardAiLoading={dashboardAiLoading}
          calcAiInsights={calcAiInsights}
          calcAiLoading={calcAiLoading}
          einsteinTilt={einsteinTilt}
          einsteinRef={einsteinRef}
          burgerMenuPortal={burgerMenuPortal}
          customQuizQuestions={customQuizQuestions}
        />
        <ResetModal
          isOpen={resetModalVisible}
          onClose={() => setResetModalVisible(false)}
          onConfirm={handleResetExecute}
          title="Lernstand wirklich löschen?"
          description="Dein kompletter Lernstand und die Analyse werden zurückgesetzt. Löse die Aufgabe, um fortzufahren:"
        />
      </React.Suspense>
    );
  }

  if (appMode === 'quiz_setup') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade Themenauswahl...</div>}>
        <QuizSetup
          selectedQuizTopic={selectedQuizTopic}
          setSelectedQuizTopic={setSelectedQuizTopic}
          getDueQuizzesByTopic={getDueQuizzesByTopic}
          getQuizTopicGroup={getQuizTopicGroup}
          multiChoiceRepeatMode={multiChoiceRepeatMode}
          onMultiChoiceRepeatModeChange={handleMultiChoiceRepeatModeChange}
          feynmanModeEnabled={feynmanModeEnabled}
          setFeynmanModeEnabled={setFeynmanModeEnabled}
          quizCountSelection={quizCountSelection}
          setQuizCountSelection={setQuizCountSelection}
          startQuiz={() => startQuizSession(quizCountSelection, selectedQuizTopic)}
          setAppMode={setAppMode}
          burgerMenuPortal={burgerMenuPortal}
        />
      </React.Suspense>
    );
  }

  if (appMode === 'klr_mc_setup') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade KLR MC...</div>}>
        <>
          <QuizSetup
            selectedQuizTopic={'all'}
            setSelectedQuizTopic={() => { }}
            getDueQuizzesByTopic={getDueKlrMcByTopic}
            getQuizTopicGroup={getQuizTopicGroup}
            multiChoiceRepeatMode={multiChoiceRepeatMode}
            onMultiChoiceRepeatModeChange={handleMultiChoiceRepeatModeChange}
            feynmanModeEnabled={feynmanModeEnabled}
            setFeynmanModeEnabled={setFeynmanModeEnabled}
            quizCountSelection={klrMcQuizCountSelection}
            setQuizCountSelection={setKlrMcCountSelection}
            startQuiz={() => startKlrMcSession(klrMcQuizCountSelection, 'all')}
            setAppMode={setAppMode}
            burgerMenuPortal={burgerMenuPortal}
            title="Wieviele Fragen?"
            description="Wähle die Anzahl fälliger Fragen im KLR MC und starte den Durchgang."
            showTopicSelect={false}
            backMode="dashboard"
            showResetProgressButton
            onResetProgress={() => openResetModal(null, 'klr_mc')}
          />
          <ResetModal
            isOpen={resetModalVisible}
            onClose={() => setResetModalVisible(false)}
            onConfirm={handleResetExecute}
            title="KLR-MC-Lernstand zurücksetzen?"
            description="Dein Fortschritt im KLR MC wird gelöscht. Löse die Rechenaufgabe zur Bestätigung:"
          />
        </>
      </React.Suspense>
    );
  }

  if (appMode === 'marketing_review_setup') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade IHK Extras...</div>}>
        <>
          <QuizSetup
            selectedQuizTopic={'all'}
            setSelectedQuizTopic={() => { }}
            getDueQuizzesByTopic={getDueMarketingReviewByTopic}
            getQuizTopicGroup={getQuizTopicGroup}
            multiChoiceRepeatMode={multiChoiceRepeatMode}
            onMultiChoiceRepeatModeChange={handleMultiChoiceRepeatModeChange}
            feynmanModeEnabled={feynmanModeEnabled}
            setFeynmanModeEnabled={setFeynmanModeEnabled}
            quizCountSelection={marketingReviewCountSelection}
            setQuizCountSelection={setMarketingReviewCountSelection}
            startQuiz={() => startMarketingReviewSession(marketingReviewCountSelection, 'all')}
            setAppMode={setAppMode}
            burgerMenuPortal={burgerMenuPortal}
            title="Wieviele Fragen?"
            description="Wähle die Anzahl fälliger Fragen in „IHK Extras“ und starte den Durchgang."
            showTopicSelect={false}
            backMode="dashboard"
            showResetProgressButton
            onResetProgress={() => openResetModal(null, 'marketing_review')}
          />
          <ResetModal
            isOpen={resetModalVisible}
            onClose={() => setResetModalVisible(false)}
            onConfirm={handleResetExecute}
            title="IHK-Extras-Lernstand zurücksetzen?"
            description="Dein Fortschritt in „IHK Extras“ wird gelöscht. Löse die Rechenaufgabe zur Bestätigung:"
          />
        </>
      </React.Suspense>
    );
  }

  if (appMode === 'wisor_eco_setup') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade WiSoR...</div>}>
        <>
          <QuizSetup
            selectedQuizTopic={'all'}
            setSelectedQuizTopic={() => { }}
            getDueQuizzesByTopic={getDueWisorEcoByTopic}
            getQuizTopicGroup={getQuizTopicGroup}
            feynmanModeEnabled={feynmanModeEnabled}
            setFeynmanModeEnabled={setFeynmanModeEnabled}
            quizCountSelection={wisorEcoCountSelection}
            setQuizCountSelection={setWisorEcoCountSelection}
            startQuiz={() => startWisorEcoSession(wisorEcoCountSelection, 'all')}
            setAppMode={setAppMode}
            burgerMenuPortal={burgerMenuPortal}
            title="Wieviele Fragen?"
            description="Wähle die Anzahl fälliger Fragen in WiSoR E-Commerce und starte den Durchgang. Korrekt gelöste Fragen werden sofort aus dem aktiven Topf entfernt."
            showTopicSelect={false}
            backMode="dashboard"
            showResetProgressButton
            onResetProgress={() => openResetModal(null, 'wisorEco')}
          />
          <ResetModal
            isOpen={resetModalVisible}
            onClose={() => setResetModalVisible(false)}
            onConfirm={handleResetExecute}
            title="WiSoR-Lernstand zurücksetzen?"
            description="Dein Fortschritt in WiSoR E-Commerce wird gelöscht. Löse die Rechenaufgabe zur Bestätigung:"
          />
        </>
      </React.Suspense>
    );
  }

  if (appMode === 'marketing_review_result') {
    const weakTopic = getWeakTopicLabel(marketingReviewResult);
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade Ergebnis...</div>}>
        <ResultSummary
          title="IHK Extras - Ergebnis"
          summary={marketingReviewResult}
          weakTopic={weakTopic}
          onPracticeWeakTopic={openPracticeByTopic}
          onBack={() => {
            setMarketingReviewResult(null);
            setAppMode('dashboard');
          }}
          onRetry={() => startMarketingReviewSession(marketingReviewCountSelection, 'all')}
        />
      </React.Suspense>
    );
  }

  if (appMode === 'quiz') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade Quiz...</div>}>
        <QuizErrorBoundary onReset={() => setAppMode('quiz_setup')}>
          <QuizSession
            quizDuePool={quizDuePool}
            initialSessionPool={quizSessionPool}
            dbRemainingCount={quizDuePool.length}
            onComplete={() => {
              refreshQuizDuePool();
              setAppMode('quiz_setup');
            }}
            onCancel={() => {
              refreshQuizDuePool();
              setAppMode('dashboard');
            }}
            feynmanModeEnabled={feynmanModeEnabled}
            onLearningEvent={appendLearningEvent}
            onQuizAnswer={(q, isCorrect) => handleQuizAnswerUpdate(q, isCorrect, quizSessionRepeatMode)}
            handleGeminiAsk={handleGeminiAsk}
            geminiResponse={geminiResponse}
            geminiLoading={geminiLoading}
            setGeminiQuery={setGeminiQuery}
            geminiQuery={geminiQuery}
            setGeminiVisible={setGeminiVisible}
            geminiVisible={geminiVisible}
            pomodoroPortal={pomodoroPortal}
            burgerMenuPortal={burgerMenuPortal}
            handleToggleVideos={handleToggleVideos}
            wisorVideoOpen={wisorVideoOpen}
            setWisorVideoOpen={setWisorVideoOpen}
            wisorVideoLoading={wisorVideoLoading}
            wisorVideos={wisorVideos}
            wisorVideoError={wisorVideoError}
            selectedWisorVideo={selectedWisorVideo}
            setSelectedWisorVideo={setSelectedWisorVideo}
            showConfetti={showConfetti}
            triggerConfetti={() => triggerConfetti()}
            lastQuizCorrect={lastQuizCorrect}
            setAppMode={setAppMode}
            handleFeynmanCheck={handleFeynmanCheck}
            learningMode="quiz"
            setupMode="quiz_setup"
          />
        </QuizErrorBoundary>
      </React.Suspense>
    );
  }

  if (appMode === 'marketing_review_quiz') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade IHK Extras...</div>}>
        <QuizErrorBoundary onReset={() => setAppMode('marketing_review_setup')}>
          <QuizSession
            quizDuePool={getDueMarketingReviewByTopic('all')}
            initialSessionPool={marketingReviewSessionPool}
            dbRemainingCount={getDueMarketingReviewByTopic('all').length}
            onComplete={() => {
              setMarketingReviewSessionPool([]);
              setAppMode('marketing_review_setup');
            }}
            onFinish={(summary) => {
              setMarketingReviewSessionPool([]);
              setMarketingReviewResult(summary);
              setAppMode('marketing_review_result');
            }}
            onCancel={() => {
              setMarketingReviewSessionPool([]);
              setAppMode('dashboard');
            }}
            feynmanModeEnabled={feynmanModeEnabled}
            onLearningEvent={appendLearningEvent}
            onQuizAnswer={(q, isCorrect) => handleMarketingReviewAnswerUpdate(q, isCorrect, marketingReviewSessionRepeatMode)}
            handleGeminiAsk={handleGeminiAsk}
            geminiResponse={geminiResponse}
            geminiLoading={geminiLoading}
            setGeminiQuery={setGeminiQuery}
            geminiQuery={geminiQuery}
            setGeminiVisible={setGeminiVisible}
            geminiVisible={geminiVisible}
            pomodoroPortal={pomodoroPortal}
            burgerMenuPortal={burgerMenuPortal}
            handleToggleVideos={handleToggleVideos}
            wisorVideoOpen={wisorVideoOpen}
            setWisorVideoOpen={setWisorVideoOpen}
            wisorVideoLoading={wisorVideoLoading}
            wisorVideos={wisorVideos}
            wisorVideoError={wisorVideoError}
            selectedWisorVideo={selectedWisorVideo}
            setSelectedWisorVideo={setSelectedWisorVideo}
            showConfetti={showConfetti}
            triggerConfetti={() => triggerConfetti()}
            lastQuizCorrect={lastQuizCorrect}
            setAppMode={setAppMode}
            handleFeynmanCheck={handleFeynmanCheck}
            learningMode="marketing_review"
            setupMode="marketing_review_setup"
          />
        </QuizErrorBoundary>
      </React.Suspense>
    );
  }

  if (appMode === 'wisor_eco_quiz') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade WiSoR...</div>}>
        <QuizErrorBoundary onReset={() => setAppMode('wisor_eco_setup')}>
          <QuizSession
            quizDuePool={getDueWisorEcoByTopic('all')}
            initialSessionPool={wisorEcoSessionPool}
            dbRemainingCount={getDueWisorEcoByTopic('all').length}
            onComplete={() => {
              setWisorEcoSessionPool([]);
              setAppMode('wisor_eco_setup');
            }}
            onCancel={() => {
              setWisorEcoSessionPool([]);
              setAppMode('dashboard');
            }}
            feynmanModeEnabled={feynmanModeEnabled}
            onLearningEvent={appendLearningEvent}
            onQuizAnswer={(q, isCorrect) => handleWisorEcoAnswerUpdate(q, isCorrect, WISOR_ECO_REPEAT_MODE)}
            handleGeminiAsk={handleGeminiAsk}
            geminiResponse={geminiResponse}
            geminiLoading={geminiLoading}
            setGeminiQuery={setGeminiQuery}
            geminiQuery={geminiQuery}
            setGeminiVisible={setGeminiVisible}
            geminiVisible={geminiVisible}
            pomodoroPortal={pomodoroPortal}
            burgerMenuPortal={burgerMenuPortal}
            handleToggleVideos={handleToggleVideos}
            wisorVideoOpen={wisorVideoOpen}
            setWisorVideoOpen={setWisorVideoOpen}
            wisorVideoLoading={wisorVideoLoading}
            wisorVideos={wisorVideos}
            wisorVideoError={wisorVideoError}
            selectedWisorVideo={selectedWisorVideo}
            setSelectedWisorVideo={setSelectedWisorVideo}
            showConfetti={showConfetti}
            triggerConfetti={() => triggerConfetti()}
            lastQuizCorrect={lastQuizCorrect}
            setAppMode={setAppMode}
            handleFeynmanCheck={handleFeynmanCheck}
            learningMode="wisorEco"
            setupMode="wisor_eco_setup"
          />
        </QuizErrorBoundary>
      </React.Suspense>
    );
  }

  if (appMode === 'klr_mc') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade KLR MC...</div>}>
        <QuizErrorBoundary onReset={() => setAppMode('klr_mc_setup')}>
          <QuizSession
            quizDuePool={getDueKlrMcByTopic('all')}
            initialSessionPool={klrMcQuizSessionPool}
            dbRemainingCount={getDueKlrMcByTopic('all').length}
            onComplete={() => {
              setKlrMcSessionPool([]);
              setAppMode('klr_mc_setup');
            }}
            onCancel={() => {
              setKlrMcSessionPool([]);
              setAppMode('dashboard');
            }}
            feynmanModeEnabled={feynmanModeEnabled}
            onLearningEvent={appendLearningEvent}
            onQuizAnswer={(q, isCorrect) => handleKlrMcAnswerUpdate(q, isCorrect, klrMcQuizSessionRepeatMode)}
            handleGeminiAsk={handleGeminiAsk}
            geminiResponse={geminiResponse}
            geminiLoading={geminiLoading}
            setGeminiQuery={setGeminiQuery}
            geminiQuery={geminiQuery}
            setGeminiVisible={setGeminiVisible}
            geminiVisible={geminiVisible}
            pomodoroPortal={pomodoroPortal}
            burgerMenuPortal={burgerMenuPortal}
            handleToggleVideos={handleToggleVideos}
            wisorVideoOpen={wisorVideoOpen}
            setWisorVideoOpen={setWisorVideoOpen}
            wisorVideoLoading={wisorVideoLoading}
            wisorVideos={wisorVideos}
            wisorVideoError={wisorVideoError}
            selectedWisorVideo={selectedWisorVideo}
            setSelectedWisorVideo={setSelectedWisorVideo}
            showConfetti={showConfetti}
            triggerConfetti={() => triggerConfetti()}
            lastQuizCorrect={lastQuizCorrect}
            setAppMode={setAppMode}
            handleFeynmanCheck={handleFeynmanCheck}
            learningMode="klr_mc"
            setupMode="klr_mc_setup"
          />
        </QuizErrorBoundary>
      </React.Suspense>
    );
  }

  if (appMode === 'wisor') {
    return (
      <React.Suspense fallback={<div className="app-container" style={{ zIndex: 10 }}>WisoR lädt...</div>}>
        <WisorSession
          allWisors={allWisors}
          currentWisorIndex={currentWisorIndex}
          wisorScore={wisorScore}
          wisorEvaluated={wisorEvaluated}
          wisorInput={wisorInput}
          setWisorInput={setWisorInput}
          wisorIsCorrect={wisorIsCorrect}
          wisorVideoOpen={wisorVideoOpen}
          wisorVideoLoading={wisorVideoLoading}
          wisorVideos={wisorVideos}
          wisorVideoError={wisorVideoError}
          selectedWisorVideo={selectedWisorVideo}
          setSelectedWisorVideo={setSelectedWisorVideo}
          geminiVisible={geminiVisible}
          setGeminiVisible={setGeminiVisible}
          geminiQuery={geminiQuery}
          setGeminiQuery={setGeminiQuery}
          geminiLoading={geminiLoading}
          geminiResponse={geminiResponse}
          isLightMode={isLightMode}
          activeWisorMode={activeWisorMode}
          completedWisors={completedWisors}
          completedWisorsEco={completedWisorsEco}
          completedMarketingReview={completedMarketingReview}
          wisorEco={wisorEco}
          wisor1={wisor1}
          marketingReview={marketingReview}
          lastWisorCorrect={lastWisorCorrect}
          handleWisorSubmit={handleWisorSubmit}
          nextWisorQuestion={nextWisorQuestion}
          handleToggleVideos={handleToggleVideos}
          handleGeminiAsk={handleGeminiAsk}
          startWisor={startWisor}
          setAppMode={setAppMode}
          burgerMenuPortal={burgerMenuPortal}
          pomodoroPortal={pomodoroPortal}
          wisorInputRef={wisorInputRef}
          navigateWisorUnanswered={navigateWisorUnanswered}
          openResetModal={openResetModal}
          resetModalVisible={resetModalVisible}
          setResetModalVisible={setResetModalVisible}
          handleResetExecute={handleResetExecute}
        />
      </React.Suspense>
    );
  }


  if (appMode === 'flashcards') {
    return (
      <React.Suspense fallback={<div className="loading-spinner">Lade Lernkarten...</div>}>
        <FlashcardSession
          allCards={allCards}
          stats={stats}
          setStats={setStats}
          onBack={() => setAppMode('dashboard')}
          setAppMode={setAppMode}
          appendLearningEvent={appendLearningEvent}
          authUser={authUser}
          supabase={supabase}
          burgerMenuPortal={burgerMenuPortal}
          syncProgressToSupabase={syncProgressToSupabaseAction}
        />
      </React.Suspense>
    );
  }

  // Final safety: if no condition matched, return dashboard
  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      <button className="btn-primary" onClick={() => setAppMode('dashboard')}>Return to Dashboard</button>
    </div>
  );
}

export default App;
