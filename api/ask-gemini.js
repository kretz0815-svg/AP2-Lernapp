import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// --- Rate Limiting (in-memory, per-IP, resets on cold start) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // max requests per IP per window

function isRateLimited(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    // Clean up entries older than 5 minutes to prevent memory leaks
    for (const [key, val] of rateLimitMap) {
        if (now - val.startTime > 5 * 60 * 1000) {
            rateLimitMap.delete(key);
        }
    }

    if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return false;
    }

    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }
    return false;
}

// --- CORS Headers ---
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// --- Input Sanitization ---
function sanitizeString(str, maxLength = 8000) {
    return String(str ?? '')
        .replace(/<[^>]*>/g, '') // strip HTML tags
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
        .slice(0, maxLength)
        .trim();
}

function extractText(result) {
    try {
        if (!result?.response) return null;
        return result.response.text?.()?.trim() || null;
    } catch {
        try {
            const candidates = result?.response?.candidates || [];
            const c = candidates[0];
            if (!c || ['SAFETY', 'RECITATION'].includes(c.finishReason || '')) return null;
            return (c.content?.parts?.[0]?.text || '').trim() || null;
        } catch {
            return null;
        }
    }
}

async function askDeepSeekServer(prompt, deepSeekKey) {
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
        console.warn('DeepSeek server fallback failed:', error?.message || error);
        return null;
    }
}

export async function POST(request) {
    // --- Rate Limiting ---
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';

    if (isRateLimited(clientIp)) {
        return new Response(JSON.stringify({
            error: 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.'
        }), { status: 429, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // --- API Keys from server env only (never from VITE_ client vars) ---
    const apiKey = process.env.GEMINI_API_KEY;
    const deepSeekKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey && !deepSeekKey) {
        return new Response(JSON.stringify({
            error: 'Fehler: Kein API-Key für den KI-Assistenten konfiguriert. Bitte in den Vercel-Projekteinstellungen setzen (GEMINI_API_KEY und/oder DEEPSEEK_API_KEY).'
        }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Ungültiger JSON-Body' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // --- Input Sanitization ---
    const question = sanitizeString(body.question, 8000);
    const contextQuestion = sanitizeString(body.contextQuestion, 4000);
    const contextAnswer = sanitizeString(body.contextAnswer, 4000);
    const hasIsCorrect = typeof body.isCorrect === 'boolean';
    const isCorrect = hasIsCorrect ? body.isCorrect : null;
    const selectedAnswer = sanitizeString(body.selectedAnswer, 1200);
    const correctAnswer = sanitizeString(body.correctAnswer, 1200);

    if (!question) {
        return new Response(JSON.stringify({ error: 'Frage darf nicht leer sein.' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    const correctnessBlock = hasIsCorrect
        ? `
Zusatzkontext zur letzten Antwort:
- isCorrect: ${isCorrect}
- Gewählte Antwort: "${selectedAnswer || 'N/A'}"
- Korrekte Antwort: "${correctAnswer || 'N/A'}"

WICHTIGE REGEL:
Du bist ein strenger, aber fairer IHK-Tutor.
Wenn isCorrect = false, lobe den User NIEMALS.
Sage klar, dass die Antwort falsch war, erkläre kurz, warum die gewählte Option nicht stimmt, und begründe, warum die korrekte Option die richtige ist.
Wenn isCorrect = true, gib kurzes, sachliches Lob und eine präzise Vertiefung.`
        : '';

    const prompt = `Du bist ein hilfreicher Lern-Assistent für einen Lehrling in der Ausbildung, wahrscheinlich im IT-Bereich (Fachinformatiker o.ä.). 
Der Azubi übt gerade Lernkarten und diese spezielle Frage aus einem Lernkatalog:
"${contextQuestion}"
Die erwartete korrekte Antwort lautet: "${contextAnswer}"
${correctnessBlock}

Hier ist die konkrete Rückfrage / das Problem des Auszubildenden dazu:
"${question}"

Bitte antworte ermutigend, kurz, prägnant und fachlich korrekt in einem leicht verständlichen Deutsch. Fasse dich kurz, es soll direkt helfen, ohne abzulenken.`;

    // 1. Try Gemini
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const text = extractText(result);
                if (text && text.length > 0) {
                    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
                }
            } catch (err) {
                console.warn(`Gemini ${modelId} failed:`, err?.message);
            }
        }
    }

    // 2. DeepSeek Fallback
    const deepSeekResult = await askDeepSeekServer(prompt, deepSeekKey);
    if (deepSeekResult) {
        return new Response(JSON.stringify({ text: deepSeekResult }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // All models failed
    return new Response(JSON.stringify({
        error: 'Entschuldigung, leider gab es ein Problem bei der Verbindung zur KI. Bitte versuche es in einer Minute erneut.'
    }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

// Handle CORS preflight
export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}