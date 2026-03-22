import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProjectM } from '../state/ProjectMProvider';
import Confetti from '../../../components/Confetti';
import './project-m.css';

// --- Sound Helper using Web Audio API for "Pling" and "Bop" ---
const playSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      // "Pling" - High pitch, fast decay
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'error') {
      // "Bop" - Low pitch, un-intrusive
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch (e) {
    console.error('Audio Context Error', e);
  }
};

// --- Levels Configuration ---
const LEVELS = [
  { id: 1, title: 'Die Chronologie', subtitle: 'Der Zeitstrahl', objective: 'Bringe die Hauptphasen des E-Commerce-Projekts in die richtige Reihenfolge.' },
  { id: 2, title: 'Der Projektstrukturplan', subtitle: 'PSP & Untervorgänge', objective: 'Ordne spezifische Aufgaben den richtigen Hauptphasen zu.' },
  { id: 3, title: 'Steuerung & Gantt', subtitle: 'Fachbegriffe & Diagramme', objective: 'Vervollständige die Fachbegriffe zum kritischen Pfad und Gantt-Modell.' },
  { id: 4, title: 'Die Meisterprüfung', subtitle: 'Fehlersuche & Transfer', objective: 'Korrigiere den fehlerhaften Projektplan und baue die fehlenden Phasen ein.' }
];

const L1_CARDS = [
  { id: 'l1-1', label: 'Projektvorbereitung', order: 0 },
  { id: 'l1-2', label: 'Marktanalyse', order: 1 },
  { id: 'l1-3', label: 'Inhaltsplanung', order: 2 },
  { id: 'l1-4', label: 'Kanalauswahl & Optimierung', order: 3 },
  { id: 'l1-5', label: 'Umsetzung', order: 4 },
  { id: 'l1-6', label: 'Monitoring & Analyse', order: 5 },
  { id: 'l1-7', label: 'Abschluss & Bericht', order: 6 }
];

const L2_CATEGORIES = [
  { id: 'A', title: 'A) Marktanalyse' },
  { id: 'B', title: 'B) Inhaltsplanung' },
  { id: 'C', title: 'C) Umsetzung' },
  { id: 'D', title: 'D) Abschluss & Bericht' }
];

const L2_CARDS = [
  { id: 'l2-1', label: 'Zielgruppenanalyse', category: 'A' },
  { id: 'l2-2', label: 'Konkurrenzanalyse', category: 'A' },
  { id: 'l2-3', label: 'SWOT-Analyse', category: 'A' },
  { id: 'l2-4', label: 'Redaktionsplan erstellen', category: 'B' },
  { id: 'l2-5', label: 'Content-Strategie festlegen', category: 'B' },
  { id: 'l2-6', label: 'Landing Pages technisch aufbauen', category: 'C' },
  { id: 'l2-7', label: 'Finales Ad-Design erstellen', category: 'C' },
  { id: 'l2-8', label: 'Zielgruppensegmentierung im Tool einstellen', category: 'C' },
  { id: 'l2-9', label: 'Lessons Learned besprechen', category: 'D' },
  { id: 'l2-10', label: 'Erfolg gegen Zielsetzung messen', category: 'D' },
  { id: 'l2-11', label: 'Abschlusspräsentation halten', category: 'D' }
];

const L3_CLOZE = [
    { text: 'Ein Balkenplan zur Terminübersicht heißt auch', gap: 'Gantt-Diagramm', wrong: ['Budgetplan', 'Meilenstein'] },
    { text: 'Vorgänge, die parallel laufen können, nennt man', gap: 'Gleichzeitige Vorgänge', wrong: ['Lagerhaltung', 'Einfache Bindung'] },
    { text: 'Wenn ein Sammelvorgang den finalen Endtermin des Projekts bestimmt und keine Puffer hat, liegt er auf dem', gap: 'Kritischen Pfad', wrong: ['Pfadfinder', 'Hauptumsatzträger'] },
    { text: 'Eine Aufgabe, die zwingend abgeschlossen sein muss, bevor die nächste beginnt, erzeugt eine', gap: 'Abhängigkeit', wrong: ['Projektbremse', 'Budgetkürzung'] }
];

