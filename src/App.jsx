import { SLFModal } from './features/stadt-land-fluss';
import React, { useState, useEffect, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { createPortal } from 'react-dom';
import './index.css';
import flashcards1 from './data/flashcards_1.json';
import flashcards2 from './data/flashcards_2.json';
import flashcards3 from './data/flashcards_3.json';

import wissenTesten from './data/wissen_testen.json';
import notesIcon from './assets/book-line-icon.png';

import wisor1 from './data/wisor_1.json';
import wisorEco from './data/wisor_eco.json';
import marketingReview from './data/marketing_review.json';

import { supabase } from './supabaseClient';
import { askGemini, extractFocusTopics, extractCalculationInsights } from './geminiClient';
import { fetchYouTubeVideos } from './youtubeClient';
import FloatingNotes from './components/FloatingNotes';
import FloatingCalculator from './components/FloatingCalculator';
import FloatingPortal from './components/FloatingPortal';
import FloatingImage from './components/FloatingImage';
import BurgerMenu from './components/BurgerMenu';
import QuestionManager from './components/QuestionManager';
import PomodoroTimer from './components/PomodoroTimer';
import KalkulationsBoss from './components/KalkulationsBoss';
import BreakEvenPoint from './components/BreakEvenPoint';
import ResetModal from './components/ResetModal';
import VideoPanel from './components/VideoPanel';
import GeminiPanel from './components/GeminiPanel';
import Confetti from './components/Confetti';
import { KLRGameHub, useKLRGame } from './features/klr';
import { ProjectMGame, useProjectM } from './features/project-m';
import { JourneyArchitectGame, useJourneyArchitect } from './features/journey-architect';
import { mapWisorAnswerToRating } from './services/srsFeedbackMapper';
import { reviewTaskWithDSR, getTaskProgressByType, clearTaskProgressByType } from './services/srsStore';

const LearningDashboard = React.lazy(() => import('./components/LearningDashboard'));
const QuizSession = React.lazy(() => import('./components/QuizSession'));
const WisorSession = React.lazy(() => import('./components/WisorSession'));
const NotesView = React.lazy(() => import('./components/NotesView'));
const QuizSetup = React.lazy(() => import('./components/QuizSetup'));
const FlashcardSession = React.lazy(() => import('./components/FlashcardSession'));


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
import { formatLatex } from './utils/formatting';
import { detectQuizTopic, getQuizTopicGroup } from './utils/quizTopics';
import { computeNextQuizProgress, filterDueQuizzes } from './utils/quizDue';
import { useAuth } from './hooks/useAuth';
import { useAppearance } from './hooks/useAppearance';
import { isRechenTask, categorizeRechenTask, getRechenTasks } from './utils/quizUtils';


function App() {
  const [appMode, setAppMode] = useState(localStorage.getItem('masterpat_auth') === 'true' ? 'intro' : 'auth'); // 'auth', 'dashboard', 'quiz', 'wisor', 'intro'
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
  const [quizProgressView, setQuizProgressView] = useState(() => JSON.parse(localStorage.getItem('ap2_quiz_progress') || '{}'));
  const [selectedQuizTopic, setSelectedQuizTopic] = useState('all');
  const [feynmanModeEnabled, setFeynmanModeEnabled] = useState(false);
  const [lastQuizCorrect] = useState(false);
  const [quizCountSelection, setQuizCountSelection] = useState(10);
  const [marketingReviewSessionPool, setMarketingReviewSessionPool] = useState([]);
  const [marketingReviewCountSelection, setMarketingReviewCountSelection] = useState(10);

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
          topic: m.mode === 'quiz' ? '' : m.mode === 'wisor' ? 'WisoR Grundlagen' : m.mode === 'wisorEco' ? 'WisoR E-Commerce' : m.mode === 'klr' ? 'KLR' : ''
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
  const [wisorVideoLoading, setWisorVideoLoading] = useState(false);
  const [lastWisorCorrect, setLastWisorCorrect] = useState(false);
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
  }, [currentWisorIndex]);

  // formatLatex imported from utils/formatting.js

  const getLocalProgressData = (overrides = {}) => {
    const srsProgress = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
    const wisorProgress = JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {};
    const wisorEcoProgress = JSON.parse(localStorage.getItem('ap2_wisor_eco_progress')) || {};
    const marketingReviewProgress = JSON.parse(localStorage.getItem('ap2_marketing_review_progress')) || {};
    const savedNotes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
    const analytics = loadAnalyticsForUser(authUser);
    const customQuiz = loadCustomQuizForUser(authUser);
    const appearanceRaw = localStorage.getItem(getAppearanceKey(authUser));
    const appearance = appearanceRaw ? JSON.parse(appearanceRaw) : null;
    const theme = localStorage.getItem(getThemeKey(authUser)) || 'dark';
    const klrProgress = JSON.parse(localStorage.getItem('klr_game_progress_v1') || 'null');
    const projectMProgress = JSON.parse(localStorage.getItem('project_m_progress_v1') || 'null');

    return {
      ...srsProgress,
      wisor_progress: wisorProgress,
      wisor_eco_progress: wisorEcoProgress,
      marketing_review_progress: marketingReviewProgress,
      saved_notes: savedNotes,
      learning_analytics: analytics,
      custom_quiz_questions: customQuiz,
      appearance_settings: appearance,
      theme_mode: theme,
      klr_progress: klrProgress,
      project_m_progress: projectMProgress,
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

  const handleQuizAnswerUpdate = async (q, isCorrect) => {
    // 1. Local progress update
    const localProg = JSON.parse(localStorage.getItem('ap2_quiz_progress') || '{}');
    const prevProg = localProg[q.id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
    const nextProg = computeNextQuizProgress(prevProg, isCorrect);
    
    localProg[q.id] = nextProg;
    localStorage.setItem('ap2_quiz_progress', JSON.stringify(localProg));
    setQuizProgressView(localProg);

    // 2. Supabase DSR update
    if (authUser?.id) {
      // Mapping correct answer to a 4 (Good), otherwise 2 (Hard) if incorrect.
      const rating = isCorrect ? 4 : 2; 
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: `quiz:${q.id}`,
        rating,
        taskType: 'quiz',
        category: q.topic,
        metadata: { question: q.question }
      }).catch(err => console.error('DSR quiz review failed:', err));
    }
  };

  const handleMarketingReviewAnswerUpdate = async (q, isCorrect) => {
    if (!q?.id) return;

    if (isCorrect) {
      const localProg = JSON.parse(localStorage.getItem('ap2_marketing_review_progress') || '{}');
      const nextProg = { ...localProg, [q.id]: true };
      localStorage.setItem('ap2_marketing_review_progress', JSON.stringify(nextProg));
      setCompletedMarketingReview(nextProg);

      if (authUser?.id) {
        syncProgressToSupabase({ marketing_review_progress: nextProg }).catch(() => { });
      }
    }

    if (authUser?.id) {
      const rating = isCorrect ? 4 : 2;
      reviewTaskWithDSR({
        supabase,
        userId: authUser.id,
        taskId: `marketing_review:${q.id}`,
        rating,
        taskType: 'marketing_review',
        category: q.topic,
        metadata: { question: q.question }
      }).catch(err => console.error('DSR marketing review failed:', err));
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
        const localProg = quizProg[q.id] || null;

        if (row) {
          const supabaseNextReview = row.due_date ? new Date(row.due_date).getTime() : 0;
          const localNextReview = localProg?.nextReview || 0;
          const localLatestRep = localProg?.rep || 0;

          // Always trust local progress if it shows we answered it (nextReview in future)
          // or if it strictly has a later review date than Supabase. This fixes iOS
          // Safari fetch caching bugs displaying old database states immediately after a session.
          const useLocal = localProg && (localNextReview > supabaseNextReview || localNextReview > now);

          if (useLocal) {
            effectiveProgress[q.id] = {
              rep: Math.max(localLatestRep, row.review_count || 0),
              ef: localProg.ef || 2.5,
              interval: localProg.interval || 0,
              nextReview: localNextReview
            };
          } else {
            effectiveProgress[q.id] = {
              rep: row.review_count || 0,
              ef: q.progress?.ef || 2.5,
              interval: row.scheduled_days || 0,
              nextReview: supabaseNextReview
            };
          }
        } else {
          effectiveProgress[q.id] = localProg || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
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

      await refreshQuizDuePool();

    return { ok: true };
  };

  const getDueQuizzesByTopic = (topic = 'all') => {
    const due = quizDuePool;
    if (topic === 'all') return due;
    return due.filter(q => getQuizTopicGroup(q.topic) === topic);
  };

  const getDueMarketingReviewByTopic = (topic = 'all') => {
    const due = (marketingReview.questions || []).filter(q => !completedMarketingReview[q.id]);
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

  const handleGeminiAsk = async (activeQuestion = null) => {
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

    const response = await askGemini(geminiQuery, q.question, answerInfo);
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
    let sessionQs = [...getDueQuizzesByTopic(topic)].sort(() => Math.random() - 0.5);
    // Guests: max 3 trial questions
    const isGuest = !authUser;
    const effectiveLimit = isGuest ? 3 : limit;
    if (effectiveLimit !== 'all') {
      sessionQs = sessionQs.slice(0, effectiveLimit);
    }

    setQuizSessionPool(sessionQs);
    setAppMode('quiz');
  };

  const startMarketingReviewSession = (limit, topic = 'all') => {
    let sessionQs = [...getDueMarketingReviewByTopic(topic)].sort(() => Math.random() - 0.5);
    const isGuest = !authUser;
    const effectiveLimit = isGuest ? 3 : limit;
    if (effectiveLimit !== 'all') {
      sessionQs = sessionQs.slice(0, effectiveLimit);
    }
    setMarketingReviewSessionPool(sessionQs);
    setAppMode('marketing_review_quiz');
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
            // Removed: localStorage.setItem('ap2_quiz_progress', JSON.stringify({})); // Keep local progress intact as fallback

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
            if (data.progress_data.marketing_review_progress) {
              localStorage.setItem('ap2_marketing_review_progress', JSON.stringify(data.progress_data.marketing_review_progress));
            } else {
              localStorage.setItem('ap2_marketing_review_progress', JSON.stringify({}));
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
            // Removed: localStorage.setItem('ap2_quiz_progress', JSON.stringify({})); // Keep local progress intact as fallback
            localStorage.setItem('ap2_wisor_progress', JSON.stringify({}));
            localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify({}));
            localStorage.setItem('ap2_marketing_review_progress', JSON.stringify({}));
            localStorage.setItem('ap2_saved_notes', JSON.stringify({}));
            if (data.progress_data.project_m_progress) {
              localStorage.setItem('project_m_progress_v1', JSON.stringify(data.progress_data.project_m_progress));
            }
            if (data.progress_data.klr_progress) {
              localStorage.setItem('klr_game_progress_v1', JSON.stringify(data.progress_data.klr_progress));
            }
            // Trigger local update for providers
            window.dispatchEvent(new Event('storage'));

            if (session?.user) {
              localStorage.setItem(getAnalyticsStorageKey(session.user), JSON.stringify(createEmptyAnalytics()));
              localStorage.setItem(getCustomQuizStorageKey(session.user), JSON.stringify([]));
            }
            analyticsData = createEmptyAnalytics();
            customQuizData = [];
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
      const now = Date.now();
      const dueCount = mergedCards.filter(c => c.progress.nextReview <= now).length;
      setStats({ learnedToday: 0, totalDue: dueCount });

      // 4. Setup Quizzes
      await refreshQuizDuePool();

      // 5. Setup Wisor
      const rawWisors = [
        ...(wisor1.questions || [])
      ].filter(q => !(JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {})[q.id]);
      const shuffledWisors = rawWisors.sort(() => Math.random() - 0.5);
      setAllWisors(shuffledWisors);

      // 6. Setup Review
      const reviewProg = JSON.parse(localStorage.getItem('ap2_marketing_review_progress')) || {};
      setCompletedMarketingReview(reviewProg);
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLearningAnalytics(loadAnalyticsForUser(authUser));
    setCustomQuizQuestions(loadCustomQuizForUser(authUser));
  }, [authUser]);

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

    const handleExternalUpdate = () => {
      syncProgressToSupabase();
    };

    window.addEventListener('ap2_progress_updated', handleExternalUpdate);
    window.addEventListener('online', handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('ap2_progress_updated', handleExternalUpdate);
    };
    // syncProgressToSupabase and flushPendingMemberSync are intentionally not deps here:
    // adding them would recreate the interval/listeners on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const syncProgressToSupabaseAction = async () => {
    await syncProgressToSupabase().catch(() => { });
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
    e.stopPropagation();
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
      clearAnalyticsByMode('wisorEco');

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
        syncProgressToSupabase({ marketing_review_progress: {} }).catch(() => { });
      }
      setMarketingReviewSessionPool([]);
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
      setResetModalVisible(false);
      window.location.reload();
    } else if (resetTarget === 'fullAccount') {
      // Clear progress localStorage (keep custom quiz questions)
      localStorage.removeItem('ap2_srs_progress');
      localStorage.removeItem('ap2_quiz_progress');
      localStorage.removeItem('ap2_wisor_progress');
      localStorage.removeItem('ap2_wisor_eco_progress');
      localStorage.removeItem('ap2_marketing_review_progress');
      localStorage.removeItem('ap2_saved_notes');
      localStorage.removeItem('klr_game_progress_v1');
      localStorage.removeItem('project_m_progress_v1');
      localStorage.removeItem('journey_architect_progress_v1');
      localStorage.removeItem(getAnalyticsStorageKey(authUser));

      // Reset progress state (keep customQuizQuestions intact)
      setCompletedWisors({});
      setCompletedWisorsEco({});
      setCompletedMarketingReview({});
      setQuizProgressView({});
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
      const topicLabel = activeWisorMode === 'wisor1' ? 'WisoR' : 
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
          const dbKey = activeWisorMode === 'wisor1'
            ? 'wisor_progress'
            : activeWisorMode === 'wisorEco'
              ? 'wisor_eco_progress'
              : 'marketing_review_progress';
          syncProgressToSupabase({ [dbKey]: next }).catch(() => { });
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
    if (appMode && !['intro', 'auth', 'dashboard', 'quiz', 'quiz_setup', 'wisor', 'rechen_tasks_setup', 'klr', 'kalkulation', 'break_even', 'project_m', 'journey_architect', 'notes_manager', 'learning_dashboard', 'appearance_settings', 'flashcards'].includes(appMode)) {
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
            {currentHost === 'localhost' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  localStorage.setItem('masterpat_auth', 'true');
                  localStorage.setItem(ACCESS_MODE_KEY, 'guest');
                  setAppMode('dashboard');
                }}
                style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginTop: '0.5rem', background: 'linear-gradient(45deg, #ff416c, #ff4b2b)' }}
              >
                Login (Dev Bypass)
              </button>
            )}
          </form>

          {authMsg && <p style={{ color: authMsg.includes('Erfolg') || authMsg.includes('erstellt') ? 'var(--success)' : 'var(--error)', marginBottom: '1rem', fontWeight: 'bold' }}>{authMsg}</p>}

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--glass-border)' }} />

          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.8rem' }}>Alternativ: Lokaler Gast Zugang (Nur auf diesem Gerät)</p>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
            onClick={() => {
              setAuthError(false);
              localStorage.setItem(ACCESS_MODE_KEY, 'guest');
              clearGuestProgressData();
              localStorage.setItem('masterpat_auth', 'true');
              setAppMode('intro');
              window.location.reload(); // Zum Laden der User Data vom Device
            }}
          >
            Als Gast (Lokal) fortfahren
          </button>
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
      return count + ((progress.nextReview || 0) > nowTs ? 1 : 0);
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
      wisorEcoLearned: Object.keys(completedWisorsEco).length,
      reviewTotal: (marketingReview.questions || []).length,
      reviewLearned: Object.keys(completedMarketingReview).length,
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
      />
      {questionManagerCategory && (
        <QuestionManager
          category={questionManagerCategory}
          questions={
            questionManagerCategory === 'quiz' ? allQuizQuestions :
              questionManagerCategory === 'wisor' ? wisorQuestions : 
              questionManagerCategory === 'wisorEco' ? wisorEcoQuestions : rechenTasks
          }
          authUser={authUser}
          progress={
            questionManagerCategory === 'quiz' || questionManagerCategory === 'rechen' ? quizProg :
              questionManagerCategory === 'wisor' ? completedWisors : completedWisorsEco
          }
          formatLatex={formatLatex}
          onClose={() => setQuestionManagerCategory(null)}
          onAddCustomQuizQuestion={handleAddCustomQuizQuestion}
          onProgressUpdate={(cat, updatedProgress) => {
            if (cat === 'quiz' || cat === 'rechen') refreshQuizDuePool().catch(() => { });
            else if (cat === 'wisor') setCompletedWisors(updatedProgress);
            else if (cat === 'wisorEco') setCompletedWisorsEco(updatedProgress);
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
            <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '0px', fontSize: '3.5rem', transform: 'scaleY(1.2)', transformOrigin: 'bottom', margin: '0 0 0 0', color: 'var(--text-light)', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>MASTERPAT APP</h1>
          </div>
          <p className="subtitle" style={{ marginTop: '0.8rem' }}>Wähle deinen Lernmodus</p>
        </header>
        <div className="dashboard-grid">
          <div id="card-quiz" className="dash-card" onClick={() => { setAppMode('quiz_setup'); }}>
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

          <div id="card-kpis" className="dash-card rechen-card" onClick={() => { setAppMode('rechen_tasks_setup'); }}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="15"></line>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="16"></line>
              </svg>
            </div>
            <h2>KPI's</h2>
            <p>Gezieltes Training für IHK-relevante Rechen- und KPI-Aufgaben.</p>
            <div className="chip">
              {rechenLearned === rechenTotal && rechenTotal > 0 ? 'Alles gemeistert! 🎉' : 
               `${rechenTotal - rechenLearned} Aufgaben fällig`}
            </div>
          </div>


          <div id="card-kalkulation" className="dash-card" onClick={() => setAppMode('kalkulation')}>
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
            <button
              className="btn-secondary"
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
              onClick={(e) => { e.stopPropagation(); openResetModal(e, 'kalkulation'); }}
            >
              🔄 Lernfortschritt zurücksetzen
            </button>
          </div>

          <div id="card-breakeven" className="dash-card" onClick={() => setAppMode('break_even')}>
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
            <button
              className="btn-secondary"
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
              onClick={(e) => { e.stopPropagation(); openResetModal(e, 'breakEven'); }}
            >
              🔄 Lernfortschritt zurücksetzen
            </button>
          </div>

          <div id="card-klr" className="dash-card" onClick={() => setAppMode('klr')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2.5" />
                <line x1="7" y1="9" x2="17" y2="9" />
                <line x1="7" y1="13" x2="12" y2="13" />
                <line x1="7" y1="17" x2="10" y2="17" />
                <line x1="16" y1="13" x2="16" y2="18" />
                <line x1="14" y1="15.5" x2="18" y2="15.5" />
              </svg>
            </div>
            <h2>KLR Startup<br />Survival</h2>
            <p>Gamifizierte Kosten- und Leistungsrechnung im E-Commerce-Setting.</p>
            <div className="chip">XP: {klrProgress?.xp || 0}</div>
          </div>

          <div id="card-project-m" className="dash-card" onClick={() => setAppMode('project_m')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </div>
            <h2>Projekt m<br />Mastery</h2>
            <p>Beherrsche den Projektlebenszyklus und Fachbegriffe im E-Commerce.</p>
            <div className="chip">XP: {pmProgress?.xp || 0}</div>
            <button
               className="btn-secondary"
               style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
               onClick={(e) => { e.stopPropagation(); openResetModal(e, 'project_m'); }}
            >
               🔄 Lernfortschritt zurücksetzen
            </button>
          </div>

          <div id="card-journey-architect" className="dash-card" onClick={() => setAppMode('journey_architect')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M8 11l3 3 5-5" />
              </svg>
            </div>
            <h2>Journey<br />Architect</h2>
            <p>Werde zum Meister der Kundenreisen (5, 7 und 8 Phasen).</p>
            <div className="chip">XP: {jaProgress?.xp || 0}</div>
            <button
               className="btn-secondary"
               style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
               onClick={(e) => { e.stopPropagation(); openResetModal(e, 'journey_architect'); }}
            >
               🔄 Lernfortschritt zurücksetzen
            </button>
          </div>

          <div id="card-marketing-review" className="dash-card" onClick={() => setAppMode('marketing_review_setup')}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <svg width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h2>IHK<br />Extras</h2>
            <p>IHK Review: Influencer, Live Shopping, 4 PS und Funnel Strategien.</p>
            <div className="chip">
              {Object.keys(completedMarketingReview).length === marketingReview.questions.length ? 'Alles gemeistert! 🎉' : 
               `${marketingReview.questions.length - Object.keys(completedMarketingReview).length} Fragen offen`}
            </div>
            <button
               className="btn-secondary"
               style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}
               onClick={(e) => { e.stopPropagation(); openResetModal(e, 'marketing_review'); }}
            >
               🔄 Lernfortschritt zurücksetzen
            </button>
          </div>

          <div id="card-notes" className="dash-card" onClick={() => { setAppMode('notes_manager'); }}>
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

          {/* VIP Bereich: Stadt Land Fluss Multiplayer */}
          <div id="card-vip" className="dash-card" onClick={() => setIsSLFOpen(true)}>
            <div className="dash-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1.2em' }}>
              <span>👑</span>
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
      pool = filterDueQuizzes(prepared, quizProg, now);
    } else {
      // Prioritize due questions, then fill with unlearned/ready
      const due = filterDueQuizzes(prepared, quizProg, now);
      const remaining = prepared.filter(p => !due.some(d => d.id === p.id));
      pool = [...due, ...remaining.sort(() => Math.random() - 0.5)].slice(0, parseInt(count));
    }
    
    if (pool.length === 0) {
      alert('Keine fälligen Aufgaben für dieses Thema gefunden.');
      return;
    }

    setQuizSessionPool(pool);
    setAppMode('quiz');
  };

  if (appMode === 'rechen_tasks_setup') {
    const calcTasks = getRechenTasks(customQuizQuestions);
    const topics = ['Alle', 'KPI', 'Handelskalkulation', 'Conversion', 'ROAS', 'Allgemein'];
    
    const now = Date.now();
    const preparedAll = buildPreparedQuizzes(calcTasks, quizProg);
    filterDueQuizzes(preparedAll, quizProg, now);

    const getTopicStats = (t) => {
      const topicTasks = t === 'Alle' ? calcTasks : calcTasks.filter(q => categorizeRechenTask(q) === t);
      const topicPrepared = buildPreparedQuizzes(topicTasks, quizProg);
      const topicDue = filterDueQuizzes(topicPrepared, quizProg, now);
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => startRechenTasks(10, rechenSetup.topic)}>10 Aufgaben</button>
            <button className="btn-secondary" onClick={() => startRechenTasks(20, rechenSetup.topic)}>20 Aufgaben</button>
            <button className="btn-secondary" onClick={() => startRechenTasks(50, rechenSetup.topic)}>50 Aufgaben</button>
            <button className="btn-primary" onClick={() => startRechenTasks('All', rechenSetup.topic)}>
              {getTopicStats(rechenSetup.topic).due} fällige starten
            </button>
          </div>
          
          <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Inklusive Video-Vorschlägen & KI-Assistent
          </p>
        </div>
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
          <JourneyArchitectGame onBack={() => setAppMode('dashboard')} />
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
          <KalkulationsBoss onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} isGuest={!authUser} />
        </React.Suspense>
      </>
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
          dashboardAiTopics={dashboardAiTopics}
          dashboardAiLoading={dashboardAiLoading}
          calcAiInsights={calcAiInsights}
          calcAiLoading={calcAiLoading}
          einsteinTilt={einsteinTilt}
          einsteinRef={einsteinRef}
          burgerMenuPortal={burgerMenuPortal}
          customQuizQuestions={customQuizQuestions}
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

  if (appMode === 'marketing_review_setup') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade IHK Extras...</div>}>
        <QuizSetup
          selectedQuizTopic={'all'}
          setSelectedQuizTopic={() => { }}
          getDueQuizzesByTopic={getDueMarketingReviewByTopic}
          getQuizTopicGroup={getQuizTopicGroup}
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
        />
      </React.Suspense>
    );
  }

  if (appMode === 'quiz') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade Quiz...</div>}>
        <QuizSession
          quizDuePool={quizDuePool}
          initialSessionPool={quizSessionPool}
          onComplete={() => {
            refreshQuizDuePool();
            setAppMode('dashboard');
          }}
          onCancel={() => {
            refreshQuizDuePool();
            setAppMode('dashboard');
          }}
          feynmanModeEnabled={feynmanModeEnabled}
          onLearningEvent={appendLearningEvent}
          onQuizAnswer={handleQuizAnswerUpdate}
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
        />
      </React.Suspense>
    );
  }

  if (appMode === 'marketing_review_quiz') {
    return (
      <React.Suspense fallback={<div className="loading-overlay">Lade IHK Extras...</div>}>
        <QuizSession
          quizDuePool={getDueMarketingReviewByTopic('all')}
          initialSessionPool={marketingReviewSessionPool}
          onComplete={() => {
            setMarketingReviewSessionPool([]);
            setAppMode('dashboard');
          }}
          onCancel={() => {
            setMarketingReviewSessionPool([]);
            setAppMode('dashboard');
          }}
          feynmanModeEnabled={feynmanModeEnabled}
          onLearningEvent={appendLearningEvent}
          onQuizAnswer={handleMarketingReviewAnswerUpdate}
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
