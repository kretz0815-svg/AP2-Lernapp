# AP2 LernApp – Detaillierte Gebrauchsanweisung

## 1) Zweck der App

Die AP2 LernApp ist eine Lernplattform für AP2-Prüfungsvorbereitung mit:
- Multiple-Choice-Quiz (Wissen testen)
- WisoR-Eingabeaufgaben (inkl. E-Commerce-Variante)
- Spaced-Repetition-Logik
- Lernanalyse, Notizen, Pomodoro, Hilfs-Tools
- Cloud-Sync für Member

---

## 2) Schnellstart

1. App öffnen (`Dashboard` erscheint nach Login oder Gastmodus).  
2. Modus wählen:
   - **Quiz** für MC-Fragen
   - **WisoR** für Freitext/Zahlen
   - **WisoR E-Commerce** für E-Commerce-Rechen-/Wissensanteile
3. Bei Bedarf Pomodoro starten, Notizen nutzen, Lernvideos/KI-Hilfe öffnen.

---

## 3) Account-Modi: Unterschied & Verhalten

## 3.1 Gastmodus
- Lokal auf dem Gerät (LocalStorage)
- Keine Cloud-Synchronisierung
- Geeignet für schnelles, anonymes Lernen

## 3.2 Membermodus (E-Mail/Passwort)
- Cloud-Sync über Supabase
- Quiz-SRS/Fälligkeiten über DSR in `user_task_progress`
- Daten sind accountgebunden und geräteübergreifend nutzbar

**Wichtig:** Guest und Member sind getrennt; keine Vermischung der Lernstände.

---

## 4) Funktionen im Detail

## 4.1 Quiz (Wissen testen)
- Thema wählen (oder „Alle Themen“)
- Anzahl fälliger Fragen wählen (10/20/50/alle)
- Antwort geben → Review wird gespeichert
- Member: Fälligkeit/Due-Date wird in DSR aktualisiert
- Guest: lokaler Fallback bleibt aktiv

## 4.2 Eigene Quizfragen erstellen
- Über Question Manager (Kategorie Quiz)
- Frage, Antwortoptionen, richtige Antwort, Hint, Thema erfassen
- Eigene Fragen werden in den Quizpool integriert
- Filter „Eigene“ verfügbar

## 4.3 WisoR / WisoR E-Commerce
- Freitext-/Zahlenantworten
- Richtige Antworten werden als erledigt markiert
- Fortschritt je Modus separat

## 4.4 Flashcards
- Klassische Spaced-Repetition-Bewertung
- Antwortqualität beeinflusst Wiederholungsintervall

## 4.5 Lernanalyse-Dashboard
- Verlauf, Fehlercluster, Trefferquoten
- Hilft beim Erkennen schwacher Themen

## 4.6 Notizen
- Fragebezogene Notizen
- Lokal + Member-Cloud-Sync

## 4.7 Pomodoro
- Lernsession starten/pausieren/abbrechen
- Session-Auswertung mit Trefferrate und Themenhinweisen

## 4.8 Hilfsmodule
- Floating Calculator
- Floating Image
- Kalkulations-Boss
- Break-Even-Point

---

## 5) Empfohlener Lernablauf

1. **Quiz**: Fällige Fragen eines Themenblocks abarbeiten  
2. **WisoR**: Zahlen/Fakten aktiv eingeben  
3. **Lernanalyse**: Schwachstellen prüfen  
4. **Eigene Fragen**: Lücken gezielt schließen  
5. **Pomodoro**: Fokusblöcke für konstantes Lerntempo

---

## 6) Reset / Zurücksetzen

- Fortschritt je Bereich kann zurückgesetzt werden
- Quiz-Reset entfernt bei Membern die entsprechenden DSR-Einträge
- Danach startet der Bereich sauber neu

---

## 7) Fehlerfall-Checkliste

Wenn etwas „komisch“ wirkt:
1. Neu laden (`Hard Refresh`)  
2. Prüfen, ob Guest oder Member aktiv ist  
3. Bei Member: kurz aus- und wieder einloggen  
4. Erneut eine Frage beantworten und Dashboard prüfen  
5. Bei Bedarf Dev-Check: `npm run lint`, `npm run build`

---

## 8) Aktuelle Grenzen

- Keine automatisierten E2E-Tests im Repo
- Einige Hook-Warnings im Lint (nicht blockierend)
- Bundle-Größe kann weiter optimiert werden

---

## 9) Verbesserungs-Ideen (Roadmap)

## Kurzfristig (hoher Nutzen, geringes Risiko)
1. E2E-Smoke-Test (Login → Quiz → Review → Due-Count)  
2. Hook-Warnings systematisch reduzieren  
3. Audit-Panel im Admin-/Dev-Menü (Live-Zähler für DSR-Reviews)

## Mittelfristig
1. Code-Splitting/Lazy Loading für große Module  
2. Exportierbare Lernberichte (PDF/CSV)  
3. Retry/Backoff-Monitoring für Cloud-Sync

## Langfristig
1. Adaptive Lernpfade nach Fehlerclustern  
2. Tages-/Wochenziele mit KPI-Tracking  
3. Optionaler Multi-Device-Konfliktindikator bei paralleler Nutzung

---

## 10) Betriebsempfehlung

Für verlässlichen Alltag:
- Membermodus für echten Cloud-Fortschritt nutzen
- Regelmäßig kurze Fokus-Sessions (Pomodoro)
- Schwache Themen im Question Manager mit eigenen Fragen ergänzen
- Nach größeren Updates einmal `lint + build` lokal prüfen
