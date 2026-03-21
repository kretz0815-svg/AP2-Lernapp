import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

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
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const deepSeekKey = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;

    if (!apiKey && !deepSeekKey) {
        return new Response(JSON.stringify({
            error: 'Fehler: Kein API-Key für den KI-Assistenten gesetzt. Bitte in den Vercel-Projekteinstellungen konfigurieren.'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Ungültiger JSON-Body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const question = String(body.question ?? '').slice(0, 8000);
    const contextQuestion = String(body.contextQuestion ?? '').slice(0, 4000);
    const contextAnswer = String(body.contextAnswer ?? '').slice(0, 4000);

    const prompt = `Du bist ein hilfreicher Lern-Assistent für einen Lehrling in der Ausbildung, wahrscheinlich im IT-Bereich (Fachinformatiker o.ä.). 
Der Azubi übt gerade Lernkarten und diese spezielle Frage aus einem Lernkatalog:
"${contextQuestion}"
Die erwartete korrekte Antwort lautet: "${contextAnswer}"

Hier ist die konkrete Rückfrage / das Problem des Auszubildenden dazu:
"${question}"

Bitte antworte ermutigend, kurz, prägnant und fachlich korrekt in einem leicht verständlichen Deutsch. Fasse dich kurz, es soll direkt helfen, ohne abzulenken.`;

    // 1. Gemini versuchen
    if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        for (const modelId of GEMINI_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(prompt);
                const text = extractText(result);
                if (text && text.length > 0) {
                    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                }
            } catch (err) {
                console.warn(`Gemini ${modelId} failed:`, err?.message);
            }
        }
    }

    // 2. DeepSeek Fallback
    const deepSeekResult = await askDeepSeekServer(prompt, deepSeekKey);
    if (deepSeekResult) {
        return new Response(JSON.stringify({ text: deepSeekResult }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Alle Modelle fehlgeschlagen
    return new Response(JSON.stringify({
        error: 'Entschuldigung, leider gab es ein Problem bei der Verbindung zur KI. Bitte versuche es in einer Minute erneut.'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
}
