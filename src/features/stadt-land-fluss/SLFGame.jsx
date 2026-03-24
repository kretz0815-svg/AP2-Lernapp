import React, { useState, useEffect, useRef } from 'react';
import { slfService } from './slfSupabaseService';
import Confetti from '../../components/Confetti';
import { askGemini } from '../../geminiClient';

const SLFGame = ({ room, player, deviceId, onClose }) => {
  const [gameState, setGameState] = useState(room);
  const [players, setPlayers] = useState([]);
  const [responses, setResponses] = useState({ stadt: '', land: '', fluss: '', tier: '', beruf: '' });
  const [isLocked, setIsLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [results, setResults] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  const lastUpdateRef = useRef(Date.now());

  // Categories defined as per request
  const categories = ['stadt', 'land', 'fluss', 'tier', 'beruf'];

  useEffect(() => {
    // Initial fetch
    fetchPlayers();
    
    // Subscribe to Realtime matches
    const sub = slfService.subscribeToRoom(room.id, (newRoom) => {
      if (newRoom) {
        setGameState(newRoom);
        // Sync Lock state
        if (newRoom.status === 'evaluating' && !isLocked) {
          setIsLocked(true);
        }
      }
      fetchPlayers();
    });

    return () => sub.unsubscribe();
  }, []);

  const fetchPlayers = async () => {
    try {
      const data = await slfService.fetchPlayers(room.id);
      setPlayers(data);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const handleInputChange = (category, value) => {
    if (isLocked) return;
    setResponses(prev => ({ ...prev, [category]: value }));
  };

  const triggerBuzzer = async () => {
    if (isLocked) return;
    setIsLocked(true);
    setShowConfetti(true);
    
    try {
      await slfService.setBuzzer(room.id, player.name);
      await slfService.submitResponses(room.id, player.id, 1, responses);
    } catch (err) {
      console.error('Buzzer error:', err);
    }
    
    setTimeout(() => setShowConfetti(false), 5000);
  };

  // ─── AI VALIDATION PIPELINE ──────────────────────────────────
  /**
   * Placeholder for the Project's AI Pipeline.
   * Leverages existing project's geminiClient.js functionalities.
   */
  const validateAnswersWithAI = async (answers) => {
    setLoadingAI(true);
    try {
      // In a real-world scenario, you would send all players' answers for centralized scoring.
      // Here, we're validating the current player's answers as a direct call to the project's Gemini client.
      const prompt = `Validiere die folgenden Antworten für Stadt Land Fluss mit dem Buchstaben '${gameState.current_letter || 'A'}': 
      STADT: ${answers.stadt}, LAND: ${answers.land}, FLUSS: ${answers.fluss}, TIER: ${answers.tier}, BERUF: ${answers.beruf}. 
      Antworte als JSON: { "stadt": "correct/wrong/neutral", ... }`;
      
      const response = await askGemini(prompt);
      const jsonMatch = response.match(/\{.*\}/s);
      if (jsonMatch) {
         setResults(JSON.parse(jsonMatch[0]));
      }
    } catch (err) {
      console.error('AI Validation failed:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (isLocked && gameState.status === 'evaluating') {
      validateAnswersWithAI(responses);
    }
  }, [isLocked, gameState.status]);

  const getAccuracyColor = (val) => {
     if (val === 'correct') return '#22c55e';
     if (val === 'wrong') return '#ef4444';
     return '#f59e0b';
  };

  return (
    <div className="slf-game-view">
      {showConfetti && <Confetti />}
      
      <div className="slf-game-header">
        <div className="slf-room-info">
          <span className="slf-badge">Raum: {gameState.room_code}</span>
          <span className="slf-badge">Buchstabe: {gameState.current_letter || 'A'}</span>
        </div>
        <div className="slf-lock-status">
           {gameState.status === 'evaluating' && (
             <span className="slf-locked-badge">🛑 Spiel gestoppt von {gameState.locked_by}!</span>
           )}
        </div>
      </div>

      <div className="slf-grid">
        <div className="slf-categories">
          {categories.map(cat => (
            <div key={cat} className="slf-input-row" style={{ borderColor: results && results[cat] ? getAccuracyColor(results[cat]) : 'rgba(255,255,255,0.1)' }}>
              <label>{cat.toUpperCase()}</label>
              <input 
                type="text" 
                value={responses[cat]} 
                onChange={(e) => handleInputChange(cat, e.target.value)}
                disabled={isLocked}
                placeholder="..."
              />
              {loadingAI && <span className="slf-sync-icon">🤖</span>}
              {results && results[cat] && (
                 <span className="slf-result-tag" style={{ color: getAccuracyColor(results[cat]) }}>
                    {results[cat] === 'correct' ? '✓' : results[cat] === 'wrong' ? '✗' : '?'}
                 </span>
              )}
            </div>
          ))}
        </div>

        <div className="slf-sidebar">
           <div className="slf-players-list">
             <h3>Spieler ({players.length})</h3>
             {players.map(p => (
               <div key={p.id} className="slf-player-card">
                 <span>{p.name === player.name ? '👤 ' : '👾 '}{p.name} {p.id === player.id && '(Du)'}</span>
                 <span>{p.score} Pkt</span>
               </div>
             ))}
           </div>
           
           {!isLocked && (
             <button onClick={triggerBuzzer} className="slf-buzzer-btn">STOP! (Buzzer)</button>
           )}
           
           {isLocked && (
              <div className="slf-waiting-box">
                 <p>{loadingAI ? 'KI wertet Ergebnisse aus...' : 'Warten auf Spielende...'}</p>
                 <div className="slf-loader-line"></div>
              </div>
           )}
        </div>
      </div>

      <style>{`
        .slf-game-view { display: flex; flex-direction: column; width: 100%; height: 100%; min-width: 320px; }
        .slf-game-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; }
        .slf-badge { background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: white; padding: 0.4rem 0.85rem; border-radius: 99px; margin-right: 0.5rem; font-family: monospace; }
        .slf-locked-badge { color: #ef4444; font-weight: 700; font-size: 0.9rem; animation: pulse 2s infinite; }
        
        .slf-grid { display: grid; grid-template-columns: 1fr 200px; gap: 2rem; }
        .slf-categories { display: flex; flex-direction: column; gap: 1rem; }
        .slf-input-row { position: relative; border-radius: 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem 1.2rem; display: flex; flex-direction: column; }
        .slf-input-row label { font-size: 0.75rem; color: #a855f7; font-weight: 800; margin-bottom: 0.3rem; letter-spacing: 0.05em; }
        .slf-input-row input { background: transparent; border: none; padding: 0; margin: 0; font-size: 1.2rem; width: 100%; color: white; }
        .slf-input-row input:focus { background: transparent; box-shadow: none; border: none; }
        
        .slf-sync-icon { position: absolute; right: 1rem; top: 1.5rem; animation: rotate 2s linear infinite; }
        .slf-result-tag { position: absolute; right: 1rem; top: 1rem; font-size: 1.5rem; font-weight: 900; }
        
        .slf-players-list h3 { font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-top: 0; }
        .slf-player-card { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem; opacity: 0.9; }
        
        .slf-buzzer-btn { 
          margin-top: 2rem; 
          width: 100%; 
          background: #ef4444; 
          border: 4px solid #991b1b; 
          color: white; 
          padding: 1.5rem 1rem; 
          border-radius: 50%; 
          aspect-ratio: 1; 
          font-weight: 900; 
          cursor: pointer; 
          transition: all 0.1s;
          box-shadow: 0 10px 0 #991b1b, 0 15px 25px rgba(239, 68, 68, 0.3);
          transform: perspective(500px) rotateX(20deg);
        }
        .slf-buzzer-btn:hover { background: #f87171; box-shadow: 0 8px 0 #991b1b, 0 12px 20px rgba(239, 68, 68, 0.4); transform: perspective(500px) rotateX(20deg) translateY(2px); }
        .slf-buzzer-btn:active { transform: perspective(500px) rotateX(20deg) translateY(8px); box-shadow: 0 2px 0 #991b1b, 0 5px 10px rgba(0,0,0,0.5); }
        
        .slf-waiting-box { margin-top: 2rem; text-align: center; background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; }
        .slf-loader-line { height: 3px; background: #6366f1; width: 100%; animation: loader 2s ease-in-out infinite; }
        
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loader { 0% { opacity: 0.2; width: 0; } 50% { opacity: 1; width: 100%; } 100% { opacity: 0.2; width: 0; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.95); opacity: 0.6; } }
        
        @media (max-width: 500px) {
          .slf-grid { grid-template-columns: 1fr; }
          .slf-sidebar { order: -1; display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
          .slf-buzzer-btn { width: 80px; height: 80px; padding: 0; margin-top: 0; }
        }
      `}</style>
    </div>
  );
};

export default SLFGame;
