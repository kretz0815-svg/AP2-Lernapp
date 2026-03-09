import React from 'react';

function IntroPage({ setAppMode }) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, backgroundColor: '#000' }}>
            <video
                src="/intro.mp4"
                autoPlay
                playsInline
                muted
                onEnded={() => setAppMode('dashboard')}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
                onClick={() => setAppMode('dashboard')}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10000, backdropFilter: 'blur(4px)', fontFamily: 'inherit' }}
            >
                Überspringen
            </button>
        </div>
    );
}

export default IntroPage;
