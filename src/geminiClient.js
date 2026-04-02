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

function extractJsonObject(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const direct = raw.match(/\{[\s\S]*\}/);
    if (!direct) return null;
    try {
        return JSON.parse(direct[0]);
    } catch {
        return null;
    }
}

function buildFallbackKpiScenario() {
    const products = ['Laufschuhe', 'Kuechenzubehoer', 'Yoga-Matten', 'Gaming-Maeuse', 'Outdoor-Jacken'];
    const channels = ['Social-Media-Ads', 'Display-Kampagne', 'Video-Ads', 'Search-Ads'];
    const product = products[Math.floor(Math.random() * products.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];

    const impressions = Math.floor(50000 + Math.random() * 250000);
    const ctr = 0.012 + Math.random() * 0.05;
    const klicks = Math.max(200, Math.floor(impressions * ctr));
    const conversionRate = 0.01 + Math.random() * 0.08;
    const bestellungen = Math.max(10, Math.floor(klicks * conversionRate));
    const werbekosten = Math.round((800 + Math.random() * 5200) * 100) / 100;
    const aov = 35 + Math.random() * 120;
    const umsatz = Math.round((bestellungen * aov) * 100) / 100;

    return {
        kampagnen_szenario: `Du bewirbst ${product} ueber ${channel}. Dein Budget lag bei ${werbekosten.toFixed(2)} EUR. Die Anzeigen wurden ${impressions.toLocaleString('de-DE')} Mal ausgespielt, ${klicks.toLocaleString('de-DE')} Personen klickten, ${bestellungen.toLocaleString('de-DE')} Bestellungen wurden erzielt. Der Umsatz betraegt ${umsatz.toFixed(2)} EUR.`,
        impressions,
        klicks,
        bestellungen,
        werbekosten_euro: werbekosten,
        umsatz_euro: umsatz
    };
}

function isValidKpiScenario(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    const impressions = Number(parsed.impressions);
    const klicks = Number(parsed.klicks);
    const bestellungen = Number(parsed.bestellungen);
    const werbekosten = Number(parsed.werbekosten_euro);
    const umsatz = Number(parsed.umsatz_euro);
    const text = String(parsed.kampagnen_szenario || '').trim();
    return (
        text.length > 20
        && Number.isFinite(impressions) && impressions > 0
        && Number.isFinite(klicks) && klicks > 0 && klicks <= impressions
        && Number.isFinite(bestellungen) && bestellungen > 0 && bestellungen <= klicks
        && Number.isFinite(werbekosten) && werbekosten > 0
        && Number.isFinite(umsatz) && umsatz > 0
    );
}

export async function generateOnlineMarketingScenario() {
    const prompt = `Du bist ein Generator fuer E-Commerce Pruefungsaufgaben.
Erstelle eine fiktive Online-Marketing-Kampagne (z. B. Social-Media-Ads fuer Laufschuhe).
Generiere realistische Zahlenwerte fuer Impressions, Klicks, Bestellungen (Conversions), Werbekosten und generierten Umsatz.
Antworte AUSSCHLIESSLICH im folgenden JSON-Format:
{ "kampagnen_szenario": "String", "impressions": Number, "klicks": Number, "bestellungen": Number, "werbekosten_euro": Number, "umsatz_euro": Number }`;

    if (genAI) {
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const text = extractTextFromResult(result);
                const parsed = extractJsonObject(text);
                if (isValidKpiScenario(parsed)) {
                    return {
                        kampagnen_szenario: String(parsed.kampagnen_szenario),
                        impressions: Number(parsed.impressions),
                        klicks: Number(parsed.klicks),
                        bestellungen: Number(parsed.bestellungen),
                        werbekosten_euro: Number(parsed.werbekosten_euro),
                        umsatz_euro: Number(parsed.umsatz_euro)
                    };
                }
            } catch (error) {
                console.warn(`generateOnlineMarketingScenario ${modelId} failed:`, error?.message || error);
            }
        }
    }

    const deepSeekResult = await askDeepSeek(prompt);
    if (deepSeekResult) {
        const parsed = extractJsonObject(deepSeekResult);
        if (isValidKpiScenario(parsed)) {
            return {
                kampagnen_szenario: String(parsed.kampagnen_szenario),
                impressions: Number(parsed.impressions),
                klicks: Number(parsed.klicks),
                bestellungen: Number(parsed.bestellungen),
                werbekosten_euro: Number(parsed.werbekosten_euro),
                umsatz_euro: Number(parsed.umsatz_euro)
            };
        }
    }

    return buildFallbackKpiScenario();
}

