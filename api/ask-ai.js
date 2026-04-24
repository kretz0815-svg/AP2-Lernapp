import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// --- Rate Limiting ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    for (const [key, val] of rateLimitMap) {
        if (now - val.startTime > 5 * 60 * 1000) rateLimitMap.delete(key);
    }
    if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function sanitizeString(str, maxLength = 16000) {
    return String(str ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
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
                max_tokens: 2048,
                temperature: 0.7
            })
        });
        if (!res.ok) return null;
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        return text && text.length > 0 ? text : null;
    } catch {
        return null;
    }
}

export async function POST(request) {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip') || 'unknown';

    if (isRateLimited(clientIp)) {
        return new Response(JSON.stringify({ error: 'Zu viele Anfragen.' }), { status: 429, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const deepSeekKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey && !deepSeekKey) {
        return new Response(JSON.stringify({ error: 'Kein API-Key konfiguriert.' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Ungültiger JSON-Body' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    const prompt = sanitizeString(body.prompt, 16000);
    if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt darf nicht leer sein.' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    const preferredModel = sanitizeString(body.model, 50) || null;
    const modelsToTry = preferredModel ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)] : GEMINI_MODELS;

    // 1. Try Gemini
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        for (const modelId of modelsToTry) {
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

    return new Response(JSON.stringify({
        error: 'Alle Modelle fehlgeschlagen. Bitte versuche es erneut.'
    }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}