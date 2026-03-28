import React, { useState, useEffect } from 'react';
import { slfService } from './slfSupabaseService';
import SLFGameContainer from './SLFGameContainer';

/**
 * SLFModal: Entry point for the "VIP" feature Stadt, Land, Fluss.
 * - Handles Password Check ("pingsta")
 * - User Registration (Guest Mode)
 * - Game Instance Launching
 */
const SLFModal = ({ isOpen, onClose, authUser }) => {
  const [step, setStep] = useState('password'); // password, lobby_setup, ingame
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState(authUser?.email?.split('@')[0] || 'Gast');
  const [isInvalidPassword, setIsInvalidPassword] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [totalRounds, setTotalRounds] = useState(5);
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [loading, setLoading] = useState(false);

  const deviceId = localStorage.getItem('slf_device_id') || Math.random().toString(36).substring(2, 12);
  useEffect(() => {
     if (!localStorage.getItem('slf_device_id')) localStorage.setItem('slf_device_id', deviceId);
  }, []);

  const handlePassword = (e) => {
    e.preventDefault();
    if (password.toLowerCase() === 'pingsta') {
      setStep('lobby_setup');
    } else {
      setIsInvalidPassword(true);
      setTimeout(() => setIsInvalidPassword(false), 500);
      setPassword('');
    }
  };

  const handleCreate = async () => {
    if (!roomNameInput.trim()) { alert('Bitte Raumnamen eingeben'); return; }
    setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      const room = await slfService.createRoom(code, roomNameInput, totalRounds);
      const player = await slfService.registerPlayer(room.id, deviceId, playerName);
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setStep('ingame');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!roomCode.trim()) return;
    setLoading(true);
    try {
      const room = await slfService.joinRoom(roomCode.toUpperCase());
      const player = await slfService.registerPlayer(room.id, deviceId, playerName);
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setStep('ingame');
    } catch (_err) { alert('Raum Code ungültig'); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="slf-modal-overlay">
      <div className={`slf-modal-card ${isInvalidPassword ? 'vibrate' : ''}`}>
        <button className="slf-modal-close" onClick={onClose}>✕</button>

        {step === 'password' && (
          <div className="slf-form">
             <h2>🔑 VIP Content</h2>
             <p>Bitte Passwort eingeben</p>
             <form onSubmit={handlePassword}>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                <button className="slf-prime-btn">Verify</button>
             </form>
          </div>
        )}

        {step === 'lobby_setup' && (
          <div className="slf-form">
             <h2>🌍 Multiplayer Lobby</h2>
             <div className="slf-input-group">
                <label>Dein Spielername</label>
                <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Spielername" />
             </div>
             
             <div className="slf-split">
                <div className="slf-action-box">
                   <label>Neuen Raum erstellen</label>
                   <input value={roomNameInput} onChange={e => setRoomNameInput(e.target.value)} placeholder="Raumname (z.B. Kurs-Ap2)" />
                   
                   <div className="slf-round-selector">
                      <label>Runden anzahl:</label>
                      <select value={totalRounds} onChange={e => setTotalRounds(parseInt(e.target.value))}>
                         <option value={5}>5 Runden</option>
                         <option value={10}>10 Runden</option>
                         <option value={15}>15 Runden</option>
                      </select>
                   </div>

                   <button onClick={handleCreate} disabled={loading} className="slf-prime-btn">Raum erstellen</button>
                </div>
                
                <div className="slf-divider">oder beitreten</div>
                
                <div className="slf-action-box">
                   <label>Existierenden Raum beitreten</label>
                   <input value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="Raum-Code oder Name" />
                   <button onClick={handleJoin} disabled={loading} className="slf-sec-btn">Beitreten</button>
                </div>
             </div>
          </div>
        )}

        {step === 'ingame' && (
           <SLFGameContainer room={currentRoom} player={currentPlayer} onClose={onClose} />
        )}
      </div>

      <style>{`
        .slf-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10000; }
        .slf-modal-card { background: #1a1b26; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; width: 100%; max-width: 600px; min-height: 400px; padding: 2rem; box-shadow: 0 40px 100px rgba(0,0,0,0.8); display: flex; flex-direction: column; position: relative; overflow-y: auto; max-height: 90vh; }
        .slf-modal-close { position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; color: white; opacity: 0.4; font-size: 1.5rem; cursor: pointer; }
        .slf-modal-close:hover { opacity: 1; }
        
        .slf-form h2 { color: #a855f7; font-size: 2.2rem; margin: 0 0 1.5rem 0; text-align: center; font-weight: 800; }
        .slf-form p { text-align: center; opacity: 0.6; margin-bottom: 2rem; }
        
        input { width: 100%; background: #24283b; border: 1px solid rgba(255,255,255,0.1); padding: 1.2rem; border-radius: 14px; color: white; font-size: 1.1rem; margin-bottom: 1rem; outline: none; }
        input:focus { border-color: #a855f7; }
        
        .slf-prime-btn { background: #a855f7; color: white; padding: 1.2rem; border-radius: 14px; border: none; font-weight: 700; font-size: 1.1rem; width: 100%; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3); }
        .slf-prime-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(168, 85, 247, 0.4); }
        .slf-sec-btn { background: rgba(255,255,255,0.1); color: white; border: none; width: 100%; padding: 1rem; border-radius: 12px; font-weight: 600; cursor: pointer; }
        
        .slf-split { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1rem; }
        .slf-action-box { display: flex; flex-direction: column; gap: 0.4rem; background: rgba(255,255,255,0.03); padding: 1.2rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
        .slf-action-box label { font-size: 0.8rem; opacity: 0.6; margin-bottom: 0.2rem; display: block; }
        .slf-round-selector { margin: 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; }
        .slf-round-selector select { background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 0.4rem; border-radius: 8px; }
        .slf-input-group label { font-size: 0.8rem; opacity: 0.6; margin-bottom: 0.4rem; display: block; }
        .slf-divider { text-align: center; opacity: 0.3; font-size: 0.8rem; text-transform: uppercase; margin: 0.2rem 0; }
        
        @keyframes vibrate { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        .vibrate { animation: vibrate 0.4s ease-in-out; border-color: #ef4444; }
      `}</style>
    </div>
  );
};

export default SLFModal;
