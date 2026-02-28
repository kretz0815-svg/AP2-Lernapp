import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai = null;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export async function askGemini(question, contextQuestion, contextAnswer) {
    if (!ai) {
        return "Fehler: Der Gemini API-Key (VITE_GEMINI_API_KEY) ist nicht gesetzt. Bitte füge in deiner .env-Datei den Key hinzu oder setze ihn in Vercel als Environment Variable.";
    }

    try {
        const prompt = `Du bist ein hilfreicher Lern-Assistent für einen Lehrling in der Ausbildung, wahrscheinlich im IT-Bereich (Fachinformatiker o.ä.). 
Der Azubi übt gerade Lernkarten und diese spezielle Frage aus einem Lernkatalog:
"${contextQuestion}"
Die erwartete korrekte Antwort lautet: "${contextAnswer}"

Hier ist die konkrete Rückfrage / das Problem des Auszubildenden dazu:
"${question}"

Bitte antworte ermutigend, kurz, prägnant und fachlich korrekt in einem leicht verständlichen Deutsch. Fasse dich kurz, es soll direkt helfen, ohne abzulenken.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Entschuldigung, leider gab es ein Problem bei der Verbindung zu Gemini. Bitte überprüfe die Entwicklerkonsole.";
    }
}
