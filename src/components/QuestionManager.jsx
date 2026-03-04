import React, { useState } from 'react';
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

export default function QuestionManager({ category, questions, progress, formatLatex, onClose, onProgressUpdate, onAddCustomQuizQuestion, authUser }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'learned', 'unlearned', 'own'
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editAnswers, setEditAnswers] = useState([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [expandedQuestionId, setExpandedQuestionId] = useState(null);
    const [localProgress, setLocalProgress] = useState(progress || {});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionTopic, setNewQuestionTopic] = useState('Eigenes Thema');
    const [newQuestionHint, setNewQuestionHint] = useState('');
    const [newQuestionYoutubeQuery, setNewQuestionYoutubeQuery] = useState('');
    const [newAnswerOptions, setNewAnswerOptions] = useState([
        { text: '', isCorrect: true, rationale: '' },
        { text: '', isCorrect: false, rationale: '' },
        { text: '', isCorrect: false, rationale: '' },
        { text: '', isCorrect: false, rationale: '' }
    ]);
    const [addFormError, setAddFormError] = useState('');
    const [addFormLoading, setAddFormLoading] = useState(false);
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

    const availableFilterModes = category === 'quiz'
        ? ['all', 'learned', 'unlearned', 'own']
        : ['all', 'learned', 'unlearned'];

    // Filter and search
    const filteredQuestions = questionList.filter(q => {
        if (filterMode === 'learned' && !q.isLearned) return false;
        if (filterMode === 'unlearned' && q.isLearned) return false;
        if (filterMode === 'own' && !q.raw?.custom) return false;
        if (searchTerm.trim()) {
            return q.text.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
    });

    const learnedCount = questionList.filter(q => q.isLearned).length;
    const totalCount = questionList.length;
    const ownCount = questionList.filter(q => !!q.raw?.custom).length;

    const fmt = (text) => (formatLatex ? formatLatex(text) : text);

    // --- Actions ---

    const handleResetProgress = async (id) => {
        const updatedProgress = { ...localProgress };
        delete updatedProgress[id];
        setLocalProgress(updatedProgress);

        // Update localStorage
        localStorage.setItem(config.progressKey, JSON.stringify(updatedProgress));

        // Sync to Supabase (only for authenticated users)
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const userId = session.user.id;
                if (category === 'quiz') {
                    await supabase
                        .from('user_task_progress')
                        .delete()
                        .eq('user_id', userId)
                        .eq('task_type', 'quiz')
                        .eq('task_id', `quiz:${id}`);
                } else {
                    const { data } = await supabase.from('user_data').select('progress_data').eq('user_id', userId).single();
                    if (data?.progress_data) {
                        const key = category === 'wisor' ? 'wisor_progress' : 'wisor_eco_progress';
                        data.progress_data[key] = updatedProgress;
                        await supabase.from('user_data').update({ progress_data: data.progress_data, updated_at: new Date().toISOString() }).eq('user_id', userId);
                    }
                }
            }
        } catch (err) { console.error('Supabase reset sync error:', err); }

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

    const handleStartEdit = (id, text, raw) => {
        setEditingId(id);
        setEditText(text);
        // For quiz questions, also load answer options for editing
        if (category === 'quiz' && raw.answerOptions) {
            setEditAnswers(raw.answerOptions.map(a => ({ ...a })));
        } else {
            setEditAnswers([]);
        }
    };

    const handleSaveEdit = (id) => {
        const updated = { ...editOverrides };
        // Save question text override
        updated[id] = editText;
        // Save answer overrides if quiz
        if (category === 'quiz' && editAnswers.length > 0) {
            updated[`${id}_answers`] = editAnswers;
        }
        setEditOverrides(updated);
        localStorage.setItem(`ap2_edits_${category}`, JSON.stringify(updated));
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const resetAddForm = () => {
        setNewQuestionText('');
        setNewQuestionTopic('Eigenes Thema');
        setNewQuestionHint('');
        setNewQuestionYoutubeQuery('');
        setNewAnswerOptions([
            { text: '', isCorrect: true, rationale: '' },
            { text: '', isCorrect: false, rationale: '' },
            { text: '', isCorrect: false, rationale: '' },
            { text: '', isCorrect: false, rationale: '' }
        ]);
        setAddFormError('');
    };

    const handleMarkCorrectAnswer = (index) => {
        setNewAnswerOptions(prev => prev.map((opt, i) => ({ ...opt, isCorrect: i === index })));
    };

    const handleAddAnswerOption = () => {
        setNewAnswerOptions(prev => {
            if (prev.length >= 8) return prev;
            return [...prev, { text: '', isCorrect: false, rationale: '' }];
        });
    };

    const handleRemoveAnswerOption = (index) => {
        setNewAnswerOptions(prev => {
            if (prev.length <= 2) return prev;
            const removedWasCorrect = prev[index]?.isCorrect;
            const next = prev.filter((_, i) => i !== index);
            if (removedWasCorrect && next.length > 0) {
                next[0] = { ...next[0], isCorrect: true };
            }
            return next;
        });
    };

    const handleSubmitCustomQuestion = async () => {
        if (category !== 'quiz') return;
        if (!onAddCustomQuizQuestion) {
            setAddFormError('Hinzufügen ist momentan nicht verfügbar.');
            return;
        }

        const trimmedQuestion = newQuestionText.trim();
        const filledAnswers = newAnswerOptions.filter(opt => opt.text.trim());
        const hasCorrect = filledAnswers.some(opt => opt.isCorrect);

        if (!trimmedQuestion) {
            setAddFormError('Bitte gib eine Frage ein.');
            return;
        }
        if (filledAnswers.length < 2) {
            setAddFormError('Bitte mindestens 2 Antwortmöglichkeiten ausfüllen.');
            return;
        }
        if (!hasCorrect) {
            setAddFormError('Bitte eine richtige Antwort markieren.');
            return;
        }

        setAddFormError('');
        setAddFormLoading(true);
        try {
            const result = await onAddCustomQuizQuestion({
                question: trimmedQuestion,
                topic: newQuestionTopic,
                hint: newQuestionHint,
                youtubeQuery: newQuestionYoutubeQuery,
                answerOptions: filledAnswers
            });

            if (!result?.ok) {
                setAddFormError(result?.message || 'Frage konnte nicht gespeichert werden.');
                return;
            }

            resetAddForm();
            setShowAddForm(false);
        } catch {
            setAddFormError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
        } finally {
            setAddFormLoading(false);
        }
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
                {category === 'quiz' && (
                    <button
                        onClick={() => {
                            if (!authUser?.email) {
                                setAddFormError('Eigene Quizkarten sind nur mit E-Mail/Google-Login möglich.');
                                return;
                            }
                            setAddFormError('');
                            setShowAddForm(prev => !prev);
                        }}
                        style={{
                            flexShrink: 0,
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-light)',
                            fontSize: '1.35rem',
                            lineHeight: 1,
                            cursor: 'pointer'
                        }}
                        title={authUser?.email ? 'Eigene Karte hinzufügen' : 'Nur mit E-Mail/Google-Login'}
                    >
                        +
                    </button>
                )}
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
                    {availableFilterModes.map(mode => (
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
                            {mode === 'all'
                                ? 'Alle'
                                : mode === 'learned'
                                    ? '✓ Gelernt'
                                    : mode === 'unlearned'
                                        ? '○ Offen'
                                        : `⭐ Eigene (${ownCount})`
                            }
                        </button>
                    ))}
                </div>
            </div>

            {category === 'quiz' && showAddForm && (
                <div style={{
                    padding: '0.9rem 1.5rem',
                    borderBottom: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                }}>
                    <h4 style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.92rem' }}>Neue Multiple-Choice-Karte</h4>
                    <input
                        type="text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Frage eingeben..."
                        style={{
                            padding: '0.65rem 0.8rem',
                            borderRadius: '10px',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-light)',
                            fontSize: '0.86rem',
                            outline: 'none'
                        }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        <input
                            type="text"
                            value={newQuestionTopic}
                            onChange={(e) => setNewQuestionTopic(e.target.value)}
                            placeholder="Thema (z.B. Marketing)"
                            style={{
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-light)',
                                fontSize: '0.8rem',
                                outline: 'none'
                            }}
                        />
                        <input
                            type="text"
                            value={newQuestionYoutubeQuery}
                            onChange={(e) => setNewQuestionYoutubeQuery(e.target.value)}
                            placeholder="YouTube Suchbegriff (optional)"
                            style={{
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-light)',
                                fontSize: '0.8rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <input
                        type="text"
                        value={newQuestionHint}
                        onChange={(e) => setNewQuestionHint(e.target.value)}
                        placeholder="Hinweis (optional)"
                        style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-light)',
                            fontSize: '0.8rem',
                            outline: 'none'
                        }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {newAnswerOptions.map((opt, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.45rem', alignItems: 'center' }}>
                                <button
                                    onClick={() => handleMarkCorrectAnswer(index)}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: `1px solid ${opt.isCorrect ? 'rgba(34,197,94,0.5)' : 'var(--glass-border)'}`,
                                        background: opt.isCorrect ? 'rgba(34,197,94,0.2)' : 'transparent',
                                        color: opt.isCorrect ? '#22c55e' : 'var(--text-muted)',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                    title="Als richtige Antwort markieren"
                                >
                                    {opt.isCorrect ? '✓' : String.fromCharCode(65 + index)}
                                </button>
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => {
                                        const updated = [...newAnswerOptions];
                                        updated[index] = { ...updated[index], text: e.target.value };
                                        setNewAnswerOptions(updated);
                                    }}
                                    placeholder={`Antwort ${index + 1}`}
                                    style={{
                                        padding: '0.48rem 0.68rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--text-light)',
                                        fontSize: '0.8rem',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={() => handleRemoveAnswerOption(index)}
                                    disabled={newAnswerOptions.length <= 2}
                                    style={{
                                        padding: '0.32rem 0.5rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        cursor: newAnswerOptions.length <= 2 ? 'not-allowed' : 'pointer',
                                        opacity: newAnswerOptions.length <= 2 ? 0.5 : 1
                                    }}
                                    title="Antwort entfernen"
                                >
                                    −
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleAddAnswerOption}
                            disabled={newAnswerOptions.length >= 8}
                            style={{
                                padding: '0.38rem 0.7rem',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                fontSize: '0.78rem',
                                cursor: newAnswerOptions.length >= 8 ? 'not-allowed' : 'pointer',
                                opacity: newAnswerOptions.length >= 8 ? 0.6 : 1
                            }}
                        >
                            + Antwort hinzufügen
                        </button>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    resetAddForm();
                                    setShowAddForm(false);
                                }}
                                style={{
                                    padding: '0.4rem 0.85rem',
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
                            <button
                                onClick={handleSubmitCustomQuestion}
                                disabled={addFormLoading || !authUser?.email}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--success)',
                                    color: '#fff',
                                    fontSize: '0.8rem',
                                    cursor: addFormLoading || !authUser?.email ? 'not-allowed' : 'pointer',
                                    opacity: addFormLoading || !authUser?.email ? 0.65 : 1,
                                    fontWeight: 'bold'
                                }}
                            >
                                {addFormLoading ? 'Speichert…' : 'Karte hinzufügen'}
                            </button>
                        </div>
                    </div>
                    {addFormError && (
                        <div style={{ color: '#f87171', fontSize: '0.78rem', fontWeight: 'bold' }}>{addFormError}</div>
                    )}
                </div>
            )}

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

                                        {/* Quiz Answer Options (collapsible) */}
                                        {category === 'quiz' && q.raw.answerOptions && editingId !== q.id && (
                                            <div style={{ marginTop: '0.6rem' }}>
                                                <button
                                                    onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        fontSize: '0.78rem',
                                                        cursor: 'pointer',
                                                        padding: '0.2rem 0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <span style={{
                                                        display: 'inline-block',
                                                        transition: 'transform 0.2s',
                                                        transform: expandedQuestionId === q.id ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        fontSize: '0.7rem'
                                                    }}>▶</span>
                                                    {expandedQuestionId === q.id ? 'Antworten verbergen' : 'Antworten anzeigen'} ({q.raw.answerOptions.length})
                                                </button>
                                                {expandedQuestionId === q.id && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                        {(editOverrides[`${q.id}_answers`] || q.raw.answerOptions).map((opt, i) => (
                                                            <div key={i} style={{
                                                                padding: '0.55rem 0.8rem',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${opt.isCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(248,113,113,0.25)'}`,
                                                                background: opt.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.05)',
                                                                display: 'flex',
                                                                gap: '0.6rem',
                                                                alignItems: 'flex-start'
                                                            }}>
                                                                <span style={{
                                                                    flexShrink: 0,
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '0.7rem',
                                                                    background: opt.isCorrect ? 'var(--success)' : 'rgba(248,113,113,0.3)',
                                                                    color: '#fff',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    {opt.isCorrect ? '✓' : String.fromCharCode(65 + i)}
                                                                </span>
                                                                <div style={{ flex: 1 }}>
                                                                    <p style={{
                                                                        margin: 0,
                                                                        fontSize: '0.82rem',
                                                                        color: 'var(--text-light)',
                                                                        lineHeight: '1.4'
                                                                    }}>
                                                                        {fmt(opt.text)}
                                                                    </p>
                                                                    {opt.rationale && (
                                                                        <p style={{
                                                                            margin: '0.3rem 0 0 0',
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            lineHeight: '1.35',
                                                                            fontStyle: 'italic'
                                                                        }}>
                                                                            💡 {fmt(opt.rationale)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Quiz answers inline editing */}
                                        {category === 'quiz' && editingId === q.id && editAnswers.length > 0 && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Antwortoptionen bearbeiten:</h4>
                                                {editAnswers.map((opt, i) => (
                                                    <div key={i} style={{
                                                        padding: '0.6rem',
                                                        marginBottom: '0.5rem',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${opt.isCorrect ? 'rgba(34,197,94,0.4)' : 'var(--glass-border)'}`,
                                                        background: opt.isCorrect ? 'rgba(34,197,94,0.05)' : 'transparent'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: 'bold',
                                                                color: opt.isCorrect ? '#22c55e' : 'var(--text-muted)'
                                                            }}>
                                                                {opt.isCorrect ? '✓ Richtig' : `${String.fromCharCode(65 + i)}) Falsch`}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = editAnswers.map((a, j) => ({
                                                                        ...a,
                                                                        isCorrect: j === i
                                                                    }));
                                                                    setEditAnswers(updated);
                                                                }}
                                                                style={{
                                                                    padding: '0.15rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid var(--glass-border)',
                                                                    background: 'transparent',
                                                                    color: 'var(--text-muted)',
                                                                    fontSize: '0.7rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {opt.isCorrect ? 'ist richtig' : 'als richtig markieren'}
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={opt.text}
                                                            onChange={(e) => {
                                                                const updated = [...editAnswers];
                                                                updated[i] = { ...updated[i], text: e.target.value };
                                                                setEditAnswers(updated);
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.45rem',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                color: 'var(--text-light)',
                                                                fontSize: '0.82rem',
                                                                outline: 'none'
                                                            }}
                                                            placeholder="Antworttext..."
                                                        />
                                                        <input
                                                            type="text"
                                                            value={opt.rationale || ''}
                                                            onChange={(e) => {
                                                                const updated = [...editAnswers];
                                                                updated[i] = { ...updated[i], rationale: e.target.value };
                                                                setEditAnswers(updated);
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.35rem',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--glass-border)',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                color: 'var(--text-muted)',
                                                                fontSize: '0.75rem',
                                                                outline: 'none',
                                                                marginTop: '0.3rem'
                                                            }}
                                                            placeholder="Erklärung/Rationale..."
                                                        />
                                                    </div>
                                                ))}
                                            </div>
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
                                            onClick={() => handleStartEdit(q.id, q.text, q.raw)}
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
