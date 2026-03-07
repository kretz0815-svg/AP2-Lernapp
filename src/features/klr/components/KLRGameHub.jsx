import React, { useMemo, useState } from 'react';
import { useKLRGame } from '../state/KLRGameProvider';
import { generateLevel2Math, generateLevel4Math } from '../utils/generateLevelMath';

const euro = (n) => `${Number(n).toLocaleString('de-DE')} €`;

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
                Fortschritt läuft global im Provider. Rechenlogik läuft lokal und ohne Verzögerung.
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

            <div style={{ display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1rem' }}>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Startup</div>
                    <div style={{ fontWeight: 800, fontSize: '1.08rem', marginTop: '0.2rem' }}>{progress.startupName}</div>
                </div>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>XP</div>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', marginTop: '0.2rem' }}>{progress.xp}</div>
                </div>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Aktuelles Level</div>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', marginTop: '0.2rem' }}>{progress.currentLevel}</div>
                </div>
                <div className="note-card" style={{ margin: 0, padding: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Freigeschaltet</div>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', marginTop: '0.2rem' }}>{progress.unlockedLevels.join(', ')}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div className="note-card" style={{ margin: 0 }}>
                    <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Level 2: Betriebsabrechnungsbogen</h3>
                    <div style={{ display: 'grid', gap: '0.35rem' }}>
                        <div>Gesamtkosten: <strong>{euro(level2Preview.baseCost)}</strong></div>
                        <div>Verteilerschlüssel: <strong>{level2Preview.key.total} {level2Preview.unit}</strong></div>
                        <div>Lager: <strong>{level2Preview.key.lager} {level2Preview.unit}</strong> → {euro(level2Preview.allocations.lager)}</div>
                        <div>Packstation: <strong>{level2Preview.key.packstation} {level2Preview.unit}</strong> → {euro(level2Preview.allocations.packstation)}</div>
                        <div>Büro: <strong>{level2Preview.key.buero} {level2Preview.unit}</strong> → {euro(level2Preview.allocations.buero)}</div>
                    </div>
                    <details style={{ marginTop: '0.7rem' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>Technische Details</summary>
                        <pre style={{ margin: '0.55rem 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflow: 'auto', fontSize: '0.75rem' }}>
                            {JSON.stringify(level2Preview, null, 2)}
                        </pre>
                    </details>
                </div>

                <div className="note-card" style={{ margin: 0 }}>
                    <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Level 4: Break-Even Survival</h3>
                    <div style={{ display: 'grid', gap: '0.35rem' }}>
                        <div>Fixkosten: <strong>{euro(level4Preview.fixedCost)}</strong></div>
                        <div>Variable Kosten/Stück: <strong>{euro(level4Preview.variableCostPerUnit)}</strong></div>
                        <div>Zielpreis: <strong>{euro(level4Preview.target.price)}</strong></div>
                        <div>Deckungsbeitrag: <strong>{euro(level4Preview.target.deckungsbeitrag)}</strong></div>
                        <div>Break-Even-Menge: <strong>{level4Preview.target.breakEvenUnits.toLocaleString('de-DE')} Stück</strong></div>
                        <div>Erlaubte Preise: <strong>{level4Preview.allowedPrices.slice(0, 8).join(', ')}</strong>{level4Preview.allowedPrices.length > 8 ? ' …' : ''}</div>
                    </div>
                    <details style={{ marginTop: '0.7rem' }}>
                        <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>Technische Details</summary>
                        <pre style={{ margin: '0.55rem 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflow: 'auto', fontSize: '0.75rem' }}>
                            {JSON.stringify(level4Preview, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        </div>
    );
}
