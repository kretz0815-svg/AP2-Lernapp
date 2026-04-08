# KLR Feature (Phase 1)

## Ziel dieser Phase
- Grundstruktur für das neue KLR-Spiel
- Globales State-Management (XP, aktuelles Level, Startup-Name)
- Lokale mathematische Generatoren (Zero Latency) für:
  - Level 2: Betriebsabrechnungsbogen
  - Level 4: Break-Even Survival

## Ordnerstruktur
- `state/KLRGameProvider.jsx`: globaler Progress-State + Persistenz
- `utils/generateLevelMath.js`: RNG + Validierung der Mathe
- `utils/generateLevelMath.test.js`: Integritätstests mit `node:test`
- `components/KLRGameHub.jsx`: UI-Skelett/Preview für State + RNG
- `components/CostCalcModule.js`: Vanilla JS Lernmodul "Kostenrechnung & Preisuntergrenze" (8 Etappen)
- `components/costCalcModule.css`: UI-Styles für das Lernmodul
- `components/cost-calc-module.html`: Beispiel-Container + Templates
- `index.js`: zentrale Exports

## Mathe-Regeln
- Berechnung läuft lokal.
- Beträge sind Integer.
- Level 2 garantiert glatte Verteilung:
  - `baseCost = totalKey * costPerKeyUnit`
  - Alle Teilkosten sind Integer.
- Level 4 garantiert glatte Break-Even-Menge:
  - Erlaubte Preise nur dort, wo `(fixedCost % (price - kv)) === 0`.
  - Keine krummen Stückzahlen.

## Integration CostCalcModule
1. Stelle einen Container bereit: `<div id="calc-boss-module"></div>`.
2. Binde die Styles ein: `import './components/costCalcModule.css';`.
3. Starte das Modul z. B. im Mount-Lifecycle: `bootstrapCostCalcModule({ containerId: 'calc-boss-module' });`.

Hinweis: Das Modul ist komplett framework-frei, kann aber aus React/Vite heraus einfach gestartet werden.
