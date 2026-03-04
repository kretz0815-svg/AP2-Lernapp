# DSR SRS Upgrade (global, account-scoped)

## 1) Datenbankschema (Bridge User ↔ Task)

Tabelle: `public.user_task_progress`

- Primärschlüssel: `id`
- Eindeutig: `(user_id, task_id)`
- DSR-Kernfelder:
  - `difficulty` (D)
  - `stability` (S)
  - `retrievability` (R)
  - `due_date`
  - `desired_retention`
- Review-Verlauf (aggregiert): `review_count`, `lapse_count`, `elapsed_days`, `scheduled_days`, `last_rating`, `last_reviewed_at`
- Kontext: `task_type`, `category`, `metadata`

Migration: `supabase/migrations/20260304_create_user_task_progress.sql`

## 2) Service-/Engine-Logik

### Engine
Datei: `src/services/dsrSrsEngine.js`

- `calculateRetrievability(S, t) = exp(-t/S)`
- Intervall aus Zielretention:
  - `interval = -S * ln(desiredRetention)`
- `reviewDSRState(...)` berechnet nach jeder Bewertung neu:
  - Difficulty-Drift je Rating
  - Stability-Wachstum mit
    - Retrievability-Faktor
    - Difficulty-Penalty
    - Overdue-Bonus (wenn verspätet, aber korrekt)
  - Fuzzing (leichte Intervall-Varianz gegen Clumping)

### Feedback-Mapping (format-agnostisch)
Datei: `src/services/srsFeedbackMapper.js`

- `mapInteractionToRating(...)` (1..4)
  - falsch => 1 (Again)
  - richtig, aber spät/2. Versuch => 2 (Hard)
  - richtig normal => 3 (Good)
  - richtig sehr schnell => 4 (Easy)

### Persistenz + Queue
Datei: `src/services/srsStore.js`

- `reviewTaskWithDSR(...)`
  - liest bestehenden Zustand `(user_id, task_id)`
  - rechnet DSR neu
  - upsert in `user_task_progress`
- `getDueTasksForToday(userId, { limit })`
  - globale fällige Tasks über alle Typen
  - `due_date <= now`
  - sortiert nach `due_date`
  - limitierbar (z. B. 100)

## 3) Integrationsbeispiel (Multiple Choice)

Bereits im Quiz-Flow integriert in `src/App.jsx` (`handleQuizAnswer`):

1. MC-Ergebnis wird in Rating übersetzt:
   - `const rating = mapQuizAnswerToRating({ isCorrect, attempt: 1 })`
2. Review wird zentral gespeichert:
   - `reviewTaskWithDSR({ supabase, userId, taskId: `quiz:${q.id}`, rating, taskType: 'quiz', category: q.topic })`
3. Engine schreibt neues `due_date` + D/S/R für genau `(user_id, task_id)`.

Damit gilt global:
- Kein Kategorie-Silo
- Kein doppeltes Lernen derselben Aufgabe
- Einheitlicher SRS-Zustand pro User+Task

## 4) Queue Manager (global)

Beispiel:

```js
const due = await getDueTasksForToday(supabase, authUser.id, { limit: 100 });
```

Ergebnis ist eine globale Tages-Warteschlange über Quiz/WisoR/Lernkarten hinweg.

## 5) Hinweise zur Migration

1. In Supabase SQL Editor ausführen:
   - `supabase/migrations/20260304_create_user_task_progress.sql`
2. Danach App nutzen; neue Reviews erzeugen automatisch DSR-Einträge.
3. Bestehender Legacy-Progress bleibt parallel erhalten, bis vollständige Umschaltung abgeschlossen ist.