const L4_SITUATION = {
    faulty: [
        { label: 'Idee', correctLabel: 'Projektvorbereitung' },
        { label: 'Umsetzung', correctLabel: 'Marktanalyse' },
        { label: 'Marktanalyse', correctLabel: 'Inhaltsplanung' },
        { label: 'Abschluss', correctLabel: 'Umsetzung' },
        { label: 'Monitoring', correctLabel: 'Abschluss & Bericht' }
    ],
    inventory: [
        { id: 'l4-i1', label: 'Projektvorbereitung' },
        { id: 'l4-i2', label: 'Marktanalyse' },
        { id: 'l4-i3', label: 'Inhaltsplanung' },
        { id: 'l4-i4', label: 'Umsetzung' },
        { id: 'l4-i5', label: 'Monitoring' },
        { id: 'l4-i6', label: 'Abschluss & Bericht' }
    ]
};

export default function ProjectMGame({ onBack, onLearningEvent }) {
  const { progress, grantXp, unlockLevel } = useProjectM();
  const [screen, setScreen] = useState('home');
  const [showConfetti, setShowConfetti] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('Systeme bereit. Analysiere Projekt "SneakerNova"...');
  const [assistantState, setAssistantState] = useState('idle');
  
  // Confetti trigger
  const triggerSuccess = () => {
    setShowConfetti(true);
    playSound('success');
    setAssistantState('success');
    setTimeout(() => setShowConfetti(false), 5000);
    setTimeout(() => setAssistantState('idle'), 3000);
  };

  const triggerError = (msg) => {
    playSound('error');
    setAssistantState('error');
    setAssistantMessage(msg || 'Struktureller Fehler im Plan!');
    setTimeout(() => setAssistantState('idle'), 3000);
  };

  // --- HOME SCREEN ---
  const renderHome = () => (
    <div className="project-m-theme">
      <div className="pm-wire" style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1.5rem', borderRadius: '24px', position: 'relative' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.02em', textShadow: '0 0 30px rgba(109, 175, 255, 0.4)' }}>PROJEKT m</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Projektmanagement Mastery für E-Commerce</p>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
             <div className="stats-badge" style={{ background: 'rgba(109, 175, 255, 0.1)', border: '1px solid var(--glass-border)' }}>
               XP: {progress.xp} | Level {progress.currentLevel}
             </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {LEVELS.map((lvl) => {
            const isUnlocked = progress.unlockedLevels.includes(lvl.id);
            return (
              <div 
                key={lvl.id} 
                className={`dash-card pm-wire ${!isUnlocked ? 'locked' : ''}`}
                style={{ cursor: isUnlocked ? 'pointer' : 'not-allowed', opacity: isUnlocked ? 1 : 0.6 }}
                onClick={() => isUnlocked && setScreen(`level${lvl.id}`)}
              >
                <div className="level-number" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'rgba(109,175,255,0.2)', position: 'absolute', right: '15px', top: '10px' }}>0{lvl.id}</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{lvl.title}</h3>
                <h4 style={{ color: 'var(--primary)', marginBottom: '0.8rem', fontSize: '0.95rem' }}>{lvl.subtitle}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lvl.objective}</p>
                {!isUnlocked && <div style={{ marginTop: '1rem', color: 'var(--accent)', fontWeight: 'bold' }}>🔒 Gesperrt</div>}
              </div>
            );
          })}
        </div>

        <button className="btn-secondary" style={{ marginTop: '3rem', width: '100%' }} onClick={onBack}>&larr; Zurück zum Dashboard</button>
      </div>
    </div>
  );

  // --- LEVEL 1: TIMELINE ---
  const [l1Dropped, setL1Dropped] = useState(Array(7).fill(null));
  const [l1Mistakes, setL1Mistakes] = useState({}); // per card id
  const [l1QuizGate, setL1QuizGate] = useState(false);

  const renderLevel1 = () => {
    const isCompleted = l1Dropped.every(val => val !== null);
    
    const handleDragStart = (e, card) => {
      e.dataTransfer.setData('cardId', card.id);
    };

    const handleDrop = (e, slotIndex) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('cardId');
      const card = L1_CARDS.find(c => c.id === cardId);
      
      if (card.order === slotIndex) {
        setL1Dropped(prev => {
          const next = [...prev];
          next[slotIndex] = card;
          return next;
        });
        setAssistantMessage('Exakt! Das ist die richtige Phase.');
        if (l1Dropped.filter(v => v !== null).length === 6) {
           triggerSuccess();
        } else {
           playSound('success');
        }
      } else {
        triggerError('Die Reihenfolge stimmt so nicht. Denk an den Zyklus!');
        setL1Mistakes(prev => ({ ...prev, [cardId]: (prev[cardId] || 0) + 1 }));
      }
    };

    return (
      <div className="project-m-theme">
        <div className="pm-wire" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', borderRadius: '24px' }}>
          <button className="btn-nav" onClick={() => setScreen('home')}>&larr; Zurück</button>
          
          <div style={{ textAlign: 'center', margin: '1rem 0 2rem' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 1: Die Chronologie</h2>
            <p style={{ color: 'var(--text-muted)' }}>Szenario: 🛒 "SneakerNova" Sommer-Sale. In welcher Reihenfolge planen wir?</p>
          </div>

          <div className="timeline-container">
            {l1Dropped.map((item, idx) => (
              <div 
                key={idx} 
                className={`timeline-slot ${item ? 'pm-card--correct' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => !item && handleDrop(e, idx)}
              >
                {item ? item.label : ''}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
            {L1_CARDS.map(card => {
               const alreadyPlaced = l1Dropped.some(d => d?.id === card.id);
               if (alreadyPlaced) return null;
               return (
                 <div 
                   key={card.id} 
                   className="pm-card" 
                   draggable 
                   onDragStart={(e) => handleDragStart(e, card)}
                 >
                   {card.label}
                   {l1Mistakes[card.id] >= 3 && <div className="hint-icon" title="Tipp: Beginne immer mit der Vorbereitung.">❓</div>}
                 </div>
               );
            })}
          </div>

          {isCompleted && !l1QuizGate && (
            <div className="fade-in pm-wire" style={{ marginTop: '2rem', padding: '1.5rem', textAlign: 'center', background: 'rgba(109, 175, 255, 0.1)' }}>
              <h3>Quiz-Gate! 🛑</h3>
              <p>Womit startet ein professionelles E-Commerce-Projekt zwingend?</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button className="btn-secondary" onClick={() => triggerError('Falsch! Design kommt erst viel später.')}>Design</button>
                <button className="btn-secondary" onClick={() => { triggerSuccess(); setL1QuizGate(true); }}>Projektvorbereitung</button>
                <button className="btn-secondary" onClick={() => triggerError('Falsch! Ohne Planung keine Umsetzung.')}>Umsetzung</button>
              </div>
            </div>
          )}

          {l1QuizGate && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
               <button className="btn-primary" onClick={() => { grantXp(50); unlockLevel(2); setScreen('home'); }}>Level Abschließen & XP Sammeln</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- LEVEL 2: PSP ---
  const [l2Dropped, setL2Dropped] = useState({ A: [], B: [], C: [], D: [] });
  const [l2Mistakes, setL2Mistakes] = useState({});
  const [l2QuizGate, setL2QuizGate] = useState(false);

  const renderLevel2 = () => {
    const remainingCards = L2_CARDS.filter(c => !Object.values(l2Dropped).flat().some(d => d.id === c.id));
    const allPlaced = remainingCards.length === 0;

    const handleDragStart = (e, card) => {
      e.dataTransfer.setData('cardId', card.id);
    };

    const handleDrop = (e, catId) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('cardId');
      const card = L2_CARDS.find(c => c.id === cardId);

      if (card.category === catId) {
        setL2Dropped(prev => ({
          ...prev,
          [catId]: [...prev[catId], card]
        }));
        playSound('success');
        
        // Gate check: If Box C becomes full (3 items)
        if (catId === 'C' && l2Dropped.C.length === 2 && !l2QuizGate) {
           setL2QuizGate(true);
           setAssistantMessage('Moment! Kurze Wissensprüfung...');
        }
      } else {
        triggerError('Inkorrekte Zuordnung. Überlege genau, in was diese Aufgabe mündet.');
        setL2Mistakes(prev => ({ ...prev, [cardId]: (prev[cardId] || 0) + 1 }));
      }
    };

    return (
      <div className="project-m-theme">
        <div className="pm-wire" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem', borderRadius: '24px' }}>
          <button className="btn-nav" onClick={() => setScreen('home')}>&larr; Zurück</button>

          <div style={{ textAlign: 'center', margin: '1rem 0 1.5rem' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 2: Projektstrukturplan</h2>
            <p style={{ color: 'var(--text-muted)' }}>Szenario: Detaillierung für den "SneakerNova"-Sale. Ordne die Aufgaben richtig zu.</p>
          </div>

          <div className="pm-category-grid">
            {L2_CATEGORIES.map(cat => (
              <div 
                key={cat.id} 
                className="pm-category-box"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, cat.id)}
              >
                <h3>{cat.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                   {l2Dropped[cat.id].map(card => (
                     <div key={card.id} className="pm-card pm-card--correct" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>{card.label}</div>
                   ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center', marginTop: '2rem' }}>
            {!l2QuizGate && remainingCards.map(card => (
              <div 
                key={card.id} 
                className="pm-card" 
                draggable 
                onDragStart={(e) => handleDragStart(e, card)}
                style={{ width: '180px' }}
              >
                {card.label}
                {l2Mistakes[card.id] >= 3 && <div className="hint-icon">❓</div>}
              </div>
            ))}
          </div>

          {l2QuizGate && (
            <div className="fade-in pm-wire" style={{ marginTop: '2rem', padding: '1.5rem', textAlign: 'center', border: '2px solid var(--accent)' }}>
               <h3>Einstich-Frage! 🎯</h3>
               <p>Das Team baut Landing Pages und setzt Tracking-Pixel. In welcher Phase sind wir?</p>
               <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                  <button className="btn-secondary" onClick={() => triggerError('Nope, Monitoring kommt danach.')}>Monitoring</button>
                  <button className="btn-secondary" onClick={() => { triggerSuccess(); setL2QuizGate(false); }}>Umsetzung</button>
                  <button className="btn-secondary" onClick={() => triggerError('Leider falsch, wir sind schon aktiv.')}>Planung</button>
               </div>
            </div>
          )}

          {allPlaced && !l2QuizGate && (
             <div style={{ marginTop: '2rem', textAlign: 'center' }}>
               <button className="btn-primary" onClick={() => { triggerSuccess(); grantXp(75); unlockLevel(3); setScreen('home'); }}>Strukturplan Abgeschlossen & XP+</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  // --- LEVEL 3: GANTT ---
  const [l3Answers, setL3Answers] = useState(Array(4).fill(''));
  const [l3Pool, setL3Pool] = useState(['Gantt-Diagramm', 'Gleichzeitige Vorgänge', 'Kritischen Pfad', 'Abhängigkeit', 'Meilenstein', 'Budgetplan'].sort(() => Math.random() - 0.5));

  const renderLevel3 = () => {
    const handleDrop = (e, index) => {
      e.preventDefault();
      const val = e.dataTransfer.getData('answer');
      if (val === L3_CLOZE[index].gap) {
        setL3Answers(prev => {
          const next = [...prev];
          next[index] = val;
          return next;
        });
        playSound('success');
      } else {
        triggerError('Dieser Begriff passt semantisch oder technisch nicht.');
      }
    };

    const allChecked = l3Answers.every(ans => ans !== '');

    return (
      <div className="project-m-theme">
        <div className="pm-wire" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', borderRadius: '24px' }}>
          <button className="btn-nav" onClick={() => setScreen('home')}>&larr; Zurück</button>
          
          <div style={{ textAlign: 'center', margin: '1rem 0 1rem' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 3: Projektsteuerung & Gantt</h2>
            <p style={{ color: 'var(--text-muted)' }}>Fülle das Lückentext-Puzzle über Terminplanung und kritische Pfade aus.</p>
          </div>

          <div className="pm-cloze-container">
            {L3_CLOZE.map((cloze, idx) => (
              <div key={idx} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                {cloze.text} 
                <div 
                  className={`pm-drop-zone ${l3Answers[idx] ? 'filled' : ''}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, idx)}
                >
                  {l3Answers[idx] || ''}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
             {l3Pool.map((p, i) => {
               if (l3Answers.includes(p)) return null;
               return <div key={i} className="pm-card" draggable onDragStart={e => e.dataTransfer.setData('answer', p)}>{p}</div>
             })}
          </div>

          {allChecked && (
             <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button className="btn-primary" onClick={() => { triggerSuccess(); grantXp(100); unlockLevel(4); setScreen('home'); }}>Meister der Begriffe! XP+</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  // --- LEVEL 4: MASTER TEST ---
  const [l4Current, setL4Current] = useState(L4_SITUATION.faulty.map((item, id) => ({ ...item, id: `faulty-${id}` })));
  const [l4Inventory, setL4Inventory] = useState(L4_SITUATION.inventory);

  const renderLevel4 = () => {
    const isWin = l4Current.length === 6 && l4Current.every((card, idx) => {
        const correctSequence = ['Projektvorbereitung', 'Marktanalyse', 'Inhaltsplanung', 'Umsetzung', 'Monitoring', 'Abschluss & Bericht'];
        return card.label === correctSequence[idx];
    });

    const handleDragStart = (e, card, from) => {
      e.dataTransfer.setData('cardStr', JSON.stringify({ card, from }));
    };

    const handleDrop = (e, targetIdx) => {
       e.preventDefault();
       const data = JSON.parse(e.dataTransfer.getData('cardStr'));
       const { card, from } = data;

       setL4Current(prev => {
          const next = [...prev];
          // Simple swap or replace
          if (from === 'board') {
             // Swap on board
             const originIdx = next.findIndex(c => c.id === card.id);
             const temp = next[targetIdx];
             next[targetIdx] = next[originIdx];
             next[originIdx] = temp;
          } else {
             // From inventory - replace or insert?
             // User said: "remove false cards and replace with correct"
             // For simplicity, let's just allow replacing the slot
             next[targetIdx] = card;
          }
          return next;
       });

       // Logic for appending/fixing size
       if (l4Current.length < 6 && from === 'inventory') {
          // Check if we should append
         setL4Current(prev => {
            if (prev.length < 6 && !prev.some(c => c.id === card.id)) {
               return [...prev, card];
            }
            return prev;
         });
       }
    };

    const handleTrash = (e) => {
       e.preventDefault();
       const data = JSON.parse(e.dataTransfer.getData('cardStr'));
       if (data.from === 'board') {
          setL4Current(prev => prev.filter(c => c.id !== data.card.id));
          playSound('error');
       }
    };

    return (
      <div className="project-m-theme">
        <div className="pm-wire" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', borderRadius: '24px' }}>
          <button className="btn-nav" onClick={() => setScreen('home')}>&larr; Zurück</button>

          <div style={{ textAlign: 'center', margin: '1rem 0 2rem' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 4: Die Meisterprüfung</h2>
            <p style={{ color: 'var(--text-muted)' }}>Szenario: Korrigiere den Relaunch-Plan der "EcoGlow" App. Ziehe Fehler heraus und baue die korrekte Kette (6 Phasen).</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', minHeight: '120px', padding: '1.5rem', border: '1px solid rgba(109,175,255,0.2)', borderRadius: '15px' }}>
             {l4Current.map((card, idx) => (
               <div 
                 key={card.id} 
                 className="pm-card" 
                 draggable 
                 onDragStart={e => handleDragStart(e, card, 'board')}
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => handleDrop(e, idx)}
               >
                 {card.label}
               </div>
             ))}
             {l4Current.length < 6 && <div className="pm-card" style={{ border: '2px dashed #444', opacity: 0.3 }} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, l4Current.length)}>+ Drop here</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem' }}>
             <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: '0.8rem' }}>Inventar:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                   {l4Inventory.map(c => (
                     <div key={c.id} className="pm-card" draggable onDragStart={e => handleDragStart(e, c, 'inventory')} style={{ fontSize: '0.8rem' }}>{c.label}</div>
                   ))}
                </div>
             </div>
             
             <div 
               onDragOver={e => e.preventDefault()} 
               onDrop={handleTrash}
               style={{ width: '100px', height: '100px', border: '2px solid var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '2rem' }}
             >
                🗑️
             </div>
          </div>

          {isWin && (
             <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                <button className="btn-primary" style={{ padding: '1rem 3rem' }} onClick={() => { triggerSuccess(); grantXp(150); setScreen('home'); }}>Meisterprüfung Bestanden! 🏆</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  const currentScreen = useMemo(() => {
    switch (screen) {
      case 'level1': return renderLevel1();
      case 'level2': return renderLevel2();
      case 'level3': return renderLevel3();
      case 'level4': return renderLevel4();
      default: return renderHome();
    }
  }, [screen, l1Dropped, l1Mistakes, l1QuizGate, l2Dropped, l2Mistakes, l2QuizGate, l3Answers, l4Current]);

  return (
    <div className={`project-m-container ${assistantState === 'success' ? 'project-m-theme--success' : ''}`}>
      {showConfetti && <Confetti />}
      {currentScreen}

      <div className={`pm-assistant pm-assistant--${assistantState}`}>
        <div className="pm-assistant__bubble">
          <strong>Projekt-Assistent</strong>
          <p>{assistantMessage}</p>
        </div>
        <div className="avatar-placeholder" style={{ width: '100px', height: '100px', background: 'rgba(109,175,255,0.2)', border: '1px solid var(--primary)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'italic', fontSize: '0.7rem' }}>
           AI Vision Bot
        </div>
      </div>
    </div>
  );
}
