import json
import re

questions_text = """1. Reihenfolge Bewerbung: Eine Jugendliche will sich bewerben. Bringen Sie die Vorgehensweise in die richtige Reihenfolge! Schritte: [1] Abschluss Vertrag, [2] Bewerbung schreiben, [3] Erkundigung Unternehmen, [4] Erkundigung Beruf, [5] Absenden Bewerbung, [6] Vorstellungsgespräch. Lösung: 4-3-2-5-6-1.
2. Welches Gesetz bestimmt den Inhalt des Ausbildungsvertrages? a) HGB b) BetrVG c) JArbSchG d) BAföG e) BBiG. Lösung: e.
3. Wann endet in der Regel das Ausbildungsverhältnis? a) Bestehen Abschlussprüfung b) Ablauf vertragliche Zeit c) Kündigung AG d) Kündigung Azubi e) Vereinbarung. Lösung: a.
4. Regelung BBiG? a) Einheitliche Regelung Ausbildung b) Berufsschule c) Arbeitsrecht d) BAföG e) Arbeitszeit Azubis. Lösung: a.
5. Szenario: Mündliche Zusage am 1. Juni für 1. September. Eltern einverstanden. Gültig? a) Nein, Eltern fehlten b) Nein, Prokurist darf nicht c) Nein, IHK fehlt d) Nein, schriftlich von Anfang an e) Ja, aber Niederschrift vor Beginn. Lösung: e.
6. Nichtige Vereinbarung? a) Urlaub b) Verbleibenspflicht c) Vergütung d) Fortbildung e) Arbeitszeit. Lösung: b.
7. Szenario Erna (17J): 4 Tage bis 18 Uhr, Do 11-20 Uhr. Jeweils 8h. Zulässig? a) Nein, nach 18 Uhr verboten b) Nein, Start 11 Uhr c) Nein, Do > 8h d) Ja, 8h/Tag und 40h/Woche e) Ja, Eltern zugestimmt. Lösung: d.
8. Welches Gesetz schreibt Urlaub im Vertrag vor? a) BBiG b) JArbSchG c) BUrlG d) BetrVG e) GG. Lösung: a.
9. Probezeit Dauer? a) 4 Monate b) 1 bis 4 Monate c) 6 Monate d) min 3 Monate e) keine Regelung. Lösung: b.
10. Probezeit Zweck? a) Eignung b) Verlängerung auf 6M möglich c) nicht vorgeschrieben d) nur wichtiger Grund e) Frist 4 Wochen. Lösung: a.
11. Szenario: Azubi kündigt nach Probezeit ohne Grund zum 30. April. Termin? a) 30. April b) Bestehen Prüfung c) Vertraglich d) Sofort e) Unwirksam. Lösung: e.
12. Verlängerung über Zeit hinaus? a) Noten schlecht b) Nicht bestanden + Verlangen c) automatisch bei Nichtbestehen d) Übernahme e) nicht vorgesehen. Lösung: b.
13. Gesetz Pflicht Bemühung? a) JArbSchG b) BBiG c) BetrVG d) Kündigungsschutzgesetz e) HGB. Lösung: b.
14. Vorzeitige Zulassung Entscheidung? a) Schulleitung b) Geschäftsleitung c) Zuständige Stelle (IHK) d) BMBF e) Prüfungsausschuss. Lösung: c.
15. Angabe im Vertrag? a) Vergütung b) Pausen c) Form Kündigung Probezeit d) Krankenkasse e) Berufsschule. Lösung: a.
16. Zeitpunkt Niederschrift? a) Unverzüglich/Vor Beginn b) erste 3M Probezeit c) nach Zwischenprüfung d) 4 Wochen nach Beginn e) nach Probezeit. Lösung: a.
17. Verpflichtung Berichtshefte? a) Rahmenlehrplan b) Ausbildungsordnung c) BetrVG d) JArbSchG e) BG. Lösung: b.
18. Zwei nichtige Vereinbarungen? a) 2M Probezeit b) Verbleibenspflicht c) Vertragsstrafe d) überbetriebliche Maßnahmen e) 39h/Woche. Lösung: b und c.
19. Verstoß BBiG? a) Niederschrift erst nach Probezeit b) Urlaub nach JArbSchG c) Übertariflich d) Freistellung Schule e) Kostenlose Mittel. Lösung: a.
20. Korrektur im Vertrag? a) Dauer 26M b) Probezeit 6M c) Unterschrift Eltern fehlt bei Volljährigen d) Vergütung steigt e) Ort Betriebssitz. Lösung: b.
21. Abschluss Vertrag minderjährig? a) Azubi, Vertreter, IHK b) Azubi, Vertreter, Ausbildender c) Eltern und Betrieb d) Vertreter und Ausbildender e) Azubi und Ausbildender. Lösung: b.
22. Kenntnisse 3. Jahr nachlesen? a) Lehrplan Schule b) Ausbildungsrahmenplan c) Tarifvertrag d) IHK Anforderungen e) JArbSchG. Lösung: b.
23. Qualifiziertes Zeugnis? a) nur Art/Dauer b) auf Verlangen bei Beendigung c) BR Zustimmung d) nur positiv e) Berufsschule. Lösung: b.
24. Verantwortlich Vermittlung Rahmenplan? a) Schule b) IHK c) Betrieb d) Eltern e) Azubi. Lösung: c.
25. Freistellung Schule Gesetz? a) Rahmenlehrplan b) BBiG c) AfG d) BetrVG e) Gewerbeordnung. Lösung: b.
26. Weiterer Lernort BBiG? a) Werkstatt b) Berufsschule c) IHK Räume d) überbetrieblich e) Fernlehrgang. Lösung: b.
27. Vergütung Regelung? a) BBiG/Vertrag b) BMA c) Rahmenplan d) gleichbleibend e) Noten. Lösung: a.
28. Vergütung zutreffend? a) pfändbar b) Lohnfortzahlung 6 Wochen c) keine Zahlung bei Freistellung d) keine Überstunden e) Zahlung 1. Werktag Folgemonat. Lösung: b.
29. Zwei Angaben nicht enthalten? a) Beginn/Dauer b) Probezeit c) Kündigungsgründe Probezeit d) Vergütung e) Ort f) Dauer Berufsschule. Lösung: c und f.
30. Kündigung nach Probezeit Voraussetzung? a) formlos 2 Wochen Grund b) fristlos/formlos wichtiger Grund c) schriftlich 4 Wochen Wechsel Beruf d) schriftlich 6 Wochen Quartal e) formlos jederzeit. Lösung: c.
31. Kündigungsbestimmungen Azubis Gesetz? a) KSchG b) JArbSchG c) BBiG d) BGB e) GewO. Lösung: c."""

