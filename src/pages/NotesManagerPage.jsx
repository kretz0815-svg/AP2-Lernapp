import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { askGemini } from '../geminiClient';
import { formatLatex } from '../utils/formatting';
import './NotesManagerPage.css';

function NotesManagerPage() {
    const {
        authUser,
        setAppMode,
        syncProgressToSupabase
    } = useAppContext();

    const [deepLearningLoading, setDeepLearningLoading] = useState(null);

    const savedNotes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
    const noteKeys = Object.keys(savedNotes).sort((a, b) => new Date(savedNotes[b].date) - new Date(savedNotes[a].date));

    const handleDeleteNote = async (key) => {
        if (window.confirm('Möchtest du diese Notiz wirklich löschen?')) {
            const notes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
            delete notes[key];
            localStorage.setItem('ap2_saved_notes', JSON.stringify(notes));
            if (authUser?.id) {
                try {
                    await syncProgressToSupabase({ saved_notes: notes });
                } catch (err) { console.error('Supabase note delete sync error:', err); }
            }
            setAppMode('notes_manager');
        }
    };

    const formatNoteContext = (key, contextText) => {
        const parts = key.split('_');
        const typeStr = parts[0] === 'quiz' ? 'Quiz' : parts[0] === 'wisor' ? 'Wisor' : parts[0] === 'wisoreco' ? 'WisoR E-Commerce' : parts[0] === 'flashcard' ? 'Lernkarte' : 'Aufgabe';
        const idNum = parts.length > 1 ? parts[1] : '';
        const parsedNum = parseInt(idNum, 10);
        const numStr = isNaN(parsedNum) ? '' : ` ${parsedNum + 1}`;

        const title = `${typeStr}${numStr}`;
        const cleanText = (contextText || '').replace(/[^\wäöüÄÖÜß]/g, ' ');
        const words = cleanText.split(/\s+/).filter(w => w.length > 3);
        const nouns = words.filter(w => /^[A-ZÄÖÜ]/.test(w));
        const chosenWords = nouns.length >= 2 ? nouns.slice(0, 2) : words.slice(0, 2);
        const keywords = chosenWords.length > 0 ? ` - ${chosenWords.join(', ')}` : '';
        return `${title}${keywords}`;
    };

    const handleGenerateDeepLearning = async (key, note) => {
        setDeepLearningLoading(key);
        const prompt = `Du bist ein genialer, motivierender KI-Tutor. Der Schüler hat sich folgende Prüfungsnotiz gemerkt, weil er es schwer fand:

Kontext/Frage: ${note.context}
Eigene Notiz des Schülers: ${note.text}

Bitte erstelle daraus sofort ein "Deep Learning" Materialset. WICHTIG: Antworte AUSSCHLIESSLICH mit einem puren JSON-Objekt, ohne Markdown-Codeblöcke (\`\`\`) außenrum. Keine Begrüßung.

Die JSON muss exakt diese Struktur haben:
{
  "quiz": [
    {
      "question": "Die präzise Frage hier",
      "options": ["Falsch", "Richtig", "Falsch", "Falsch"],
      "correctAnswer": 1
    },
    ... (insgesamt 3 Fragen)
  ],
  "writeAction": "Hol jetzt einen Stift und schreib dir diesen Kern-Satz auf: [Hier der Kernsatz]"
}`;

        try {
            const response = await askGemini(prompt);
            const notes = JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}');
            if (notes[key]) {
                try {
                    let cleanResponse = response.trim();
                    if (cleanResponse.startsWith('```json')) {
                        cleanResponse = cleanResponse.substring(7, cleanResponse.length - 3);
                    } else if (cleanResponse.startsWith('```')) {
                        cleanResponse = cleanResponse.substring(3, cleanResponse.length - 3);
                    }
                    const parsedData = JSON.parse(cleanResponse);
                    notes[key].deepLearningResult = parsedData;
                    localStorage.setItem('ap2_saved_notes', JSON.stringify(notes));
                    if (authUser?.id) {
                        try {
                            await syncProgressToSupabase({ saved_notes: notes });
                        } catch (err) { console.error('Supabase deep learning sync error:', err); }
                    }
                } catch (e) {
                    console.error('Failed to parse JSON', e);
                    alert('Die KI hat ein ungültiges Format gesendet.');
                }
            }
        } catch (error) {
            console.error(error);
            alert('Ein Fehler ist bei der Erstellung des Deep Learning Materials aufgetreten.');
        }
        setDeepLearningLoading(null);
        setAppMode('notes_manager');
    };

    return (
        <div className="app-container">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <header className="hide-on-print notes-header">
                <div className="notes-header-top">
                    <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
                    <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px' }} onClick={() => window.print()}>Als PDF drucken</button>
                </div>
                <h1 className="notes-header-title">Gespeicherte Notizen</h1>
            </header>

            <div className="notes-list-container">
                {noteKeys.length === 0 ? (
                    <div style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '2rem' }}>Noch keine Notizen vorhanden.</div>
                ) : (
                    <div className="printable-notes">
                        {noteKeys.map(key => {
                            const note = savedNotes[key];
                            return (
                                <div key={key} className="note-card" style={{ textAlign: 'left' }}>
                                    <div className="note-card-meta">
                                        <span>{new Date(note.date).toLocaleString()}</span>
                                        <button
                                            className="hide-on-print note-card-delete-btn"
                                            onClick={() => handleDeleteNote(key)}
                                            title="Notiz löschen"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <div className="note-card-context">
                                        {formatNoteContext(key, note.context)}
                                    </div>
                                    <div className="note-card-text">
                                        {note.text}
                                    </div>

                                    {note.deepLearningResult && typeof note.deepLearningResult === 'object' ? (
                                        <div className="fade-in hide-on-print deep-learning-panel">
                                            <h3>
                                                <span>🎯</span> Deep Learning Quiz
                                            </h3>

                                            <div className="deep-learning-quiz-list">
                                                {note.deepLearningResult.quiz?.map((q, qIndex) => (
                                                    <div key={qIndex} className="deep-learning-quiz-item">
                                                        <p style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-light)' }}>{formatLatex(q.question)}</p>
                                                        <div className="deep-learning-quiz-options">
                                                            {q.options.map((opt, oIndex) => (
                                                                <button
                                                                    key={oIndex}
                                                                    className="btn-secondary deep-learning-quiz-btn"
                                                                    onClick={(e) => {
                                                                        if (oIndex === q.correctAnswer) {
                                                                            e.target.style.background = '#10b981';
                                                                            e.target.style.color = '#fff';
                                                                            e.target.innerText = '✅ ' + formatLatex(opt);
                                                                        } else {
                                                                            e.target.style.background = '#ef4444';
                                                                            e.target.style.color = '#fff';
                                                                            e.target.innerText = '❌ ' + formatLatex(opt);
                                                                        }
                                                                    }}
                                                                >
                                                                    {formatLatex(opt)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {note.deepLearningResult.writeAction && (
                                                <div className="deep-learning-write-action">
                                                    <h4>✍️ Wichtige Schreibaufgabe:</h4>
                                                    <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 'bold' }}>{note.deepLearningResult.writeAction}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="hide-on-print" style={{ marginTop: '1.5rem' }}>
                                            <button
                                                className={`btn-secondary btn-generate-quiz ${deepLearningLoading === key ? 'loading' : ''}`}
                                                onClick={() => handleGenerateDeepLearning(key, note)}
                                                disabled={deepLearningLoading === key}
                                            >
                                                {deepLearningLoading === key ? '✨ Generiere Quiz...' : '✨ Deep Learning Quiz generieren'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotesManagerPage;
