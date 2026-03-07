import React from 'react';

export default function CyberEinsteinMentor({ state = 'idle', message = '', visible = true }) {
  if (!visible) return null;

  return (
    <aside className={`cyber-mentor cyber-mentor--${state}`} aria-live="polite">
      <div className="cyber-mentor__bubble">
        <strong>Cyber-Einstein</strong>
        <p>{message || 'System bereit. Starte das nächste KLR-Manöver.'}</p>
      </div>

      <div className="cyber-mentor__avatar-wrap">
        <img src="/einsteinGANZ.webp" alt="Cyber-Einstein Mentor" className="cyber-mentor__avatar" />
        <div className="cyber-mentor__mouth" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </aside>
  );
}
