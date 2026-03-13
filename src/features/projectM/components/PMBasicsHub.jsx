import React from 'react';
import './projectm-cyber.css';

const sectionStyle = {
    width: '100%',
    borderRadius: '16px',
    padding: '1rem',
    marginBottom: '0.85rem'
};

const MODULES = [
    {
        id: 1,
        title: 'Modul 1: Begriffe-Matcher',
        summary: 'Begriffe wie Lastenheft, Pflichtenheft, Scrum und Wasserfall den richtigen Definitionen zuordnen.'
    },
    {
        id: 2,
        title: 'Modul 2: Agil vs. Klassisch',
        summary: 'Risiko-Karten korrekt in agiles oder klassisches PM sortieren.'
    },
    {
        id: 3,
        title: 'Modul 3: Abhängigkeits-Detektiv',
        summary: 'Abhängigkeiten zwischen Aufgaben per Pfeildiagramm erkennen und einzeichnen.'
    }
];

export default function PMBasicsHub({ onBack }) {
    return (
        <div className="projectm-cyber-theme" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            <div style={{ maxWidth: '980px', width: '100%', margin: '0 auto', padding: '1rem 0.9rem 3.6rem' }}>
                <div className="projectm-wire" style={{ ...sectionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <button className="btn-nav" onClick={onBack}>&larr; PM Modul</button>
                    <span className="chip">Part 2</span>
                </div>

                <div className="projectm-wire" style={sectionStyle}>
                    <h1 style={{ marginTop: 0, marginBottom: '0.2rem' }}>PM Basics</h1>
                    <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
                        Dieser Bereich ist die Grundlagen-Schiene zu Project M und wird als eigener Lernpfad geführt.
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {MODULES.map((module) => (
                        <div key={module.id} className="projectm-wire" style={{ ...sectionStyle, marginBottom: 0 }}>
                            <h2 style={{ marginTop: 0, marginBottom: '0.3rem' }}>{module.title}</h2>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{module.summary}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
