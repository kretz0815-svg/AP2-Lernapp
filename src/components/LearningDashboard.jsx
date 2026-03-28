import React from 'react';
import Confetti from './Confetti';
import { getLearningEventKey } from '../utils/analytics';
import { detectQuizTopic, getQuizTopicGroup } from '../utils/quizTopics';
import { generateId } from '../utils/constants';
import { getAllQuizQuestions, getRechenTasks } from '../utils/quizUtils';
import flashcards1 from '../data/flashcards_1.json';
import flashcards2 from '../data/flashcards_2.json';
import flashcards3 from '../data/flashcards_3.json';
import wisor1 from '../data/wisor_1.json';
import wisorEco from '../data/wisor_eco.json';
import marketingReview from '../data/marketing_review.json';

const LearningDashboard = ({
  authUser,
  setAppMode,
  learningAnalytics,
  refreshMistakeAnalysis,
  dashboardAiTopics,
  dashboardAiLoading,
  calcAiInsights,
  calcAiLoading,
  einsteinTilt,
  einsteinRef,
  burgerMenuPortal,
  customQuizQuestions
}) => {
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
      rechen: byMode('rechen'),
      klr: byMode('klr'),
      marketing_review: byMode('marketing_review'),
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
    breakEven: 'Break-Even-Point',
    klr: 'KLR-Modul',
    rechen: "KPI's",
    marketing_review: 'IHK Extras'
  };

  const modeTotals = events.reduce((acc, event) => {
    const mode = event.mode || 'unknown';
    if (!acc[mode]) acc[mode] = { correct: 0, wrong: 0 };
    if (event.correct) acc[mode].correct += 1;
    else acc[mode].wrong += 1;
    return acc;
  }, {});

  const questionEvents = events.filter(e => e.mode === 'quiz' || e.mode === 'wisor' || e.mode === 'wisorEco' || e.mode === 'kalkulation' || e.mode === 'breakEven' || e.mode === 'klr' || e.mode === 'rechen');
  const totalAnswers = events.length;
  const totalCorrect = events.filter(e => e.correct).length;
  const hitRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const totalPoolSize =
    (flashcards1.cards || []).length +
    (flashcards2.cards || []).length +
    (flashcards3.cards || []).length +
    getAllQuizQuestions(customQuizQuestions).length +
    (wisor1.questions || []).length +
    (wisorEco.questions || []).length +
    (marketingReview.questions || []).length +
    getRechenTasks(customQuizQuestions).length;

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
    getAllQuizQuestions(customQuizQuestions).map((q) => {
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
    if (event.mode === 'klr') return event.topic || 'KLR-Modul';
    if (event.mode === 'marketing_review') return 'IHK Extras';
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

  const radarTopicTotals = questionEvents.reduce((acc, event) => {
    let topic = resolveTopic(event);
    if (topic.startsWith('KLR')) topic = 'KLR';
    if (!acc[topic]) acc[topic] = { correct: 0, wrong: 0, total: 0 };
    if (event.correct) acc[topic].correct += 1;
    else acc[topic].wrong += 1;
    acc[topic].total += 1;
    return acc;
  }, {});

  const radarTopics = Object.entries(radarTopicTotals)
    .map(([topic, stats]) => {
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return { topic, ...stats, accuracy };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

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
    if (entry.mode === 'klr') return entry.topic || 'KLR-Modul';
    return 'Allgemein';
  };

  const _thematicWeaknessGroups = topMistakes.reduce((acc, entry) => {
    const topic = getMistakeTopic(entry);
    if (!acc[topic]) acc[topic] = { topic, count: 0, entries: [], terms: {} };
    acc[topic].count += (entry.count || 0);
    acc[topic].entries.push(entry);

    extractKeyTerms(entry.questionText || '').forEach(term => {
      acc[topic].terms[term] = (acc[topic].terms[term] || 0) + 1;
    });
    return acc;
  }, {});

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

  const einsteinNeonColor = overallAccuracy >= 100 ? '#fbbf24' : overallAccuracy >= 75 ? '#22c55e' : overallAccuracy >= 35 ? '#f59e0b' : '#ef4444';
  const einsteinGlow = overallAccuracy >= 100 ? 'rgba(251,191,36,0.7)' : overallAccuracy >= 75 ? 'rgba(34,197,94,0.6)' : overallAccuracy >= 35 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.6)';
  const einsteinImage = overallAccuracy >= 100 ? '/EinsteinGold.webp' : overallAccuracy >= 75 ? '/einstein.webp' : overallAccuracy >= 35 ? '/EinsteinOrange.webp' : '/EinsteinRot.webp';
  const statusLabel = overallAccuracy >= 100 ? 'Perfekt!' : overallAccuracy >= 75 ? 'Prüfungsbereit' : overallAccuracy >= 35 ? 'Solides Mittelfeld' : 'Viel Nachholbedarf';
  const statusEmoji = overallAccuracy >= 100 ? '\u{1F451}' : overallAccuracy >= 75 ? '\u{1F7E2}' : overallAccuracy >= 35 ? '\u{1F7E1}' : '\u{1F534}';
  const circleRadius = 62;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = circleCircumference * (1 - overallAccuracy / 100);
  const allModeKeys = ['quiz', 'wisor', 'wisorEco', 'kalkulation', 'breakEven', 'klr', 'flashcard'];
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

  const calcCategories = [
    { key: 'vorwaerts', label: 'Vorwärtskalkulation', icon: '⬇️', color: '#22c55e', prefix: 'Vorwärtskalkulation' },
    { key: 'rueckwaerts', label: 'Rückwärtskalkulation', icon: '⬆️', color: '#f59e0b', prefix: 'Rückwärtskalkulation' },
    { key: 'differenz', label: 'Differenzkalkulation', icon: '🔀', color: '#ef4444', prefix: 'Differenzkalkulation' },
    { key: 'boss', label: 'Boss-Modus', icon: '👾', color: '#a855f7', prefix: 'Boss-Modus' },
    { key: 'breakEven', label: 'Break-Even-Point', icon: '📊', color: '#6366f1', prefix: 'Break-Even' },
    { key: 'klr1', label: 'KLR Level 1', icon: '🧩', color: '#22c55e', topic: 'KLR Level 1 · Kostenartenrechnung' },
    { key: 'klr2', label: 'KLR Level 2', icon: '🏭', color: '#f59e0b', topic: 'KLR Level 2 · Kostenstellenrechnung' },
    { key: 'klr3', label: 'KLR Level 3', icon: '🧥', color: '#a855f7', topic: 'KLR Level 3 · Kostenträgerrechnung' },
    { key: 'klr4', label: 'KLR Level 4', icon: '📈', color: '#14b8a6', topic: 'KLR Level 4 · Break-Even-Analyse' },
  ];
  const calcStats = calcCategories.map(cat => {
    const filtered = cat.key === 'breakEven'
      ? events.filter(e => e.mode === 'breakEven')
      : cat.topic
        ? events.filter(e => e.mode === 'klr' && (e.topic || '') === cat.topic)
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

      <section className="note-card analytics-big-picture" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem', borderRadius: '20px', border: `1px solid ${einsteinNeonColor}44`, background: 'var(--glass-bg)', backdropFilter: 'blur(16px)' }}>
        <div className="analytics-big-picture-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
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

      <section className="note-card analytics-action-call" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.2rem 1.5rem', borderRadius: '16px', border: `1px solid ${einsteinNeonColor}55`, background: `linear-gradient(135deg, ${einsteinNeonColor}12, transparent 60%)`, backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{'\uD83C\uDFAF'}</span>
          <div>
            <h3 style={{ margin: '0 0 0.3rem 0', color: einsteinNeonColor, fontSize: '0.95rem', fontWeight: 700 }}>Dein Fokus f&uuml;r heute</h3>
            <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.92rem', lineHeight: 1.45 }}>{actionCallText}</p>
          </div>
        </div>
      </section>

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

      <div className="analytics-deep-dive printable-notes" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
        <section className="note-card" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
          <h3 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-light)', fontSize: '1rem' }}>Themenkompetenz</h3>
          {radarTopics.length < 3 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.88rem' }}>Mindestens 3 Themen mit Daten n&ouml;tig.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg
                  style={{ width: '100%', maxWidth: '320px', height: 'auto', overflow: 'visible' }}
                  viewBox={`${-28} ${-28} ${radarSize + 56} ${radarSize + 56}`}
                  role="img"
                  aria-label="Radar"
                >
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
                    const badge = polarToCartesian(a, 116);
                    return (
                      <g key={`ax_${row.topic}`}>
                        <line x1={radarCenter} y1={radarCenter} x2={edge.x} y2={edge.y} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
                        <circle cx={badge.x} cy={badge.y} r="9" fill="rgba(99,102,241,0.22)" stroke="rgba(99,102,241,0.55)" strokeWidth="1.2" />
                        <text
                          x={badge.x}
                          y={badge.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="9"
                          fontWeight="700"
                          fill="var(--text-light)"
                        >
                          {idx + 1}
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
                {radarTopics.map((row, idx) => (
                  <div key={`lgnd_${row.topic}`} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
                    <span>{idx + 1}. {row.topic}</span>
                    <strong style={{ color: row.accuracy >= 75 ? 'var(--success)' : row.accuracy >= 60 ? '#f59e0b' : 'var(--error)' }}>{row.accuracy}%</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

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

      <section className="note-card analytics-rechenaufgaben" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.3)', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-light)', fontSize: '1.1rem', textAlign: 'center' }}>🧮 Rechenaufgaben</h3>
        {calcTotal === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontSize: '0.88rem' }}>Noch keine Rechenaufgaben bearbeitet. Starte den Kalkulations-Boss, das KLR-Modul oder Break-Even-Point!</p>
        ) : (
          <>
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

            <div style={{ marginTop: '1rem', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.07)', padding: '0.9rem' }}>
              <h4 style={{ margin: '0 0 0.6rem 0', color: '#a5b4fc', fontSize: '0.9rem' }}>🤖 KI-Rechenfehleranalyse</h4>
              {calcAiLoading ? (
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.84rem' }}>KI analysiert deine Rechenfehler…</p>
              ) : calcAiInsights.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {calcAiInsights.map((insight, idx) => (
                    <div key={`calc_ai_${idx}`} style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', padding: '0.7rem' }}>
                      <p style={{ margin: '0 0 0.35rem 0', color: 'var(--text-light)', fontSize: '0.84rem' }}><strong>Fehler:</strong> {insight.error}</p>
                      {insight.why && <p style={{ margin: '0 0 0.35rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}><strong>Warum:</strong> {insight.why}</p>}
                      <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.8rem' }}><strong>Nächstes Mal:</strong> {insight.nextTime}{insight.focus ? ` (Fokus: ${insight.focus})` : ''}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.84rem' }}>
                  Noch nicht genug Rechenfehler für eine KI-Auswertung. Bearbeite einige Kalkulations-, KLR- oder Break-Even-Aufgaben.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="note-card analytics-prognose" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-light)', fontSize: '1.1rem', textAlign: 'center' }}>Pr&uuml;fungsprognose</h3>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
          <svg width="220" height="150" viewBox="0 0 220 150" style={{ maxWidth: '100%', height: 'auto' }}>
            <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
            <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke={einsteinNeonColor} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${Math.PI * 90}`} strokeDashoffset={Math.PI * 90 * (1 - overallAccuracy / 100)}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            {NaFunc(overallAccuracy, einsteinNeonColor)}
            <circle cx="110" cy="110" r="5" fill={einsteinNeonColor} />
            <text x="20" y="126" textAnchor="middle" fontSize="11" fill="var(--text-muted)">0%</text>
            <text x="110" y="14" textAnchor="middle" fontSize="11" fill="var(--text-muted)">50%</text>
            <text x="200" y="126" textAnchor="middle" fontSize="11" fill="var(--text-muted)">100%</text>
            <text x="110" y="98" textAnchor="middle" fontSize="26" fontWeight="900" fill={einsteinNeonColor}>{overallAccuracy}%</text>
            <text x="110" y="124" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-muted)">Gesamtfortschritt</text>
          </svg>
        </div>
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
};

const NaFunc = (overallAccuracy, einsteinNeonColor) => {
  const na = Math.PI - (overallAccuracy / 100) * Math.PI;
  return <line x1="110" y1="110" x2={110 + 70 * Math.cos(na)} y2={110 - 70 * Math.sin(na)} stroke={einsteinNeonColor} strokeWidth="2.5" strokeLinecap="round" />;
};

export default React.memo(LearningDashboard);
