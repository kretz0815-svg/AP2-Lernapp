import React, { useEffect, useRef, useState } from 'react';
import { bootstrapCostCalcModule } from '../features/klr';
import { fetchYouTubeVideos } from '../youtubeClient';
import { askGemini } from '../geminiClient';
import FloatingPortal from './FloatingPortal';
import VideoPanel from './VideoPanel';
import GeminiPanel from './GeminiPanel';
import '../features/klr/components/costCalcModule.css';

const COST_YOUTUBE_BY_STAGE = {
  1: 'Stückdeckungsbeitrag Betriebsergebnis berechnen einfach erklärt',
  2: 'fixe und variable Kosten unterscheiden einfach erklärt',
  3: 'kurzfristige Preisuntergrenze berechnen einfach erklärt',
  4: 'langfristige Preisuntergrenze berechnen einfach erklärt',
  5: 'Break-even-Menge Break-even-Umsatz berechnen einfach erklärt',
  6: 'Sortimentsentscheidung Deckungsbeitrag Fixkosten einfach erklärt',
  7: 'wirtschaftliche Bewertung Kostenrechnung Beispiel',
  8: 'Handelskalkulation Selbstkosten berechnen einfach erklärt',
};

const FINANCE_YOUTUBE_BY_STAGE = {
  1: 'Eigenkapitalrentabilität Umsatzrentabilität berechnen einfach erklärt',
  2: 'Liquidität 1 Grades berechnen einfach erklärt',
  3: 'Liquidität 2 Grades Quick Ratio berechnen einfach erklärt',
  4: 'Liquidität interpretieren unter 100 Prozent erklärt',
  5: 'Maßnahmen Liquidität verbessern Factoring Mahnwesen',
  6: 'Zielkonflikt Liquidität und Rentabilität erklärt',
};

const SORTIMENT_YOUTUBE_BY_STAGE = {
  1: 'Retourenquote berechnen einfach erklärt',
  2: 'Stornoquote berechnen einfach erklärt',
  3: 'Reklamationsquote berechnen Qualitätsanalyse einfach erklärt',
  4: 'Customer Lifetime Value CLV berechnen einfach erklärt',
  5: 'Break-even-Menge Sortiment berechnen einfach erklärt',
  6: 'Umsatzrentabilität berechnen einfach erklärt',
  7: 'Rückwärtskalkulation vom Bruttoverkaufspreis einfach erklärt',
  8: 'Retourenmanagement Maßnahmen E-Commerce einfach erklärt',
};

const COST_EXPECTED_CONTEXT_BY_STAGE = {
  1: 'Formeln: Stückdeckungsbeitrag = Verkaufspreis - variable Kosten; Betriebsergebnis = Stückdeckungsbeitrag * Absatz - Fixkosten.',
  2: 'Kostenarten: Material, Verpackung, Versand und variable Vertriebskosten sind variabel; Miete, Gehälter und Abschreibungen sind fix.',
  3: 'Kurzfristige Preisuntergrenze entspricht den variablen Stückkosten.',
  4: 'Langfristige Preisuntergrenze = variable Stückkosten + Fixkostenanteil pro Stück.',
  5: 'Break-even-Menge = Fixkosten / Stückdeckungsbeitrag, kaufmännisch auf ganze Stück aufrunden. Break-even-Umsatz = Break-even-Menge * Verkaufspreis.',
  6: 'Sortiment bleibt, wenn entfallender Deckungsbeitrag höher als einsparbare Fixkosten ist.',
  7: 'Bewertung sollte Deckungsbeitrag, Preisuntergrenze, Break-even, Fixkostenstruktur und Sortimentsentscheidung begründet verbinden.',
  8: 'Selbstkosten = Einstandspreis + Handlungskostenzuschlag + Verwaltungs- und Vertriebsgemeinkosten.',
};

const FINANCE_EXPECTED_CONTEXT_BY_STAGE = {
  1: 'Formeln: Eigenkapitalrentabilität = Gewinn / Eigenkapital * 100; Umsatzrentabilität = Gewinn / Umsatz * 100.',
  2: 'Liquidität 1. Grades = Kasse und Bank / kurzfristige Verbindlichkeiten * 100.',
  3: 'Liquidität 2. Grades = (Kasse und Bank + Forderungen) / kurzfristige Verbindlichkeiten * 100.',
  4: 'Bei einem Wert unter 100 Prozent ist die kurzfristige Zahlungsfähigkeit kritisch, weil weitere Zuflüsse nötig sind.',
  5: 'Sofortmaßnahmen sind z. B. Factoring, strikteres Mahnwesen, Skonto-Nutzung und Lagerabbau.',
  6: 'Sofortige Schuldentilgung senkt den Cash-Bestand und damit die Liquidität 1. Grades.',
};

