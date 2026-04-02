import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const deepSeekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

let genAI = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

function extractTextFromResult(result) {
    try {
        if (!result?.response) return null;
        return result.response.text?.()?.trim() || null;
    } catch {
        try {
            const candidates = result?.response?.candidates || [];
            const c = candidates[0];
            if (!c || (c.finishReason && ['SAFETY', 'RECITATION'].includes(c.finishReason))) return null;
            return (c.content?.parts?.[0]?.text || '').trim() || null;
        } catch {
            return null;
        }
    }
}

// --- DeepSeek Fallback (OpenAI-kompatible API) ---
async function askDeepSeek(prompt) {
    if (!deepSeekKey) return null;

    try {
        const res = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepSeekKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'Du bist ein hilfreicher Lern-Assistent für Azubis. Antworte auf Deutsch, kurz und prägnant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        if (!res.ok) {
            console.warn(`DeepSeek API returned ${res.status}`);
            return null;
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        return text && text.length > 0 ? text : null;
    } catch (error) {
        console.warn('DeepSeek fallback failed:', error?.message || error);
        return null;
    }
}

export async function askGemini(question, contextQuestion, contextAnswer, options = {}) {
    const safeQuestion = String(question ?? '').slice(0, 8000);
    const safeContextQ = String(contextQuestion ?? '').slice(0, 4000);
    const safeContextA = String(contextAnswer ?? '').slice(0, 4000);
    const hasIsCorrect = typeof options?.isCorrect === 'boolean';
    const safeIsCorrect = hasIsCorrect ? options.isCorrect : null;
    const safeSelectedAnswer = String(options?.selectedAnswer ?? '').slice(0, 1200);
    const safeCorrectAnswer = String(options?.correctAnswer ?? '').slice(0, 1200);

    // Zuerst über serverseitige API (Vercel) aufrufen – vermeidet CORS und schützt den API-Key
    try {
        const res = await fetch('/api/ask-gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: safeQuestion,
                contextQuestion: safeContextQ,
                contextAnswer: safeContextA,
                isCorrect: safeIsCorrect,
                selectedAnswer: safeSelectedAnswer,
                correctAnswer: safeCorrectAnswer
            })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.text) return data.text;
        if (data?.error) {
            // Bei Vercel-API-Fehler nicht sofort abbrechen – DeepSeek-Fallback versuchen
            console.warn('Vercel API returned error:', data.error);
        }
    } catch (e) {
        console.warn('API-Proxy nicht erreichbar, Fallback auf direkten Aufruf:', e?.message);
    }

    // Fallback 1: direkter Gemini-Aufruf (z. B. lokale Entwicklung)
    const correctnessBlock = hasIsCorrect
        ? `
Prüfkontext zur letzten Antwort:
- isCorrect: ${safeIsCorrect}
- Gewählte Antwort: "${safeSelectedAnswer || 'N/A'}"
- Korrekte Antwort: "${safeCorrectAnswer || 'N/A'}"

WICHTIGE REGEL:
Du bist ein strenger, aber fairer IHK-Tutor.
Wenn isCorrect = false, lobe den User NIEMALS.
Sage klar, dass die Antwort falsch war, erkläre kurz warum die gewählte Option nicht stimmt und warum die korrekte Option richtig ist.
Wenn isCorrect = true, gib kurzes, sachliches Lob und vertiefe den Kernpunkt fachlich.`
        : '';

    const prompt = `Du bist ein hilfreicher Lern-Assistent für einen Lehrling in der Ausbildung, wahrscheinlich im IT-Bereich (Fachinformatiker o.ä.). 
Der Azubi übt gerade Lernkarten und diese spezielle Frage aus einem Lernkatalog:
"${safeContextQ}"
Die erwartete korrekte Antwort lautet: "${safeContextA}"
${correctnessBlock}

Hier ist die konkrete Rückfrage / das Problem des Auszubildenden dazu:
"${safeQuestion}"

Bitte antworte ermutigend, kurz, prägnant und fachlich korrekt in einem leicht verständlichen Deutsch. Fasse dich kurz, es soll direkt helfen, ohne abzulenken.`;

    if (genAI) {
        let lastError = null;
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const text = extractTextFromResult(result);
                if (text && text.length > 0) return text;
            } catch (error) {
                lastError = error;
                console.warn(`Gemini ${modelId} failed:`, error?.message || error);
            }
        }
        console.error("Gemini API Error (all models failed):", lastError);
    }

    // Fallback 2: DeepSeek
    console.info('Versuche DeepSeek-Fallback…');
    const deepSeekResult = await askDeepSeek(prompt);
    if (deepSeekResult) return deepSeekResult;

    // Alle Modelle fehlgeschlagen
    if (!genAI && !deepSeekKey) {
        return "Fehler: Kein API-Key für den KI-Assistenten gesetzt. Bitte in .env.local oder Vercel konfigurieren.";
    }

    return "Entschuldigung, leider gab es ein Problem bei der Verbindung zur KI. Bitte versuche es in einer Minute erneut.";
}

