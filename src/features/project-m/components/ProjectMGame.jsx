import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProjectM } from '../state/ProjectMProvider';
import Confetti from '../../../components/Confetti';
import { L1_VARIANTS, L2_VARIANTS, L3_VARIANTS, L4_VARIANTS } from '../data/scenarios';
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
  { id: 1, title: 'Die Chronologie', subtitle: 'Der Zeitstrahl', objective: 'Bringe die Hauptphasen des Projekts in die richtige Reihenfolge.' },
  { id: 2, title: 'Der Projektstrukturplan', subtitle: 'PSP & Untervorgänge', objective: 'Ordne spezifische Aufgaben den richtigen Hauptphasen zu.' },
  { id: 3, title: 'Steuerung & Gantt', subtitle: 'Fachbegriffe & Diagramme', objective: 'Vervollständige die Fachbegriffe zu IHK-Methoden.' },
  { id: 4, title: 'Die Meisterprüfung', subtitle: 'Fehlersuche & Transfer', objective: 'Korrigiere den fehlerhaften Projektplan und baue die fehlenden Phasen ein.' }
];

export default function ProjectMGame({ onBack, onLearningEvent }) {
  const { progress, grantXp, unlockLevel } = useProjectM();
  const [screen, setScreen] = useState('home');
  const [showConfetti, setShowConfetti] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('Systeme bereit. Analysiere Projekt "SneakerNova"...');
  const [assistantState, setAssistantState] = useState('idle');
  
  // Current Random Variants
  const [l1Variant, setL1Variant] = useState(L1_VARIANTS[0]);
  const [l2Variant, setL2Variant] = useState(L2_VARIANTS[0]);
  const [l3Variant, setL3Variant] = useState(L3_VARIANTS[0]);
  const [l4Variant, setL4Variant] = useState(L4_VARIANTS[0]);

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

  const handleStartLevel = (levelId) => {
    if (levelId === 1) {
      const v = L1_VARIANTS[Math.floor(Math.random() * L1_VARIANTS.length)];
      setL1Variant(v);
      setL1Dropped(Array(v.cards.length).fill(null));
      setL1Mistakes({});
      setL1QuizGate(false);
      setScreen('level1');
    } else if (levelId === 2) {
      const v = L2_VARIANTS[Math.floor(Math.random() * L2_VARIANTS.length)];
      setL2Variant(v);
      setL2Dropped({ A: [], B: [], C: [], D: [] });
      setL2Mistakes({});
      setL2QuizGate(false);
      setScreen('level2');
    } else if (levelId === 3) {
      const v = L3_VARIANTS[Math.floor(Math.random() * L3_VARIANTS.length)];
      setL3Variant(v);
      setL3Answers(Array(v.cloze.length).fill(''));
      setL3Pool([...v.pool].sort(() => Math.random() - 0.5));
      setScreen('level3');
    } else if (levelId === 4) {
      const v = L4_VARIANTS[Math.floor(Math.random() * L4_VARIANTS.length)];
      setL4Variant(v);
      setL4Current(v.faulty.map((item, id) => ({ ...item, id: `faulty-${id}` })));
      setL4Inventory(v.inventory);
      setScreen('level4');
    }
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
                onClick={() => isUnlocked && handleStartLevel(lvl.id)}
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
      const card = l1Variant.cards.find(c => c.id === cardId);
      if (!card) return;
      
      if (card.order === slotIndex) {
        setL1Dropped(prev => {
          const next = [...prev];
          next[slotIndex] = card;
          return next;
        });
        setAssistantMessage('Exakt! Das ist die richtige Phase.');
        const currentCount = l1Dropped.filter(v => v !== null).length;
        if (currentCount === l1Variant.cards.length - 1) {
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
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 1: {l1Variant.title}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{l1Variant.scenario}</p>
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
            {l1Variant.cards.map(card => {
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
              <p>{l1Variant.quizQuestion}</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                {l1Variant.quizAnswers.map((ans, i) => (
                    <button 
                        key={i} 
                        className="btn-secondary" 
                        onClick={() => {
                            if (ans.correct) {
                                triggerSuccess();
                                setL1QuizGate(true);
                            } else {
                                triggerError(ans.msg);
                            }
                        }}
                    >
                        {ans.text}
                    </button>
                ))}
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
    const remainingCards = l2Variant.cards.filter(c => !Object.values(l2Dropped).flat().some(d => d.id === c.id));
    const allPlaced = remainingCards.length === 0;

    const handleDragStart = (e, card) => {
      e.dataTransfer.setData('cardId', card.id);
    };

    const handleDrop = (e, catId) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('cardId');
      const card = l2Variant.cards.find(c => c.id === cardId);
      if(!card) return;

      if (card.category === catId) {
        setL2Dropped(prev => {
           const next = { ...prev, [catId]: [...prev[catId], card] };
           if (catId === l2Variant.quizTriggerCategory && next[catId].length === l2Variant.quizTriggerCount && !l2QuizGate) {
              setL2QuizGate(true);
              setAssistantMessage('Moment! Kurze Wissensprüfung...');
           }
           return next;
        });
        playSound('success');
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
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 2: {l2Variant.title}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{l2Variant.scenario}</p>
          </div>

          <div className="pm-category-grid">
            {l2Variant.categories.map(cat => (
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
               <p>{l2Variant.quizQuestion}</p>
               <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {l2Variant.quizAnswers.map((ans, i) => (
                      <button 
                          key={i} 
                          className="btn-secondary" 
                          onClick={() => {
                              if(ans.correct) {
                                  triggerSuccess();
                                  setL2QuizGate(false);
                              } else {
                                  triggerError(ans.msg);
                              }
                          }}
                      >
                          {ans.text}
                      </button>
                  ))}
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
  const [l3Pool, setL3Pool] = useState([]);

  const renderLevel3 = () => {
    const handleDrop = (e, index) => {
      e.preventDefault();
      const val = e.dataTransfer.getData('answer');
      if (val === l3Variant.cloze[index].gap) {
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
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 3: {l3Variant.title}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{l3Variant.scenario}</p>
          </div>

          <div className="pm-cloze-container">
            {l3Variant.cloze.map((cloze, idx) => (
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
  const [l4Current, setL4Current] = useState([]);
  const [l4Inventory, setL4Inventory] = useState([]);

  const renderLevel4 = () => {
    const isWin = l4Current.length === l4Variant.correctSequence.length && l4Current.every((card, idx) => {
        return card.label === l4Variant.correctSequence[idx];
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
          if (from === 'board') {
             const originIdx = next.findIndex(c => c.id === card.id);
             const temp = next[targetIdx];
             if(next[targetIdx] !== undefined) {
                 next[targetIdx] = next[originIdx];
                 next[originIdx] = temp;
             }
          } else {
             // ensure we're not exceeding max length or adding duplicates
             if (!next.some(c => c.id === card.id)) {
                next[targetIdx] = card;
             }
          }
          return next;
       });
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
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>Level 4: {l4Variant.title}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{l4Variant.scenario}</p>
          </div>

          <div className="level-4-layout" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', minHeight: '120px', padding: '1.5rem', border: '1px solid rgba(109,175,255,0.2)', borderRadius: '15px' }}>
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
             {l4Current.length < l4Variant.correctSequence.length && <div className="pm-card" style={{ border: '2px dashed #444', opacity: 0.3 }} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, l4Current.length)}>+ Drop here</div>}
          </div>

          <div className="level-4-layout" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem' }}>
             <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: '0.8rem' }}>Inventar:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                   {l4Inventory.map(c => (
                     <div key={c.id} className="pm-card" draggable onDragStart={e => handleDragStart(e, c, 'inventory')} style={{ fontSize: '0.8rem' }}>{c.label}</div>
                   ))}
                </div>
             </div>
             
             <div 
               className="level-4-trash"
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
