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

const generateId = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `card_${Math.abs(hash)}`;
};

function App() {
  const [appMode, setAppMode] = useState(localStorage.getItem('masterpat_auth') === 'true' ? 'dashboard' : 'auth'); // 'auth', 'dashboard', 'quiz', 'wisor'

  // --- THEME STATE ---
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('masterpat_theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.body.classList.add('light-theme');
    }
  }, []);

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

  // --- AUTH STATE ---
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const SECRET_PIN = '261115'; // Das Passwort, das du später ändern kannst

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!captchaToken) { setAuthMsg('Bitte bestätige das Captcha.'); return; }
    setAuthLoading(true);
    setAuthMsg('');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    if (error) { setAuthMsg(error.message); setAuthLoading(false); }
    else {
      setAuthMsg('Erfolgreich eingeloggt! Lade Account...');
      localStorage.setItem('masterpat_auth', 'true');
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
        localStorage.setItem('masterpat_auth', 'true');
        window.location.reload();
      }
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('masterpat_auth');
    window.location.reload();
  };

  // --- FLASHCARD STATE ---
  const [allCards, setAllCards] = useState([]);
  const [learningQueue, setLearningQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState({ learnedToday: 0, totalDue: 0 });

  // --- QUIZ STATE ---
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

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

  useEffect(() => {
    setWisorVideos([]);
    setSelectedWisorVideo(null);
    setWisorVideoOpen(false);
    setWisorEvaluated(false);
    setWisorInput('');
    setGeminiVisible(false);
    setGeminiQuery('');
    setGeminiResponse('');
  }, [currentWisorIndex, currentQuizIndex]);

  const formatLatex = (text) => {
    if (typeof text !== 'string') return text;
    // Removes the wrapping $ signs and any backslash \ escapes (e.g., \$ -> $, \% -> %)
    return text.replace(/\$([^\$]+)\$/g, (match, inner) => inner.replace(/\\/g, '').trim());
  };

  const handleToggleVideos = async (q) => {
    if (wisorVideoOpen) {
      setWisorVideoOpen(false);
      return;
    }

    setWisorVideoOpen(true);

    if (wisorVideos.length === 0 && !wisorVideoLoading) {
      setWisorVideoLoading(true);

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

      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

      let queryStr = q.youtubeQuery;
      if (!queryStr) {
        // Clean formatting, drop numbers at start
        let cleanQ = formatLatex(q.question).split(/[\n]/)[0].replace(/^[\d\.]+\s*/, '').trim();
        // Remove punctuation
        cleanQ = cleanQ.replace(/[?.,!;:()"]/g, '');

        // Basic German stop words to filter out so YouTube focuses on the real keywords
        const stopWords = new Set(['was', 'wie', 'warum', 'wann', 'wo', 'wer', 'welche', 'welcher', 'welches', 'ein', 'eine', 'einer', 'einem', 'eines', 'der', 'die', 'das', 'den', 'dem', 'des', 'als', 'ist', 'sind', 'wird', 'werden', 'kann', 'können', 'für', 'und', 'oder', 'zu', 'im', 'am', 'um', 'auf', 'von', 'bei', 'beim', 'mit', 'kann', 'gilt', 'es', 'sich', 'in']);

        const words = cleanQ.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()));

        // Take up to 10 of the most relevant words
        queryStr = words.slice(0, 10).join(' ');
      }

      let fetched = [];
      if (apiKey) {
        fetched = await fetchYouTubeVideos(queryStr, apiKey, 4 - predefinedVideos.length);
      }

      setWisorVideos([...predefinedVideos, ...fetched]);
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

  const startQuizSession = (limit) => {
    const rawQuizzes = [
      ...(quiz1.questions || []),
      ...(quiz2.questions || []),
      ...(quiz3.questions || []),
      ...(quizUForm2.questions || [])
    ];
    let quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
    const mergedQuizzes = rawQuizzes.map(q => {
      const id = q.id || generateId(q.question);
      return {
        ...q,
        id,
        progress: quizProg[id] || { rep: 0, ef: 2.5, interval: 0, nextReview: 0 }
      };
    });
    const now = Date.now();
    const due = mergedQuizzes.filter(q => q.progress.nextReview <= now);
    let sessionQs = due.sort(() => Math.random() - 0.5);
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
      if (session?.user) {
        setAuthUser(session.user);
      }

      // 1. Load local progress
      let progressData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};

      // 2. Fetch from Supabase (only for authenticated users)
      if (session?.user) {
        const userId = session.user.id;
        try {
          const { data } = await supabase
            .from('user_data')
            .select('progress_data')
            .eq('user_id', userId)
            .single();

          if (data && data.progress_data) {
            progressData = { ...progressData, ...data.progress_data };
            localStorage.setItem('ap2_srs_progress', JSON.stringify(progressData));

            if (data.progress_data.wisor_progress) {
              localStorage.setItem('ap2_wisor_progress', JSON.stringify(data.progress_data.wisor_progress));
            }
            if (data.progress_data.wisor_eco_progress) {
              localStorage.setItem('ap2_wisor_eco_progress', JSON.stringify(data.progress_data.wisor_eco_progress));
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
            await supabase.from('user_data').insert([{ user_id: userId, device_id: userId, progress_data: progressData }]);
          }
        } catch (err) {
          console.error("Supabase load error: ", err);
        }
      }

      let wisorProg = JSON.parse(localStorage.getItem('ap2_wisor_progress')) || {};
      setCompletedWisors(wisorProg);

      let wisorEcoProg = JSON.parse(localStorage.getItem('ap2_wisor_eco_progress')) || {};
      setCompletedWisorsEco(wisorEcoProg);

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
      const rawQuizzes = [
        ...(quiz1.questions || []),
        ...(quiz2.questions || []),
        ...(quiz3.questions || []),
        ...(quizUForm2.questions || [])
      ];
      let quizProgStorage = progressData.quiz_progress || JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
      const mergedQuizzesInit = rawQuizzes.map(q => {
        const id = q.id || generateId(q.question);
        return { progress: quizProgStorage[id] || { nextReview: 0 } };
      });
      // Just keep track of total due count in allQuizzes for Dashboard logic
      const dueCountQs = mergedQuizzesInit.filter(q => q.progress.nextReview <= Date.now());
      setAllQuizzes(dueCountQs);

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

    // Sync to Supabase in background (only for authenticated users)
    if (authUser?.id) {
      supabase.from('user_data').update({ progress_data: storageData, updated_at: new Date().toISOString() }).eq('user_id', authUser.id).then();
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

    setSelectedAnswer(optionIndex);
    const q = allQuizzes[currentQuizIndex];
    const isCorrect = q.answerOptions[optionIndex].isCorrect;

    if (isCorrect) {
      setQuizScore(s => ({ ...s, correct: s.correct + 1 }));
    }

    // Pomodoro session logging
    if (pomodoroActive) {
      const questionText = q.question?.substring(0, 100) || 'Quiz-Frage';
      const topic = q.hint ? 'Quiz' : 'Quiz';
      setPomodoroSessionLog(prev => [...prev, { correct: isCorrect, questionText, topic: 'Quiz' }]);
    }

    // Spaced repetition update
    let quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
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

    if (authUser?.id) {
      let progressData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
      progressData.quiz_progress = quizProg;
      supabase.from('user_data').update({ progress_data: progressData }).eq('user_id', authUser.id).catch(e => console.error(e));
    }
  };

  const nextQuizQuestion = () => {
    setQuizScore(s => ({ ...s, total: s.total + 1 }));
    setSelectedAnswer(null);
    setCurrentQuizIndex(prev => prev + 1);
  };

  const resetQuiz = (qsToUse = null) => {
    const list = qsToUse || allQuizzes;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setAllQuizzes(shuffled);
    setCurrentQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setSelectedAnswer(null);
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
          const srsData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
          supabase.from('user_data').update({ progress_data: { ...srsData, wisor_progress: {} } }).eq('user_id', authUser.id).then();
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
          const srsData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
          supabase.from('user_data').update({ progress_data: { ...srsData, wisor_eco_progress: {} } }).eq('user_id', authUser.id).then();
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

        if (authUser?.id) {
          const srsData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
          supabase.from('user_data').update({ progress_data: { ...srsData, quiz_progress: {} } }).eq('user_id', authUser.id).then();
        }

        setResetModalVisible(false);
        const rawQuizzes = [
          ...(quiz1.questions || []),
          ...(quiz2.questions || []),
          ...(quiz3.questions || []),
          ...(quizUForm2.questions || [])
        ];
        const mergedQuizzesInit = rawQuizzes.map(q => {
          const id = q.id || generateId(q.question);
          return { ...q, id, progress: { nextReview: 0 } };
        });
        setAllQuizzes(mergedQuizzesInit);
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
          const srsData = JSON.parse(localStorage.getItem('ap2_srs_progress')) || {};
          const dbKey = activeWisorMode === 'wisor1' ? 'wisor_progress' : 'wisor_eco_progress';
          supabase.from('user_data').update({ progress_data: { ...srsData, [dbKey]: next } }).eq('user_id', authUser.id).then();
        }
        return next;
      };

      if (activeWisorMode === 'wisor1') {
        setCompletedWisors(updateProg);
      } else {
        setCompletedWisorsEco(updateProg);
      }
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
              <HCaptcha
                ref={captchaRef}
                sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY || '10000000-ffff-ffff-ffff-000000000001'}
                theme="dark"
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }} disabled={authLoading || !captchaToken}>Login</button>
              <button type="button" onClick={handleRegister} className="btn-secondary" style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }} disabled={authLoading || !captchaToken}>Registrieren</button>
            </div>
          </form>

          {authMsg && <p style={{ color: authMsg.includes('Erfolg') || authMsg.includes('erstellt') ? 'var(--success)' : 'var(--error)', marginBottom: '1rem', fontWeight: 'bold' }}>{authMsg}</p>}

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--glass-border)' }} />

          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.8rem' }}>Alternativ: Lokaler Gast Zugang (Nur auf diesem Gerät)</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pinInput === SECRET_PIN) {
              setAuthError(false);
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
  const allQuizQuestions = [...(quiz1.questions || []), ...(quiz2.questions || []), ...(quiz3.questions || []), ...(quizUForm2.questions || [])];
  const quizProg = JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {};
  const wisorQuestions = wisor1.questions || [];
  const wisorEcoQuestions = wisorEco.questions || [];
  const globalStats = {
    quizTotal: allQuizQuestions.length,
    quizLearned: allQuizQuestions.length - allQuizzes.length,
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
          progress={
            questionManagerCategory === 'quiz' ? quizProg :
              questionManagerCategory === 'wisor' ? completedWisors : completedWisorsEco
          }
          formatLatex={formatLatex}
          onClose={() => setQuestionManagerCategory(null)}
          onProgressUpdate={(cat, updatedProgress) => {
            if (cat === 'wisor') setCompletedWisors(updatedProgress);
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
            <div className="chip">{allQuizzes.length === 0 ? 'Alles gemeistert! 🎉' : `${allQuizzes.length} Fragen fällig`}</div>

            {Object.keys(JSON.parse(localStorage.getItem('ap2_quiz_progress')) || {}).length > 0 && (
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
            <div className="dash-icon">📓</div>
            <h2>Meine Notizen</h2>
            <p>Deine gespeicherten Notizen ansehen und als PDF exportieren.</p>
            <div className="chip" style={{ marginTop: 'auto' }}>Gespeichert</div>
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
            const { data } = await supabase.from('user_data').select('progress_data').eq('user_id', authUser.id).single();
            if (data?.progress_data) {
              data.progress_data.saved_notes = notes;
              await supabase.from('user_data').update({ progress_data: data.progress_data, updated_at: new Date().toISOString() }).eq('user_id', authUser.id);
            }
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
                const { data: dbRow } = await supabase.from('user_data').select('progress_data').eq('user_id', authUser.id).single();
                if (dbRow?.progress_data) {
                  dbRow.progress_data.saved_notes = notes;
                  await supabase.from('user_data').update({ progress_data: dbRow.progress_data, updated_at: new Date().toISOString() }).eq('user_id', authUser.id);
                }
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

  if (appMode === 'quiz_setup') {
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
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Wähle aus, wie viele fällige Fragen du jetzt lernen möchtest.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => startQuizSession(10)}>10 Fragen</button>
            <button className="btn-secondary" onClick={() => startQuizSession(20)}>20 Fragen</button>
            <button className="btn-secondary" onClick={() => startQuizSession(50)}>50 Fragen</button>
            <button className="btn-primary" onClick={() => startQuizSession('all')}>Alle fälligen</button>
          </div>
        </div>
      </div>
    );
  }

  if (appMode === 'quiz') {
    if (allQuizzes.length === 0) return <div style={{ color: 'var(--text-light)', zIndex: 10 }}>Lade Quiz...</div>;

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
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Keine Videos gefunden.</div>
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
              <p><strong>Erklärung:</strong> {formatLatex(q.answerOptions[selectedAnswer].rationale)}</p>
              <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={nextQuizQuestion}>Nächste Frage &rarr;</button>
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
