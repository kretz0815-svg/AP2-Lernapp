import React from 'react';
import './projectm-cyber.css';

const topBarStyle = {
    width: '100%',
    borderRadius: '16px',
    padding: '0.8rem 0.95rem',
    marginBottom: '0.75rem',
    display: 'flex',
    gap: '0.65rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
};

const sectionStyle = {
    width: '100%',
    borderRadius: '16px',
    padding: '1rem',
    marginBottom: '0.85rem'
};

export default function ProjectMMainHub({ onBack, onOpenSneakerDrop, onOpenPMBasics, xp = 0 }) {
    return (
        <div className="projectm-cyber-theme" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            <div style={{ maxWidth: '980px', width: '100%', margin: '0 auto', padding: '1rem 0.9rem 3.6rem' }}>
                <div className="projectm-wire" style={topBarStyle}>
                    <button className="btn-nav" onClick={onBack}>&larr; Menü</button>
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>PM Hauptmodul</strong>
                        <span className="chip">Project-M XP: {xp || 0}</span>
                    </div>
                </div>

                <div className="projectm-wire" style={sectionStyle}>
                    <h1 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Projektmanagement</h1>
                    <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                        Wähle einen PM-Lernpfad.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    <div className="projectm-wire" style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', minHeight: '250px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '0.35rem' }}>1. Project M: Sneaker Drop</h2>
                        <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                            Dein aktuelles PM-Spiel mit Levels. Aktuell 3 Levels, vorbereitet für Erweiterung.
                        </p>
                        <div style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary" onClick={onOpenSneakerDrop}>
                                Öffnen
                            </button>
                        </div>
                    </div>

                    <div className="projectm-wire" style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', minHeight: '250px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '0.35rem' }}>2. PM Basics</h2>
                        <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                            Grundlagen-Track: Begriffe, Methodenvergleich und Abhängigkeiten.
                        </p>
                        <div style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary" onClick={onOpenPMBasics}>
                                Öffnen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
