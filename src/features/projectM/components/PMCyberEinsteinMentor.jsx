import React from 'react';

export default function PMCyberEinsteinMentor({ state = 'idle', message = '', visible = true }) {
    const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!visible) return null;
    if (isMobile && state === 'idle') return null;

    return (
        <aside className={`pm-cyber-mentor pm-cyber-mentor--${state}`} aria-live="polite">
            <div className="pm-cyber-mentor__bubble">
                <strong>Cyber-Einstein</strong>
                <p>{message || 'System online. Zeig mir saubere PM-Logik.'}</p>
            </div>

            <div className="pm-cyber-mentor__avatar-wrap">
                <img src="/einsteinGANZ.webp" alt="Cyber-Einstein Mentor" className="pm-cyber-mentor__avatar" />
                <div className="pm-cyber-mentor__mouth" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </div>
            </div>
        </aside>
    );
}
