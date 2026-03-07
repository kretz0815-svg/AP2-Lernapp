import React, { useMemo, useRef, useState } from 'react';
import { useKLRGame } from '../state/KLRGameProvider';
import { generateLevel2Math } from '../utils/generateLevelMath';

const LEVELS = [
  {
    id: 1,
    title: 'Das Rechnungs-Tinder',
    subtitle: 'Kostenartenrechnung',
    objective: 'Ordne Kosten korrekt zu: Fixkosten oder variable Kosten.'
  },
  {
    id: 2,
    title: 'Der Betriebsabrechnungsbogen',
    subtitle: 'Kostenstellenrechnung',
    objective: 'Verteile Gemeinkosten korrekt auf Lager, Packstation und Büro.'
  },
  {
    id: 3,
    title: 'Der Produkt-Kalkulator',
    subtitle: 'Kostenträgerrechnung',
    objective: 'Berechne Selbstkosten für dein Produkt sauber durch.'
  },
  {
    id: 4,
    title: 'Survival-Modus',
    subtitle: 'Break-Even-Analyse',
    objective: 'Halte dein Startup am Leben und erreiche die Gewinnschwelle.'
  }
];

const COST_ITEM_POOL = [
  { label: 'Shopify-Abo', amountMin: 20, amountMax: 59, step: 1, category: 'fix' },
  { label: 'WooCommerce Hosting', amountMin: 30, amountMax: 99, step: 1, category: 'fix' },
  { label: 'Lager-Miete', amountMin: 500, amountMax: 1800, step: 50, category: 'fix' },
  { label: 'Büro-Miete', amountMin: 300, amountMax: 1200, step: 50, category: 'fix' },
  { label: 'Cloud-Server Flat', amountMin: 80, amountMax: 400, step: 10, category: 'fix' },
  { label: 'CDN Grundgebühr', amountMin: 20, amountMax: 120, step: 5, category: 'fix' },
  { label: 'Buchhaltungssoftware', amountMin: 15, amountMax: 80, step: 5, category: 'fix' },
  { label: 'ERP-Lizenz', amountMin: 60, amountMax: 250, step: 10, category: 'fix' },
  { label: 'Team-Chat Lizenz', amountMin: 10, amountMax: 60, step: 5, category: 'fix' },
  { label: 'Projektmanagement Tool', amountMin: 8, amountMax: 40, step: 2, category: 'fix' },
  { label: 'Steuerberater Pauschale', amountMin: 120, amountMax: 350, step: 10, category: 'fix' },
  { label: 'Rechtsberatung Retainer', amountMin: 100, amountMax: 400, step: 10, category: 'fix' },
  { label: 'Versicherung Betriebshaftpflicht', amountMin: 40, amountMax: 180, step: 5, category: 'fix' },
  { label: 'D&O Versicherung', amountMin: 30, amountMax: 150, step: 5, category: 'fix' },
  { label: 'Internetanschluss', amountMin: 25, amountMax: 70, step: 5, category: 'fix' },
  { label: 'Telefonanlage', amountMin: 15, amountMax: 60, step: 5, category: 'fix' },
  { label: 'Abschreibung Regalsystem', amountMin: 80, amountMax: 260, step: 10, category: 'fix' },
  { label: 'Abschreibung Packtische', amountMin: 40, amountMax: 160, step: 10, category: 'fix' },
  { label: 'Sicherheitsdienst Lager', amountMin: 120, amountMax: 360, step: 20, category: 'fix' },
  { label: 'Alarmanlage Wartung', amountMin: 20, amountMax: 90, step: 5, category: 'fix' },
  { label: 'Abo KI-Tool', amountMin: 15, amountMax: 120, step: 5, category: 'fix' },
  { label: 'Abo Design-Tool', amountMin: 12, amountMax: 60, step: 2, category: 'fix' },
  { label: 'Abo Video-Tool', amountMin: 10, amountMax: 55, step: 5, category: 'fix' },
  { label: 'HR-Software', amountMin: 20, amountMax: 110, step: 5, category: 'fix' },
  { label: 'Monitoring-Tool', amountMin: 25, amountMax: 130, step: 5, category: 'fix' },

  { label: 'Wareneinsatz Hoodie pro Stück', amountMin: 10, amountMax: 28, step: 2, category: 'variable' },
  { label: 'Wareneinsatz Gadget pro Stück', amountMin: 8, amountMax: 24, step: 2, category: 'variable' },
  { label: 'Verpackungskarton pro Bestellung', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Seidenpapier pro Bestellung', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Sticker-Beilage pro Bestellung', amountMin: 1, amountMax: 2, step: 1, category: 'variable' },
  { label: 'Versandlabel pro Paket', amountMin: 3, amountMax: 8, step: 1, category: 'variable' },
  { label: 'Pick-&-Pack Kosten pro Order', amountMin: 2, amountMax: 6, step: 1, category: 'variable' },
  { label: 'Payment Fee pro Transaktion', amountMin: 1, amountMax: 5, step: 1, category: 'variable' },
  { label: 'Zahlungsanbieter %-Gebühr je Verkauf', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Retourenlabel pro Retoure', amountMin: 3, amountMax: 9, step: 1, category: 'variable' },
  { label: 'Reinigungsaufwand pro Rückläufer', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Neuverpackung pro Rückläufer', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Kommission für Marktplatzverkauf', amountMin: 2, amountMax: 9, step: 1, category: 'variable' },
  { label: 'Affiliate-Provision je Sale', amountMin: 2, amountMax: 10, step: 1, category: 'variable' },
  { label: 'Influencer-Provision je Code-Sale', amountMin: 3, amountMax: 12, step: 1, category: 'variable' },
  { label: 'Klarna-Gebühr je Bestellung', amountMin: 1, amountMax: 5, step: 1, category: 'variable' },
  { label: 'Kreditkarten-Processing je Kauf', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Customs Handling je Auslandssendung', amountMin: 2, amountMax: 9, step: 1, category: 'variable' },
  { label: 'Einlagekarte pro Premium-Box', amountMin: 1, amountMax: 2, step: 1, category: 'variable' },
  { label: 'Schutzfolie pro Gadget', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Batterie-Beilage pro Bundle', amountMin: 1, amountMax: 4, step: 1, category: 'variable' },
  { label: 'Montage-Minuten pro Spezialprodukt', amountMin: 2, amountMax: 8, step: 1, category: 'variable' },
  { label: 'Lagerpick pro Position', amountMin: 1, amountMax: 3, step: 1, category: 'variable' },
  { label: 'Kundensupport pro Bestellung (variabel)', amountMin: 1, amountMax: 5, step: 1, category: 'variable' },
  { label: 'E-Mail Versandkosten je Kampagnenkontakt', amountMin: 1, amountMax: 2, step: 1, category: 'variable' }
];

const randStepValue = (min, max, step) => {
  const count = Math.floor((max - min) / step);
  const idx = Math.floor(Math.random() * (count + 1));
  return min + (idx * step);
};

const euro = (n) => `${Number(n).toLocaleString('de-DE')} €`;

const sampleWithoutReplacement = (arr, count) => {
  const pool = [...arr];
  const out = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
};

const generateLevel1Run = () => {
  const questionCount = 12;
  const sampled = sampleWithoutReplacement(COST_ITEM_POOL, questionCount);
  return sampled.map((item, idx) => ({
    id: `${item.label}-${idx}-${Date.now()}`,
    label: item.label,
    amount: randStepValue(item.amountMin, item.amountMax, item.step),
    category: item.category
  }));
};

export default function KLRGameHub({ onBack }) {
  const { progress, setStartupName, grantXp, unlockLevel } = useKLRGame();
  const [nameInput, setNameInput] = useState(progress.startupName);
  const [screen, setScreen] = useState('home');
  const [pendingLevelId, setPendingLevelId] = useState(null);
  const [howToOpen, setHowToOpen] = useState(false);

  const [level1Items, setLevel1Items] = useState(() => generateLevel1Run());
  const [level1Index, setLevel1Index] = useState(0);
  const [level1Correct, setLevel1Correct] = useState(0);
  const [level1Mistakes, setLevel1Mistakes] = useState(0);
  const [level1Feedback, setLevel1Feedback] = useState('');

  const [level2Math, setLevel2Math] = useState(() => generateLevel2Math());
  const [level2Inputs, setLevel2Inputs] = useState({ lager: '', packstation: '', buero: '' });
  const [level2FieldOk, setLevel2FieldOk] = useState({ lager: null, packstation: null, buero: null });
  const [level2Attempts, setLevel2Attempts] = useState({ lager: 0, packstation: 0, buero: 0 });
  const [level2Status, setLevel2Status] = useState('idle');
  const [level2Feedback, setLevel2Feedback] = useState('');
  const level2InputRefs = useRef({ lager: null, packstation: null, buero: null });

  const level1Done = level1Index >= level1Items.length;
  const currentItem = level1Items[level1Index];

  const level1ScorePct = useMemo(() => {
    if (!level1Items.length) return 0;
    return Math.round((level1Correct / level1Items.length) * 100);
  }, [level1Correct, level1Items.length]);

  const shellStyle = {
    width: '100%',
    maxWidth: '980px',
    margin: '0 auto',
    padding: 'max(0.9rem, env(safe-area-inset-top, 0px)) 0 1.2rem 0',
    display: 'grid',
    gap: '0.9rem'
  };

  const sectionStyle = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '18px',
    padding: '0.95rem',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)'
  };

  const topBarStyle = {
    ...sectionStyle,
    position: 'sticky',
    top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
    zIndex: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap'
  };

  const startLevel1 = () => {
    setLevel1Items(generateLevel1Run());
    setLevel1Index(0);
    setLevel1Correct(0);
    setLevel1Mistakes(0);
    setLevel1Feedback('');
    setScreen('level1');
  };

  const startLevel2 = () => {
    setLevel2Math(generateLevel2Math());
    setLevel2Inputs({ lager: '', packstation: '', buero: '' });
    setLevel2FieldOk({ lager: null, packstation: null, buero: null });
    setLevel2Attempts({ lager: 0, packstation: 0, buero: 0 });
    setLevel2Status('idle');
    setLevel2Feedback('');
    setScreen('level2');
  };

  const submitLevel1Choice = (choice) => {
    if (level1Done || !currentItem) return;

    const isCorrect = choice === currentItem.category;
    if (isCorrect) {
      setLevel1Correct((n) => n + 1);
      setLevel1Feedback('Richtig. Saubere Einordnung.');
    } else {
      setLevel1Mistakes((n) => n + 1);
      setLevel1Feedback(
        currentItem.category === 'fix'
          ? 'Falsch: Das bleibt unabhängig von der Bestellmenge meist konstant.'
          : 'Falsch: Das steigt oder fällt mit jeder Bestellung.'
      );
    }

    setLevel1Index((n) => n + 1);
  };

  const finishLevel1 = () => {
    const baseXp = 40;
    const bonusXp = Math.max(0, level1Correct * 6 - level1Mistakes * 2);
    grantXp(baseXp + bonusXp);
    if (level1ScorePct >= 75) unlockLevel(2);
    setScreen('home');
  };

  const parseMoneyInput = (raw) => {
    if (raw == null) return Number.NaN;
    const cleaned = String(raw).trim().replace(/\s/g, '').replace(/€/g, '');
    if (!cleaned) return Number.NaN;
    const normalized = cleaned.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    return Number(normalized);
  };

  const isLevel2FieldCorrect = (fieldKey, value) => {
    if (!Number.isFinite(value)) return false;
    const expected = level2Math.allocations[fieldKey];
    return Math.round(value * 100) === Math.round(expected * 100);
  };

  const validateLevel2Field = (fieldKey, showFieldFeedback = true) => {
    const value = parseMoneyInput(level2Inputs[fieldKey]);
    const ok = isLevel2FieldCorrect(fieldKey, value);

    setLevel2FieldOk((prev) => ({ ...prev, [fieldKey]: ok }));
    if (!ok) {
      setLevel2Attempts((prev) => ({ ...prev, [fieldKey]: prev[fieldKey] + 1 }));
    }

    const allOkNow = ['lager', 'packstation', 'buero'].every((key) => {
      const parsed = key === fieldKey ? value : parseMoneyInput(level2Inputs[key]);
      return isLevel2FieldCorrect(key, parsed);
    });

    if (allOkNow) {
      setLevel2Status('success');
      setLevel2Feedback('Perfekt verteilt. Genau richtig!');
    } else if (showFieldFeedback) {
      const label = fieldKey === 'lager' ? 'Lager' : fieldKey === 'packstation' ? 'Packstation' : 'Büro';
      setLevel2Status('error');
      setLevel2Feedback(ok ? `${label} korrekt ✓` : `${label} noch nicht korrekt.`);
    }

    return ok;
  };

  const handleLevel2Enter = (e, fieldKey, nextFieldKey) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    validateLevel2Field(fieldKey, true);
    if (nextFieldKey && level2InputRefs.current[nextFieldKey]) {
      level2InputRefs.current[nextFieldKey].focus();
      level2InputRefs.current[nextFieldKey].select?.();
    }
  };

  const validateLevel2 = () => {
    const correctLager = validateLevel2Field('lager', false);
    const correctPack = validateLevel2Field('packstation', false);
    const correctBuero = validateLevel2Field('buero', false);
    const correct = correctLager && correctPack && correctBuero;

    if (correct) {
      setLevel2Status('success');
      setLevel2Feedback('Perfekt verteilt. Genau richtig!');
    } else {
      setLevel2Status('error');
      setLevel2Feedback('Noch nicht korrekt. Rechne mit Kosten pro m² und prüfe jede Kostenstelle einzeln.');
    }
  };

  const finishLevel2 = () => {
    if (level2Status !== 'success') return;
    grantXp(90);
    unlockLevel(3);
    setScreen('home');
  };

  const openPendingLevel = (levelId) => {
    setPendingLevelId(levelId);
    setScreen('pending');
  };

  const renderActionBar = (leftText = '← Levelauswahl', leftAction = () => setScreen('home')) => (
    <div style={topBarStyle}>
      <button className="btn-secondary" onClick={leftAction}>{leftText}</button>
      <button className="btn-secondary" onClick={() => onBack?.()}>✕ Menü</button>
    </div>
  );

  if (screen === 'level1') {
    return (
      <div style={{ ...shellStyle, maxWidth: '760px' }}>
        {renderActionBar()}

        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.25rem 0' }}>Level 1: Rechnungs-Tinder</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            Entscheide pro Karte: <strong>Fixkosten</strong> oder <strong>Variable Kosten</strong>.
          </p>

          {!level1Done ? (
            <div style={{ marginTop: '0.55rem', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '0.85rem', background: 'rgba(2,6,23,0.45)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                Aufgabe {level1Index + 1} von {level1Items.length}
              </div>
              <h3 style={{ marginTop: 0, marginBottom: '0.15rem' }}>{currentItem.label}</h3>
              <p style={{ marginTop: 0, marginBottom: '0.9rem', fontSize: '1.25rem', fontWeight: 800 }}>{euro(currentItem.amount)}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => submitLevel1Choice('fix')}
                  style={{
                    border: '1px solid rgba(239,68,68,0.58)',
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.34), rgba(239,68,68,0.16))',
                    color: '#fee2e2',
                    borderRadius: '14px',
                    padding: '0.9rem 0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minHeight: '56px',
                    boxShadow: '0 8px 22px rgba(239,68,68,0.2)'
                  }}
                >
                  ⬅️ Fixkosten
                </button>
                <button
                  type="button"
                  onClick={() => submitLevel1Choice('variable')}
                  style={{
                    border: '1px solid rgba(34,197,94,0.6)',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.34), rgba(34,197,94,0.16))',
                    color: '#dcfce7',
                    borderRadius: '14px',
                    padding: '0.9rem 0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minHeight: '56px',
                    boxShadow: '0 8px 22px rgba(34,197,94,0.2)'
                  }}
                >
                  Variable Kosten ➡️
                </button>
              </div>

              {!!level1Feedback && (
                <p style={{ marginTop: '0.7rem', marginBottom: 0, color: 'var(--text-muted)' }}>{level1Feedback}</p>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '0.55rem', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '0.85rem', background: 'rgba(2,6,23,0.45)' }}>
              <h3 style={{ marginTop: 0 }}>Level abgeschlossen</h3>
              <p style={{ marginBottom: '0.5rem' }}>Treffer: <strong>{level1Correct}</strong> / {level1Items.length}</p>
              <p style={{ marginTop: 0, marginBottom: '0.8rem' }}>Fehler: <strong>{level1Mistakes}</strong> · Score: <strong>{level1ScorePct}%</strong></p>
              <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>Ab 75% wird Level 2 freigeschaltet.</p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={finishLevel1}>Belohnung einsammeln</button>
                <button className="btn-secondary" onClick={startLevel1}>Nochmal spielen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'level2') {
    return (
      <div style={{ ...shellStyle, maxWidth: '760px' }}>
        {renderActionBar()}

        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 0.3rem 0' }}>Level 2: Betriebsabrechnungsbogen</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Verteile die Gemeinkosten korrekt auf Lager, Packstation und Büro.
          </p>

          <div style={{ border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.8rem', background: 'rgba(2,6,23,0.45)' }}>
            <p style={{ margin: '0 0 0.3rem 0' }}>Gesamtkosten: <strong>{euro(level2Math.baseCost)}</strong></p>
            <p style={{ margin: '0 0 0.6rem 0' }}>Verteilerschlüssel (m²): Lager <strong>{level2Math.key.lager}</strong> · Packstation <strong>{level2Math.key.packstation}</strong> · Büro <strong>{level2Math.key.buero}</strong></p>

            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <label style={{ display: 'grid', gap: '0.25rem', textAlign: 'left' }}>
                <span>Lager (€)</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wisor-input"
                    inputMode="decimal"
                    ref={(el) => { level2InputRefs.current.lager = el; }}
                    value={level2Inputs.lager}
                    onChange={(e) => setLevel2Inputs((p) => ({ ...p, lager: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    onKeyDown={(e) => handleLevel2Enter(e, 'lager', 'packstation')}
                    style={
                      level2FieldOk.lager === true
                        ? { borderColor: '#22c55e', boxShadow: '0 0 0 1px rgba(34,197,94,0.45)', paddingRight: '3.2rem' }
                        : level2FieldOk.lager === false
                          ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px rgba(239,68,68,0.35)', paddingRight: '3.2rem' }
                          : { paddingRight: '3.2rem' }
                    }
                  />
                  <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>€</span>
                  {level2FieldOk.lager === true && (
                    <span style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontWeight: 800 }}>✓</span>
                  )}
                </div>
                {level2FieldOk.lager === false && level2Attempts.lager >= 2 && (
                  <small style={{ color: '#fca5a5' }}>Hinweis: Kosten pro m² × Lagerfläche ({level2Math.key.lager}) rechnen.</small>
                )}
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', textAlign: 'left' }}>
                <span>Packstation (€)</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wisor-input"
                    inputMode="decimal"
                    ref={(el) => { level2InputRefs.current.packstation = el; }}
                    value={level2Inputs.packstation}
                    onChange={(e) => setLevel2Inputs((p) => ({ ...p, packstation: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    onKeyDown={(e) => handleLevel2Enter(e, 'packstation', 'buero')}
                    style={
                      level2FieldOk.packstation === true
                        ? { borderColor: '#22c55e', boxShadow: '0 0 0 1px rgba(34,197,94,0.45)', paddingRight: '3.2rem' }
                        : level2FieldOk.packstation === false
                          ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px rgba(239,68,68,0.35)', paddingRight: '3.2rem' }
                          : { paddingRight: '3.2rem' }
                    }
                  />
                  <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>€</span>
                  {level2FieldOk.packstation === true && (
                    <span style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontWeight: 800 }}>✓</span>
                  )}
                </div>
                {level2FieldOk.packstation === false && level2Attempts.packstation >= 2 && (
                  <small style={{ color: '#fca5a5' }}>Hinweis: Kosten pro m² × Packstationfläche ({level2Math.key.packstation}) rechnen.</small>
                )}
              </label>
              <label style={{ display: 'grid', gap: '0.25rem', textAlign: 'left' }}>
                <span>Büro (€)</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="wisor-input"
                    inputMode="decimal"
                    ref={(el) => { level2InputRefs.current.buero = el; }}
                    value={level2Inputs.buero}
                    onChange={(e) => setLevel2Inputs((p) => ({ ...p, buero: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    onKeyDown={(e) => handleLevel2Enter(e, 'buero', null)}
                    style={
                      level2FieldOk.buero === true
                        ? { borderColor: '#22c55e', boxShadow: '0 0 0 1px rgba(34,197,94,0.45)', paddingRight: '3.2rem' }
                        : level2FieldOk.buero === false
                          ? { borderColor: '#ef4444', boxShadow: '0 0 0 1px rgba(239,68,68,0.35)', paddingRight: '3.2rem' }
                          : { paddingRight: '3.2rem' }
                    }
                  />
                  <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>€</span>
                  {level2FieldOk.buero === true && (
                    <span style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontWeight: 800 }}>✓</span>
                  )}
                </div>
                {level2FieldOk.buero === false && level2Attempts.buero >= 2 && (
                  <small style={{ color: '#fca5a5' }}>Hinweis: Kosten pro m² × Bürofläche ({level2Math.key.buero}) rechnen.</small>
                )}
              </label>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={validateLevel2}>Prüfen</button>
              <button className="btn-secondary" onClick={startLevel2}>Neue Aufgabe</button>
              {level2Status === 'success' && <button className="btn-primary" onClick={finishLevel2}>Level abschließen</button>}
            </div>

            {!!level2Feedback && (
              <p style={{ marginTop: '0.7rem', color: level2Status === 'success' ? '#86efac' : '#fca5a5' }}>{level2Feedback}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'pending') {
    const level = LEVELS.find((x) => x.id === pendingLevelId);
    return (
      <div style={{ ...shellStyle, maxWidth: '760px' }}>
        {renderActionBar()}

        <div style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>{level?.title}</h2>
          <p style={{ color: 'var(--text-muted)' }}>{level?.objective}</p>
          <h3 style={{ marginTop: 0 }}>Nächster Build-Schritt</h3>
          <p style={{ marginBottom: 0 }}>
            Dieses Level ist als nächstes dran und wird als echte Spielansicht umgesetzt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={{ ...topBarStyle, marginBottom: '0.1rem' }}>
        <button className="btn-secondary" onClick={() => onBack?.()}>← Menü</button>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>KLR Startup Survival</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Du rettest ein E-Commerce-Startup vor der Pleite. Jedes Level trainiert einen KLR-Baustein.
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="wisor-input"
            style={{ maxWidth: '280px' }}
            placeholder="Startup Name"
          />
          <button className="btn-primary" onClick={() => setStartupName(nameInput)}>Startup speichern</button>
        </div>

        <div style={{ display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '0.8rem' }}>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>STARTUP</div>
            <div style={{ fontWeight: 800, marginTop: '0.2rem' }}>{progress.startupName}</div>
          </div>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>XP</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.xp}</div>
          </div>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>AKTUELLES LEVEL</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.currentLevel}</div>
          </div>
          <div style={{ ...sectionStyle, margin: 0, padding: '0.8rem', borderRadius: '14px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>FREIGESCHALTET</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>{progress.unlockedLevels.join(', ')}</div>
          </div>
        </div>

        <div style={{ ...sectionStyle, margin: '0 0 0.2rem 0', padding: '0.8rem 0.9rem', borderRadius: '14px' }}>
          <button
            type="button"
            onClick={() => setHowToOpen((v) => !v)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '1.05rem',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <span>So spielst du</span>
            <span style={{ color: 'var(--text-muted)' }}>{howToOpen ? '▾' : '▸'}</span>
          </button>
          {howToOpen && (
            <div style={{ marginTop: '0.65rem' }}>
              <p style={{ margin: '0 0 0.35rem 0' }}>1. Wähle ein freigeschaltetes Level.</p>
              <p style={{ margin: '0 0 0.35rem 0' }}>2. Löse die Aufgaben Schritt für Schritt.</p>
              <p style={{ margin: 0 }}>3. Sammle XP und schalte das nächste Level frei.</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'stretch' }}>
        {LEVELS.map((lvl) => {
          const unlocked = progress.unlockedLevels.includes(lvl.id);
          return (
            <div
              key={lvl.id}
              style={{
                ...sectionStyle,
                opacity: unlocked ? 1 : 0.78,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '240px',
                padding: '0.95rem',
                borderRadius: '16px'
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Level {lvl.id}: {lvl.title}</h3>
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{lvl.subtitle}</p>
              <p style={{ marginTop: 0, marginBottom: '0.9rem' }}>{lvl.objective}</p>
              <div style={{ marginTop: 'auto' }}>
                {lvl.id === 1 ? (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={startLevel1}>Jetzt starten</button>
                ) : lvl.id === 2 && unlocked ? (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={startLevel2}>Level öffnen</button>
                ) : unlocked ? (
                  <button className="btn-secondary" style={{ width: '100%' }} onClick={() => openPendingLevel(lvl.id)}>Level öffnen</button>
                ) : (
                  <button
                    type="button"
                    disabled
                    style={{
                      width: '100%',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '999px',
                      padding: '0.65rem 0.8rem',
                      background: 'rgba(15,23,42,0.35)',
                      color: 'var(--text-muted)',
                      fontWeight: 700
                    }}
                  >
                    🔒 Erst Level {lvl.id - 1} abschließen
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
