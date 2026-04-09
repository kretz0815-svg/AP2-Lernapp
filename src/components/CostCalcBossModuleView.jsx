import React, { useEffect, useRef, useState } from 'react';
import { bootstrapCostCalcModule, bootstrapDBCalcManager } from '../features/klr';
import { fetchYouTubeVideos } from '../youtubeClient';
import { askGemini } from '../geminiClient';
import FloatingPortal from './FloatingPortal';
import VideoPanel from './VideoPanel';
import GeminiPanel from './GeminiPanel';
import '../features/klr/components/costCalcModule.css';
import '../features/klr/components/dbCalcManager.css';

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
  1: 'Retourenquote E-Commerce berechnen Retourenmanagement',
  2: 'Stornoquote im Onlinehandel berechnen',
  3: 'Reklamationsquote Qualitätsanalyse E-Commerce',
  4: 'Customer Lifetime Value CLV Deckungsbeitrag einfach erklärt',
  5: 'Break-even-Menge Deckungsbeitrag Sortiment berechnen',
  6: 'Umsatzrentabilität Gewinn Umsatz berechnen',
  7: 'Rückwärtskalkulation Brutto Netto Rabatt Skonto',
  8: 'Maßnahmen Retouren senken E-Commerce Produktdaten Größenberatung',
};