export async function askKpiTutorFeedback({ metric, formula, userInput }) {
    const safeMetric = String(metric || '').slice(0, 40);
    const safeFormula = String(formula || '').slice(0, 180);
    const safeInput = String(userInput || '').slice(0, 80);

    const prompt = `Der Schueler hat bei der Berechnung der Marketing-KPIs Fehler gemacht.
Erklaere ihm in genau einem kurzen, motivierenden Satz die korrekte Formel fuer die falsche Metrik,
ohne das genaue Endergebnis vorzusagen.

Falsche Metrik: ${safeMetric}
Formel: ${safeFormula}
User-Eingabe: ${safeInput || 'leer'}

Beispielstil: Achtung beim ROAS: Hier musst du den Umsatz durch die Werbekosten teilen, nicht umgekehrt!`;

    if (genAI) {
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const text = extractTextFromResult(result);
                if (text) return text;
            } catch (error) {
                console.warn(`askKpiTutorFeedback ${modelId} failed:`, error?.message || error);
            }
        }
    }

    const deepSeekResult = await askDeepSeek(prompt);
    if (deepSeekResult) return deepSeekResult;

    return `Tipp zu ${safeMetric}: Nutze sauber die Formel ${safeFormula} und achte darauf, Zaehler und Nenner nicht zu vertauschen.`;
}

function buildFallbackKpiTheoryQuestions() {
    return [
        {
            id: 'risk_cpc',
            question: 'Wer traegt beim CPC-Modell das Risiko, wenn viele klicken, aber niemand kauft?',
            options: [
                { id: 'a', text: 'Der Merchant / Werbetreibende', isCorrect: true },
                { id: 'b', text: 'Immer das Affiliate-Netzwerk', isCorrect: false },
                { id: 'c', text: 'Niemand, weil Klicks Umsatz garantieren', isCorrect: false }
            ]
        },
        {
            id: 'term_cpm',
            question: 'Welche Abkuerzung steht fuer den Tausenderkontaktpreis?',
            options: [
                { id: 'a', text: 'CPM', isCorrect: true },
                { id: 'b', text: 'CPL', isCorrect: false },
                { id: 'c', text: 'CPO', isCorrect: false }
            ]
        },
        {
            id: 'model_cpo',
            question: 'Bei welchem Modell bezahlt der Advertiser erst bei einer Bestellung?',
            options: [
                { id: 'a', text: 'CPO', isCorrect: true },
                { id: 'b', text: 'CPM', isCorrect: false },
                { id: 'c', text: 'CPC', isCorrect: false }
            ]
        },
        {
            id: 'model_cpl',
            question: 'Wofuer steht CPL im Online-Marketing?',
            options: [
                { id: 'a', text: 'Cost per Lead', isCorrect: true },
                { id: 'b', text: 'Cost per Like', isCorrect: false },
                { id: 'c', text: 'Campaign per Lead', isCorrect: false }
            ]
        }
    ];
}

function normalizeTheoryQuestionSet(parsed) {
    const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const normalized = list
        .map((entry, qIndex) => {
            const qText = String(entry?.question || '').trim();
            const options = Array.isArray(entry?.options) ? entry.options : [];
            const mappedOptions = options
                .map((opt, oIndex) => ({
                    id: String(opt?.id || String.fromCharCode(97 + oIndex)),
                    text: String(opt?.text || '').trim(),
                    isCorrect: !!opt?.isCorrect
                }))
                .filter((opt) => opt.text.length > 0);
            const correctCount = mappedOptions.filter((opt) => opt.isCorrect).length;
            if (qText.length < 10 || mappedOptions.length < 3 || correctCount !== 1) return null;
            return {
                id: String(entry?.id || `kpi_theory_${qIndex + 1}`),
                question: qText,
                options: mappedOptions
            };
        })
        .filter(Boolean)
        .slice(0, 6);

    if (normalized.length < 4) return null;
    return normalized;
}