export async function askCyberEinstein({ userPrompt, contextQuestion, contextAnswer }) {
    const prompt = `Du bist ein geniales, aber leicht schrulliges Einstein-Hologramm-Mentor-System.
Du erklärst KLR-Fehler praxisnah anhand von E-Commerce-Beispielen.
Wenn es passt, nutze einen humorvollen Einstein-Ton.
Maximal 2 Sätze. Kurz, direkt, bestimmt.

Kontext-Aufgabe:
"${contextQuestion || 'KLR-Aufgabe'}"
Korrekte Referenz:
"${contextAnswer || 'Keine Referenz'}"
Nutzer-Eingabe:
"${userPrompt || 'Keine Eingabe'}"

Antworte auf Deutsch.`;

    // Gemini zuerst
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.warn('askCyberEinstein Gemini error:', error?.message);
        }
    }

    // DeepSeek Fallback
    const deepSeekResult = await askDeepSeek(prompt);
    if (deepSeekResult) return deepSeekResult;

    return 'Mein Freund, dein Rechenweg hat ein Glitch. Prüfe Basiswert und Formel noch einmal.';
}

export async function extractFocusTopics(wrongQuestions) {
    if (!wrongQuestions || wrongQuestions.length === 0) {
        return { topics: [] };
    }
    if (!genAI && !deepSeekKey) {
        return { topics: [] };
    }

    try {
        const questionList = wrongQuestions
            .map((q, i) => {
                if (typeof q === 'string') return `${i + 1}. ${q}`;
                const parts = [];
                if (q.questionText || q.question) parts.push(`Frage: ${q.questionText || q.question}`);
                if (q.expectedAnswer) parts.push(`Korrekte Antwort: ${q.expectedAnswer}`);
                if (q.userAnswer) parts.push(`User antwortete: ${q.userAnswer}`);
                if (q.topic && q.topic !== 'Allgemein' && q.topic !== 'Quiz Allgemein') parts.push(`Themenbereich: ${q.topic}`);
                return `${i + 1}. ${parts.join(' | ')}`;
            })
            .filter(q => q.length > 6)
            .join('\n');

        if (!questionList.trim()) return { topics: [] };

        const prompt = `Du bist ein präziser Lern-Assistent für Azubis (Kaufleute im E-Commerce / Fachinformatiker).
Deine Aufgabe: Analysiere die falsch beantworteten Prüfungsfragen und extrahiere 1 bis maximal 3 übergeordnete fachliche Kernthemen (Tags). Der User soll sofort erkennen, welches Themengebiet er nachholen muss.

Regeln:
1. Analysiere Fragentext UND die korrekte Antwort, um das genaue Fachgebiet zu bestimmen.
2. Finde die gemeinsamen Nenner oder die Hauptkategorien.
3. Formuliere die Themen extrem kurz und prägnant (2 bis 4 Wörter pro Thema).
4. Themen müssen KONKRET und FACHLICH sein — niemals generisch wie "Quiz", "Allgemein" oder "Prüfungswissen".
5. Gute Beispiele: "Warenwirtschaft & Logistik", "Handelskalkulation", "UWG & Wettbewerbsrecht", "SEO & Online-Marketing", "Kaufvertragsstörungen", "E-Commerce Kennzahlen".
6. Schlechte Beispiele (VERBOTEN): "Quiz Allgemein", "Allgemein", "Verschiedenes", "Prüfungsfragen".
7. Gib die Antwort AUSSCHLIESSLICH als valides JSON-Objekt zurück:

{"topics": ["Thema 1", "Thema 2", "Thema 3"]}

Hier sind die falsch beantworteten Fragen:
${questionList}`;

        // Gemini zuerst
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();
                const jsonMatch = text.match(/\{[\s\S]*"topics"[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed.topics)) {
                        return { topics: parsed.topics.slice(0, 3) };
                    }
                }
            } catch (error) {
                console.warn('extractFocusTopics Gemini error:', error?.message);
            }
        }

        // DeepSeek Fallback
        const deepSeekResult = await askDeepSeek(prompt);
        if (deepSeekResult) {
            const jsonMatch = deepSeekResult.match(/\{[\s\S]*"topics"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed.topics)) {
                    return { topics: parsed.topics.slice(0, 3) };
                }
            }
        }

        return { topics: [] };
    } catch (error) {
        console.error('extractFocusTopics error:', error);
        return { topics: [] };
    }
}

