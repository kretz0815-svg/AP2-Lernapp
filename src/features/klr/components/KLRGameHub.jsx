import React, { useMemo, useState } from 'react';
import { useKLRGame } from '../state/KLRGameProvider';
import { generateLevel2Math, generateLevel4Math } from '../utils/generateLevelMath';

export default function KLRGameHub() {
    const { progress, setStartupName, grantXp } = useKLRGame();
    const [nameInput, setNameInput] = useState(progress.startupName);
    const [seed, setSeed] = useState(0);

    const level2Preview = useMemo(() => generateLevel2Math(), [seed]);
    const level4Preview = useMemo(() => generateLevel4Math(), [seed]);

    return (
        <div className="card-face" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>KLR Startup-Engine (Basis)</h2>
            <p style={{ color: 'var(--text-muted)' }}>
                Fortschritt läuft global im Provider. Mathe läuft lokal und deterministisch pro Run.
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="wisor-input"
                    style={{ maxWidth: '280px' }}
                    placeholder="Startup Name"
                />
                <button className="btn-primary" onClick={() => setStartupName(nameInput)}>Name speichern</button>
                <button className="btn-secondary" onClick={() => grantXp(25)}>+25 XP</button>
                <button className="btn-secondary" onClick={() => setSeed((s) => s + 1)}>Neue RNG-Daten</button>
            </div>

            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="note-card" style={{ margin: 0 }}>
                    <h3 style={{ marginTop: 0 }}>Global State</h3>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(progress, null, 2)}</pre>
                </div>
                <div className="note-card" style={{ margin: 0 }}>
                    <h3 style={{ marginTop: 0 }}>Level 2 RNG</h3>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(level2Preview, null, 2)}</pre>
                </div>
                <div className="note-card" style={{ margin: 0 }}>
                    <h3 style={{ marginTop: 0 }}>Level 4 RNG</h3>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(level4Preview, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
