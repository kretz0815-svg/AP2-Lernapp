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
  const [isLocked, setIsLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Round Specific State
  const [localRoll, setLocalRoll] = useState(null);
  const [answers, setAnswers] = useState({ stadt: '', land: '', fluss: '', tier: '', beruf: '' });
  const [aiResults, setAiResults] = useState(null);
  const [rouletteLetter, setRouletteLetter] = useState('A');
  const [isRolling, setIsRolling] = useState(false);

  const categories = ['stadt', 'land', 'fluss', 'tier', 'beruf'];

  useEffect(() => {
    refreshPlayers();
    const sub = slfService.subscribeToRoom(room.id, 
      (newRoom) => setRoomData(newRoom), 
      () => refreshPlayers()
    );
    return () => sub.unsubscribe();
  }, [room.id]);

  const refreshPlayers = async () => {
    const data = await slfService.fetchPlayers(room.id);
    setPlayers(data);
  };

  /**
   * AI Validation Placeholder
   */
  const validateAnswersWithAI = async (answersObj) => {
    try {
      const prompt = `Validiere Stadt Land Fluss mit Buchstabe '${roomData.current_letter}': 
      STADT: ${answersObj.stadt}, LAND: ${answersObj.land}, FLUSS: ${answersObj.fluss}, TIER: ${answersObj.tier}, BERUF: ${answersObj.beruf}.
      Antworte als JSON: { "stadt": "correct/wrong/neutral", ... }`;
      const response = await askGemini(prompt);
      const jsonMatch = response.match(/\{.*\}/s);
      if (jsonMatch) setAiResults(JSON.parse(jsonMatch[0]));
    } catch (err) {
      console.error('AI Eval error:', err);
    }
  };

  useEffect(() => {
    if (roomData.game_phase === 'evaluating' && !aiResults) {
      validateAnswersWithAI(answers);
    }
  }, [roomData.game_phase]);

  /** ───────── Phase Logic ───────── **/

  const startDicePhase = () => slfService.setGamePhase(room.id, 'dice');

  const rollDice = async () => {
    const val = Math.floor(Math.random() * 6) + 1;
    setLocalRoll(val);
    await slfService.updateDiceRoll(player.id, val);
    
    // Auto-advance if everyone rolled (simplified logic for demo)
    const activePlayers = players.filter(p => p.dice_roll > 0);
    if (activePlayers.length === players.length - 1 && players.length > 1) {
       // Logic to determine winner (server side ideally or last roller)
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
    setIsLocked(true);
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

    return (
      <div className="slf-section">
        <h3>🎲 Würfel für Initiative</h3>
        <div className="slf-dice-grid">
           {players.map(p => (
             <div key={p.id} className={`slf-dice-card ${p.id === player.id ? 'active' : ''}`}>
                <span>{p.name}</span>
                <div className="slf-die">{p.dice_roll || '?'}</div>
             </div>
           ))}
        </div>
        {!localRoll && <button onClick={rollDice} className="slf-dice-btn">Jetzt Würfeln!</button>}
        
        {winner && winner.dice_roll > 0 && (
           <div className="slf-winner-announcement">
             🏆 {winner.name} hat gewonnen!
             <button onClick={() => advanceToLetterRoulette(winner.id)} className="slf-sub-btn">Weiter zum Buchstaben Roulette</button>
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
        <button disabled={isRolling} onClick={spinRoulette} className="slf-spin-btn">
          {isRolling ? 'Rattert...' : 'STSTOPP!'}
        </button>
      ) : <p className="slf-hint">Warte auf {players.find(p => p.id === roomData.dice_winner_id)?.name}...</p>}
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
      <div className="slf-results-grid">
         {categories.map(cat => (
           <div key={cat} className="slf-res-row">
             <span>{cat.toUpperCase()}: <b>{answers[cat]}</b></span>
             {aiResults ? (
               <span className={`slf-badge ${aiResults[cat]}`}>{aiResults[cat]}</span>
             ) : 'Analysiere...'}
           </div>
         ))}
      </div>
      <button onClick={onClose} className="slf-prime-btn">Beenden & Zurück</button>
    </div>
  );

  return (
    <div className="slf-container">
      {showConfetti && <Confetti />}
      
      {/* State Machine Switch */}
      {roomData.game_phase === 'lobby' && renderLobby()}
      {roomData.game_phase === 'dice' && renderDice()}
      {roomData.game_phase === 'roulette' && renderRoulette()}
      {roomData.game_phase === 'playing' && renderPlaying()}
      {roomData.game_phase === 'evaluating' && renderResults()}

      <style>{`
        .slf-container { color: white; width: 100%; max-width: 600px; }
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
        .slf-dice-card.active { border-color: #a855f7; }
        .slf-die { font-size: 3rem; font-weight: 900; color: #a855f7; margin-top: 1rem; animation: bounce 1s infinite alternate; }
        
        /* Roulette */
        .slf-slot-display { font-size: 8rem; font-weight: 900; color: #a855f7; margin: 2rem 0; text-shadow: 0 0 30px rgba(168, 85, 247, 0.6); }

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
        .slf-res-row { display: flex; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; }
        .slf-badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 900; text-transform: uppercase; }
        .slf-badge.correct { background: #22c55e; }
        .slf-badge.wrong { background: #ef4444; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { from { transform: scale(1); } to { transform: scale(1.1); } }
      `}</style>
    </div>
  );
};

export default SLFGameContainer;