export async function extractCalculationInsights(wrongCalculationEvents) {
    if (!Array.isArray(wrongCalculationEvents) || wrongCalculationEvents.length === 0) {
        return { insights: [] };
    }
    if (!genAI && !deepSeekKey) {
        return { insights: [] };
    }

    try {
        const eventList = wrongCalculationEvents
            .slice(0, 30)
            .map((entry, i) => {
                const mode = entry.mode === 'breakEven' ? 'Break-Even' : 'Kalkulation';
                const question = entry.questionText || entry.question || 'Unbekannt';
                const expected = entry.expectedAnswer || '';
                const userAnswer = entry.userAnswer || entry.lastUserAnswer || '';
                return `${i + 1}. Modus: ${mode} | Aufgabe: ${question} | Nutzerantwort: ${userAnswer} | Erwartet: ${expected}`;
            })
            .join('\n');

        if (!eventList.trim()) return { insights: [] };

        const prompt = `Du bist ein präziser Lerncoach für kaufmännische Rechenaufgaben (Kalkulation, Break-Even).
Analysiere die Fehlerliste und gib maximal 3 konkrete, wiederkehrende Fehlerbilder zurück.

Regeln:
1. Fokus nur auf RECHENFEHLER / Denkmuster (nicht auf Motivation).
2. Jedes Fehlerbild muss klar sagen:
   - error: Welcher Fehler passiert?
   - why: Warum passiert er typischerweise?
   - nextTime: Worauf soll der Nutzer beim nächsten Mal konkret achten?
3. Kurze, klare Sätze in einfachem Deutsch.
4. Antworte NUR als valides JSON:
{
  "insights": [
    { "error": "...", "why": "...", "nextTime": "...", "focus": "..." }
  ]
}

Fehlerdaten:
${eventList}`;

        const parseInsights = (text) => {
            const jsonMatch = text.match(/\{[\s\S]*"insights"[\s\S]*\}/);
            if (!jsonMatch) return null;
            const parsed = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsed.insights)) return null;
            return parsed.insights
                .map((item) => ({
                    error: String(item?.error || '').trim(),
                    why: String(item?.why || '').trim(),
                    nextTime: String(item?.nextTime || '').trim(),
                    focus: String(item?.focus || '').trim()
                }))
                .filter((item) => item.error && item.nextTime)
                .slice(0, 3);
        };

        // Gemini zuerst
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();
                const insights = parseInsights(text);
                if (insights) return { insights };
            } catch (error) {
                console.warn('extractCalculationInsights Gemini error:', error?.message);
            }
        }

        // DeepSeek Fallback
        const deepSeekResult = await askDeepSeek(prompt);
        if (deepSeekResult) {
            const insights = parseInsights(deepSeekResult);
            if (insights) return { insights };
        }

        return { insights: [] };
    } catch (error) {
        console.error('extractCalculationInsights error:', error);
        return { insights: [] };
    }
}

