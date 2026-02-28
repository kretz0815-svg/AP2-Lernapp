import React, { useState, useEffect } from 'react';
import '../index.css';

export default function FloatingNotes({ questionId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState('');

    // Clear notes when question changes
    useEffect(() => {
        setNotes('');
    }, [questionId]);

    return (
        <div className={`floating-notes-container ${isOpen ? 'open' : ''}`}>
            {!isOpen ? (
                <button
                    className="floating-notes-toggle"
                    onClick={() => setIsOpen(true)}
                    title="Notizen zur aktuellen Frage"
                >
                    📝
                </button>
            ) : (
                <div className="floating-notes-window fade-in card-face">
                    <div className="floating-notes-header">
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Notizen</h3>
                        <button
                            className="floating-notes-close"
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}
                        >
                            &times;
                        </button>
                    </div>
                    <textarea
                        className="floating-notes-textarea wisor-input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Deine Notizen zu dieser Frage..."
                        autoFocus
                        style={{
                            width: '100%',
                            height: 'calc(100% - 40px)',
                            resize: 'none',
                            marginTop: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            padding: '10px'
                        }}
                    />
                </div>
            )}
        </div>
    );
}
