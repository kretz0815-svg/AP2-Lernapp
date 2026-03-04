import React, { useMemo, useRef, useState } from 'react';

const toEuro = (cents) => (cents / 100).toFixed(2).replace('.', ',');
const parseEuroToCents = (raw) => {
  const cleaned = String(raw ?? '').trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!cleaned) return NaN;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return NaN;
  return Math.round((value + Number.EPSILON) * 100);
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const PRODUCT_SCENARIOS = [
  { company: 'Tech-Gear GmbH', frame: 'einer Aktion', product: 'Smartwatch', variable: ['Wareneinsatz', 'Versand', 'Pick & Pack'], fixed: ['Shop-Software', 'Mitarbeitergehälter', 'Ads-Fixbudget'] },
  { company: 'UrbanStyle GmbH', frame: 'eines Sortiments', product: 'Sneaker', variable: ['Einkauf', 'Versandkarton', 'Payment-Gebühren'], fixed: ['Lagerpersonal', 'ERP-Lizenz', 'Shop-Hosting'] },
  { company: 'HomeCloud GmbH', frame: 'einer Kampagne', product: 'Smart-Home-Gadget', variable: ['Lieferantenpreis', 'Fulfillment', 'Retourenrückstellung'], fixed: ['Serverkosten', 'CRM-Tool', 'Teamgehälter'] },
  { company: 'BeanWave GmbH', frame: 'einer Monatsaktion', product: 'Kaffeevollautomat', variable: ['Rohware', 'Verpackung', 'Versand'], fixed: ['Shop-Miete', 'Content-Produktion', 'Verwaltung'] },
  { company: 'DeskLight GmbH', frame: 'eines Sortiments', product: 'LED-Schreibtischlampe', variable: ['Wareneinsatz', 'Kommissionierung', 'Versandmaterial'], fixed: ['Miete & NK', 'Software-Lizenzen', 'Support-Team'] },
];

function splitAmount(totalCents, labels) {
  const part1 = Math.round(totalCents * randInt(30, 50) / 100);
  const part2 = Math.round((totalCents - part1) * randInt(40, 70) / 100);
  const part3 = totalCents - part1 - part2;
  return [
    { label: labels[0], cents: part1 },
    { label: labels[1], cents: part2 },
    { label: labels[2], cents: part3 },
  ];
}

function generateChallenge() {
  const scenario = PRODUCT_SCENARIOS[randInt(0, PRODUCT_SCENARIOS.length - 1)];

  const variableCents = randInt(1200, 7800);
  const dbCents = randInt(300, 2600);
  const priceCents = variableCents + dbCents;
  const bepUnits = randInt(90, 900);
  const fixedCents = dbCents * bepUnits;
  const soldUnits = bepUnits + randInt(20, 220);
  const totalDbCents = dbCents * soldUnits;
  const profitLossCents = totalDbCents - fixedCents;
  const bepRevenueCents = priceCents * bepUnits;

  const variableParts = splitAmount(variableCents, scenario.variable);
  const fixedParts = splitAmount(fixedCents, scenario.fixed);

  return {
    scenario,
    values: {
      p: priceCents,
      kv: variableCents,
      kf: fixedCents,
      db: dbCents,
      soldUnits,
      totalDb: totalDbCents,
      bepUnits,
      bepRevenue: bepRevenueCents,
      profitLoss: profitLossCents,
    },
    variableParts,
    fixedParts,
  };
}

