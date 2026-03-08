import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ResetModal = ({ isOpen, onClose, onConfirm, title = "Fortschritt zurücksetzen?", description = "Bitte löse folgende Aufgabe, um ein versehentliches Löschen zu verhindern:" }) => {
    const [resetMath, setResetMath] = useState({ a: 0, b: 0, input: '' });

    useEffect(() => {
        if (isOpen) {
            setResetMath({
                a: Math.floor(Math.random() * 10) + 1,
                b: Math.floor(Math.random() * 20) + 1,
                input: ''
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (parseInt(resetMath.input) === resetMath.a + resetMath.b) {
            onConfirm();
        } else {
            // Opt: visual feedback on error, but for now just prevent submission
            setResetMath(s => ({ ...s, input: '' }));
        }
    };

    const modalContent = (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="card-face fade-in" style={{ padding: '2rem', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center', maxWidth: '350px' }}>
                <h3 style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>{title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{description}</p>
                <form onSubmit={handleSubmit}>
                    <p style={{ fontSize: '1.5rem', color: 'var(--text-light)', marginBottom: '1rem' }}>{resetMath.a} + {resetMath.b} = ?</p>
                    <input
                        type="number"
                        className="wisor-input"
                        style={{ textAlign: 'center', marginBottom: '1rem' }}
                        value={resetMath.input}
                        onChange={(e) => setResetMath(s => ({ ...s, input: e.target.value }))}
                        required
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Abbrechen</button>
                        <button type="submit" className="btn-primary" style={{ flex: 1, background: 'var(--color-error)' }}>Löschen</button>
                    </div>
                </form>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
};

export default ResetModal;