def get_rationale(q_num):
    rationales = {
        1: "Die logische Reihenfolge im Bewerbungsprozess beginnt mit der Orientierung (4, 3), gefolgt von der Erstellung und dem Absenden der Unterlagen (2, 5). Nach einem erfolgreichen Vorstellungsgespräch (6) erfolgt der Vertragsabschluss (1).",
        2: "Das Berufsbildungsgesetz (BBiG) ist die zentrale Rechtsgrundlage für die Berufsausbildung in Deutschland und regelt auch die Inhalte des Ausbildungsvertrages (§ 11 BBiG).",
        3: "Das Ausbildungsverhältnis endet grundsätzlich mit dem Ablauf der Ausbildungszeit oder vorzeitig mit dem Bestehen der Abschlussprüfung (§ 21 BBiG).",
        4: "Das Berufsbildungsgesetz (BBiG) sorgt für eine bundeseinheitliche Regelung der Berufsausbildung außerhalb der Schulen (§ 1 BBiG).",
        5: "Ein Ausbildungsvertrag kann zwar mündlich geschlossen werden, der Ausbildende ist jedoch verpflichtet, die wesentlichen Inhalte vor Beginn der Ausbildung schriftlich niederzulegen (§ 11 BBiG).",
        6: "Vereinbarungen, die Auszubildende für die Zeit nach Beendigung des Ausbildungsverhältnisses in der Ausübung ihrer beruflichen Tätigkeit beschränken (z. B. Verbleibenspflicht), sind nichtig (§ 12 BBiG).",
        7: "Nach dem JArbSchG dürfen Jugendliche nicht mehr als 8 Stunden täglich und 40 Stunden wöchentlich beschäftigt werden. Die Beschäftigung bis 20 Uhr ist für Jugendliche über 16 Jahre zulässig (§ 14 JArbSchG).",
        8: "Das BBiG (§ 11) schreibt vor, dass die Dauer des Urlaubs im Ausbildungsvertrag enthalten sein muss. Die Mindestdauer richtet sich nach dem JArbSchG oder BUrlG.",
        9: "Gemäß § 20 BBiG muss das Berufsausbildungsverhältnis mit einer Probezeit beginnen. Diese muss mindestens einen Monat und darf höchstens vier Monate betragen.",
        10: "Die Probezeit dient dazu, festzustellen, ob der Auszubildende für den Beruf geeignet ist (Eignung) und ob ihm der gewählte Beruf zusagt.",
        11: "Nach der Probezeit kann ein Azubi nur kündigen, wenn er die Ausbildung aufgeben oder wechseln will (4 Wochen Frist). Eine ordentliche Kündigung ohne Grund zum Monatsende ist für Azubis nicht vorgesehen; eine solche Kündigung ist unwirksam (§ 22 BBiG).",
        12: "Bestehen Auszubildende die Abschlussprüfung nicht, so verlängert sich das Ausbildungsverhältnis auf ihr Verlangen bis zur nächstmöglichen Wiederholungsprüfung, höchstens um ein Jahr (§ 21 BBiG).",
        13: "Auszubildende haben die Pflicht, sich zu bemühen, die berufliche Handlungsfähigkeit zu erwerben, die zum Erreichen des Ausbildungsziels erforderlich ist (§ 13 BBiG).",
        14: "Auszubildende können nach Anhörung des Ausbildenden und der Berufsschule vorzeitig zur Abschlussprüfung zugelassen werden, wenn ihre Leistungen dies rechtfertigen. Die Entscheidung trifft die zuständige Stelle (z. B. IHK) (§ 45 BBiG).",
        15: "Zu den wesentlichen Inhalten des Ausbildungsvertrages gehört laut § 11 BBiG zwingend die Zahlung und Höhe der Vergütung.",
        16: "Der Ausbildende hat unverzüglich nach Abschluss des Berufsausbildungsvertrages, spätestens vor Beginn der Berufsausbildung, die wesentlichen Inhalte schriftlich niederzulegen (§ 11 BBiG).",
        17: "Auszubildende sind zum Führen von Ausbildungsnachweisen (Berichtsheften) verpflichtet. Diese Pflicht und die Form werden durch die jeweilige Ausbildungsordnung konkretisiert (§ 13 BBiG).",
        18: "Verbleibenspflichten (§ 12 BBiG) und Vertragsstrafen sind im Ausbildungsverhältnis nicht zulässig und entsprechende Vereinbarungen sind nichtig.",
        19: "Die schriftliche Niederlegung des Vertrages muss spätestens VOR Beginn der Ausbildung erfolgen. Eine Niederschrift erst nach der Probezeit ist ein klarer Verstoß gegen § 11 BBiG.",
        20: "Eine Probezeit von 6 Monaten in der Ausbildung verstößt gegen § 20 BBiG (Maximaldauer 4 Monate) und muss im Vertrag korrigiert werden.",
        21: "Bei Minderjährigen wird der Vertrag durch den Auszubildenden und seine gesetzlichen Vertreter (i. d. R. die Eltern) sowie durch den Ausbildenden unterzeichnet (§ 11 BBiG).",
        22: "Der Ausbildungsrahmenplan ist Bestandteil der Ausbildungsordnung und gibt die sachliche und zeitliche Gliederung der Vermittlung der Kenntnisse und Fertigkeiten vor (§ 5 BBiG).",
        23: "Nach Beendigung des Ausbildungsverhältnisses kann der Azubi ein qualifiziertes Zeugnis verlangen, das auch Angaben über Führung, Leistung und besondere fachliche Kenntnisse enthält (§ 16 BBiG).",
        24: "Der Ausbildende (Betrieb) trägt die Verantwortung dafür, dass dem Auszubildenden die berufliche Handlungsfähigkeit vermittelt wird, die zum Erreichen des Ausbildungsziels erforderlich ist (§ 14 BBiG).",
        25: "Der Ausbildende hat den Auszubildenden für die Teilnahme am Berufsschulunterricht freizustellen (§ 15 BBiG).",
        26: "Die Berufsausbildung findet im dualen System an den Lernorten Betrieb und Berufsschule statt (§ 2 BBiG).",
        27: "Auszubildenden ist eine angemessene Vergütung zu gewähren. Diese wird im Ausbildungsvertrag vereinbart und muss mit fortschreitender Ausbildung, mindestens jährlich, ansteigen (§ 17 BBiG).",
        28: "Auszubildenden ist die Vergütung auch für die Zeit der Freistellung (z. B. Berufsschule) sowie im Krankheitsfall bis zur Dauer von sechs Wochen weiterzuzahlen (§ 19 BBiG).",
        29: "Kündigungsgründe für die Probezeit (da jederzeit ohne Grund kündbar) und die genaue Dauer der Berufsschule (da diese landesschulrechtlich geregelt ist) müssen nicht im Ausbildungsvertrag stehen (§ 11 BBiG).",
        30: "Nach der Probezeit kann der Auszubildende mit einer Kündigungsfrist von vier Wochen kündigen, wenn er die Berufsausbildung aufgeben oder sich für eine andere Berufstätigkeit ausbilden lassen will (§ 22 BBiG).",
        31: "Die speziellen Kündigungsbestimmungen für das Berufsausbildungsverhältnis sind im Berufsbildungsgesetz (§ 22 BBiG) geregelt."
    }
    return rationales.get(q_num, "Keine Angabe.")