const SORTIMENT_EXPECTED_CONTEXT_BY_STAGE = {
  1: 'Retourenquote = retournierte Bestellungen / Gesamtbestellungen * 100.',
  2: 'Stornoquote = Stornierungen vor Versand / Gesamtbestellungen * 100.',
  3: 'Reklamationsquote = Reklamationen / verkaufte Stück * 100; Anteil berechtigter Reklamationen = berechtigte Reklamationen / Reklamationen * 100.',
  4: 'CLV = Deckungsbeitrag je Bestellung * Bestellungen pro Jahr * Jahre - Marketingkosten pro Kunde und Jahr * Jahre.',
  5: 'Deckungsbeitrag je Stück = Verkaufspreis - variable Kosten; Break-even-Menge = Fixkosten / Stückdeckungsbeitrag und aufrunden.',
  6: 'Umsatzrentabilität = Gewinn / Umsatz * 100.',
  7: 'Rückwärtskalkulation: Brutto-LVP -> Netto-LVP -> ZVP -> BVP -> Selbstkosten -> Einstandspreis.',
  8: 'Maßnahmen sollen Retourenquote, Stornoquote, Reklamationslage und CLV logisch verbinden.',
};

function getStageYoutubeQuery(variant, stageId, fallbackTitle) {
  if (variant === 'sortiment-retouren-3e') return SORTIMENT_YOUTUBE_BY_STAGE[stageId] || fallbackTitle;
  if (variant === 'finance-liquidity') return FINANCE_YOUTUBE_BY_STAGE[stageId] || fallbackTitle;
  return COST_YOUTUBE_BY_STAGE[stageId] || fallbackTitle;
}

function getStageExpectedContext(variant, stageId) {
  if (variant === 'sortiment-retouren-3e') return SORTIMENT_EXPECTED_CONTEXT_BY_STAGE[stageId] || 'Nutze die passende Formel und rechne kaufmännisch sauber.';
  if (variant === 'finance-liquidity') return FINANCE_EXPECTED_CONTEXT_BY_STAGE[stageId] || 'Nutze die passende Formel und rechne kaufmännisch sauber.';
  return COST_EXPECTED_CONTEXT_BY_STAGE[stageId] || 'Nutze die passende Formel und rechne kaufmännisch sauber.';
}