const DB_YOUTUBE_BY_STAGE = {
  1: 'Deckungsbeitrag 1 pro Stück berechnen einfach erklärt',
  2: 'Deckungsbeitrag 1 gesamt berechnen',
  3: 'Deckungsbeitrag 2 Fixkostendeckungsrechnung erklärt',
  4: 'Betriebsergebnis aus DB2 berechnen',
  5: 'kurzfristige Preisuntergrenze variable Kosten',
  6: 'langfristige Preisuntergrenze Vollkosten',
  7: 'Zielpreis Rückwärtskalkulation mit Zielgewinn',
  8: 'relativer Deckungsbeitrag Engpassentscheidung',
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

const DB_EXPECTED_CONTEXT_BY_STAGE = {
  1: 'DB I je Stück = p - kv.',
  2: 'Gesamt-DB I = DB I je Stück * Menge.',
  3: 'DB II = Gesamt-DB I - erzeugnisfixe Kosten.',
  4: 'Betriebsergebnis = Summe DB II - unternehmensfixe Kosten.',
  5: 'Kurzfristige PUG entspricht den variablen Stückkosten.',
  6: 'Langfristige PUG basiert auf Vollkosten je Stück.',
  7: 'Zielpreis via Rückwärtsrechnung aus Zielergebnis, Fixkosten und variablen Kosten.',
  8: 'Relativer DB = DB I je Stück / Engpasseinheit; höherer Wert hat Priorität.',
};

const SORTIMENT_VIDEO_KEYWORDS_BY_STAGE = {
  1: ['retoure', 'retouren', 'quote'],
  2: ['storno', 'stornierung', 'quote'],
  3: ['reklamation', 'reklamationsquote', 'qualität'],
  4: ['customer lifetime value', 'clv'],
  5: ['break-even', 'deckungsbeitrag'],
  6: ['umsatzrentabilität', 'rentabilität'],
  7: ['rückwärtskalkulation', 'rabatt', 'skonto'],
  8: ['retourenmanagement', 'retouren', 'maßnahmen'],
};

const DB_VIDEO_KEYWORDS_BY_STAGE = {
  1: ['deckungsbeitrag', 'db'],
  2: ['deckungsbeitrag', 'gesamt'],
  3: ['deckungsbeitrag', 'db ii', 'fixkosten'],
  4: ['betriebsergebnis', 'fixkosten'],
  5: ['preisuntergrenze', 'kurzfristig'],
  6: ['preisuntergrenze', 'langfristig', 'vollkosten'],
  7: ['rückwärtskalkulation', 'zielpreis'],
  8: ['relativer deckungsbeitrag', 'engpass'],
};

function formatNumber(value) {
  return Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function filterSortimentVideos(stageId, videos) {
  const keywords = SORTIMENT_VIDEO_KEYWORDS_BY_STAGE[stageId] || [];
  if (!keywords.length) return videos || [];

  const normalizedKeywords = keywords.map((k) => normalizeText(k));
  const list = Array.isArray(videos) ? videos : [];
  return list.filter((video) => {
    const haystack = normalizeText(`${video?.title || ''} ${video?.channelTitle || ''}`);
    const matches = normalizedKeywords.filter((k) => haystack.includes(k)).length;
    return matches >= 1;
  });
}

function filterDbVideos(stageId, videos) {
  const keywords = DB_VIDEO_KEYWORDS_BY_STAGE[stageId] || [];
  if (!keywords.length) return videos || [];

  const normalizedKeywords = keywords.map((k) => normalizeText(k));
  const list = Array.isArray(videos) ? videos : [];
  return list.filter((video) => {
    const haystack = normalizeText(`${video?.title || ''} ${video?.channelTitle || ''}`);
    const matches = normalizedKeywords.filter((k) => haystack.includes(k)).length;
    return matches >= 1;
  });
}

function buildSortimentCoachResponse(stageId, data) {
  if (!data) {
    return 'Kein aktueller Datensatz gefunden. Bitte Etappe neu laden.';
  }

  if (stageId === 1) {
    return `Retourenquote = ${data.returnedOrders} / ${data.totalOrders} × 100 = ${formatNumber(data.returnRate)} %.`;
  }
  if (stageId === 2) {
    return `Stornoquote = ${data.canceledOrders} / ${data.totalOrders} × 100 = ${formatNumber(data.cancellationRate)} %.`;
  }
  if (stageId === 3) {
    return `Reklamationsquote = ${data.complaintsTotal} / ${data.soldJackets} × 100 = ${formatNumber(data.complaintRate)} %. Anteil berechtigter Reklamationen = ${data.justifiedComplaints} / ${data.complaintsTotal} × 100 = ${formatNumber(data.justifiedComplaintShare)} %. Qualitätsproblem wahrscheinlich: ${data.qualityIssueLikely}.`;
  }
  if (stageId === 4) {
    return `CLV = (${data.avgContributionPerOrder} × ${data.ordersPerYear} × ${data.customerYears}) - (${data.yearlyMarketingCostPerCustomer} × ${data.customerYears}) = ${formatNumber(data.clv)} EUR.`;
  }
  if (stageId === 5) {
    return `Deckungsbeitrag je Stück = ${data.salesPricePants} - ${data.variableCostPants} = ${formatNumber(data.dbUnitPants)} EUR. Break-even-Menge = ${data.fixedCostPants} / ${formatNumber(data.dbUnitPants)} = ${data.breakEvenQtyPants} Stück (aufgerundet). Geplanter Absatz ${data.plannedSalesPants} Stück => wirtschaftlich: ${data.isPantsEconomicAtPlan}.`;
  }
  if (stageId === 6) {
    return `Umsatzrentabilität = ${data.outdoorProfitQ1} / ${data.outdoorRevenueQ1} × 100 = ${formatNumber(data.revenueProfitability)} %.`;
  }
  if (stageId === 7) {
    return `Rückwärtskalkulation: LVP brutto ${formatNumber(data.listSalesPriceGross)} EUR -> LVP netto ${formatNumber(data.listSalesPriceNet)} EUR -> ZVP ${formatNumber(data.targetSalesPrice)} EUR -> BVP ${formatNumber(data.cashSalesPrice)} EUR -> Selbstkosten ${formatNumber(data.selfCost)} EUR -> maximaler Einstandspreis ${formatNumber(data.maxPurchasePrice)} EUR.`;
  }
  if (stageId === 8) {
    return `Drei sinnvolle Maßnahmen: 1) Größenberatung und bessere Produktdaten für weniger Retouren. 2) Qualitätskontrolle und Lieferantenfeedback für weniger berechtigte Reklamationen. 3) Checkout- und Lieferzeit-Optimierung zur Senkung der Stornoquote und Stabilisierung des CLV (${formatNumber(data.clv)} EUR).`;
  }

  return 'Nutze die Kennzahlen der aktuellen Etappe und rechne mit den angezeigten Daten.';
}

function getStageYoutubeQuery(variant, stageId, fallbackTitle) {
  if (variant === 'db-calc-manager') return DB_YOUTUBE_BY_STAGE[stageId] || fallbackTitle;
  if (variant === 'sortiment-retouren-3e') return SORTIMENT_YOUTUBE_BY_STAGE[stageId] || fallbackTitle;
  if (variant === 'finance-liquidity') return FINANCE_YOUTUBE_BY_STAGE[stageId] || fallbackTitle;
  return COST_YOUTUBE_BY_STAGE[stageId] || fallbackTitle;
}

function getStageExpectedContext(variant, stageId) {
  if (variant === 'db-calc-manager') return DB_EXPECTED_CONTEXT_BY_STAGE[stageId] || 'Nutze die passende Formel und rechne kaufmännisch sauber.';
  if (variant === 'sortiment-retouren-3e') return SORTIMENT_EXPECTED_CONTEXT_BY_STAGE[stageId] || 'Nutze die passende Formel und rechne kaufmännisch sauber.';
  if (variant === 'finance-liquidity') return FINANCE_EXPECTED_CONTEXT_BY_STAGE[stageId] || 'Nutze die passende Formel und rechne kaufmännisch sauber.';
  return COST_EXPECTED_CONTEXT_BY_STAGE[stageId] || 'Nutze die passende Formel und rechne kaufmännisch sauber.';
}

function getStageDataFacts(variant, stageId, data) {
  if (!data) return '';

  if (variant === 'db-calc-manager') {
    if (stageId === 1) return `Aktuelle Werte: pA=${data.pA}, kvA=${data.kvA}, pB=${data.pB}, kvB=${data.kvB}.`;
    if (stageId === 2) return `Aktuelle Werte: Menge A=${data.qtyA}, Menge B=${data.qtyB}, DB1/Stück A=${data.db1UnitA}, DB1/Stück B=${data.db1UnitB}.`;
    if (stageId === 3) return `Aktuelle Werte: Gesamt-DB1 A=${data.db1TotalA}, Gesamt-DB1 B=${data.db1TotalB}, Kfix_erz A=${data.kfixErzA}, Kfix_erz B=${data.kfixErzB}.`;
    if (stageId === 4) return `Aktuelle Werte: DB2 A=${data.db2A}, DB2 B=${data.db2B}, Kfix_unt=${data.kfixUnt}.`;
    if (stageId === 5) return `Aktuelle Werte: kvA=${data.kvA}, kvB=${data.kvB}.`;
    if (stageId === 6) return `Aktuelle Werte: kvA=${data.kvA}, kvB=${data.kvB}, Kfix_erz A=${data.kfixErzA}, Kfix_erz B=${data.kfixErzB}, Kfix_unt=${data.kfixUnt}, Menge A=${data.qtyA}, Menge B=${data.qtyB}.`;
    if (stageId === 7) return `Aktuelle Werte: Zielmenge B=${data.targetQtyB}, Zielergebnis=${data.targetProfit}, pA=${data.pA}, kvA=${data.kvA}, Menge A=${data.qtyA}, kvB=${data.kvB}.`;
    if (stageId === 8) return `Aktuelle Werte: DB1/Stück A=${data.db1UnitA}, DB1/Stück B=${data.db1UnitB}, Engpass A=${data.engpassA}, Engpass B=${data.engpassB}.`;
  }

  if (variant === 'sortiment-retouren-3e') {
    if (stageId === 1) return `Aktuelle Werte: Gesamtbestellungen=${data.totalOrders}, retournierte Bestellungen=${data.returnedOrders}.`;
    if (stageId === 2) return `Aktuelle Werte: Gesamtbestellungen=${data.totalOrders}, Stornierungen vor Versand=${data.canceledOrders}.`;
    if (stageId === 3) return `Aktuelle Werte: verkauft=${data.soldJackets}, Reklamationen gesamt=${data.complaintsTotal}, berechtigt=${data.justifiedComplaints}, unberechtigt=${data.unjustifiedComplaints}.`;
    if (stageId === 4) return `Aktuelle Werte: Deckungsbeitrag je Bestellung=${data.avgContributionPerOrder}, Bestellungen/Jahr=${data.ordersPerYear}, Kundenjahre=${data.customerYears}, Marketingkosten/Jahr=${data.yearlyMarketingCostPerCustomer}.`;
    if (stageId === 5) return `Aktuelle Werte: Fixkosten=${data.fixedCostPants}, Verkaufspreis=${data.salesPricePants}, variable Kosten=${data.variableCostPants}, Planabsatz=${data.plannedSalesPants}.`;
    if (stageId === 6) return `Aktuelle Werte: Umsatz=${data.outdoorRevenueQ1}, Gewinn=${data.outdoorProfitQ1}.`;
    if (stageId === 7) return `Aktuelle Werte: LVP brutto=${data.listSalesPriceGross}, USt=${data.vatRate}%, Rabatt=${data.customerDiscountRate}%, Skonto=${data.customerSkontoRate}%, Gewinnzuschlag=${data.profitMarkupRate}%, Handlungskosten=${data.handlingCostRate}%.`;
    if (stageId === 8) return `Aktuelle Kennzahlen: Retourenquote=${data.returnRate}%, Stornoquote=${data.cancellationRate}%, Reklamationsquote=${data.complaintRate}%, berechtigte Reklamationen=${data.justifiedComplaintShare}%, CLV=${data.clv}.`;
  }

  return '';
}

export default function CostCalcBossModuleView({ onBack, onLearningEvent }) {
  const mountRef = useRef(null);
  const moduleRef = useRef(null);
  const onLearningEventRef = useRef(onLearningEvent);
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
      const curated = moduleVariant === 'sortiment-retouren-3e'
        ? filterSortimentVideos(activeStage.id, fetched)
        : moduleVariant === 'db-calc-manager'
          ? filterDbVideos(activeStage.id, fetched)
          : (fetched || []);
      setVideos(curated || []);
      if (!curated || curated.length === 0) {
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
      const dataSnapshot = moduleRef.current?.state?.data;
      if (moduleVariant === 'sortiment-retouren-3e') {
        const localResponse = buildSortimentCoachResponse(activeStage.id, dataSnapshot);
        setGeminiResponse(localResponse);
        return;
      }
      const stageFacts = getStageDataFacts(moduleVariant, activeStage.id, dataSnapshot);
      const contextQuestion = `${activeStage.title}: ${activeStage.prompt}\n${stageFacts}\nWichtig: Nutze ausschließlich diese aktuellen Werte, keine Beispielzahlen.`;
      const contextAnswer = `${getStageExpectedContext(moduleVariant, activeStage.id)} Nutze ausschließlich die oben genannten aktuellen Werte und gib Rechenschritte mit genau diesen Zahlen an.`;
      const response = await askGemini(geminiQuery, contextQuestion, contextAnswer);
      setGeminiResponse(response || 'Keine Antwort erhalten.');
    } catch (_ERROR) {
      setGeminiResponse('Die KI-Antwort konnte nicht geladen werden. Bitte gleich noch einmal versuchen.');
    } finally {
      setGeminiLoading(false);
    }
  };

  useEffect(() => {
    onLearningEventRef.current = onLearningEvent;
  }, [onLearningEvent]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (!mountRef.current) return undefined;
    mountRef.current.classList.remove('dbc-mode');

    let module;
    let intervalId;
    try {
      if (moduleVariant === 'db-calc-manager') {
        mountRef.current.classList.add('dbc-mode');
        module = bootstrapDBCalcManager({
          containerEl: mountRef.current,
          onLearningEvent: (event) => {
            onLearningEventRef.current?.(event);
          },
        });
      } else {
        module = bootstrapCostCalcModule({
          containerEl: mountRef.current,
          variant: moduleVariant,
          onLearningEvent: (event) => {
            onLearningEventRef.current?.(event);
          },
        });
      }
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
      if (mountRef.current) {
        mountRef.current.classList.remove('dbc-mode');
      }
    };
  }, [moduleVariant]);

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
            Kostenrechnung
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
            Sortimentsanalyse
          </button>
          <button
            type="button"
            className={moduleVariant === 'db-calc-manager' ? 'ccm-view-switch-btn active' : 'ccm-view-switch-btn'}
            onClick={() => setModuleVariant('db-calc-manager')}
          >
            DB I & DB II
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
          : moduleVariant === 'db-calc-manager'
            ? 'db_calc_manager_module'
          : moduleVariant === 'sortiment-retouren-3e'
            ? 'sortiment_retouren_3e_module'
            : 'cost_calc_boss_module'}
        questionText={moduleVariant === 'finance-liquidity'
          ? 'Finanz-Analyse & Liquiditätsmanagement'
          : moduleVariant === 'db-calc-manager'
            ? 'DB I & DB II Fixkostendeckungsrechnung'
          : moduleVariant === 'sortiment-retouren-3e'
            ? 'Sortimentsanalyse & Retourenmanagement'
            : 'Kostenrechnung & Preisuntergrenze'}
        currentAppMode={moduleVariant === 'finance-liquidity'
          ? 'finance_liquidity'
          : moduleVariant === 'db-calc-manager'
            ? 'db_calc_manager'
          : moduleVariant === 'sortiment-retouren-3e'
            ? 'sortiment_retouren_3e'
            : 'cost_calc_boss'}
      />
    </div>
  );
}