def get_youtube_query(q_num):
    queries = {
        1: "Bewerbungsprozess Reihenfolge",
        2: "Berufsbildungsgesetz Ausbildungsvertrag Inhalt",
        3: "Ende Ausbildungsverhältnis BBiG",
        4: "BBiG Grundlagen",
        5: "Ausbildungsvertrag Schriftform BBiG",
        6: "Nichtige Vereinbarungen Ausbildungsvertrag",
        7: "Jugendarbeitsschutzgesetz Arbeitszeit",
        8: "Inhalt Ausbildungsvertrag Pflichtangaben",
        9: "Probezeit Ausbildung Dauer",
        10: "Zweck der Probezeit",
        11: "Kündigung Azubi nach Probezeit",
        12: "Verlängerung Ausbildung bei Nichtbestehen",
        13: "Pflichten des Auszubildenden BBiG",
        14: "Vorzeitige Zulassung Abschlussprüfung",
        15: "Vergütung im Ausbildungsvertrag",
        16: "Niederschrift Ausbildungsvertrag Zeitpunkt",
        17: "Berichtsheft führen Pflicht",
        18: "Vertragsstrafe Ausbildung nichtig",
        19: "BBiG Verstöße Ausbildungsvertrag",
        20: "Dauer Probezeit BBiG",
        21: "Ausbildungsvertrag Minderjährige Unterschrift",
        22: "Ausbildungsrahmenplan BBiG",
        23: "Qualifiziertes Zeugnis Ausbildung",
        24: "Verantwortung Ausbildender",
        25: "Freistellung Berufsschule BBiG",
        26: "Lernorte duale Ausbildung",
        27: "Angemessene Vergütung BBiG",
        28: "Lohnfortzahlung Azubi Krankheit",
        29: "Inhalt Berufsausbildungsvertrag BBiG",
        30: "Kündigungsfrist Azubi Berufswechsel",
        31: "Kündigungsschutz Ausbildung BBiG"
    }
    return queries.get(q_num, "Berufsbildungsgesetz")

