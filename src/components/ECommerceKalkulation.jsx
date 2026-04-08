import React, { useState, useRef, useCallback, useMemo } from 'react';
import FloatingPortal from './FloatingPortal';
import Confetti from './Confetti';

// ═══════════════════════════════════════════════════════════════
// E-COMMERCE KALKULATION – Endless-Task-Generator
// IHK GAP 2 Standard: Betriebswirtschaftliche Kalkulationstabelle
// ═══════════════════════════════════════════════════════════════

// ── Kaufmännische Rundung auf 1 bzw. 2 Nachkommastellen ─────
const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Formatierung ─────────────────────────────────────────────
const fmt = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtEuro = (v) => `${fmt(v)} €`;
const fmtPct = (v) => `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

// ── Zufalls-Helfer ───────────────────────────────────────────
const randBetween = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Szenario-Daten (für Textgenerierung) ──────────────────────
const COMPANIES = ["Glühfuchs Handels GmbH", "CampGear KG", "AlpinSports AG", "NatureFlow e.K.", "PeakPerformance Ltd.", "TrailBlazer OHG"];
const PRODUCTS = ["Zelte", "Wanderschuhe", "Kletterseile", "Campingkocher", "hochwertige Rucksäcke", "Outdoor-Equipment"];

// ═══════════════════════════════════════════════════════════════
// AUFGABEN-GENERATOR
// ═══════════════════════════════════════════════════════════════
//
// WICHTIG – Netto vs. Brutto Bezug:
// ─────────────────────────────────────────────────────────────
// • Wareneinsatz & Provision werden vom NETTO-Warenwert berechnet,
//   weil sie den tatsächlichen Warenwert ohne Versand als Basis haben.
//   Der Wareneinsatz ist der Einkaufspreis der Ware (netto),
//   die Provision geht an den Marktplatz und bezieht sich auf den
//   Netto-Verkaufspreis des Produkts.
//
// • Marketing & Payment werden vom BRUTTO-Gesamtumsatz berechnet,
//   weil diese Kosten sich auf den gesamten Zahlungsfluss beziehen:
//   - Payment-Gebühren (z.B. PayPal, Klarna) werden auf den
//     Brutto-Betrag berechnet, den der Kunde tatsächlich zahlt.
//   - Marketing-Kosten (z.B. Google Ads) beziehen sich oft auf
//     den Brutto-Umsatz als KPI.
//
// • Logistikkosten sind eine Flat-Fee pro Paket (Stückzahl × Pauschale)
// ═══════════════════════════════════════════════════════════════

function generateECommerceTask() {
  // ── 1. Random Basiswerte generieren ─────────────────────────
  const totalGrossRevenueRaw = round2(randBetween(150000, 450000));
  const basketGrossValue = round2(randBetween(60, 180));

  // Versandkosten: Fix 4,95 € oder 5,95 €
  const shippingGrossCustomer = Math.random() < 0.5 ? 4.95 : 5.95;

  // MwSt-Satz (Konstante 19%)
  const VAT_RATE = 1.19;

  // ── 2. Bestellanzahl berechnen und Bruttoumsatz korrigieren ──
  // Zuerst die Bestellanzahl durch Division ermitteln, dann abrunden
  // und den Bruttoumsatz korrigieren, damit er exakt = n * Warenkorbwert ist.
  const orderCount = Math.floor(totalGrossRevenueRaw / basketGrossValue);
  const totalGrossRevenue = round2(orderCount * basketGrossValue);

  // ── 3. Nettowerte berechnen ─────────────────────────────────
  // Gesamter Nettoumsatz = Bruttoumsatz / 1.19
  const totalNetRevenue = round2(totalGrossRevenue / VAT_RATE);

  // Netto-Versanderlöse pro Bestellung = Versand brutto / 1.19, dann × Bestellanzahl
  const netShippingPerOrder = round2(shippingGrossCustomer / VAT_RATE);
  const netShippingRevenue = round2(orderCount * netShippingPerOrder);

  // Netto-Produkterlöse (reiner Warenwert) = Gesamter Nettoumsatz - Netto-Versanderlöse
  const netProductRevenue = round2(totalNetRevenue - netShippingRevenue);

  // ── 4. Kostenfaktoren (randomisiert) ────────────────────────

  // WARENEINSATZ: 35-55% vom NETTO-Warenwert
  // Begründung: Der Wareneinsatz (Einkaufspreis) wird vom Netto-Warenwert
  // berechnet, weil die MwSt durchlaufender Posten ist und nicht
  // in die Kostenkalkulation einfließt.
  const wareneinsatzRate = round1(randBetween(35, 55));
  const wareneinsatz = round2(netProductRevenue * wareneinsatzRate / 100);

  // PROVISION: 10-15% vom NETTO-Warenwert
  // Begründung: Die Marktplatz-Provision (z.B. Amazon, eBay) bezieht
  // sich auf den Netto-Verkaufspreis des Produkts. Die Umsatzsteuer
  // ist kein Erlös des Händlers, daher wird sie nicht provisioniert.
  const provisionRate = round1(randBetween(10, 15));
  const provision = round2(netProductRevenue * provisionRate / 100);

  // MARKETING & PAYMENT: 8-12% vom BRUTTO-Gesamtumsatz
  // Begründung: Payment-Gebühren (PayPal, Klarna, Kreditkarte) werden
  // immer auf den Brutto-Betrag berechnet, den der Kunde zahlt.
  // Marketing-KPIs wie ROAS beziehen sich ebenfalls auf Bruttoumsätze.
  // Deshalb ist die Basis hier der gesamte Bruttoumsatz.
  const marketingPaymentRate = round1(randBetween(8, 12));
  const marketingPayment = round2(totalGrossRevenue * marketingPaymentRate / 100);

  // LOGISTIKKOSTEN: 6,50-9,50 € pro Paket × Bestellanzahl
  // Begründung: Logistikkosten sind eine Flat-Fee pro versandtem Paket
  // (Pick & Pack, Verpackung, Übergabe an DHL/GLS etc.)
  const logisticsFlatFee = round2(randBetween(6.50, 9.50));
  const logisticsCost = round2(orderCount * logisticsFlatFee);

  // ── 5. Kurzfristiger Erfolg ────────────────────────────────
  // = Nettoerlöse (Warenwert + Versand) - alle Kosten
  const nettoErloese = round2(netProductRevenue + netShippingRevenue);
  const kurzfristigerErfolg = round2(
    nettoErloese - wareneinsatz - provision - marketingPayment - logisticsCost
  );

  // ── 6. Dynamisches Szenario (Fließtext) generieren ─────────
  const company = COMPANIES[randInt(0, COMPANIES.length - 1)];
  const product = PRODUCTS[randInt(0, PRODUCTS.length - 1)];

  const scenarioText = `Die ${company} vertreibt ${product} über einen Online-Marktplatz. Im letzten Quartal wurde ein Bruttoumsatz von ${fmtEuro(totalGrossRevenue)} erzielt. Dabei wurden insgesamt ${orderCount.toLocaleString('de-DE')} Bestellungen abgewickelt. Der durchschnittliche Brutto-Warenkorbwert lag bei ${fmtEuro(basketGrossValue)}, wobei pro Bestellung pauschale Versandkosten von ${fmtEuro(shippingGrossCustomer)} (brutto) berechnet wurden.

