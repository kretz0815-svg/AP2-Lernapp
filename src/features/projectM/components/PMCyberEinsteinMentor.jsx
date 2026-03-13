import React from 'react';

export default function PMCyberEinsteinMentor({ state = 'idle', message = '', visible = true }) {
    const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth <= 768);
    const [desktopWidth, setDesktopWidth] = React.useState(260);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const prevMessageRef = React.useRef('');

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    React.useEffect(() => {
        const computeWidth = () => {
            if (typeof window === 'undefined') return;
            const contentRoot = document.querySelector('[data-pm-content-root="true"]');
            if (contentRoot) {
                const rect = contentRoot.getBoundingClientRect();
                const viewportLeftPadding = 10;
                const gapToContent = 10;
                const target = Math.floor(rect.left - viewportLeftPadding - gapToContent);
                setDesktopWidth(Math.max(220, target));
                return;
            }

            const viewport = window.innerWidth;
            const contentMax = 1120;
            const sideSpace = Math.max(0, (viewport - contentMax) / 2);
            const target = Math.floor(sideSpace - 20);
            setDesktopWidth(Math.max(220, target));
        };
        computeWidth();
        window.addEventListener('resize', computeWidth);
        return () => window.removeEventListener('resize', computeWidth);
    }, []);

    React.useEffect(() => {
        const msg = String(message || '');
        const hasNewMessage = msg !== prevMessageRef.current;
        if (hasNewMessage) {
            const shouldExpand = msg.length > 170 || state === 'error' || state === 'speaking';
            setIsExpanded(shouldExpand);
            prevMessageRef.current = msg;
        }
    }, [message, state]);

    if (!visible) return null;
    if (isMobile && state === 'idle') return null;

    return (
        <aside
            className={`pm-cyber-mentor pm-cyber-mentor--${state}`}
            aria-live="polite"
            style={!isMobile ? { width: `${desktopWidth}px` } : undefined}
        >
            <div className={`pm-cyber-mentor__bubble ${isExpanded ? 'pm-cyber-mentor__bubble--expanded' : ''}`}>
                {isExpanded && (
                    <button
                        type="button"
                        className="pm-cyber-mentor__close"
                        onClick={() => setIsExpanded(false)}
                        aria-label="Hinweis minimieren"
                        title="Hinweis minimieren"
                    >
                        ×
                    </button>
                )}
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
