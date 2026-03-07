import React from 'react';

const GeminiPanel = ({
    isOpen,
    title,
    placeholder = "Frag die KI nach einer Erklärung...",
    query,
    onQueryChange,
    onAsk,
    isLoading,
    response
}) => {
    if (!isOpen) return null;

    return (
        <div className="fade-in" style={{
            marginBottom: '1.5rem',
            width: '100%',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)'
        }}>
            {title && (
                <p style={{ color: 'var(--text-light)', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    {title}
                </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                    type="text"
                    className="wisor-input"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onAsk();
                        }
                    }}
                    style={{ flex: 1, padding: '0.8rem', margin: 0, fontSize: '0.95rem' }}
                />
                <button
                    type="button"
                    className="btn-primary"
                    onClick={onAsk}
                    disabled={isLoading || !query.trim()}
                    style={{ padding: '0 1.5rem' }}
                >
                    {isLoading ? '...' : 'Fragen'}
                </button>
            </div>

            {response && (
                <div style={{ textAlign: 'left', lineHeight: '1.6', fontSize: '0.95rem', color: '#f8fafc', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>
                    {response}
                </div>
            )}
        </div>
    );
};

export default GeminiPanel;