Kalkulieren Sie den kurzfristigen Erfolg des Quartals (Umsatzsteuer: ${Math.round((VAT_RATE - 1) * 100)} %) unter Berücksichtigung der folgenden Kostensätze:

• Der Wareneinsatz beträgt ${fmtPct(wareneinsatzRate)} vom Netto-Warenwert.
• Die Provision beträgt ${fmtPct(provisionRate)} vom Netto-Warenwert.
• Die Marketing- und Paymentkosten belaufen sich auf ${fmtPct(marketingPaymentRate)} vom Brutto-Gesamterlös.
• Zusätzlich fallen pro Paket reine Logistikkosten (Pick & Pack, Fracht) in Höhe von ${fmtEuro(logisticsFlatFee)} an.`;

  return {
    // Gegebene Werte (für die Aufgabenstellung)
    given: {
      scenarioText,
      totalGrossRevenue,
      basketGrossValue,
      shippingGrossCustomer,
      orderCount,
      vatRate: VAT_RATE,
      wareneinsatzRate,
      provisionRate,
      marketingPaymentRate,
      logisticsFlatFee,
    },
    // Berechnete Lösungswerte
    solution: {
      netProductRevenue,     // Zeile 1: Nettoumsatz (reiner Warenwert)
      netShippingRevenue,    // Zeile 2: Netto-Versanderlöse
      nettoErloese,          // Zeile 3: Nettoerlöse (Summe 1+2)
      wareneinsatz,          // Zeile 4: Wareneinstand
      provision,             // Zeile 5: Provisionen
      marketingPayment,      // Zeile 6: Marketing/Payment
      logisticsCost,         // Zeile 7: Logistikkosten
      kurzfristigerErfolg,   // Zeile 8: Kurzfristiger Erfolg
    },
    // Tabellenstruktur für die Anzeige
    rows: [
      {
        key: 'netProductRevenue',
        label: 'Nettoumsatz (reiner Warenwert)',
        sublabel: `Bruttoumsatz ${fmtEuro(totalGrossRevenue)} ÷ ${VAT_RATE} − Versanderlöse`,
        value: netProductRevenue,
        hint: `Schritt 1: Gesamten Nettoumsatz berechnen:\n${fmtEuro(totalGrossRevenue)} ÷ ${VAT_RATE} = ${fmtEuro(totalNetRevenue)}\n\nSchritt 2: Netto-Versanderlöse berechnen:\n${orderCount} × (${fmtEuro(shippingGrossCustomer)} ÷ ${VAT_RATE}) = ${orderCount} × ${fmtEuro(netShippingPerOrder)} = ${fmtEuro(netShippingRevenue)}\n\nSchritt 3: Reiner Warenwert:\n${fmtEuro(totalNetRevenue)} − ${fmtEuro(netShippingRevenue)} = ${fmtEuro(netProductRevenue)}`,
        prefix: '',
        basisInfo: 'Netto-Basis (Brutto ÷ 1,19 − Versand)',
      },
      {
        key: 'netShippingRevenue',
        label: 'Netto-Versanderlöse',
        sublabel: `${orderCount} Bestellungen × ${fmtEuro(shippingGrossCustomer)} ÷ ${VAT_RATE}`,
        value: netShippingRevenue,
        hint: `Netto-Versand pro Bestellung:\n${fmtEuro(shippingGrossCustomer)} ÷ ${VAT_RATE} = ${fmtEuro(netShippingPerOrder)}\n\nGesamt:\n${orderCount} × ${fmtEuro(netShippingPerOrder)} = ${fmtEuro(netShippingRevenue)}`,
        prefix: '+',
        basisInfo: 'Stückzahl × (Brutto-Versand ÷ 1,19)',
      },
      {
        key: 'nettoErloese',
        label: '= Nettoerlöse (gesamt)',
        sublabel: 'Zeile 1 + Zeile 2',
        value: nettoErloese,
        hint: `${fmtEuro(netProductRevenue)} + ${fmtEuro(netShippingRevenue)} = ${fmtEuro(nettoErloese)}`,
        prefix: '=',
        isSum: true,
        basisInfo: 'Summenzeile',
      },
      {
        key: 'wareneinsatz',
        label: 'Wareneinstand',
        sublabel: `${fmtPct(wareneinsatzRate)} von Zeile 1 (Netto-Warenwert)`,
        value: wareneinsatz,
        hint: `Basis = Netto-Warenwert (Zeile 1)\n${fmtEuro(netProductRevenue)} × ${wareneinsatzRate}% = ${fmtEuro(wareneinsatz)}\n\n⚠️ Warum vom Netto?\nDer Wareneinsatz ist der Einkaufspreis – dieser wird immer netto kalkuliert, da die MwSt ein durchlaufender Posten ist.`,
        prefix: '−',
        basisInfo: '⚠️ Netto-Warenwert (Zeile 1)',
      },
      {
        key: 'provision',
        label: 'Provisionen',
        sublabel: `${fmtPct(provisionRate)} von Zeile 1 (Netto-Warenwert)`,
        value: provision,
        hint: `Basis = Netto-Warenwert (Zeile 1)\n${fmtEuro(netProductRevenue)} × ${provisionRate}% = ${fmtEuro(provision)}\n\n⚠️ Warum vom Netto?\nDie Marktplatz-Provision bezieht sich auf den Netto-Verkaufspreis. Die MwSt ist kein Erlös des Händlers und wird nicht provisioniert.`,
        prefix: '−',
        basisInfo: '⚠️ Netto-Warenwert (Zeile 1)',
      },
      {
        key: 'marketingPayment',
        label: 'Marketing-/Payment-Kosten',
        sublabel: `${fmtPct(marketingPaymentRate)} vom Bruttoumsatz (${fmtEuro(totalGrossRevenue)})`,
        value: marketingPayment,
        hint: `Basis = Brutto-Gesamtumsatz\n${fmtEuro(totalGrossRevenue)} × ${marketingPaymentRate}% = ${fmtEuro(marketingPayment)}\n\n⚠️ Warum vom Brutto?\nPayment-Gebühren (PayPal, Klarna) werden auf den Brutto-Betrag berechnet, den der Kunde tatsächlich zahlt. Auch Marketing-KPIs wie ROAS basieren auf Bruttoumsätzen.`,
        prefix: '−',
        basisInfo: '⚠️ Brutto-Umsatz (gesamt)',
      },
      {
        key: 'logisticsCost',
        label: 'Logistikkosten',
        sublabel: `${orderCount} Pakete × ${fmtEuro(logisticsFlatFee)}`,
        value: logisticsCost,
        hint: `Flat-Fee pro Paket:\n${orderCount} × ${fmtEuro(logisticsFlatFee)} = ${fmtEuro(logisticsCost)}\n\nLogistikkosten sind ein fester Betrag pro Sendung (Pick & Pack, Verpackung, Carrier).`,
        prefix: '−',
        basisInfo: 'Stückzahl × Pauschale',
      },
      {
        key: 'kurzfristigerErfolg',
        label: '= Kurzfristiger Erfolg',
        sublabel: 'Zeile 3 − (Zeilen 4 bis 7)',
        value: kurzfristigerErfolg,
        hint: `${fmtEuro(nettoErloese)}\n− ${fmtEuro(wareneinsatz)} (Wareneinstand)\n− ${fmtEuro(provision)} (Provisionen)\n− ${fmtEuro(marketingPayment)} (Marketing/Payment)\n− ${fmtEuro(logisticsCost)} (Logistik)\n= ${fmtEuro(kurzfristigerErfolg)}`,
        prefix: '=',
        isSum: true,
        basisInfo: 'Ergebnis',
      },
    ],
  };
}

// ── Toleranz-Prüfung (±0,10 € wegen Rundungsdifferenzen) ──
const TOLERANCE_CENTS = 10; // 0,10 €
const isWithinTolerance = (userVal, expectedVal) => {
  return Math.abs(Math.round(userVal * 100) - Math.round(expectedVal * 100)) <= TOLERANCE_CENTS;
};

// ── Farben ───────────────────────────────────────────────────
const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#0ea5e9',
  nettoAccent: '#a78bfa',    // lila für Netto-Basis
  bruttoAccent: '#fb923c',   // orange für Brutto-Basis
};

// ═══════════════════════════════════════════════════════════════
// KOMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function ECommerceKalkulation({ onBack, onLearningEvent }) {
  const [task, setTask] = useState(() => generateECommerceTask());
  const [inputs, setInputs] = useState({});
  const [fieldStates, setFieldStates] = useState({});
  const [showHints, setShowHints] = useState({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [showFullSolution, setShowFullSolution] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [basisFeedback, setBasisFeedback] = useState({});
  const [difficultyLevel, setDifficultyLevel] = useState(2); // 1 = Lernmodus, 2 = Übungsmodus, 3 = Prüfungsmodus
  const inputRefs = useRef({});

  const allCorrect = useMemo(() => {
    return task.rows.every((row) => fieldStates[row.key] === 'correct');
  }, [fieldStates, task.rows]);

  const correctCount = useMemo(() => {
    return task.rows.filter((row) => fieldStates[row.key] === 'correct').length;
  }, [fieldStates, task.rows]);

  const solutionUnlocked = failedAttempts >= 3;

  const handleNewTask = useCallback(() => {
    setTask(generateECommerceTask());
    setInputs({});
    setFieldStates({});
    setShowHints({});
    setFailedAttempts(0);
    setTotalAttempted(0);
    setShowFullSolution(false);
    setShowConfetti(false);
    setBasisFeedback({});
  }, []);

  const parseInput = (raw) => {
    const cleaned = String(raw ?? '').trim().replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
    if (!cleaned) return NaN;
    return Number(cleaned);
  };

  const validateField = useCallback((key) => {
    const row = task.rows.find((r) => r.key === key);
    if (!row) return;

    const userVal = parseInput(inputs[key]);
    if (!Number.isFinite(userVal)) return;

    const isCorrect = isWithinTolerance(userVal, row.value);

    setFieldStates((prev) => ({ ...prev, [key]: isCorrect ? 'correct' : 'wrong' }));

    // Basis-Feedback: Prüfe ob der User die richtige Basis (Netto/Brutto) verwendet hat
    if (!isCorrect && (key === 'wareneinsatz' || key === 'provision')) {
      // Hat der User evtl. vom Brutto statt vom Netto gerechnet?
      const bruttoBasedValue = round2(task.given.totalGrossRevenue / task.given.vatRate *
        (key === 'wareneinsatz' ? task.given.wareneinsatzRate : task.given.provisionRate) / 100);
      if (isWithinTolerance(userVal, bruttoBasedValue)) {
        setBasisFeedback((prev) => ({
          ...prev,
          [key]: '⚠️ Du hast vom gesamten Nettoumsatz gerechnet! Diese Position wird nur vom Netto-WARENWERT (Zeile 1, ohne Versand) berechnet.'
        }));
      }
    } else if (!isCorrect && key === 'marketingPayment') {
      // Hat der User evtl. vom Netto statt vom Brutto gerechnet?
      const nettoBasedValue = round2((task.solution.netProductRevenue) * task.given.marketingPaymentRate / 100);
      if (isWithinTolerance(userVal, nettoBasedValue)) {
        setBasisFeedback((prev) => ({
          ...prev,
          [key]: '⚠️ Du hast vom Netto-Warenwert gerechnet! Marketing-/Payment-Kosten werden vom BRUTTO-Gesamtumsatz berechnet, weil Payment-Gebühren sich auf den Brutto-Zahlungsbetrag beziehen.'
        }));
      }
    }

    if (!isCorrect) {
      setFailedAttempts((prev) => prev + 1);
    }

    if (onLearningEvent) {
      onLearningEvent({
        mode: 'ecommerce_kalkulation',
        questionId: `ecom_kalk_${key}`,
        questionText: `E-Commerce Kalkulation: ${row.label}`,
        correct: isCorrect,
        userAnswer: String(inputs[key] || ''),
        expectedAnswer: row.value.toFixed(2),
        topic: 'E-Commerce Kalkulation',
      });
    }

    return isCorrect;
  }, [task, inputs, onLearningEvent]);

  const validateAll = useCallback(() => {
    let allOk = true;
    const newStates = {};
    task.rows.forEach((row) => {
      const userVal = parseInput(inputs[row.key]);
      if (!Number.isFinite(userVal)) {
        newStates[row.key] = 'wrong';
        allOk = false;
        return;
      }
      const isCorrect = isWithinTolerance(userVal, row.value);
      newStates[row.key] = isCorrect ? 'correct' : 'wrong';
      if (!isCorrect) allOk = false;
    });
    setFieldStates(newStates);
    setTotalAttempted((prev) => prev + 1);
    if (!allOk) {
      setFailedAttempts((prev) => prev + 1);
    } else {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5500);
    }
  }, [task, inputs]);

  const handleKeyDown = useCallback((e, key) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const isCorrect = validateField(key);
      if (isCorrect) {
        // Focus next empty field
        const idx = task.rows.findIndex((r) => r.key === key);
        for (let i = idx + 1; i < task.rows.length; i++) {
          const nextKey = task.rows[i].key;
          if (fieldStates[nextKey] !== 'correct') {
            const el = inputRefs.current[nextKey];
            if (el) {
              el.focus();
              el.select?.();
            }
            break;
          }
        }
      }
    }
  }, [validateField, task.rows, fieldStates]);

  const toggleHint = useCallback((key) => {
    setShowHints((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Gegebene Werte als Infobox ────────────────────────────
  const { given } = task;

  const stateColor = (key) => {
    if (fieldStates[key] === 'correct') return COLORS.success;
    if (fieldStates[key] === 'wrong') return COLORS.error;
    return COLORS.warning;
  };

  return (
    <div className="app-container" style={{ zIndex: 10, maxWidth: '900px' }}>
      {showConfetti && <Confetti />}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', padding: '0.5rem 0 0.5rem 3.5rem', marginBottom: '0.5rem' }}>
        <button
          className="btn-nav"
          style={{ minHeight: '42px', zIndex: 10, padding: '0.4rem 1rem' }}
          onClick={onBack}
        >
          ← Zurück
        </button>
      </div>

      <header style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
        <h1 style={{
          fontFamily: '"Anton", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          fontSize: '2rem',
          transform: 'scaleY(1.15)',
          color: 'var(--text-light)',
          marginBottom: '0.3rem',
          textShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          E-COMMERCE KALKULATION
        </h1>
        <p className="subtitle" style={{ marginBottom: '0.8rem' }}>
          Betriebswirtschaftliche Kalkulation
        </p>

        {/* Score-Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
          <span className="score-badge" style={{ fontSize: '0.85rem' }}>
            {correctCount}/{task.rows.length} korrekt
          </span>
          {failedAttempts > 0 && (
            <span className="score-badge" style={{ fontSize: '0.85rem', borderColor: COLORS.error, color: COLORS.error }}>
              ❌ {failedAttempts} Fehler
            </span>
          )}
        </div>
      </header>

      {/* ── Level Selector (Scaffolding) ──────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.2rem', marginTop: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
        {[
          { level: 1, label: ' Lernmodus', desc: 'Sichtbare Rechenwege' },
          { level: 2, label: ' Übungsmodus', desc: 'Tipps auf Klick' },
          { level: 3, label: 'Prüfungsmodus', desc: 'Nur Szenario-Text' },
        ].map(lvl => (
          <button
            key={lvl.level}
            onClick={() => {
              setDifficultyLevel(lvl.level);
              setFieldStates({});
              setShowHints({});
              setFailedAttempts(0);
              setShowFullSolution(false);
            }}
            style={{
              flex: '1', minWidth: '130px', maxWidth: '180px',
              padding: '0.6rem 0.5rem',
              background: difficultyLevel === lvl.level ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${difficultyLevel === lvl.level ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              color: difficultyLevel === lvl.level ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{lvl.label}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{lvl.desc}</div>
          </button>
        ))}
      </div>

      <div className="quiz-container" style={{ width: '100%' }}>
        {/* ── Szenario / Gegebene Werte ─────────────────────── */}
        <div style={{
          marginBottom: '1rem',
          padding: '1.2rem 1.4rem',
          borderRadius: '12px',
          border: '1px solid rgba(99,102,241,0.3)',
          background: 'rgba(99,102,241,0.08)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Szenario & Aufgabenstellung
          </div>
          <div style={{
            color: 'var(--text-light)',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}>
            {given.scenarioText}
          </div>
        </div>

        {/* ── Legende: Netto vs Brutto ──────────────────────── */}
        {difficultyLevel < 3 && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.82rem',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.35rem 0.7rem', borderRadius: '8px',
              background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
              color: COLORS.nettoAccent,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.nettoAccent }}></span>
              Netto-Basis
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.35rem 0.7rem', borderRadius: '8px',
              background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)',
              color: COLORS.bruttoAccent,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.bruttoAccent }}></span>
              Brutto-Basis
            </div>
          </div>
        )}

        {/* ── Kalkulationstabelle ───────────────────────────── */}
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {task.rows.map((row, idx) => {
            const color = stateColor(row.key);
            const isNettoBase = row.key === 'wareneinsatz' || row.key === 'provision' || row.key === 'netProductRevenue' || row.key === 'netShippingRevenue';
            const isBruttoBase = row.key === 'marketingPayment';
            const accentColor = isBruttoBase ? COLORS.bruttoAccent : isNettoBase ? COLORS.nettoAccent : 'transparent';

            return (
              <div key={row.key} style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '12px',
                border: `1px solid ${fieldStates[row.key] === 'correct'
                  ? 'rgba(34,197,94,0.4)'
                  : fieldStates[row.key] === 'wrong'
                    ? 'rgba(239,68,68,0.4)'
                    : 'rgba(255,255,255,0.1)'
                  }`,
                background: row.isSum
                  ? 'rgba(99,102,241,0.06)'
                  : fieldStates[row.key] === 'correct'
                    ? 'rgba(34,197,94,0.06)'
                    : fieldStates[row.key] === 'wrong'
                      ? 'rgba(239,68,68,0.06)'
                      : 'rgba(255,255,255,0.02)',
                borderLeft: accentColor !== 'transparent' ? `3px solid ${accentColor}` : undefined,
                transition: 'all 0.2s ease',
              }}>
                {/* Row Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: row.isSum ? 700 : 600,
                      color: 'var(--text-light)',
                      fontSize: row.isSum ? '1.05rem' : '0.95rem',
                    }}>
                      <span style={{ opacity: 0.5, marginRight: '0.3rem' }}>{row.prefix}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginRight: '0.4rem' }}>
                        {String(idx + 1).padStart(1)}.
                      </span>
                      {row.label}
                    </div>
                    {difficultyLevel === 1 && row.sublabel && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {row.sublabel}
                      </div>
                    )}
                    {difficultyLevel === 1 && row.basisInfo && (
                      <div style={{
                        fontSize: '0.72rem',
                        marginTop: '0.15rem',
                        color: isBruttoBase ? COLORS.bruttoAccent : isNettoBase ? COLORS.nettoAccent : 'var(--text-muted)',
                        fontWeight: 600,
                      }}>
                        {row.basisInfo}
                      </div>
                    )}
                  </div>

                  {/* Hint Button */}
                  {difficultyLevel < 3 && (
                    <button
                      onClick={() => toggleHint(row.key)}
                      style={{
                        background: showHints[row.key] ? 'rgba(99,102,241,0.2)' : 'transparent',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'var(--text-muted)',
                        borderRadius: '8px',
                        padding: '0.3rem 0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                    >
                      💡 Tipp
                    </button>
                  )}
                </div>

                {/* Hint Panel */}
                {difficultyLevel < 3 && showHints[row.key] && (
                  <div style={{
                    padding: '0.65rem 0.8rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    fontSize: '0.82rem',
                    color: 'var(--text-light)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.55,
                  }}>
                    {row.hint}
                  </div>
                )}

                {/* Basis-Feedback (Netto/Brutto Verwechslung) */}
                {basisFeedback[row.key] && fieldStates[row.key] === 'wrong' && (
                  <div style={{
                    padding: '0.55rem 0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    background: 'rgba(251,146,60,0.12)',
                    border: '1px solid rgba(251,146,60,0.3)',
                    fontSize: '0.82rem',
                    color: COLORS.bruttoAccent,
                    lineHeight: 1.5,
                  }}>
                    {basisFeedback[row.key]}
                  </div>
                )}

                {/* Input */}
                <div style={{ position: 'relative' }}>
                  <input
                    ref={(el) => { inputRefs.current[row.key] = el; }}
                    type="text"
                    inputMode="decimal"
                    className="wisor-input"
                    value={inputs[row.key] || ''}
                    onChange={(e) => {
                      setInputs((prev) => ({ ...prev, [row.key]: e.target.value }));
                      setFieldStates((prev) => ({ ...prev, [row.key]: undefined }));
                      setBasisFeedback((prev) => ({ ...prev, [row.key]: undefined }));
                    }}
                    onBlur={() => {
                      if (inputs[row.key]?.trim()) validateField(row.key);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, row.key)}
                    placeholder="0,00"
                    disabled={fieldStates[row.key] === 'correct'}
                    style={{
                      margin: 0,
                      padding: '0.65rem 2.5rem 0.65rem 0.8rem',
                      borderColor: color,
                      boxShadow: `0 0 8px ${color}22`,
                      fontSize: '1rem',
                      fontWeight: row.isSum ? 700 : 400,
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                  }}>
                    €
                  </span>

                  {/* ✅ / ❌ Indicator */}
                  {fieldStates[row.key] && (
                    <span style={{
                      position: 'absolute',
                      left: '-1.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '1rem',
                    }}>
                      {fieldStates[row.key] === 'correct' ? '✅' : '❌'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={validateAll} style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff',
            border: 'none',
            padding: '0.85rem 1.8rem',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}>
            Alle prüfen
          </button>
          <button className="btn-secondary" onClick={handleNewTask}>
            🔄 Neue Aufgabe
          </button>
          {solutionUnlocked && !showFullSolution && (
            <button
              className="btn-secondary"
              onClick={() => setShowFullSolution(true)}
              style={{ borderColor: 'rgba(168,85,247,0.4)', color: '#a78bfa' }}
            >
              💡 Lösung anzeigen
            </button>
          )}
        </div>

        {/* Ergebnis-Feedback */}
        {allCorrect && (
          <div style={{
            marginTop: '1rem',
            padding: '0.9rem 1rem',
            borderRadius: '12px',
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.4)',
            color: COLORS.success,
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '1.05rem',
          }}>
            🎉 Perfekt! Alle Werte korrekt berechnet!
            {task.solution.kurzfristigerErfolg >= 0
              ? ` Der kurzfristige Erfolg beträgt ${fmtEuro(task.solution.kurzfristigerErfolg)}.`
              : ` Achtung: Der kurzfristige Erfolg ist negativ (${fmtEuro(task.solution.kurzfristigerErfolg)}) – das Geschäft macht Verlust!`
            }
          </div>
        )}

        {/* Fehlerzähler / Lösung unlock */}
        {!solutionUnlocked && failedAttempts > 0 && (
          <div style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Musterlösung wird nach 3 Fehlversuchen freigeschaltet. Aktuell: {failedAttempts}/3
          </div>
        )}

        {/* ── Musterlösung ──────────────────────────────────── */}
        {showFullSolution && (
          <>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }}></div>
            <div style={{
              padding: '0.9rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(168,85,247,0.3)',
              background: 'rgba(168,85,247,0.06)',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.8rem' }}>
                💡 Schritt-für-Schritt Musterlösung
              </div>
              <div style={{ color: 'var(--text-light)', lineHeight: 1.7, fontSize: '0.92rem' }}>
                <p style={{ marginBottom: '0.8rem' }}>
                  <strong>Vorarbeit: Gesamter Nettoumsatz</strong><br />
                  {fmtEuro(given.totalGrossRevenue)} ÷ {given.vatRate} = {fmtEuro(round2(given.totalGrossRevenue / given.vatRate))}
                </p>

                {task.rows.map((row, idx) => (
                  <p key={row.key} style={{ marginBottom: '0.7rem' }}>
                    <strong>{idx + 1}. {row.label}</strong><br />
                    <span style={{ whiteSpace: 'pre-wrap' }}>{row.hint?.split('\n').slice(0, 3).join('\n')}</span><br />
                    <strong style={{ color: COLORS.success }}>
                      = {fmtEuro(row.value)}
                    </strong>
                  </p>
                ))}

                <div style={{
                  marginTop: '1rem',
                  padding: '0.7rem',
                  borderRadius: '8px',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}>
                  <strong>⚠️ Wichtig – Bezugsbasis Netto vs. Brutto:</strong><br />
                  • <strong style={{ color: COLORS.nettoAccent }}>Wareneinsatz & Provision</strong>: Werden vom <em>Netto-Warenwert</em> berechnet (ohne Versand, ohne MwSt)<br />
                  • <strong style={{ color: COLORS.bruttoAccent }}>Marketing-/Payment-Kosten</strong>: Werden vom <em>Brutto-Gesamtumsatz</em> berechnet (inkl. MwSt, weil Payment-Gebühren auf den Brutto-Zahlungsbetrag anfallen)
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <FloatingPortal questionId="ecommerce_kalkulation" questionText="E-Commerce Kalkulation Training" currentAppMode="ecommerce_kalkulation" />
    </div>
  );
}
