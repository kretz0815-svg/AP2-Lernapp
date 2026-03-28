import React, { useState, useEffect, useCallback } from 'react';
import { slfService } from './slfSupabaseService';
import Confetti from '../../components/Confetti';
import { askGemini } from '../../geminiClient';

/**
 * SLFGameContainer: The State-Machine managing 6 game phases.
 * 1. Lobby
 * 2. Dice Initiative
 * 3. Letter Roulette (for the winner)
 * 4. Playing
 * 5. Buzzer Lock
 * 6. AI Evaluation
 */
const SLFGameContainer = ({ room, player, onClose }) => {
  const [roomData, setRoomData] = useState(room);
  const [players, setPlayers] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Round Specific State
  const [localRoll, setLocalRoll] = useState(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [visualRoll, setVisualRoll] = useState('?');
  const [answers, setAnswers] = useState({ stadt: '', land: '', fluss: '', tier: '', beruf: '' });
  const [aiResults, setAiResults] = useState(null);
  const [rouletteLetter, setRouletteLetter] = useState('A');
  const [isRolling, setIsRolling] = useState(false);
  const [calculatedPoints, setCalculatedPoints] = useState(0);
  const [nextRoundLoading, setNextRoundLoading] = useState(false);

  const categories = ['stadt', 'land', 'fluss', 'tier', 'beruf'];

  const refreshPlayers = useCallback(async () => {
    try {
      const data = await slfService.fetchPlayers(room.id);
      if (data && data.length > 0) {
        setPlayers(data);
        // Sync local roll if DB already has it
        const me = data.find(p => p.id === player.id);
        if (me && me.dice_roll > 0 && !localRoll) {
          setLocalRoll(me.dice_roll);
        }
      }
    } catch (err) {
      console.error('refreshPlayers error:', err);
    }
  }, [room.id, player.id, localRoll]);

  useEffect(() => {
    refreshPlayers();
    const sub = slfService.subscribeToRoom(room.id, 
      (newRoom) => {
        if (newRoom && newRoom.id) {
          setRoomData(newRoom);
          refreshPlayers(); // Re-sync players when phase changes
        }
      }, 
      () => refreshPlayers()
    );
    return () => sub.unsubscribe();
  }, [room.id, refreshPlayers]);

  /**
   * AI Validation Placeholder
   */
  const validateAnswersWithAI = async (answersObj) => {
    try {
      const prompt = `Validiere Stadt Land Fluss für Buchstabe '${roomData.current_letter}': 
      STADT: ${answersObj.stadt}, LAND: ${answersObj.land}, FLUSS: ${answersObj.fluss}, TIER: ${answersObj.tier}, BERUF: ${answersObj.beruf}.
      Antworte als JSON: { "stadt": "correct/wrong", ... }. 
      Sei STRENG. Gib NUR 'correct' oder 'wrong' zurück. Keine Neutral-Werte. Buchstabe muss stimmen.`;
      const response = await askGemini(prompt);
      const jsonMatch = response.match(/\{.*\}/s);
      if (jsonMatch) {
        const raw = JSON.parse(jsonMatch[0]);
        // Translate to German
        const translated = {};
        Object.keys(raw).forEach(k => {
          translated[k] = raw[k] === 'correct' ? 'Richtig' : 'Falsch';
        });
        setAiResults(translated);
        calculatePoints(translated, answersObj);
      }
    } catch (err) {
      console.error('AI Eval error:', err);
    }
  };

  const calculatePoints = async (results, myAnswers) => {
    try {
      // Get all responses to compare
      const allResponses = await slfService.fetchResponses(room.id);
      let roundTotal = 0;

      categories.forEach(cat => {
        if (results[cat] !== 'Richtig') return;
        
        const myVal = myAnswers[cat].trim().toLowerCase();
        const otherVals = allResponses
          .filter(r => r.player_id !== player.id)
          .map(r => r.data[cat]?.trim().toLowerCase() || '');

        const hasOthers = otherVals.some(v => v !== '');
        const hasSame = otherVals.some(v => v === myVal);

        if (!hasOthers) {
           roundTotal += 20; // Ich habe was, andere nichts
        } else if (hasSame) {
           roundTotal += 5; // Gleiches Wort
        } else {
           roundTotal += 10; // Unterschiedliche richtige Wörter
        }
      });

      setCalculatedPoints(roundTotal);
      await slfService.addPlayerScore(player.id, roundTotal);
      refreshPlayers();
    } catch (err) { console.error('Score calculation error:', err); }
  };

  const startNextRoundOrFinish = async () => {
    setNextRoundLoading(true);
    try {
      if (roomData.current_round_num >= roomData.total_rounds) {
         await slfService.setGamePhase(room.id, 'game_over');
      } else {
         // Reset for next round
         await slfService.setGamePhase(room.id, 'dice', { 
           current_round_num: roomData.current_round_num + 1,
           current_letter: null,
           dice_winner_id: null
         });
         // Reset players state (dice_roll) in DB
         for (const p of players) {
           await slfService.updateDiceRoll(p.id, 0);
         }
         // Local resets
         setLocalRoll(null);
         setAiResults(null);
         setAnswers({ stadt: '', land: '', fluss: '', tier: '', beruf: '' });
      }
    } catch (err) { alert(err.message); }
    finally { setNextRoundLoading(false); }
  };

  useEffect(() => {
    // Reset local states for a new round
    setLocalRoll(null);
    setVisualRoll('?');
    setAiResults(null);
    setCalculatedPoints(0);
    setAnswers({ stadt: '', land: '', fluss: '', tier: '', beruf: '' });
  }, [roomData.current_round_num]);

  useEffect(() => {
    if (roomData.game_phase === 'evaluating' && !aiResults) {
      validateAnswersWithAI(answers);
    }
  }, [roomData.game_phase]);

  /** ───────── Phase Logic ───────── **/

  const startDicePhase = () => slfService.setGamePhase(room.id, 'dice');

  const rollDice = async () => {
    if (isRollingDice) return;
    setIsRollingDice(true);
    
    // Dice Animation
    let count = 0;
    const interval = setInterval(() => {
      setVisualRoll(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 15) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setVisualRoll(finalVal);
        setLocalRoll(finalVal);
        setIsRollingDice(false);
        finalizeRoll(finalVal);
      }
    }, 80);
  };

  const finalizeRoll = async (val) => {
    try {
      await slfService.updateDiceRoll(player.id, val);
      
      // Let's re-fetch to see the current state of everyone
      const updatedPlayers = await slfService.fetchPlayers(room.id);
      setPlayers(updatedPlayers);
      
      const allRolled = updatedPlayers.length > 0 && updatedPlayers.every(p => p.dice_roll > 0);
      
      if (allRolled) {
        const sorted = [...updatedPlayers].sort((a, b) => b.dice_roll - a.dice_roll);
        
        // TIE CHECK: If the top two have the same roll
        if (updatedPlayers.length > 1 && sorted[0].dice_roll === sorted[1].dice_roll) {
           alert(`Unentschieden (${sorted[0].dice_roll})! Bitte würfelt noch einmal.`);
           // Reset all rolls to 0 via a helper or bulk update
           for (const p of updatedPlayers) {
             await slfService.updateDiceRoll(p.id, 0);
           }
           setLocalRoll(null);
           refreshPlayers();
           return;
        }

        const winnerId = sorted[0].id;
        // The last player to roll triggers the advance for everyone
        await advanceToLetterRoulette(winnerId);
      }
    } catch (err) {
      console.error('Finalize roll error:', err);
    }
  };

  const advanceToLetterRoulette = (winnerId) => {
    slfService.setGamePhase(room.id, 'roulette', { dice_winner_id: winnerId });
  };

  const spinRoulette = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setRouletteLetter(String.fromCharCode(65 + Math.floor(Math.random() * 26)));
      count++;
      if (count > 20) {
        clearInterval(interval);
        const finalLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        setRouletteLetter(finalLetter);
        setIsRolling(false);
        slfService.setGamePhase(room.id, 'playing', { current_letter: finalLetter });
      }
    }, 100);
  };

  const submitGame = async () => {
    setShowConfetti(true);
    await slfService.triggerBuzzer(room.id, player.id);
    await slfService.submitAnswers(room.id, player.id, answers);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  /** ───────── PHASE VIEWS ───────── **/

  const renderLobby = () => (
    <div className="slf-section">
      <h3>🚀 Lobby: {roomData.room_name}</h3>
      <p className="slf-highlight-code">Beitritts-Code: <span>{roomData.room_code}</span></p>
      
      <div className="slf-p-list">
        {players.map(p => <div key={p.id} className="slf-p-tag">👤 {p.name} {p.id === player.id && '(Host)'}</div>)}
      </div>
      <button className="slf-prime-btn" onClick={startDicePhase}>Engagement starten! (Würfeln)</button>
      <p className="slf-hint" style={{ marginTop: '1rem' }}>Sende den Code oben an deine Freunde, damit sie beitreten können.</p>
    </div>
  );

  const renderDice = () => {
    const sorted = [...players].sort((a, b) => b.dice_roll - a.dice_roll);
    const winner = sorted[0]?.dice_roll > 0 ? sorted[0] : null;
    const allReady = players.every(p => p.dice_roll > 0);

    return (
      <div className="slf-section">
        <h3>🎲 Würfel für Initiative</h3>
        <p className="slf-hint">Alle müssen würfeln. Wer am höchsten wirft, beginnt!</p>
        
        <div className="slf-dice-grid">
           {players.length > 0 ? players.map(p => {
             const isMe = p.id === player.id;
             return (
               <div key={p.id} className={`slf-dice-card ${isMe ? 'active' : ''}`}>
                  <span>{p.name} {isMe && '(Du)'}</span>
                  <div className={`slf-die ${isRollingDice && isMe ? 'rolling' : ''}`}>
                    {isMe && isRollingDice ? visualRoll : (p.dice_roll || '?')}
                  </div>
               </div>
             );
           }) : <p className="slf-hint">Lade Spieler...</p>}
        </div>
        {!localRoll && (
          <button onClick={rollDice} className="slf-prime-btn slf-dice-btn" style={{ marginTop: '2rem' }}>
            🎲 JETZT WÜRFELN!
          </button>
        )}
        
        {localRoll && !allReady && <div className="slf-waiting-box">Warten auf Mitspieler... ⏳</div>}
        
        {winner && winner.dice_roll > 0 && allReady && (
           <div className="slf-winner-announcement">
             🏆 {winner.name} hat gewonnen!
             <p>Warte auf Start durch Gewinner...</p>
           </div>
        )}
      </div>
    );
  };

  const renderRoulette = () => (
    <div className="slf-section">
      <h3>🎰 Buchstaben-Roulette</h3>
      <div className="slf-slot-display">{rouletteLetter}</div>
      {roomData.dice_winner_id === player.id ? (
        <button disabled={isRolling} onClick={spinRoulette} className="slf-prime-btn slf-spin-btn">
          {isRolling ? '🎰 Rattert...' : '🛑 STOPP!'}
        </button>
      ) : <p className="slf-hint">Warte auf {players.find(p => p.id === roomData.dice_winner_id)?.name || 'Gewinner'}...</p>}
    </div>
  );

  const renderPlaying = () => (
    <div className="slf-section">
      <div className="slf-game-header">Buchstabe: <span>{roomData.current_letter}</span></div>
      <div className="slf-inputs">
        {categories.map(cat => (
          <div key={cat} className="slf-field">
            <label>{cat.toUpperCase()}</label>
            <input 
              value={answers[cat]} 
              onChange={e => setAnswers({ ...answers, [cat]: e.target.value })} 
              disabled={roomData.game_phase === 'evaluating'}
              placeholder="..."
            />
          </div>
        ))}
      </div>
      {roomData.game_phase !== 'evaluating' && (
        <button className="slf-buzzer" onClick={submitGame}>FERTIG! 🚨</button>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="slf-section">
      <h3>🤖 KI Auswertung</h3>
      <p className="slf-points-info">Diese Runde: <span>+{calculatedPoints} Punkte</span></p>
      
      <div className="slf-results-grid">
         {categories.map(cat => (
           <div key={cat} className="slf-res-row">
             <div className="slf-res-left">
                <span className="slf-cat-label">{cat.toUpperCase()}</span>
                <span className="slf-val-text">{answers[cat] || '—'}</span>
             </div>
             {aiResults ? (
               <span className={`slf-badge ${aiResults[cat] === 'Richtig' ? 'correct' : 'wrong'}`}>{aiResults[cat]}</span>
             ) : <div className="slf-loader-mini">Analysiere...</div>}
           </div>
         ))}
      </div>
      
      {aiResults && (
        <button onClick={startNextRoundOrFinish} disabled={nextRoundLoading} className="slf-prime-btn">
          {roomData.current_round_num < roomData.total_rounds ? 'Nächste Runde' : 'Zum Endergebnis'}
        </button>
      )}
    </div>
  );

  const renderGameOver = () => {
    return (
      <div className="slf-section">
        <h2 className="slf-win-title">🏆 Spiel Beendet!</h2>
        <div className="slf-final-rank">
           {players.sort((a,b) => b.score-a.score).map((p, idx) => (
             <div key={p.id} className={`slf-rank-row ${idx === 0 ? 'top' : ''}`}>
                <span className="slf-rank-num">#{idx+1}</span>
                <span className="slf-player-name">{p.name}</span>
                <span className="slf-player-score">{p.score} Pkt.</span>
             </div>
           ))}
        </div>
        <button onClick={onClose} className="slf-prime-btn" style={{ marginTop: '2rem' }}>Dashboard</button>
      </div>
    );
  };

  return (
    <div className="slf-container">
      {showConfetti && <Confetti />}
      
      {/* State Machine Switch */}
      {roomData.game_phase === 'lobby' && renderLobby()}
      {roomData.game_phase === 'dice' && renderDice()}
      {roomData.game_phase === 'roulette' && renderRoulette()}
      {roomData.game_phase === 'playing' && renderPlaying()}
      {roomData.game_phase === 'evaluating' && renderResults()}
      {roomData.game_phase === 'game_over' && renderGameOver()}

      <div className="slf-game-meta">
         <span>Runde {roomData.current_round_num} / {roomData.total_rounds}</span>
      </div>

      <style>{`
        .slf-container { color: white; width: 100%; max-width: 600px; padding-bottom: 2rem; }
        .slf-game-meta { text-align: center; margin-top: 2rem; opacity: 0.5; font-size: 0.8rem; }
        .slf-section { animation: fadeIn 0.4s ease; display: flex; flex-direction: column; align-items: center; }
        .slf-hint { opacity: 0.6; font-size: 0.9rem; text-align: center; }
        .slf-highlight-code { background: rgba(168, 85, 247, 0.1); border: 2px dashed #a855f7; padding: 1rem 2rem; border-radius: 12px; font-size: 1.1rem; margin-bottom: 2rem; }
        .slf-highlight-code span { font-weight: 900; font-family: monospace; font-size: 2rem; color: #a855f7; display: block; margin-top: 0.2rem; }
        
        /* Lobby */
        .slf-p-list { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2rem; justify-content: center; }
        .slf-p-tag { background: rgba(168, 85, 247, 0.2); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #a855f7; }
        
        /* Buttons */
        .slf-prime-btn { background: #a855f7; border: none; padding: 1rem 2rem; color: white; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .slf-prime-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(168, 85, 247, 0.4); }

        /* Dice Phase */
        .slf-dice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; width: 100%; margin: 2rem 0; }
        .slf-dice-card { background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 20px; text-align: center; border: 2px solid transparent; }
        .slf-dice-card.active { border-color: #a855f7; background: rgba(168, 85, 247, 0.1); }
        .slf-die { font-size: 3.5rem; font-weight: 900; color: #a855f7; margin-top: 1rem; text-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
        .slf-die.rolling { animation: dieRoll 0.1s infinite alternate; color: #fff; }
        .slf-dice-btn, .slf-spin-btn { max-width: 300px; margin: 0 auto; transform: scale(1.1); }
        
        @keyframes dieRoll { 
          from { transform: rotate(-10deg) scale(1.1); filter: brightness(1.5); } 
          to { transform: rotate(10deg) scale(0.9); filter: brightness(1); } 
        }
        
        /* Roulette */
        .slf-slot-display { font-size: 8rem; font-weight: 900; color: #a855f7; margin: 2rem 0; text-shadow: 0 0 30px rgba(168, 85, 247, 0.6); animation: bounce 0.5s infinite alternate; }

        /* Playing */
        .slf-game-header { font-size: 1.5rem; margin-bottom: 2rem; }
        .slf-game-header span { font-size: 3rem; color: #a855f7; font-weight: 900; }
        .slf-inputs { display: grid; gap: 1rem; width: 100%; }
        .slf-field { display: flex; flex-direction: column; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .slf-field label { font-size: 0.7rem; font-weight: 800; color: #a855f7; margin-bottom: 0.5rem; }
        .slf-field input { background: transparent; border: none; color: white; font-size: 1.4rem; padding: 0; outline: none; }
        .slf-buzzer { margin-top: 2rem; width: 120px; height: 120px; border-radius: 50%; background: #ef4444; border: 4px solid #991b1b; color: white; font-weight: 900; box-shadow: 0 8px 0 #991b1b, 0 15px 30px rgba(239, 68, 68, 0.3); transition: 0.1s; cursor: pointer; }
        .slf-buzzer:active { transform: translateY(6px); box-shadow: 0 2px 0 #991b1b; }

        /* Results */
        .slf-results-grid { width: 100%; margin: 2rem 0; display: grid; gap: 0.8rem; }
        .slf-res-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 1.2rem; border-radius: 12px; }
        .slf-res-left { display: flex; flex-direction: column; }
        .slf-cat-label { font-size: 0.6rem; opacity: 0.5; font-weight: 900; }
        .slf-val-text { font-size: 1.2rem; font-weight: 700; }
        .slf-badge { font-size: 0.8rem; padding: 0.3rem 0.8rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; }
        .slf-badge.correct { background: #22c55e; box-shadow: 0 0 15px rgba(34, 197, 94, 0.4); }
        .slf-badge.wrong { background: #ef4444; opacity: 0.8; }
        .slf-points-info { margin-bottom: 1rem; font-size: 1.1rem; }
        .slf-points-info span { color: #22c55e; font-weight: 800; font-size: 1.5rem; }

        /* Game Over */
        .slf-win-title { font-size: 2.5rem; margin-bottom: 2rem; color: #fbbf24; }
        .slf-final-rank { width: 100%; display: grid; gap: 0.8rem; }
        .slf-rank-row { display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 12px; }
        .slf-rank-row.top { background: linear-gradient(90deg, rgba(251, 191, 36, 0.2), transparent); border: 1px solid rgba(251, 191, 36, 0.3); }
        .slf-rank-num { font-size: 1.5rem; font-weight: 900; margin-right: 1.5rem; opacity: 0.5; }
        .slf-player-name { flex: 1; font-weight: 600; }
        .slf-player-score { font-weight: 900; color: #a855f7; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { from { transform: scale(1); } to { transform: scale(1.1); } }
      `}</style>
    </div>
  );
};

export default SLFGameContainer;
