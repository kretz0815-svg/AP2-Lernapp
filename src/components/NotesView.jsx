import React, { useState } from 'react';
import { formatLatex } from '../utils/formatting';
import { askGemini } from '../geminiClient';

const NotesView = ({
  authUser,
  setAppMode,
  syncProgressToSupabase,
  burgerMenuPortal
}) => {
  const [savedNotes, setSavedNotes] = useState(JSON.parse(localStorage.getItem('ap2_saved_notes') || '{}'));
  const [deepLearningLoading, setDeepLearningLoading] = useState(null);

  const noteKeys = Object.keys(savedNotes).sort((a, b) => {
    return new Date(savedNotes[b].date) - new Date(savedNotes[a].date);
  });

  const handleDeleteNote = async (key) => {
    if (window.confirm('Möchtest du diese Notiz wirklich löschen?')) {
      const notes = { ...savedNotes };
      delete notes[key];
      setSavedNotes(notes);
      localStorage.setItem('ap2_saved_notes', JSON.stringify(notes));
      if (authUser?.id) {
        try {
          await syncProgressToSupabase({ saved_notes: notes });
        } catch (err) { console.error('Supabase note delete sync error:', err); }
      }
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
      const notes = { ...savedNotes };
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
          setSavedNotes(notes);
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
  };

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      {burgerMenuPortal}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <header className="hide-on-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1.5rem' }}>
          <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
          <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px' }} onClick={() => window.print()}>Als PDF drucken</button>
        </div>
        <h1 style={{ margin: 0, color: 'var(--text-light)', fontSize: '2.5rem', textAlign: 'center', width: '100%' }}>Gespeicherte Notizen</h1>
      </header>

      <div className="notes-list-container" style={{ width: '100%' }}>
        {noteKeys.length === 0 ? (
          <div style={{ color: 'var(--text-light)', textAlign: 'center', marginTop: '2rem' }}>Noch keine Notizen vorhanden.</div>
        ) : (
          <div className="printable-notes" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
            {noteKeys.map(key => {
              const note = savedNotes[key];
              return (
                <div key={key} className="note-card" style={{ position: 'relative', padding: '1.5rem', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '16px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{new Date(note.date).toLocaleString()}</span>
                    <button
                      className="hide-on-print"
                      onClick={() => handleDeleteNote(key)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '1.2rem' }}
                      title="Notiz löschen"
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic', fontWeight: 'bold' }}>
                    {formatNoteContext(key, note.context)}
                  </div>
                  <div style={{ color: 'var(--text-light)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {note.text}
                  </div>

                  {note.deepLearningResult && typeof note.deepLearningResult === 'object' ? (
                    <div className="fade-in hide-on-print" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--glass-bg)', borderRadius: '12px', borderLeft: '4px solid var(--primary)', color: 'var(--text-light)' }}>
                      <h3 style={{ color: 'var(--text-light)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎯</span> Deep Learning Quiz
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {note.deepLearningResult.quiz?.map((q, qIndex) => (
                          <div key={qIndex} style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px' }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-light)' }}>{formatLatex(q.question)}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {q.options.map((opt, oIndex) => (
                                <button
                                  key={oIndex}
                                  className="btn-secondary"
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
                                  style={{ textAlign: 'left', padding: '0.8rem', fontSize: '0.9rem', width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none' }}
                                >
                                  {formatLatex(opt)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {note.deepLearningResult.writeAction && (
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid #38bdf8', borderRadius: '4px' }}>
                          <h4 style={{ color: '#38bdf8', margin: '0 0 0.5rem 0' }}>✍️ Wichtige Schreibaufgabe:</h4>
                          <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 'bold' }}>{note.deepLearningResult.writeAction}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="hide-on-print" style={{ marginTop: '1.5rem' }}>
                      <button
                        className={`btn-secondary ${deepLearningLoading === key ? 'loading' : ''}`}
                        onClick={() => handleGenerateDeepLearning(key, note)}
                        disabled={deepLearningLoading === key}
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: '100%', background: 'linear-gradient(90deg, #66295c, #2c3170)', color: 'white' }}
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
};

export default React.memo(NotesView);