parsed_questions = []
lines = [l.strip() for l in questions_text.split('\n') if l.strip()]

for i, line in enumerate(lines):
    q_num = i + 1
    match = re.match(r'^(\d+)\.\s+(.*)\s+Lösung:\s+(.*)\.?$', line)
    
    if match:
        full_q_text = match.group(2).strip()
        solution_raw = match.group(3).strip().lower().rstrip('.')
        
        full_q_text = full_q_text.replace("Ventura-Outdoor GmbH", "Summit-Gear GmbH")
        id_str = f"eco_{116 + q_num}"
        options = []
        expected_answers = []
        
        if q_num == 1:
            options = [
                {"text": "4-3-2-5-6-1", "isCorrect": True, "rationale": "Korrekt: Erst allgemeine Berufsinformation, dann gezielte Suche nach Unternehmen. Danach Bewerbung (Erstellung & Versand), Auswahlgespräch und schließlich Vertragsschluss."},
                {"text": "1-2-3-4-5-6", "isCorrect": False, "rationale": "Falsch: Diese Reihenfolge ist unlogisch (Vertrag vor Bewerbung)."},
                {"text": "4-3-2-6-5-1", "isCorrect": False, "rationale": "Falsch: Das Vorstellungsgespräch findet erst nach dem Absenden der Unterlagen statt."},
                {"text": "3-4-2-5-6-1", "isCorrect": False, "rationale": "Falsch: Die allgemeine Berufsorientierung (4) sollte vor der konkreten Unternehmenssuche (3) stehen."}
            ]
            expected_answers = ["4-3-2-5-6-1"]
        elif 'a)' in full_q_text:
            parts = re.split(r'([a-f]\))', full_q_text)
            for j in range(1, len(parts), 2):
                letter = parts[j][0].lower()
                text = parts[j+1].strip()
                is_correct = False
                if ' und ' in solution_raw:
                    sol_letters = [s.strip()[0] for s in solution_raw.split(' und ')]
                    if letter in sol_letters:
                        is_correct = True
                elif solution_raw == letter:
                    is_correct = True
                options.append({
                    "text": f"{letter}) {text}",
                    "isCorrect": is_correct,
                    "rationale": "Richtig." if is_correct else "Falsch."
                })
            if ' und ' in solution_raw:
                sol_letters = [s.strip()[0].upper() for s in solution_raw.split(' und ')]
                combined = "".join(sorted(sol_letters))
                expected_answers = [combined, combined[::-1]]
            else:
                expected_answers = [solution_raw.upper()]
        else:
            expected_answers = [solution_raw.upper()]

        parsed_questions.append({
            "id": id_str,
            "question": full_q_text,
            "answerOptions": options,
            "expectedAnswers": expected_answers,
            "inputType": "text",
            "rationale": get_rationale(q_num),
            "videoUrl": "",
            "youtubeQuery": get_youtube_query(q_num)
        })

print(json.dumps(parsed_questions, indent=2, ensure_ascii=False))
