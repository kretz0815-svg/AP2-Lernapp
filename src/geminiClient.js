import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

export async function askGemini(question, contextQuestion, contextAnswer) {
    if (!genAI) {
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

        // Wir nutzen zur Sicherheit das stabilere Generative-AI SDK von Google
        // Zurück auf gemini-2.5-flash gesetzt, da das Pro Modell ein Tarif / Quota Limit auf deinem Account verursacht
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini API Error details:", error);

        // Prüfen ob es ein API Key Limit Fehler ist oder so
        if (error.message && error.message.includes('API key')) {
            return "Fehler: Es scheint ein Problem mit dem API Key zu geben. Ist er korrekt hinterlegt?";
        }

        return "Entschuldigung, leider gab es ein Problem bei der Verbindung zu Gemini. Bitte überprüfe die Entwicklerkonsole.";
    }
}