export async function generateKpiTheoryQuestions() {
    const prompt = `Du bist Pruefungsaufgaben-Generator fuer Kaufleute im E-Commerce (IHK-Niveau).
Erzeuge 4 bis 6 abwechslungsreiche Theoriefragen zu Online-Marketing-Abrechnungsmodellen.
Fokus: CPC, CPO, CPL, CPM, Risikoverteilung zwischen Merchant und Publisher.

Regeln:
1) Jede Frage Multiple Choice mit 3 oder 4 Antwortoptionen.
2) Genau eine Antwort ist korrekt.
3) Fragen muessen variieren und praxisnah im IHK-Stil sein.
4) Antworte AUSSCHLIESSLICH als JSON in diesem Format:
{
  "questions": [
    {
      "id": "string",
      "question": "string",
      "options": [
        { "id": "a", "text": "string", "isCorrect": true },
        { "id": "b", "text": "string", "isCorrect": false },
        { "id": "c", "text": "string", "isCorrect": false }
      ]
    }
  ]
}`;

    if (genAI) {
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const text = extractTextFromResult(result);
                const parsed = extractJsonObject(text);
                const normalized = normalizeTheoryQuestionSet(parsed);
                if (normalized) return normalized;
            } catch (error) {
                console.warn(`generateKpiTheoryQuestions ${modelId} failed:`, error?.message || error);
            }
        }
    }

    const deepSeekResult = await askDeepSeek(prompt);
    if (deepSeekResult) {
        const parsed = extractJsonObject(deepSeekResult);
        const normalized = normalizeTheoryQuestionSet(parsed);
        if (normalized) return normalized;
    }

    return buildFallbackKpiTheoryQuestions();
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

const SWOT_LETTERS = ['S', 'W', 'O', 'T'];
const SWOT_PERSPECTIVE_BY_LETTER = {
    S: 'Intern',
    W: 'Intern',
    O: 'Extern',
    T: 'Extern'
};

const DEFAULT_SWOT_TIPS = {
    S: 'Verknüpfe eine konkrete Stärke mit einem messbaren Nutzen (z. B. schnellere Lieferung, geringere Kosten).',
    W: 'Nenne zusätzlich die Auswirkung der Schwäche auf Umsatz, Qualität oder Prozesse.',
    O: 'Zeige auf, wie das Unternehmen die Chance aktiv nutzen kann (konkrete Maßnahme).',
    T: 'Ergänze eine passende Gegenmaßnahme, um das Risiko frühzeitig zu reduzieren.'
};

const FALLBACK_SWOT_SCENARIOS = [
    {
        branche: 'Gastronomie',
        szenario_text: 'Ein regionales Restaurant hat sehr gute Bewertungen und Stammkundschaft, aber zu wenig Lieferkapazität. Gleichzeitig steigt die Nachfrage nach Online-Bestellungen in der Stadt. Neue Lieferketten-Anbieter drängen mit aggressiven Preisen in den Markt.'
    },
    {
        branche: 'Tech-Startup',
        szenario_text: 'Ein SaaS-Startup überzeugt mit einer innovativen Produktidee und schneller Entwicklung, hat jedoch ein kleines Vertriebsteam. Der Markt wächst stark durch neue Digitalisierungsprogramme. Gleichzeitig bieten große Wettbewerber ähnliche Funktionen in Bundles an.'
    },
    {
        branche: 'E-Commerce',
        szenario_text: 'Ein Online-Shop hat eine starke Conversion-Rate und gute Produktdaten, kämpft aber mit hohen Retourenquoten. Der Trend zu personalisierten Angeboten eröffnet zusätzliche Umsatzchancen. Parallel steigen die Werbekosten auf den großen Plattformen deutlich.'
    },
    {
        branche: 'Handwerk',
        szenario_text: 'Ein Handwerksbetrieb hat hochqualifizierte Fachkräfte und einen guten Ruf, aber veraltete Terminplanung. In der Region gibt es neue Förderprogramme für energetische Sanierungen. Gleichzeitig verschärfen steigende Materialpreise den Wettbewerbsdruck.'
    }
];

function getRandomFallbackSwotScenario() {
    const idx = Math.floor(Math.random() * FALLBACK_SWOT_SCENARIOS.length);
    return FALLBACK_SWOT_SCENARIOS[idx];
}

