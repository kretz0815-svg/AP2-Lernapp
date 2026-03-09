import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { CONFIG } from './config';
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
import { askGemini, extractFocusTopics, extractCalculationInsights } from './geminiClient';
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
import { KLRGameHub, useKLRGame } from './features/klr';
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
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAppearance } from './hooks/useAppearance';
const AuthPage = lazy(() => import('./pages/AuthPage'));
const IntroPage = lazy(() => import('./pages/IntroPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'));
const LearningDashboardPage = lazy(() => import('./pages/LearningDashboardPage'));
const NotesManagerPage = lazy(() => import('./pages/NotesManagerPage'));
const AppearanceSettingsPage = lazy(() => import('./pages/AppearanceSettingsPage'));
const KLRPage = lazy(() => import('./pages/KLRPage'));
const KalkulationPage = lazy(() => import('./pages/KalkulationPage'));
const BreakEvenPage = lazy(() => import('./pages/BreakEvenPage'));
const WisorPage = lazy(() => import('./pages/WisorPage'));

const LoadingFallback = () => (
  <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', zIndex: 10 }}>
    <div className="blob blob-1"></div>
    <div className="blob blob-2"></div>
    <div className="card-face fade-in" style={{ padding: '2rem', textAlign: 'center', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
      <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
      <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>Lade App...</p>
    </div>
  </div>
);
import { useAppContext } from './contexts/AppContext';

function App() {
  const {
    appMode,
    setAppMode,
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
    clearGuestProgressData,
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
    resetBackgroundColor,
    learningAnalytics,
    setLearningAnalytics,
    getLocalProgressData,
    syncProgressToSupabase,
    flushPendingMemberSync,
    appendLearningEvent,
    refreshMistakeAnalysis
  } = useAppContext();

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_HCAPTCHA_SITEKEY || '';
  const { progress: klrProgress } = useKLRGame() || { progress: { xp: 0 } };

  // --- FLASHCARD STATE ---
  const [allCards, setAllCards] = useState([]);
  const [learningQueue, setLearningQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ learnedToday: 0, totalDue: 0 });

  // --- QUIZ STATE ---
  const [quizDuePool, setQuizDuePool] = useState([]);
  const [quizProgressView, setQuizProgressView] = useState(() => JSON.parse(localStorage.getItem('ap2_quiz_progress') || '{}'));

  // --- WISOR STATE ---
  const [questionManagerCategory, setQuestionManagerCategory] = useState(null);
  const [customQuizQuestions, setCustomQuizQuestions] = useState([]);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroSessionLog, setPomodoroSessionLog] = useState([]);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroForceStop, setPomodoroForceStop] = useState(0);
  const [pomodoroTimeUpSignal, setPomodoroTimeUpSignal] = useState(0);
  const einsteinRef = useRef(null);
  const [einsteinTilt, setEinsteinTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5500);
  };

  useEffect(() => {
    if (appMode !== 'dashboard') return;
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

  // Scroll to top on every mode change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [appMode]);


  useEffect(() => {
    // This useEffect was related to wisor input focus, which is now handled within WisorPage
  }, []);

  const [geminiVisible, setGeminiVisible] = useState(false);

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
        const localProg = quizProg[q.id] || null;

        if (row) {
          const supabaseNextReview = row.due_date ? new Date(row.due_date).getTime() : 0;
          const localNextReview = localProg?.nextReview || 0;

          // Immer den SPÄTEREN nextReview nehmen (strengerer Cooldown gewinnt).
          // Das verhindert, dass alte Supabase-Einträge mit zu kurzen Intervallen
          // den korrekten lokalen 24h-Cooldown überschreiben.
          const useLocal = localProg && localNextReview > supabaseNextReview;

          if (useLocal) {
            effectiveProgress[q.id] = {
              rep: Math.max(localProg.rep || 0, row.review_count || 0),
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

    await refreshQuizDuePool({ customData: updatedCustom });

    return { ok: true };
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

      const apiKey = CONFIG.youtube.apiKey;

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

  const handleGeminiAsk = async (q) => {
    if (!geminiQuery.trim() || !q) return;
    setGeminiLoading(true);
    setGeminiResponse('');

    let expectedAnswers = '';
    if (appMode === 'wisor' && q.expectedAnswers) {
      expectedAnswers = q.expectedAnswers.join(', ') || 'N/A';
    } else if (q.answerOptions) {
      expectedAnswers = q.answerOptions.find(opt => opt.isCorrect)?.text || 'N/A';
    }
    const answerInfo = "Geforderte Antwort(en): " + expectedAnswers + " | Erklärung: " + (q.rationale || 'N/A');

    const response = await askGemini(geminiQuery, q.question, answerInfo);
    setGeminiResponse(response);
    setGeminiLoading(false);
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


  const startWisor = (mode = 'wisor1') => {
    setActiveWisorMode(mode);
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

      if (appMode === 'wisor') setAppMode('dashboard');
    } else if (resetTarget === 'wisorEco') {
      setCompletedWisorsEco({});
      localStorage.removeItem('ap2_wisor_eco_progress');
      clearAnalyticsByMode('wisorEco');

      if (authUser?.id) {
        syncProgressToSupabase({ wisor_eco_progress: {} }).catch(() => { });
      }

      setResetModalVisible(false);

      if (appMode === 'wisor') setAppMode('dashboard');
    } else if (resetTarget === 'quiz') {
      localStorage.removeItem('ap2_quiz_progress');
      setQuizProgressView({});
      clearAnalyticsByMode('quiz');
      const resetTasks = [];

      if (authUser?.id) {
        resetTasks.push(clearTaskProgressByType(supabase, authUser.id, 'quiz'));
      }

      setResetModalVisible(false);

      Promise.allSettled(resetTasks)
        .then(() => refreshQuizDuePool())
        .catch(() => refreshQuizDuePool());

      if (appMode === 'quiz' || appMode === 'quiz_setup') setAppMode('dashboard');
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
    } else if (resetTarget === 'fullAccount') {
      // Clear progress localStorage (keep custom quiz questions)
      localStorage.removeItem('ap2_srs_progress');
      localStorage.removeItem('ap2_quiz_progress');
      localStorage.removeItem('ap2_wisor_progress');
      localStorage.removeItem('ap2_wisor_eco_progress');
      localStorage.removeItem('ap2_saved_notes');
      localStorage.removeItem('klr_game_progress_v1');
      localStorage.removeItem(getAnalyticsStorageKey(authUser));

      // Reset progress state (keep customQuizQuestions intact)
      setCompletedWisors({});
      setCompletedWisorsEco({});
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



  // --- RENDERERS ---

  if (appMode === 'auth') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AuthPage
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          handleLogin={handleLogin} handleRegister={handleRegister} handleGoogleLogin={handleGoogleLogin}
          authLoading={authLoading} authMsg={authMsg}
          captchaRef={captchaRef} captchaSiteKey={captchaSiteKey} currentHost={currentHost}
          captchaToken={captchaToken} setCaptchaToken={setCaptchaToken}
          captchaError={captchaError} setCaptchaError={setCaptchaError}
          pinInput={pinInput} setPinInput={setPinInput} SECRET_PIN={SECRET_PIN}
          authError={authError} setAuthError={setAuthError}
          clearGuestProgressData={clearGuestProgressData}
          setAppMode={setAppMode}
        />
      </Suspense>
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
        setPomodoroTimeUpSignal(Date.now());
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
  const nowTs = Date.now();
  const quizLearnedCount = allQuizQuestions.reduce((count, question) => {
    const questionId = question.id || generateId(question.question);
    const progress = quizProg[questionId];
    if (!progress) return count;
    return count + ((progress.nextReview || 0) > nowTs ? 1 : 0);
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

  if (appMode === 'intro') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <IntroPage setAppMode={setAppMode} />
      </Suspense>
    );
  }

  if (appMode === 'dashboard') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <DashboardPage
          pomodoroPortal={pomodoroPortal}
          burgerMenuPortal={burgerMenuPortal}
          einsteinTilt={einsteinTilt}
          einsteinRef={einsteinRef}
          setAppMode={setAppMode}
          authUser={authUser}
          quizDuePool={quizDuePool}
          quizProg={quizProg}
          openResetModal={openResetModal}
          completedWisors={completedWisors}
          wisor1={wisor1}
          startWisor={startWisor}
          completedWisorsEco={completedWisorsEco}
          wisorEco={wisorEco}
          notesIcon={notesIcon}
          isLightMode={isLightMode}
          resetModalVisible={resetModalVisible}
          setResetModalVisible={setResetModalVisible}
          handleResetExecute={handleResetExecute}
        />
      </Suspense>
    );
  }

  if (appMode === 'appearance_settings') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AppearanceSettingsPage />
      </Suspense>
    );
  }

  if (appMode === 'klr') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <KLRPage />
      </Suspense>
    );
  }

  if (appMode === 'kalkulation') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <KalkulationPage />
      </Suspense>
    );
  }

  if (appMode === 'break_even') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <BreakEvenPage />
      </Suspense>
    );
  }

  if (appMode === 'notes_manager') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <NotesManagerPage />
      </Suspense>
    );
  }

  if (appMode === 'learning_dashboard') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LearningDashboardPage />
      </Suspense>
    );
  }

  if (appMode === 'quiz_setup' || appMode === 'quiz') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <QuizPage
          appMode={appMode}
          setAppMode={setAppMode}
          burgerMenuPortal={burgerMenuPortal}
          pomodoroPortal={pomodoroPortal}
          pomodoroActive={pomodoroActive}
          pomodoroTimeUpSignal={pomodoroTimeUpSignal}
          setPomodoroSessionLog={setPomodoroSessionLog}
          quizDuePool={quizDuePool}
          setQuizProgressView={setQuizProgressView}
          refreshQuizDuePool={refreshQuizDuePool}
          triggerConfetti={triggerConfetti}
          showConfetti={showConfetti}
          wisorVideoOpen={wisorVideoOpen}
          setWisorVideoOpen={setWisorVideoOpen}
          wisorVideoLoading={wisorVideoLoading}
          setWisorVideoLoading={setWisorVideoLoading}
          wisorVideos={wisorVideos}
          setWisorVideos={setWisorVideos}
          wisorVideoError={wisorVideoError}
          setWisorVideoError={setWisorVideoError}
          selectedWisorVideo={selectedWisorVideo}
          setSelectedWisorVideo={setSelectedWisorVideo}
          handleToggleVideos={handleToggleVideos}
          geminiVisible={geminiVisible}
          setGeminiVisible={setGeminiVisible}
          geminiQuery={geminiQuery}
          setGeminiQuery={setGeminiQuery}
          geminiLoading={geminiLoading}
          geminiResponse={geminiResponse}
          handleGeminiAsk={handleGeminiAsk}
          authUser={authUser}
        />
      </Suspense>
    );
  }

  if (appMode === 'wisor') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <WisorPage
          appMode={appMode}
          setAppMode={setAppMode}
          burgerMenuPortal={burgerMenuPortal}
          pomodoroPortal={pomodoroPortal}
          pomodoroActive={pomodoroActive}
          pomodoroTimeUpSignal={pomodoroTimeUpSignal}
          setPomodoroSessionLog={setPomodoroSessionLog}
          activeWisorMode={activeWisorMode}
          completedWisors={completedWisors}
          setCompletedWisors={setCompletedWisors}
          completedWisorsEco={completedWisorsEco}
          setCompletedWisorsEco={setCompletedWisorsEco}
          wisorVideoOpen={wisorVideoOpen}
          setWisorVideoOpen={setWisorVideoOpen}
          wisorVideoLoading={wisorVideoLoading}
          setWisorVideoLoading={setWisorVideoLoading}
          wisorVideos={wisorVideos}
          setWisorVideos={setWisorVideos}
          wisorVideoError={wisorVideoError}
          setWisorVideoError={setWisorVideoError}
          selectedWisorVideo={selectedWisorVideo}
          setSelectedWisorVideo={setSelectedWisorVideo}
          handleToggleVideos={handleToggleVideos}
          isLightMode={isLightMode}
          geminiVisible={geminiVisible}
          setGeminiVisible={setGeminiVisible}
          geminiQuery={geminiQuery}
          setGeminiQuery={setGeminiQuery}
          geminiLoading={geminiLoading}
          geminiResponse={geminiResponse}
          handleGeminiAsk={handleGeminiAsk}
          triggerConfetti={triggerConfetti}
          showConfetti={showConfetti}
          authUser={authUser}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <FlashcardsPage learningQueue={learningQueue} stats={stats} forceReloadAll={forceReloadAll} handleRating={handleRating} isFlipped={isFlipped} setIsFlipped={setIsFlipped} setAppMode={setAppMode} burgerMenuPortal={burgerMenuPortal} />
    </Suspense>
  );
}

export default App;