export default function CostCalcBossModuleView({ onBack, onLearningEvent }) {
  const mountRef = useRef(null);
  const moduleRef = useRef(null);
  const [moduleVariant, setModuleVariant] = useState('cost-calc');
  const [activeStage, setActiveStage] = useState({ id: 1, title: 'Etappe 1', prompt: '' });

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [videoError, setVideoError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [geminiVisible, setGeminiVisible] = useState(false);
  const [geminiQuery, setGeminiQuery] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState('');

  const syncActiveStage = () => {
    const module = moduleRef.current;
    if (!module || !module.tasks?.length) return;
    const currentTask = module.tasks[module.state.currentTask];
    if (!currentTask) return;
    const prompt = typeof currentTask.prompt === 'function' ? currentTask.prompt(module.state.data) : '';
    setActiveStage((prev) => {
      if (prev.id === currentTask.id && prev.title === currentTask.title && prev.prompt === prompt) return prev;
      return { id: currentTask.id, title: currentTask.title, prompt };
    });
  };

  const resetLearningPanels = () => {
    setVideoOpen(false);
    setVideoLoading(false);
    setVideos([]);
    setVideoError('');
    setSelectedVideo(null);
    setGeminiVisible(false);
    setGeminiQuery('');
    setGeminiLoading(false);
    setGeminiResponse('');
  };

  const handleToggleVideos = async () => {
    if (videoOpen) {
      setVideoOpen(false);
      setSelectedVideo(null);
      return;
    }

    setVideoOpen(true);
    setVideoLoading(true);
    setVideoError('');
    setSelectedVideo(null);

    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) {
      setVideos([]);
      setVideoError('Kein YouTube API-Key gefunden. Bitte VITE_YOUTUBE_API_KEY in der .env setzen.');
      setVideoLoading(false);
      return;
    }

    try {
      const query = getStageYoutubeQuery(moduleVariant, activeStage.id, activeStage.title);
      const fetched = await fetchYouTubeVideos(query, apiKey, 4);
      setVideos(fetched || []);
      if (!fetched || fetched.length === 0) {
        setVideoError('Keine passenden Videos gefunden.');
      }
    } catch (_ERROR) {
      setVideos([]);
      setVideoError('Videos konnten aktuell nicht geladen werden.');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleGeminiAsk = async () => {
    if (!geminiQuery.trim() || geminiLoading) return;
    setGeminiLoading(true);
    try {
      const contextQuestion = `${activeStage.title}: ${activeStage.prompt}`;
      const contextAnswer = getStageExpectedContext(moduleVariant, activeStage.id);
      const response = await askGemini(geminiQuery, contextQuestion, contextAnswer);
      setGeminiResponse(response || 'Keine Antwort erhalten.');
    } catch (_ERROR) {
      setGeminiResponse('Die KI-Antwort konnte nicht geladen werden. Bitte gleich noch einmal versuchen.');
    } finally {
      setGeminiLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (!mountRef.current) return undefined;

    let module;
    let intervalId;
    try {
      module = bootstrapCostCalcModule({
        containerEl: mountRef.current,
        variant: moduleVariant,
        onLearningEvent,
      });
      moduleRef.current = module;
      syncActiveStage();
      intervalId = window.setInterval(syncActiveStage, 250);
    } catch (_ERROR) {
      mountRef.current.innerHTML = '<div class="ccm-hint-box">Das Modul konnte nicht geladen werden. Bitte Seite neu laden.</div>';
      return undefined;
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      moduleRef.current = null;
      if (module?.container) {
        module.container.innerHTML = '';
      }
    };
  }, [moduleVariant, onLearningEvent]);

  useEffect(() => {
    resetLearningPanels();
  }, [moduleVariant, activeStage.id]);

  return (
    <div className="app-container ccm-view-root" style={{ zIndex: 10 }}>
      <header className="ccm-view-header" style={{ width: '100%', maxWidth: '980px', marginBottom: '0.85rem' }}>
        <button
          type="button"
          className="btn-nav"
          onClick={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          &larr; Menü
        </button>

        <div className="ccm-view-switcher" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={moduleVariant === 'cost-calc' ? 'ccm-view-switch-btn active' : 'ccm-view-switch-btn'}
            onClick={() => setModuleVariant('cost-calc')}
          >
            Kalkulationsboss
          </button>
          <button
            type="button"
            className={moduleVariant === 'finance-liquidity' ? 'ccm-view-switch-btn active' : 'ccm-view-switch-btn'}
            onClick={() => setModuleVariant('finance-liquidity')}
          >
            Finanz-Analyse
          </button>
          <button
            type="button"
            className={moduleVariant === 'sortiment-retouren-3e' ? 'ccm-view-switch-btn active' : 'ccm-view-switch-btn'}
            onClick={() => setModuleVariant('sortiment-retouren-3e')}
          >
            3e Aufgabenreihe
          </button>
        </div>
      </header>

      <div className="quiz-container" style={{ width: '100%', maxWidth: '980px', marginBottom: '0.5rem', padding: '1rem 1.1rem' }}>
        <div style={{ marginBottom: '0.7rem', color: 'var(--text-muted)', fontSize: '0.92rem', textAlign: 'left' }}>
          Lernhilfe zu {activeStage.title}
        </div>

        <div style={{ marginBottom: '1rem', textAlign: 'center', display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary fade-in ${videoLoading ? 'loading' : ''}`}
            onClick={handleToggleVideos}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px' }}
          >
            <span>📺</span> Videos zu dieser Etappe
          </button>
          <button
            className="btn-secondary fade-in"
            onClick={() => setGeminiVisible((prev) => !prev)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.6rem 1.2rem', borderRadius: '12px' }}
          >
            <span>✨</span> KI Hilfe
          </button>
        </div>

        <VideoPanel
          isOpen={videoOpen}
          isLoading={videoLoading}
          videos={videos}
          error={videoError}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          onCloseVideo={() => setSelectedVideo(null)}
        />

        <GeminiPanel
          isOpen={geminiVisible}
          title={`KI Hilfe zu ${activeStage.title}`}
          placeholder="Frag die KI zum aktuellen Rechenschritt..."
          query={geminiQuery}
          onQueryChange={setGeminiQuery}
          onAsk={handleGeminiAsk}
          isLoading={geminiLoading}
          response={geminiResponse}
        />
      </div>

      <div className="ccm-view-module-wrap" style={{ width: '100%', maxWidth: '980px' }}>
        <div id="calc-boss-module" ref={mountRef} />
      </div>

      <FloatingPortal
        questionId={moduleVariant === 'finance-liquidity'
          ? 'finance_liquidity_module'
          : moduleVariant === 'sortiment-retouren-3e'
            ? 'sortiment_retouren_3e_module'
            : 'cost_calc_boss_module'}
        questionText={moduleVariant === 'finance-liquidity'
          ? 'Finanz-Analyse & Liquiditätsmanagement'
          : moduleVariant === 'sortiment-retouren-3e'
            ? 'Sortimentsanalyse & Retourenmanagement'
            : 'Kostenrechnung & Preisuntergrenze'}
        currentAppMode={moduleVariant === 'finance-liquidity'
          ? 'finance_liquidity'
          : moduleVariant === 'sortiment-retouren-3e'
            ? 'sortiment_retouren_3e'
            : 'cost_calc_boss'}
      />
    </div>
  );
}