function normalizeSwotText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9äöüß\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildLocalSwotFeedback(swotEntries, scenarioText) {
    const normalizedScenario = normalizeSwotText(scenarioText);
    const scenarioTokens = new Set(
        normalizedScenario
            .split(' ')
            .filter((token) => token.length >= 5)
    );

    return SWOT_LETTERS.map((letter) => {
        const entry = swotEntries?.[letter] || {};
        const term = normalizeSwotText(entry.term);
        const perspective = String(entry.perspective || '').trim();
        const argument = String(entry.argument || '').trim();
        const justification = String(entry.justification || '').trim();

        const requiredPerspective = SWOT_PERSPECTIVE_BY_LETTER[letter];
        const expectedWords = letter === 'S'
            ? ['strength', 'starke', 'starken', 'staerke', 'staerken', 'starke', 'stärken']
            : letter === 'W'
                ? ['weakness', 'schwache', 'schwachen', 'schwaeche', 'schwaechen', 'schwäche', 'schwächen']
                : letter === 'O'
                    ? ['opportunity', 'opportunities', 'chance', 'chancen']
                    : ['threat', 'threats', 'risiko', 'risiken', 'gefahr', 'gefahren'];

        const theoryTermCorrect = expectedWords.some((word) => term.includes(word));
        const perspectiveCorrect = perspective === requiredPerspective;
        const theoryCorrect = theoryTermCorrect && perspectiveCorrect;

        const normalizedArgument = normalizeSwotText(argument);
        const hasSubstance = argument.length >= 18 && justification.length >= 24;
        const referencesScenario = normalizedArgument
            .split(' ')
            .some((token) => token.length >= 5 && scenarioTokens.has(token));
        const practiceCorrect = hasSubstance && referencesScenario;

        const theoryFeedback = theoryCorrect
            ? `Theorie korrekt: ${letter} ist passend eingeordnet.`
            : `Theorie noch unsauber: Für ${letter} muss der englische Begriff und die Perspektive (${requiredPerspective}) stimmen.`;

        const practiceFeedback = practiceCorrect
            ? 'Praxis passt: Argument und Begründung sind nachvollziehbar aus dem Szenario abgeleitet.'
            : 'Praxis noch zu schwach: Leite dein Argument konkreter aus dem Szenario ab und begründe die Auswirkung klar.';

        return {
            letter,
            theoryCorrect,
            practiceCorrect,
            theoryFeedback,
            practiceFeedback,
            profiTipp: DEFAULT_SWOT_TIPS[letter]
        };
    });
}

function normalizeSwotFeedbackItem(item, localItem) {
    const letter = SWOT_LETTERS.includes(String(item?.letter || '').toUpperCase())
        ? String(item.letter).toUpperCase()
        : localItem.letter;
    const perspectiveExpected = SWOT_PERSPECTIVE_BY_LETTER[letter];
    const entryPerspective = String(localItem?.entryPerspective || '').trim();
    const hardTheoryGate = perspectiveExpected === entryPerspective;

    const theoryCorrect = Boolean(item?.theoryCorrect) && hardTheoryGate;
    const practiceCorrect = Boolean(item?.practiceCorrect) && localItem.practiceMinimum;

    return {
        letter,
        theoryCorrect,
        practiceCorrect,
        theoryFeedback: String(item?.theoryFeedback || localItem.theoryFeedback || '').trim() || 'Theorie-Feedback nicht verfügbar.',
        practiceFeedback: String(item?.practiceFeedback || localItem.practiceFeedback || '').trim() || 'Praxis-Feedback nicht verfügbar.',
        profiTipp: String(item?.profiTipp || localItem.profiTipp || DEFAULT_SWOT_TIPS[letter]).trim() || DEFAULT_SWOT_TIPS[letter]
    };
}

export async function generateSwotScenario() {
    const prompt = `Du bist ein Generator für BWL-Fallstudien. Erstelle ein kurzes, prägnantes Szenario (max. 3 Sätze) für eine SWOT-Analyse. Wechsle zufällig die Branchen (z.B. Gastronomie, Tech-Startup, E-Commerce, Handwerk). Das Szenario muss offensichtliche interne Stärken/Schwächen und externe Chancen/Risiken enthalten. Antworte AUSSCHLIESSLICH in diesem JSON-Format: {"branche": "String", "szenario_text": "String"}`;

    const parseScenario = (text) => {
        if (!text) return null;
        const match = text.match(/\{[\s\S]*"branche"[\s\S]*"szenario_text"[\s\S]*\}/i);
        if (!match) return null;
        try {
            const parsed = JSON.parse(match[0]);
            const branche = String(parsed?.branche || '').trim();
            const szenario_text = String(parsed?.szenario_text || '').trim();
            if (!branche || !szenario_text) return null;
            return { branche, szenario_text };
        } catch {
            return null;
        }
    };

    if (genAI) {
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const parsed = parseScenario(extractTextFromResult(result));
                if (parsed) return parsed;
            } catch (error) {
                console.warn(`generateSwotScenario ${modelId} failed:`, error?.message || error);
            }
        }
    }

    const deepSeekText = await askDeepSeek(prompt);
    const deepSeekParsed = parseScenario(deepSeekText);
    if (deepSeekParsed) return deepSeekParsed;

    return getRandomFallbackSwotScenario();
}

