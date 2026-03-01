import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const generateId = (text) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `card_${Math.abs(hash)}`;
};

export default function QuestionManager({ category, questions, progress, formatLatex, onClose, onProgressUpdate }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'learned', 'unlearned'
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [localProgress, setLocalProgress] = useState(progress || {});
    const [deletedIds, setDeletedIds] = useState(() => {
        return JSON.parse(localStorage.getItem(`ap2_deleted_${category}`) || '[]');
    });
    const [editOverrides, setEditOverrides] = useState(() => {
        return JSON.parse(localStorage.getItem(`ap2_edits_${category}`) || '{}');
    });

    // Category config
    const categoryConfig = {
        quiz: {
            title: 'Quiz (Wissen testen)',
            color: 'var(--success)',
            progressKey: 'ap2_quiz_progress',
            isLearned: (id, prog) => prog[id] && prog[id].nextReview > Date.now(),
        },
        wisor: {
            title: 'WisoR (Eingabe)',
            color: 'var(--primary)',
            progressKey: 'ap2_wisor_progress',
            isLearned: (id, prog) => !!prog[id],
        },
        wisorEco: {
            title: 'WisoR E-Commerce',
            color: 'var(--accent)',
            progressKey: 'ap2_wisor_eco_progress',
            isLearned: (id, prog) => !!prog[id],
        }
    };

    const config = categoryConfig[category];

    // Build question list
    const questionList = questions
        .map((q, idx) => {
            const id = q.id || generateId(q.question);
            if (deletedIds.includes(id)) return null;
            const questionText = editOverrides[id] || q.question;
            const isLearned = config.isLearned(id, localProgress);
            return { id, index: idx, text: questionText, originalText: q.question, isLearned, raw: q };
        })
        .filter(Boolean);

    // Filter and search
    const filteredQuestions = questionList.filter(q => {
        if (filterMode === 'learned' && !q.isLearned) return false;
        if (filterMode === 'unlearned' && q.isLearned) return false;
        if (searchTerm.trim()) {
            return q.text.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    const learnedCount = questionList.filter(q => q.isLearned).length;
    const totalCount = questionList.length;

    const fmt = (text) => (formatLatex ? formatLatex(text) : text);

    // --- Actions ---

    const handleResetProgress = async (id) => {
        const updatedProgress = { ...localProgress };
        delete updatedProgress[id];
        setLocalProgress(updatedProgress);

        // Update localStorage
        localStorage.setItem(config.progressKey, JSON.stringify(updatedProgress));

        // Sync to Supabase
        const deviceId = localStorage.getItem('masterpat_device_id');
        if (deviceId) {
            try {
                const { data } = await supabase.from('user_data').select('progress_data').eq('device_id', deviceId).single();
                if (data?.progress_data) {
                    const key = category === 'quiz' ? 'quiz_progress' : category === 'wisor' ? 'wisor_progress' : 'wisor_eco_progress';
                    data.progress_data[key] = updatedProgress;
                    await supabase.from('user_data').update({ progress_data: data.progress_data, updated_at: new Date().toISOString() }).eq('device_id', deviceId);
                }
            } catch (err) { console.error('Supabase reset sync error:', err); }
        }

        if (onProgressUpdate) onProgressUpdate(category, updatedProgress);
    };

    const handleDeleteQuestion = (id) => {
        const newDeleted = [...deletedIds, id];
        setDeletedIds(newDeleted);
        localStorage.setItem(`ap2_deleted_${category}`, JSON.stringify(newDeleted));
        setConfirmDeleteId(null);
    };

    const handleRestoreQuestion = (id) => {
        const newDeleted = deletedIds.filter(d => d !== id);
        setDeletedIds(newDeleted);
        localStorage.setItem(`ap2_deleted_${category}`, JSON.stringify(newDeleted));
    };

    const handleStartEdit = (id, text) => {
        setEditingId(id);
        setEditText(text);
    };

    const handleSaveEdit = (id) => {
        const updated = { ...editOverrides, [id]: editText };
        setEditOverrides(updated);
        localStorage.setItem(`ap2_edits_${category}`, JSON.stringify(updated));
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    // Get deleted questions for restore panel
    const deletedQuestions = questions
        .map((q, idx) => {
            const id = q.id || generateId(q.question);
            if (!deletedIds.includes(id)) return null;
            return { id, index: idx, text: q.question };
        })
        .filter(Boolean);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10000,
            background: 'var(--bg-dark)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexShrink: 0
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-light)',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '0.3rem'
                    }}
                    title="Zurück"
                >
                    ←
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-light)' }}>{config.title}</h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.3rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {totalCount} Fragen
                        </span>
                        <span style={{ fontSize: '0.85rem', color: config.color, fontWeight: 'bold' }}>
                            ✓ {learnedCount} gelernt
                        </span>
                        <div style={{ flex: 1, maxWidth: '200px' }}>
                            <div className="progress-container" style={{ height: '4px' }}>
                                <div className="progress-bar" style={{
                                    width: `${(learnedCount / Math.max(totalCount, 1)) * 100}%`,
                                    background: config.color
                                }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search + Filter bar */}
            <div style={{
                padding: '0.8rem 1.5rem',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                gap: '0.8rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                flexShrink: 0
            }}>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Fragen durchsuchen..."
                    style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '0.6rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-light)',
                        fontSize: '0.9rem',
                        outline: 'none'
                    }}
                />
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {['all', 'learned', 'unlearned'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setFilterMode(mode)}
                            style={{
                                padding: '0.45rem 0.8rem',
                                borderRadius: '8px',
                                border: filterMode === mode ? `2px solid ${config.color}` : '1px solid var(--glass-border)',
                                background: filterMode === mode ? 'rgba(255,255,255,0.08)' : 'transparent',
                                color: filterMode === mode ? config.color : 'var(--text-muted)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: filterMode === mode ? 'bold' : 'normal',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {mode === 'all' ? 'Alle' : mode === 'learned' ? '✓ Gelernt' : '○ Offen'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Question list */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem 1.5rem'
            }}>
                {filteredQuestions.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: 'var(--text-muted)'
                    }}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
                        <p>Keine Fragen gefunden</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {filteredQuestions.map((q) => (
                            <div
                                key={q.id}
                                style={{
                                    background: q.isLearned ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${q.isLearned ? 'rgba(34, 197, 94, 0.2)' : 'var(--glass-border)'}`,
                                    borderRadius: '14px',
                                    padding: '1rem 1.2rem',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Question header */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    {/* Status badge */}
                                    <span style={{
                                        flexShrink: 0,
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        marginTop: '2px',
                                        background: q.isLearned ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                                        color: q.isLearned ? '#fff' : 'var(--text-muted)',
                                        fontWeight: 'bold'
                                    }}>
                                        {q.isLearned ? '✓' : (q.index + 1)}
                                    </span>

                                    {/* Question content */}
                                    <div style={{ flex: 1 }}>
                                        {editingId === q.id ? (
                                            <div>
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '120px',
                                                        padding: '0.8rem',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--primary)',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        color: 'var(--text-light)',
                                                        fontSize: '0.85rem',
                                                        resize: 'vertical',
                                                        outline: 'none',
                                                        fontFamily: 'inherit',
                                                        lineHeight: '1.5'
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleSaveEdit(q.id)}
                                                        style={{
                                                            padding: '0.4rem 1rem',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            background: 'var(--success)',
                                                            color: '#fff',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        💾 Speichern
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        style={{
                                                            padding: '0.4rem 1rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--glass-border)',
                                                            background: 'transparent',
                                                            color: 'var(--text-muted)',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Abbrechen
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p style={{
                                                margin: 0,
                                                fontSize: '0.88rem',
                                                color: 'var(--text-light)',
                                                lineHeight: '1.55',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word'
                                            }}>
                                                {fmt(q.text)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                {editingId !== q.id && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        marginTop: '0.7rem',
                                        paddingLeft: '36px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {q.isLearned && (
                                            <button
                                                onClick={() => handleResetProgress(q.id)}
                                                title="Zurück in den Lernpool werfen"
                                                style={{
                                                    padding: '0.35rem 0.7rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(251, 146, 60, 0.4)',
                                                    background: 'rgba(251, 146, 60, 0.1)',
                                                    color: '#fb923c',
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                🔄 Zurücksetzen
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleStartEdit(q.id, q.text)}
                                            title="Frage bearbeiten"
                                            style={{
                                                padding: '0.35rem 0.7rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(96, 165, 250, 0.4)',
                                                background: 'rgba(96, 165, 250, 0.1)',
                                                color: '#60a5fa',
                                                fontSize: '0.78rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            ✏️ Bearbeiten
                                        </button>

                                        {confirmDeleteId === q.id ? (
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.78rem', color: '#f87171' }}>Wirklich löschen?</span>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    style={{
                                                        padding: '0.3rem 0.6rem',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: '#ef4444',
                                                        color: '#fff',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Ja
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    style={{
                                                        padding: '0.3rem 0.6rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--glass-border)',
                                                        background: 'transparent',
                                                        color: 'var(--text-muted)',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Nein
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(q.id)}
                                                title="Frage löschen"
                                                style={{
                                                    padding: '0.35rem 0.7rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(248, 113, 113, 0.4)',
                                                    background: 'rgba(248, 113, 113, 0.1)',
                                                    color: '#f87171',
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                🗑️ Löschen
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Deleted questions restore section */}
                {deletedQuestions.length > 0 && (
                    <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '14px', border: '1px dashed var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <h4 style={{ margin: '0 0 0.7rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            🗑️ Gelöschte Fragen ({deletedQuestions.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {deletedQuestions.map(q => (
                                <div key={q.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    padding: '0.5rem 0.8rem',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--glass-border)'
                                }}>
                                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                                        {fmt(q.text).substring(0, 80)}…
                                    </span>
                                    <button
                                        onClick={() => handleRestoreQuestion(q.id)}
                                        style={{
                                            padding: '0.3rem 0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(34, 197, 94, 0.4)',
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            color: '#22c55e',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            flexShrink: 0
                                        }}
                                    >
                                        ↩ Wiederherstellen
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
