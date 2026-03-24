import React, { useState, useEffect } from 'react';
import { slfService } from './slfSupabaseService';
import SLFGame from './SLFGame';

const SLFModal = ({ isOpen, onClose, authUser }) => {
  const [step, setStep] = useState('password'); // password, lobby, game
  const [password, setPassword] = useState('');
  const [errorAnimation, setErrorAnimation] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState(authUser?.email?.split('@')[0] || 'Gast');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [loading, setLoading] = useState(false);

  const CORRECT_PASSWORD = 'pingsta';
  const deviceId = localStorage.getItem('slf_device_id') || Math.random().toString(36).substring(2, 15);
  
  useEffect(() => {
    if (!localStorage.getItem('slf_device_id')) {
      localStorage.setItem('slf_device_id', deviceId);
    }
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.toLowerCase() === CORRECT_PASSWORD) {
      setStep('lobby');
    } else {
      setErrorAnimation(true);
      setTimeout(() => setErrorAnimation(false), 500);
      setPassword('');
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const generatedCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      const room = await slfService.createRoom(deviceId, generatedCode);
      const player = await slfService.registerPlayer(room.id, deviceId, playerName);
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setStep('game');
    } catch (err) {
      alert('Raum konnte nicht erstellt werden: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;
    setLoading(true);
    try {
      const room = await slfService.joinRoom(roomCode.toUpperCase());
      const player = await slfService.registerPlayer(room.id, deviceId, playerName);
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setStep('game');
    } catch (err) {
      alert('Raum nicht gefunden oder fehlerhaft: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="slf-overlay">
      <div className={`slf-modal ${errorAnimation ? 'shake' : ''}`}>
        <button className="slf-close" onClick={onClose}>✕</button>

        {step === 'password' && (
          <div className="slf-content">
            <h2>🔑 VIP Zugang</h2>
            <p>Bitte gib das Passwort ein, um Stadt, Land, Fluss freizuschalten.</p>
            <form onSubmit={handlePasswordSubmit}>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Passwort eingeben..."
                autoFocus
              />
              <button type="submit" className="slf-btn-primary">Bestätigen</button>
            </form>
          </div>
        )}

        {step === 'lobby' && (
          <div className="slf-content">
            <h2>🌍 Multiplayer Lobby</h2>
            <div className="slf-form-group">
              <label>Dein Name</label>
              <input 
                type="text" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)} 
                placeholder="Spielername"
              />
            </div>
            <hr />
            <div className="slf-actions">
              <div className="slf-action-box">
                <button onClick={handleCreateRoom} disabled={loading} className="slf-btn-primary">Neuer Raum</button>
              </div>
              <div className="slf-action-box">
                <input 
                  type="text" 
                  value={roomCode} 
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())} 
                  placeholder="CODE"
                />
                <button onClick={handleJoinRoom} disabled={loading} className="slf-btn-secondary">Beitreten</button>
              </div>
            </div>
          </div>
        )}

        {step === 'game' && currentRoom && (
          <SLFGame room={currentRoom} player={currentPlayer} deviceId={deviceId} onClose={onClose} />
        )}
      </div>

      <style>{`
        .slf-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(10px);
          z-index: 10000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1.5rem;
        }
        .slf-modal {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          width: 100%;
          max-width: 500px;
          min-height: 350px;
          position: relative;
          padding: 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          color: white;
          animation: modalAppear 0.4s ease-out;
        }
        .slf-close {
          position: absolute;
          top: 1rem;
          right: 1.2rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 1.5rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .slf-close:hover { color: white; }
        
        .slf-content h2 { margin-top: 0; color: #a855f7; font-size: 2rem; margin-bottom: 1.5rem; text-align: center; }
        .slf-content p { text-align: center; opacity: 0.8; margin-bottom: 2rem; }
        
        input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 1rem;
          border-radius: 12px;
          color: white;
          font-size: 1.1rem;
          margin-bottom: 1rem;
          transition: all 0.2s;
        }
        input:focus { border-color: #a855f7; background: rgba(255, 255, 255, 0.08); outline: none; }
        
        .slf-btn-primary {
          width: 100%;
          background: #a855f7;
          border: none;
          color: white;
          padding: 1.1rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
        }
        .slf-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4); }
        .slf-btn-primary:active { transform: translateY(0); }
        
        .slf-btn-secondary {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .slf-btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
        
        .slf-actions { display: flex; flex-direction: column; gap: 1.5rem; }
        .slf-action-box { display: flex; flex-direction: column; gap: 0.5rem; }
        .slf-form-group { margin-bottom: 1.5rem; }
        .slf-form-group label { display: block; margin-bottom: 0.5rem; opacity: 0.7; font-size: 0.9rem; }
        
        @keyframes modalAppear { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        .shake { animation: shake 0.4s ease-in-out; border-color: #ef4444; }
      `}</style>
    </div>
  );
};

export default SLFModal;