export async function evaluateSwotAnalysis({ scenario, swotEntries }) {
    const scenarioText = String(scenario?.szenario_text || scenario || '').trim();
    const branche = String(scenario?.branche || '').trim();

    const entries = SWOT_LETTERS.reduce((acc, letter) => {
        const src = swotEntries?.[letter] || {};
        acc[letter] = {
            term: String(src.term || '').trim(),
            perspective: String(src.perspective || '').trim(),
            argument: String(src.argument || '').trim(),
            justification: String(src.justification || '').trim()
        };
        return acc;
    }, {});

    const localFeedback = buildLocalSwotFeedback(entries, scenarioText).map((item) => ({
        ...item,
        entryPerspective: entries[item.letter]?.perspective || '',
        practiceMinimum: entries[item.letter]?.argument?.length >= 18 && entries[item.letter]?.justification?.length >= 24
    }));

    if (!genAI && !deepSeekKey) {
        return {
            swot_feedback: localFeedback.map((item) => ({
                letter: item.letter,
                theoryCorrect: item.theoryCorrect,
                practiceCorrect: item.practiceCorrect,
                theoryFeedback: item.theoryFeedback,
                practiceFeedback: item.practiceFeedback,
                profiTipp: item.profiTipp
            }))
        };
    }

    const payload = JSON.stringify({
        branche,
        scenario_text: scenarioText,
        swot_entries: entries
    }, null, 2);

    const prompt = `Du bist ein strenger, aber motivierender IHK-Dozent. Bewerte die vorliegende SWOT-Analyse des Studenten zum gegebenen Szenario. Bewerte jeden der vier Buchstaben (S, W, O, T) nach folgenden Kriterien: 1. Ist der englische Begriff korrekt? 2. Stimmt die Perspektive (S/W = intern, O/T = extern)? 3. Passt das Argument logisch zum Szenario und ist die Begründung schlüssig? Formuliere zudem für jeden Buchstaben einen 'Profi-Tipp', was man noch hätte erwähnen können. Antworte AUSSCHLIESSLICH in folgendem JSON-Format (Array mit 4 Objekten):\n{ "swot_feedback": [ { "letter": "S", "theoryCorrect": boolean, "practiceCorrect": boolean, "theoryFeedback": "String", "practiceFeedback": "String", "profiTipp": "String" }, { "letter": "W", "theoryCorrect": boolean, "practiceCorrect": boolean, "theoryFeedback": "String", "practiceFeedback": "String", "profiTipp": "String" }, { "letter": "O", "theoryCorrect": boolean, "practiceCorrect": boolean, "theoryFeedback": "String", "practiceFeedback": "String", "profiTipp": "String" }, { "letter": "T", "theoryCorrect": boolean, "practiceCorrect": boolean, "theoryFeedback": "String", "practiceFeedback": "String", "profiTipp": "String" } ] }\n\nSzenario und Nutzereingaben:\n${payload}`;

    const parseTutorResponse = (text) => {
        if (!text) return null;
        const match = text.match(/\{[\s\S]*"swot_feedback"[\s\S]*\}/i);
        if (!match) return null;
        try {
            const parsed = JSON.parse(match[0]);
            if (!Array.isArray(parsed?.swot_feedback)) return null;

            const byLetter = new Map();
            parsed.swot_feedback.forEach((item) => {
                const letter = String(item?.letter || '').toUpperCase();
                if (SWOT_LETTERS.includes(letter) && !byLetter.has(letter)) {
                    byLetter.set(letter, item);
                }
            });

            const merged = SWOT_LETTERS.map((letter) => {
                const localItem = localFeedback.find((entry) => entry.letter === letter);
                const aiItem = byLetter.get(letter) || {};
                return normalizeSwotFeedbackItem(aiItem, localItem);
            });

            return { swot_feedback: merged };
        } catch {
            return null;
        }
    };

    if (genAI) {
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const parsed = parseTutorResponse(extractTextFromResult(result));
                if (parsed) return parsed;
            } catch (error) {
                console.warn(`evaluateSwotAnalysis ${modelId} failed:`, error?.message || error);
            }
        }
    }

    const deepSeekText = await askDeepSeek(prompt);
    const deepSeekParsed = parseTutorResponse(deepSeekText);
    if (deepSeekParsed) return deepSeekParsed;

    return {
        swot_feedback: localFeedback.map((item) => ({
            letter: item.letter,
            theoryCorrect: item.theoryCorrect,
            practiceCorrect: item.practiceCorrect,
            theoryFeedback: item.theoryFeedback,
            practiceFeedback: item.practiceFeedback,
            profiTipp: item.profiTipp
        }))
    };
}
