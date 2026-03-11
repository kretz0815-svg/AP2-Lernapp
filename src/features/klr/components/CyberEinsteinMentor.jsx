import React from 'react';

export default function CyberEinsteinMentor({ state = 'idle', message = '', visible = true }) {
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth <= 1024);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!visible) return null;
  // Mobile specific: hide completely when idle
  if (isMobile && state === 'idle') return null;

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