export default function BreakEvenPoint({ onBack }) {
  const [challenge, setChallenge] = useState(() => generateChallenge());
  const [inputs, setInputs] = useState({ db: '', totalDb: '', bepUnits: '', profitLoss: '' });
  const [fieldState, setFieldState] = useState({ db: 'pending', totalDb: 'pending', bepUnits: 'pending', profitLoss: 'pending' });
  const [evaluated, setEvaluated] = useState(false);
  const [failedChecks, setFailedChecks] = useState(0);
  const inputRefs = useRef({});
  const skipBlurValidationRef = useRef({});
  const lastWrongFingerprintRef = useRef({});

  const taskFields = [
    { key: 'db', label: `a) den Deckungsbeitrag pro verkaufter Einheit des Produkts "${challenge.scenario.product}".`, suffix: '€' },
    { key: 'totalDb', label: 'b) Gesamter Deckungsbeitrag für den Monat.', suffix: '€' },
    { key: 'bepUnits', label: `c) die Break-Even-Menge für das Produkt "${challenge.scenario.product}" im Monat.`, suffix: 'Stück' },
    { key: 'profitLoss', label: 'd) Gewinn oder Verlust für den Monat.', suffix: '€' },
  ];

  const colors = {
    pending: '#f59e0b',
    correct: '#22c55e',
    wrong: '#ef4444',
  };

  const resetChallenge = () => {
    setChallenge(generateChallenge());
    setInputs({ db: '', totalDb: '', bepUnits: '', profitLoss: '' });
    setFieldState({ db: 'pending', totalDb: 'pending', bepUnits: 'pending', profitLoss: 'pending' });
    setEvaluated(false);
    setFailedChecks(0);
    lastWrongFingerprintRef.current = {};
  };

  const validateSingleField = (key, { countFailure = true } = {}) => {
    const expected = challenge.values[key];
    const raw = String(inputs[key] ?? '').trim();
    if (!raw) return null;

    let isCorrect = false;
    let fingerprint = raw;

    if (key === 'bepUnits') {
      const inputUnits = Number(raw.replace(/[^0-9-]/g, ''));
      isCorrect = Number.isFinite(inputUnits) && inputUnits === expected;
      fingerprint = String(inputUnits);
    } else {
      const inputCents = parseEuroToCents(raw);
      isCorrect = Number.isFinite(inputCents) && inputCents === expected;
      fingerprint = String(inputCents);
    }

    setFieldState((prev) => ({ ...prev, [key]: isCorrect ? 'correct' : 'wrong' }));

    if (isCorrect) {
      lastWrongFingerprintRef.current[key] = null;
      return true;
    }

    if (countFailure && lastWrongFingerprintRef.current[key] !== fingerprint) {
      setFailedChecks((prev) => prev + 1);
      lastWrongFingerprintRef.current[key] = fingerprint;
    }

    return false;
  };

  const validateAndFocusNext = (key) => {
    validateSingleField(key);
    const currentIndex = taskFields.findIndex((field) => field.key === key);
    const next = taskFields[currentIndex + 1];
    if (next && inputRefs.current[next.key]) {
      skipBlurValidationRef.current[key] = true;
      inputRefs.current[next.key].focus();
      inputRefs.current[next.key].select?.();
    }
  };

  const checkAnswers = () => {
    const expected = challenge.values;

    const inputDb = parseEuroToCents(inputs.db);
    const inputTotalDb = parseEuroToCents(inputs.totalDb);
    const inputUnits = Number(String(inputs.bepUnits).replace(/[^0-9-]/g, ''));
    const inputProfitLoss = parseEuroToCents(inputs.profitLoss);

    const nextState = {
      db: inputDb === expected.db ? 'correct' : 'wrong',
      totalDb: inputTotalDb === expected.totalDb ? 'correct' : 'wrong',
      bepUnits: Number.isFinite(inputUnits) && inputUnits === expected.bepUnits ? 'correct' : 'wrong',
      profitLoss: inputProfitLoss === expected.profitLoss ? 'correct' : 'wrong',
    };

    setFieldState(nextState);
    setEvaluated(true);

    const allOk = Object.values(nextState).every((state) => state === 'correct');
    if (!allOk) {
      setFailedChecks((prev) => prev + 1);
    }
  };

  const allCorrect = useMemo(
    () => Object.values(fieldState).every((state) => state === 'correct'),
    [fieldState]
  );
  const solutionUnlocked = failedChecks >= 3;

  return (
    <div className="app-container" style={{ zIndex: 10, maxWidth: '850px' }}>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <header style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
        <button className="btn-nav" style={{ position: 'absolute', top: '0.2rem', left: '0.2rem', minHeight: '42px', zIndex: 10 }} onClick={onBack}>
          ← Zurück
        </button>
        <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '2.5rem', transform: 'scaleY(1.15)', color: 'var(--text-light)', marginBottom: '0.3rem', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
          BREAK-EVEN-POINT
        </h1>
        <p className="subtitle" style={{ marginBottom: '0.8rem' }}>Löse die Gewinnschwelle mit sauberer E-Commerce-Kalkulation</p>
      </header>

      <div className="quiz-container" style={{ width: '100%' }}>
        <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(34,197,94,0.08)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.4rem' }}>🛒 Szenario</div>
          <div style={{ color: 'var(--text-light)', lineHeight: 1.55 }}>
            <strong>{challenge.scenario.company}</strong> verkauft im Rahmen {challenge.scenario.frame} das Produkt "<strong>{challenge.scenario.product}</strong>" über den Online-Shop. Folgende Daten liegen dazu vor:
          </div>
        </div>

        <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(99,102,241,0.08)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.5rem' }}>📊 Die Daten</div>
          <ul style={{ color: 'var(--text-light)', margin: 0, paddingLeft: '1.1rem', lineHeight: 1.55 }}>
            <li>Nettoverkaufspreis (NVP): <strong>{toEuro(challenge.values.p)} €</strong></li>
            <li>
              Variable Stückkosten (VS): <strong>{toEuro(challenge.values.kv)} €</strong>
              {' '}({challenge.variableParts.map((part) => `${part.label}: ${toEuro(part.cents)} €`).join(', ')})
            </li>
            <li>
              Fixkosten (FK) des Unternehmens für den Monat: <strong>{toEuro(challenge.values.kf)} €</strong>
              {' '}({challenge.fixedParts.map((part) => `${part.label}: ${toEuro(part.cents)} €`).join(', ')})
            </li>
            <li>Verkaufte Einheiten im Monat: <strong>{challenge.values.soldUnits} Stück</strong></li>
          </ul>
        </div>

        <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(245,158,11,0.08)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem' }}>❓ Deine Aufgaben</div>

          {taskFields.map((item) => {
            const color = colors[fieldState[item.key]];
            return (
              <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '0.7rem', alignItems: 'center', marginBottom: '0.55rem' }}>
                <label style={{ color: 'var(--text-light)', fontWeight: 600 }}>{item.label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={(el) => { inputRefs.current[item.key] = el; }}
                    type="text"
                    className="wisor-input"
                    value={inputs[item.key]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInputs((prev) => ({ ...prev, [item.key]: v }));
                    }}
                    onBlur={() => {
                      if (skipBlurValidationRef.current[item.key]) {
                        skipBlurValidationRef.current[item.key] = false;
                        return;
                      }
                      validateSingleField(item.key);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        validateAndFocusNext(item.key);
                      }
                    }}
                    style={{
                      margin: 0,
                      padding: '0.7rem 2.5rem 0.7rem 0.8rem',
                      borderColor: color,
                      boxShadow: `0 0 10px ${color}33`,
                      fontSize: '1rem'
                    }}
                    placeholder="0,00"
                  />
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{item.suffix}</span>
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={checkAnswers}>Ergebnisse prüfen</button>
            <button className="btn-secondary" onClick={resetChallenge}>Neue Aufgabe generieren</button>
          </div>

          {evaluated && (
            <div style={{ marginTop: '0.7rem', color: allCorrect ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
              {allCorrect ? '✅ Perfekt! Alle 4 Ergebnisse sind korrekt.' : '❌ Mindestens ein Wert ist noch nicht korrekt. Prüfe die Schritte unten.'}
            </div>
          )}

          {!solutionUnlocked && (
            <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Musterlösung wird nach 3 Fehlversuchen angezeigt. Aktuell: {failedChecks}/3
            </div>
          )}
        </div>

        {solutionUnlocked && (
          <>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }}></div>

            <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(168,85,247,0.08)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.5rem' }}>💡 Schritt-für-Schritt Musterlösung</div>

              <div style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>
                <p><strong>Vorab-Check (Interner Check - wird nicht angezeigt)</strong><br />
                  NVP - VS = {toEuro(challenge.values.p)} € - {toEuro(challenge.values.kv)} € = {toEuro(challenge.values.db)} €<br />
                  FK / db = {toEuro(challenge.values.kf)} € / {toEuro(challenge.values.db)} € = {challenge.values.bepUnits} Stück (glatte Zahl) ✅
                </p>

                <p><strong>a) Deckungsbeitrag pro Stück (db):</strong><br />
                  Formel: db = NVP - VS<br />
                  Rechnung: {toEuro(challenge.values.p)} € - {toEuro(challenge.values.kv)} €<br />
                  Ergebnis: <strong>{toEuro(challenge.values.db)} €</strong>
                </p>

                <p><strong>b) Gesamter Deckungsbeitrag (DB):</strong><br />
                  Formel: DB = db * Verkaufte Einheiten<br />
                  Rechnung: {toEuro(challenge.values.db)} € * {challenge.values.soldUnits} Stück<br />
                  Ergebnis: <strong>{toEuro(challenge.values.totalDb)} €</strong>
                </p>

                <p><strong>c) Break-Even-Menge:</strong><br />
                  Formel: Break-Even-Menge = FK / db<br />
                  Rechnung: {toEuro(challenge.values.kf)} € / {toEuro(challenge.values.db)} €<br />
                  Ergebnis: <strong>{challenge.values.bepUnits} Stück</strong>
                </p>

                <p><strong>d) Gewinn/Verlust:</strong><br />
                  Formel: Gewinn/Verlust = DB - FK<br />
                  Rechnung: {toEuro(challenge.values.totalDb)} € - {toEuro(challenge.values.kf)} €<br />
                  Ergebnis: <strong>{toEuro(challenge.values.profitLoss)} € ({challenge.values.profitLoss >= 0 ? 'Gewinn' : 'Verlust'})</strong>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
