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

export async function extractFocusTopics(wrongQuestions) {
    if (!genAI || !wrongQuestions || wrongQuestions.length === 0) {
        return { topics: [] };
    }
    try {
        const questionList = wrongQuestions
            .map((q, i) => `${i + 1}. ${typeof q === 'string' ? q : q.questionText || q.question || ''}`)
            .filter(q => q.length > 4)
            .join('\n');

        if (!questionList.trim()) return { topics: [] };

        const prompt = `Du bist ein präziser Lern-Assistent in einer EdTech-App.
Deine Aufgabe ist es, aus einer Liste von falsch beantworteten Fragen die 1 bis maximal 3 übergeordneten fachlichen Kernthemen (Tags) zu extrahieren. Der User soll sofort wissen, welches Themengebiet er nachholen muss.

Regeln:
1. Analysiere die bereitgestellten Fragentexte.
2. Finde die gemeinsamen Nenner oder die Hauptkategorien der Fragen.
3. Formuliere die Themen extrem kurz und prägnant (maximal 1 bis 3 Wörter pro Thema, z.B. "E-Commerce Strategie", "Zinsrechnung", "Marketing-Mix").
4. Keine ganzen Sätze, keine Erklärungen.
5. Gib die Antwort AUSSCHLIESSLICH als valides JSON-Objekt zurück:

{"topics": ["Thema 1", "Thema 2", "Thema 3"]}

Hier sind die falsch beantworteten Fragen des Users:
${questionList}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*"topics"[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.topics)) {
                return { topics: parsed.topics.slice(0, 3) };
            }
        }
        return { topics: [] };
    } catch (error) {
        console.error('extractFocusTopics error:', error);
        return { topics: [] };
    }
}