export async function evaluateNutzwertanalyse({ scenarioText, masterSolution, userMatrix, userCalculatedWinner, userRecommendation, userJustification }) {
    const toNumber = (v) => Number.isFinite(Number(v)) ? Number(v) : NaN;
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const tolerance = 0.02;
    const withinTol = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
    const normalizeForMatch = (text) => String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9äöüß\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const hasEnoughJustificationQuality = (text) => {
        const raw = String(text || '').trim();
        if (raw.length < 30) return false;
        if (/(.)\1{4,}/.test(raw)) return false;

        const normalized = normalizeForMatch(raw);

        const words = normalized.split(' ').filter(Boolean);
        if (words.length < 8) return false;

        const uniqueCount = new Set(words).size;
        const uniqueRatio = uniqueCount / words.length;
        if (uniqueRatio < 0.45) return false;

        const frequencies = new Map();
        words.forEach((word) => frequencies.set(word, (frequencies.get(word) || 0) + 1));
        const maxWordFrequency = Math.max(...frequencies.values());
        if (maxWordFrequency / words.length > 0.4) return false;

        const businessTerms = [
            'anbieter', 'empfehl', 'gewicht', 'gewichtet', 'punkte', 'gesamt', 'nutzwert',
            'kriter', 'kosten', 'leistung', 'support', 'qualität', 'entscheidung', 'sieger'
        ];
        const hasBusinessSignal = businessTerms.some((term) => normalized.includes(term));

        return hasBusinessSignal;
    };

    const safeRows = Array.isArray(userMatrix?.rows) ? userMatrix.rows : [];
    const safeTotals = Array.isArray(userMatrix?.totals) ? userMatrix.totals : [];

    const matrixConsistent = safeRows.every((row) => {
        const weight = toNumber(row?.userWeight);
        const providerScores = Array.isArray(row?.userProviderScores) ? row.userProviderScores : [];
        return providerScores.every((entry) => {
            const pts = toNumber(entry?.points);
            const partial = toNumber(entry?.partial);
            const expected = Number.isFinite(weight) && Number.isFinite(pts) ? round2((weight / 100) * pts) : NaN;
            return withinTol(partial, expected);
        });
    });

    const totalsConsistent = safeTotals.every((total, pIdx) => {
        const expected = round2(safeRows.reduce((sum, row) => {
            const partial = toNumber(row?.userProviderScores?.[pIdx]?.partial);
            return sum + (Number.isFinite(partial) ? partial : 0);
        }, 0));
        return withinTol(toNumber(total), expected);
    });

    const recommendationConsistent = Boolean(userCalculatedWinner) && userRecommendation === userCalculatedWinner;
    const justificationStrong = hasEnoughJustificationQuality(userJustification);
    const providerNames = Array.isArray(masterSolution?.providers) ? masterSolution.providers : [];
    const selectedWinner = userRecommendation || userCalculatedWinner || '';
    const selectedWinnerIdx = providerNames.indexOf(selectedWinner);

    const winnerAdvantages = selectedWinnerIdx >= 0
        ? safeRows
            .map((row) => {
                const criterionName = String(row?.criterion || '').trim();
                const scores = Array.isArray(row?.userProviderScores) ? row.userProviderScores : [];
                const winnerScore = scores[selectedWinnerIdx] || {};
                const winnerPartial = toNumber(winnerScore?.partial);
                const winnerPoints = toNumber(winnerScore?.points);

                let comparisonValues = scores
                    .map((entry, idx) => ({ idx, partial: toNumber(entry?.partial), points: toNumber(entry?.points) }))
                    .filter((entry) => entry.idx !== selectedWinnerIdx);

                const partialOthers = comparisonValues.map((entry) => entry.partial).filter(Number.isFinite);
                const pointsOthers = comparisonValues.map((entry) => entry.points).filter(Number.isFinite);

                const bestOtherPartial = partialOthers.length ? Math.max(...partialOthers) : NaN;
                const bestOtherPoints = pointsOthers.length ? Math.max(...pointsOthers) : NaN;
                const partialMargin = Number.isFinite(winnerPartial) && Number.isFinite(bestOtherPartial)
                    ? round2(winnerPartial - bestOtherPartial)
                    : NaN;
                const pointsMargin = Number.isFinite(winnerPoints) && Number.isFinite(bestOtherPoints)
                    ? winnerPoints - bestOtherPoints
                    : NaN;

                const positivePartialLead = Number.isFinite(partialMargin) && partialMargin > tolerance;
                const positivePointsLead = Number.isFinite(pointsMargin) && pointsMargin > 0;

                return {
                    criterionName,
                    positiveLead: positivePartialLead || positivePointsLead,
                    margin: Number.isFinite(partialMargin)
                        ? partialMargin
                        : (Number.isFinite(pointsMargin) ? pointsMargin : Number.NEGATIVE_INFINITY)
                };
            })
            .filter((item) => item.criterionName && item.positiveLead)
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 2)
        : [];

    const tokenizeCriterion = (text) => {
        const stopWords = new Set(['und', 'oder', 'mit', 'von', 'der', 'die', 'das', 'den', 'dem', 'des', 'im', 'in', 'am']);
        return normalizeForMatch(text)
            .split(' ')
            .filter((token) => token.length >= 4 && !stopWords.has(token));
    };

    const normalizedJustification = normalizeForMatch(userJustification);
    const referencesWinnerAdvantage = winnerAdvantages.length === 0
        ? true
        : winnerAdvantages.some((adv) => {
            const tokens = tokenizeCriterion(adv.criterionName);
            return tokens.some((token) => normalizedJustification.includes(token));
        });

    const localPass = matrixConsistent
        && totalsConsistent
        && recommendationConsistent
        && justificationStrong
        && referencesWinnerAdvantage;

    const aiFlagsJustificationIssue = (feedbackText) => {
        const feedback = String(feedbackText || '').toLowerCase();
        return /(begründ|begruend|begründung|begruendung).*(fehl|schwach|unzureichend|unklar|nicht|mangel)/.test(feedback)
            || /(fehl|schwach|unzureichend|unklar|nicht|mangel).*(begründ|begruend|begründung|begruendung)/.test(feedback)
            || /(unsinnig|widersprüchlich|nicht nachvollziehbar)/.test(feedback);
    };
    const buildLocalTip = () => {
        if (!recommendationConsistent) {
            return `Vergleiche die Gesamtnutzwerte erneut und wähle den Anbieter mit dem höchsten Wert (${userCalculatedWinner || 'dein rechnerischer Sieger'}).`;
        }
        if (!justificationStrong) {
            return 'Nenne mindestens zwei konkrete Kriterien und verknüpfe sie mit Punkten/Teilnutzwerten aus deiner Matrix.';
        }
        if (!referencesWinnerAdvantage && winnerAdvantages.length) {
            const names = winnerAdvantages.map((a) => a.criterionName).join(' und ');
            return `Begründe deine Empfehlung stärker über die tatsächlichen Vorteile bei ${names}.`;
        }
        return 'Ergänze in der Begründung 1-2 konkrete Zahlenbezüge aus der Matrix, damit dein Entscheidungsweg eindeutig nachvollziehbar ist.';
    };
    const ensureTipInFeedback = (feedbackText, tipText) => {
        const feedback = String(feedbackText || '').trim();
        if (!feedback) return `Tipp: ${tipText}`;
        if (/\btipp\b\s*:/i.test(feedback)) return feedback;
        return `${feedback} Tipp: ${tipText}`;
    };

    if (!genAI && !deepSeekKey) {
        return {
            isPassed: localPass,
            scoreAdjustment: 0,
            examinerFeedback: localPass
                ? 'Rechnerisch stimmig und nachvollziehbar begründet. (Lokale Bewertung ohne KI durchgeführt.)'
                : ensureTipInFeedback('Die Eingabe ist noch nicht vollständig stimmig. Prüfe Teilnutzwerte, Gesamtsummen, Empfehlung und Begründung.', buildLocalTip())
        };
    }

    const payloadStr = JSON.stringify({
        scenario: scenarioText,
        masterSolution: masterSolution,
        userSubmission: { 
            matrix: userMatrix, 
            calculatedWinner: userCalculatedWinner,
            recommendedProvider: userRecommendation, 
            justification: userJustification 
        }
    }, null, 2);

    const prompt = `Du bist ein fairer IHK-Prüfer. Werte die Nutzwertanalyse holistisch und nachvollziehbar aus.
Bewerte in dieser Reihenfolge:
1) Rechenlogik intern: Prüfe, ob die User-Matrix in sich konsistent ist (Gewichtung * Punkte = Teilnutzwert, Summe der Teilnutzwerte = Gesamtnutzwert).
2) Entscheidungskonsistenz: Prüfe, ob die Empfehlung zum rechnerischen Sieger aus den User-Totals passt.
3) Fachliche Begründung: Prüfe, ob die Begründung sinnvoll, konkret und fachlich nachvollziehbar ist.
4) Vergleich mit Musterlösung: Nutze die Musterlösung nur als Orientierung, NICHT als starres K.O.-Kriterium. Wenn User-Eingaben intern stimmig und gut begründet sind, darf die Lösung trotzdem bestehen.

Regeln:
- Keine pauschalen Aussagen wie "mathematische Fehler", wenn die User-Rechnung intern korrekt ist.
- Wenn etwas nicht passt, nenne genau 1-2 konkrete Korrekturhinweise.
- Prüfe ausdrücklich, ob die genannten Vorteile in der Begründung zur Matrix passen (Kriterien, Punkte, Teilnutzwerte).
- Wenn die Begründung falsche oder unpassende Vorteile behauptet, setze isPassed auf false und erkläre kurz warum.
- Bevorzuge klare, kurze, konstruktive Rückmeldung in Deutsch.
- Antworte AUSSCHLIESSLICH als JSON im Format:
  { "isPassed": boolean, "scoreAdjustment": number, "examinerFeedback": "...", "tip": "..." }

Nutzerdaten und Musterlösung:
${payloadStr}

Die Begründung ist ein Pflichtkriterium für das Bestehen.
Das Feld "tip" muss immer genau einen kurzen, umsetzbaren Verbesserungstipp enthalten (auch bei bestanden).
Gib dein Ergebnis IMMER als reines JSON zurück. Keine Markdown Blocks, nur JSON.`;

    const parseEvaluation = (text) => {
        if (!text) return null;
        const match = text.match(/\{[\s\S]*"isPassed"[\s\S]*"scoreAdjustment"[\s\S]*"examinerFeedback"[\s\S]*\}/i);
        if (!match) return null;
        try {
            const parsed = JSON.parse(match[0]);
            const parsedTip = String(parsed?.tip || '').trim();
            return {
                isPassed: Boolean(parsed?.isPassed),
                scoreAdjustment: Number.isFinite(Number(parsed?.scoreAdjustment)) ? Number(parsed.scoreAdjustment) : 0,
                examinerFeedback: ensureTipInFeedback(
                    String(parsed?.examinerFeedback || '').trim() || 'Bewertung abgeschlossen.',
                    parsedTip || buildLocalTip()
                )
            };
        } catch {
            return null;
        }
    };

    try {
        if (genAI) {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const parsed = parseEvaluation(text);
            if (parsed) {
                if (parsed.isPassed && (!matrixConsistent || !totalsConsistent || !recommendationConsistent)) {
                    return {
                        isPassed: false,
                        scoreAdjustment: parsed.scoreAdjustment,
                        examinerFeedback: ensureTipInFeedback(
                            'Die Lösung ist rechnerisch oder bei der Empfehlung noch nicht konsistent.',
                            buildLocalTip()
                        )
                    };
                }
                if (!parsed.isPassed && localPass) {
                    if (aiFlagsJustificationIssue(parsed.examinerFeedback)) {
                        return parsed;
                    }
                    return {
                        isPassed: true,
                        scoreAdjustment: parsed.scoreAdjustment,
                        examinerFeedback: `Rechnerisch ist deine Lösung stimmig und die Empfehlung passt. ${parsed.examinerFeedback}`
                    };
                }
                return parsed;
            }
        }
    } catch(err) {
        console.warn('evaluateNutzwertanalyse Gemini err:', err);
    }
    
    // Fallback if genAI fails
    try {
        const dsRes = await askDeepSeek(prompt);
        if (dsRes) {
            const parsed = parseEvaluation(dsRes);
            if (parsed) {
                if (parsed.isPassed && (!matrixConsistent || !totalsConsistent || !recommendationConsistent)) {
                    return {
                        isPassed: false,
                        scoreAdjustment: parsed.scoreAdjustment,
                        examinerFeedback: ensureTipInFeedback(
                            'Die Lösung ist rechnerisch oder bei der Empfehlung noch nicht konsistent.',
                            buildLocalTip()
                        )
                    };
                }
                if (!parsed.isPassed && localPass) {
                    if (aiFlagsJustificationIssue(parsed.examinerFeedback)) {
                        return parsed;
                    }
                    return {
                        isPassed: true,
                        scoreAdjustment: parsed.scoreAdjustment,
                        examinerFeedback: `Rechnerisch ist deine Lösung stimmig und die Empfehlung passt. ${parsed.examinerFeedback}`
                    };
                }
                return parsed;
            }
        }
    } catch(err) {
        console.warn('evaluateNutzwertanalyse DS err:', err);
    }

    return {
        isPassed: localPass,
        scoreAdjustment: 0,
        examinerFeedback: localPass
            ? ensureTipInFeedback('Rechnerisch stimmig, Empfehlung konsistent und Begründung ausreichend.', buildLocalTip())
            : ensureTipInFeedback('Die Eingabe ist noch nicht vollständig stimmig. Prüfe Teilnutzwerte, Gesamtsummen, Empfehlung und Begründung.', buildLocalTip())
    };
}
