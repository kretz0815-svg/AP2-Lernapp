export const L1_VARIANTS = [
  {
    id: 'base',
    title: 'Sommer-Sale Kampagne',
    scenario: 'Szenario: 🛒 "SneakerNova" Sommer-Sale. In welcher Reihenfolge planen wir?',
    quizQuestion: 'Womit startet ein professionelles E-Commerce-Projekt zwingend?',
    quizAnswers: [
      { text: 'Design', msg: 'Falsch! Design kommt erst viel später.', correct: false },
      { text: 'Projektvorbereitung', msg: 'Richtig!', correct: true },
      { text: 'Umsetzung', msg: 'Falsch! Ohne Planung keine Umsetzung.', correct: false }
    ],
    cards: [
      { id: 'l1-b-1', label: 'Projektvorbereitung', order: 0 },
      { id: 'l1-b-2', label: 'Marktanalyse', order: 1 },
      { id: 'l1-b-3', label: 'Inhaltsplanung', order: 2 },
      { id: 'l1-b-4', label: 'Kanalauswahl & Optimierung', order: 3 },
      { id: 'l1-b-5', label: 'Umsetzung', order: 4 },
      { id: 'l1-b-6', label: 'Monitoring & Analyse', order: 5 },
      { id: 'l1-b-7', label: 'Abschluss & Bericht', order: 6 }
    ]
  },
  {
    id: 'a',
    title: 'Shop-Relaunch',
    scenario: 'Szenario: 🚀 Der komplette Shop wird neu gelauncht. Ordne die Phasen.',
    quizQuestion: 'Was muss vor der Programmierung passieren?',
    quizAnswers: [
      { text: 'Marketing starten', msg: 'Falsch.', correct: false },
      { text: 'Lastenheft & Wireframes', msg: 'Korrekt!', correct: true },
      { text: 'Beta-Testing', msg: 'Falsch.', correct: false }
    ],
    cards: [
      { id: 'l1-a-1', label: 'Problem- & Bedarfsanalyse', order: 0 },
      { id: 'l1-a-2', label: 'Lastenheft & Wireframes erstellen', order: 1 },
      { id: 'l1-a-3', label: 'Programmierung & Design', order: 2 },
      { id: 'l1-a-4', label: 'Beta-Testing & Bugfixing', order: 3 },
      { id: 'l1-a-5', label: 'Go-Live & Projektabnahme', order: 4 }
    ]
  },
  {
    id: 'b',
    title: 'Influencer-Marketing',
    scenario: 'Szenario: 📸 Eine große Influencer-Kampagne. Wie gehst du vor?',
    quizQuestion: 'Was muss klar sein, bevor Influencer kontaktiert werden?',
    quizAnswers: [
      { text: 'Ziele & Budget', msg: 'Richtig!', correct: true },
      { text: 'Content', msg: 'Falsch.', correct: false },
      { text: 'Reporting', msg: 'Falsch.', correct: false }
    ],
    cards: [
      { id: 'l1-b-1', label: 'Kampagnenziele & Budget definieren', order: 0 },
      { id: 'l1-b-2', label: 'Influencer-Scouting & Auswahl', order: 1 },
      { id: 'l1-b-3', label: 'Verträge schließen & Briefing', order: 2 },
      { id: 'l1-b-4', label: 'Content-Erstellung', order: 3 },
      { id: 'l1-b-5', label: 'Reichweiten-Auswertung', order: 4 }
    ]
  },
  {
    id: 'c',
    title: 'Neues ERP-System',
    scenario: 'Szenario: 💻 Ein neues ERP muss eingeführt werden.',
    quizQuestion: 'Was passiert direkt vor der Schulung?',
    quizAnswers: [
        { text: 'Anbieterauswahl', msg: 'Falsch.', correct: false },
        { text: 'Schnittstellen programmieren', msg: 'Falsch.', correct: false },
        { text: 'Datenmigration', msg: 'Richtig! Erst Daten rüberziehen.', correct: true }
    ],
    cards: [
      { id: 'l1-c-1', label: 'Ist-Analyse der alten Prozesse', order: 0 },
      { id: 'l1-c-2', label: 'Anbieterauswahl', order: 1 },
      { id: 'l1-c-3', label: 'Schnittstellen (API) programmieren', order: 2 },
      { id: 'l1-c-4', label: 'Datenmigration', order: 3 },
      { id: 'l1-c-5', label: 'Mitarbeiterschulung & Rollout', order: 4 }
    ]
  },
  {
    id: 'd',
    title: 'Neue Eigenmarke',
    scenario: 'Szenario: ✨ Eine Eigenmarke soll im Shop eingeführt werden.',
    quizQuestion: 'Was passiert vor dem Produktfoto-Shooting?',
    quizAnswers: [
        { text: 'Produzenten finden', msg: 'Richtig! Erst das Produkt sichern.', correct: true },
        { text: 'Marktforschung', msg: 'Falsch, passiert ganz am Anfang.', correct: false },
        { text: 'Launch analysieren', msg: 'Falsch.', correct: false }
    ],
    cards: [
      { id: 'l1-d-1', label: 'Marktforschung & Trendanalyse', order: 0 },
      { id: 'l1-d-2', label: 'Produktdesign & Prototyping', order: 1 },
      { id: 'l1-d-3', label: 'Produzenten finden & Lieferkette sichern', order: 2 },
      { id: 'l1-d-4', label: 'Produktfotos shooten & Artikel anlegen', order: 3 },
      { id: 'l1-d-5', label: 'Launch-Verkäufe analysieren', order: 4 }
    ]
  }
];

export const L2_VARIANTS = [
  {
    id: 'base',
    title: 'SneakerNova Detaillierung',
    scenario: 'Szenario: "SneakerNova"-Sale. Ordne die Aufgaben richtig zu.',
    categories: [
      { id: 'A', title: 'A) Marktanalyse' },
      { id: 'B', title: 'B) Inhaltsplanung' },
      { id: 'C', title: 'C) Umsetzung' },
      { id: 'D', title: 'D) Abschluss & Bericht' }
    ],
    cards: [
      { id: 'l2-base-1', label: 'Zielgruppenanalyse', category: 'A' },
      { id: 'l2-base-2', label: 'Konkurrenzanalyse', category: 'A' },
      { id: 'l2-base-3', label: 'SWOT-Analyse', category: 'A' },
      { id: 'l2-base-4', label: 'Redaktionsplan erstellen', category: 'B' },
      { id: 'l2-base-5', label: 'Content-Strategie festlegen', category: 'B' },
      { id: 'l2-base-6', label: 'Landing Pages technisch aufbauen', category: 'C' },
      { id: 'l2-base-7', label: 'Finales Ad-Design erstellen', category: 'C' },
      { id: 'l2-base-8', label: 'Zielgruppensegmentierung im Tool einstellen', category: 'C' },
      { id: 'l2-base-9', label: 'Lessons Learned besprechen', category: 'D' },
      { id: 'l2-base-10', label: 'Erfolg gegen Zielsetzung messen', category: 'D' },
      { id: 'l2-base-11', label: 'Abschlusspräsentation halten', category: 'D' }
    ],
    quizTriggerCategory: 'C',
    quizTriggerCount: 2,
    quizQuestion: 'Landing Pages bauen und Tools einstellen. In welcher Phase sind wir?',
    quizAnswers: [
      { text: 'Monitoring', msg: 'Falsch.', correct: false },
      { text: 'Umsetzung', msg: 'Korrekt!', correct: true },
      { text: 'Planung', msg: 'Falsch.', correct: false }
    ]
  },
  {
    id: 'a',
    title: 'Das SEO-Projekt',
    scenario: 'Szenario: Sichtbarkeit erhöhen! Unterteile den PSP (Projektstrukturplan).',
    categories: [
      { id: 'A', title: 'Vorbereitung/Analyse' },
      { id: 'B', title: 'Planung' },
      { id: 'C', title: 'Umsetzung' },
      { id: 'D', title: 'Abschluss' }
    ],
    cards: [
      { id: 'l2-a-1', label: 'Keyword-Recherche', category: 'A' },
      { id: 'l2-a-2', label: 'Konkurrenz-Sichtbarkeit prüfen', category: 'A' },
      { id: 'l2-a-3', label: 'Content-Strategie entwerfen', category: 'B' },
      { id: 'l2-a-4', label: 'Redaktionsplan schreiben', category: 'B' },
      { id: 'l2-a-5', label: 'SEO-Texte schreiben', category: 'C' },
      { id: 'l2-a-6', label: 'Meta-Tags im Shop anpassen', category: 'C' },
      { id: 'l2-a-7', label: 'Ranking-Veränderungen messen', category: 'D' },
      { id: 'l2-a-8', label: 'Abschlussbericht verfassen', category: 'D' }
    ],
    quizTriggerCategory: 'C',
    quizTriggerCount: 1,
    quizQuestion: 'In welche Phase fällt das direkte Anpassen der Meta-Tags?',
    quizAnswers: [
      { text: 'Planung', msg: 'Falsch. Hier wird operativ gearbeitet.', correct: false },
      { text: 'Umsetzung', msg: 'Korrekt!', correct: true },
      { text: 'Vorbereitung', msg: 'Falsch.', correct: false }
    ]
  },
  {
    id: 'b',
    title: 'B2B-Kundenportal',
    scenario: 'Szenario: Großkunden brauchen ein eigenes Portal. Verteile die Aufgaben!',
    categories: [
      { id: 'A', title: 'Vorbereitung/Analyse' },
      { id: 'B', title: 'Planung' },
      { id: 'C', title: 'Umsetzung' },
      { id: 'D', title: 'Abschluss' }
    ],
    cards: [
      { id: 'l2-b-1', label: 'Stakeholder-Interviews (Kunden)', category: 'A' },
      { id: 'l2-b-2', label: 'Machbarkeitsstudie', category: 'A' },
      { id: 'l2-b-3', label: 'Pflichtenheft erstellen', category: 'B' },
      { id: 'l2-b-4', label: 'Ressourcenplan', category: 'B' },
      { id: 'l2-b-5', label: 'Login-Bereich codieren', category: 'C' },
      { id: 'l2-b-6', label: 'Kundendatenbank anbinden', category: 'C' },
      { id: 'l2-b-7', label: 'Übergabeprotokoll', category: 'D' },
      { id: 'l2-b-8', label: '"Lessons Learned" Meeting', category: 'D' }
    ],
    quizTriggerCategory: 'A',
    quizTriggerCount: 1,
    quizQuestion: 'Wer sind die "Stakeholder"?',
    quizAnswers: [
      { text: 'Programmierer', msg: 'Falsch.', correct: false },
      { text: 'Alle Interessenvertreter', msg: 'Korrekt!', correct: true },
      { text: 'Investoren', msg: 'Nicht nur die.', correct: false }
    ]
  },
  {
    id: 'c',
    title: 'Black Friday Sale',
    scenario: 'Szenario: Das wichtigste Wochenende im E-Commerce. Baue den Strukturplan.',
    categories: [
      { id: 'A', title: 'Vorbereitung/Analyse' },
      { id: 'B', title: 'Planung' },
      { id: 'C', title: 'Umsetzung' },
      { id: 'D', title: 'Abschluss' }
    ],
    cards: [
      { id: 'l2-c-1', label: 'Vorjahres-Zahlen analysieren', category: 'A' },
      { id: 'l2-c-2', label: 'Bestseller identifizieren', category: 'A' },
      { id: 'l2-c-3', label: 'Rabatt-Matrix kalkulieren', category: 'B' },
      { id: 'l2-c-4', label: 'Serverkapazitäten planen', category: 'B' },
      { id: 'l2-c-5', label: 'Rabattcodes aktivieren', category: 'C' },
      { id: 'l2-c-6', label: 'Werbebanner hochladen', category: 'C' },
      { id: 'l2-c-7', label: 'Return on Investment (ROI)', category: 'D' },
      { id: 'l2-c-8', label: 'Retourenquote auswerten', category: 'D' }
    ],
    quizTriggerCategory: 'D',
    quizTriggerCount: 1,
    quizQuestion: 'Was sagt dir der Return on Investment (ROI)?',
    quizAnswers: [
      { text: 'Ob das Projekt rentabel war', msg: 'Richtig!', correct: true },
      { text: 'Die Serverauslastung', msg: 'Falsch.', correct: false },
      { text: 'Die Retourenquote', msg: 'Falsch.', correct: false }
    ]
  },
  {
    id: 'd',
    title: 'Umzug Versandlager',
    scenario: 'Szenario: Der Logistik-Umzug steht an. Kategorisiere die Untervorgänge.',
    categories: [
      { id: 'A', title: 'Vorbereitung/Analyse' },
      { id: 'B', title: 'Planung' },
      { id: 'C', title: 'Umsetzung' },
      { id: 'D', title: 'Abschluss' }
    ],
    cards: [
      { id: 'l2-d-1', label: 'Platzbedarf ermitteln', category: 'A' },
      { id: 'l2-d-2', label: 'Mietverträge vergleichen', category: 'A' },
      { id: 'l2-d-3', label: 'Umzugs-Zeitplan erstellen', category: 'B' },
      { id: 'l2-d-4', label: 'Spedition beauftragen', category: 'B' },
      { id: 'l2-d-5', label: 'Regale aufbauen', category: 'C' },
      { id: 'l2-d-6', label: 'Warenbestand umziehen', category: 'C' },
      { id: 'l2-d-7', label: 'Inventur durchführen', category: 'D' },
      { id: 'l2-d-8', label: 'Altes Lager übergeben', category: 'D' }
    ],
    quizTriggerCategory: 'B',
    quizTriggerCount: 1,
    quizQuestion: 'Warum ist der Zeitplan hier so extrem kritisch?',
    quizAnswers: [
      { text: 'Wegen Stillstandzeiten beim Versand', msg: 'Richtig! Jeder offline-Tag kostet.', correct: true },
      { text: 'Wegen der Spedition', msg: 'Falsch.', correct: false },
      { text: 'Mietvertrag schreibt es vor', msg: 'Falsch.', correct: false }
    ]
  }
];

export const L3_VARIANTS = [
  {
    id: 'base',
    title: 'Steuerung & Ablauf',
    scenario: 'Fülle das Lückentext-Puzzle über Terminplanung und Steuerung aus.',
    pool: ['Gantt-Diagramm', 'Gleichzeitige Vorgänge', 'Kritischen Pfad', 'Abhängigkeit', 'Meilenstein', 'Pufferzeit'],
    cloze: [
      { text: 'Ein Balkenplan zur Terminübersicht heißt auch', gap: 'Gantt-Diagramm' },
      { text: 'Vorgänge, die parallel laufen können, nennt man', gap: 'Gleichzeitige Vorgänge' },
      { text: 'Beeinflusst das Enddatum und hat null Pufferzeit: der', gap: 'Kritischen Pfad' },
      { text: 'Zwingend abgeschlossene Vorgänger erzeugen eine', gap: 'Abhängigkeit' }
    ]
  },
  {
    id: 'a',
    title: 'Zeit & Gantt',
    scenario: 'Fülle das Lückentext-Puzzle aus.',
    pool: ['kritischen Pfad', 'Pufferzeit', 'Meilenstein', 'Gantt-Diagramm'],
    cloze: [
      { text: 'Verzögert sich ein Vorgang auf dem', gap: 'kritischen Pfad' },
      { text: ', verschiebt sich das Projektende. Die Puffer sind gleich null. Die Zeit, um die sich ein Vorgang verschieben kann, ohne Projektverzögerung zu erzeugen, ist die', gap: 'Pufferzeit' },
      { text: 'Ein wichtiges Zwischenziel mit Datum nennt man', gap: 'Meilenstein' },
      { text: 'Zur Terminübersicht nutzt man meist ein', gap: 'Gantt-Diagramm' }
    ]
  },
  {
    id: 'b',
    title: 'Dokumentation & Start',
    scenario: 'Ziehe die IHK-Begriffe zum Dokumentationswesen an die richtige Stelle.',
    pool: ['Lastenheft', 'Pflichtenheft', 'Kick-Off-Meeting', 'Ablaufplan'],
    cloze: [
      { text: 'Die Anforderungen des Auftraggebers (Was soll gemacht werden?) stehen im', gap: 'Lastenheft' },
      { text: 'Die technische Umsetzungslösung des Auftragnehmers (Wie wird es gemacht?) steht im', gap: 'Pflichtenheft' },
      { text: 'Das allererste, offizielle produktive Meeting nennt man', gap: 'Kick-Off-Meeting' }
    ]
  },
  {
    id: 'c',
    title: 'Agil vs. Klassisch',
    scenario: 'Finde die korrekten Entwicklungsbegriffe für E-Commerce.',
    pool: ['Sprints', 'Product Backlog', 'Wasserfall-Modell', 'Kanban'],
    cloze: [
      { text: 'Kurze, zweiwöchige Entwicklungszyklen in der agilen Entwicklung heißen', gap: 'Sprints' },
      { text: 'Die gesammelte Liste aller offener Aufgaben für den Shop heißt', gap: 'Product Backlog' },
      { text: 'Das traditionelle Projektmanagement, bei dem Phasen starr aufeinander folgen, ist das', gap: 'Wasserfall-Modell' }
    ]
  },
  {
    id: 'd',
    title: 'Ressourcen & Risiken',
    scenario: 'Lückentext zu personellen und sachlichen Ressourcen sowie Risiken.',
    pool: ['Stakeholder', 'Ressourcenkonflikt', 'Risikomatrix', 'Netzplan'],
    cloze: [
      { text: 'Personen oder Gruppen, die ein Interesse am Projekt haben, sind', gap: 'Stakeholder' },
      { text: 'Wenn zwei Projektleiter gleichzeitig den einzigen Webdesigner einplanen, entsteht ein', gap: 'Ressourcenkonflikt' },
      { text: 'Um finanzielle oder zeitliche Gefahren vorab zu bewerten, erstellt man eine', gap: 'Risikomatrix' }
    ]
  }
];

export const L4_VARIANTS = [
  {
    id: 'base',
    title: 'Relaunch EcoGlow',
    scenario: 'Szenario: Korrigiere den Relaunch-Plan der "EcoGlow" App. Ziehe Fehler heraus und baue die korrekte Kette (6 Phasen).',
    isLongSequence: true,
    correctSequence: ['Projektvorbereitung', 'Marktanalyse', 'Inhaltsplanung', 'Umsetzung', 'Monitoring', 'Abschluss & Bericht'],
    faulty: [
        { label: 'Umsetzung', correct: false },
        { label: 'Marktanalyse', correct: true },
        { label: 'Projektvorbereitung', correct: false },
        { label: 'Monitoring', correct: false },
        { label: 'Abschluss & Bericht', correct: false }
    ],
    inventory: [
        { id: 'l4-i1', label: 'Projektvorbereitung' },
        { id: 'l4-i2', label: 'Marktanalyse' },
        { id: 'l4-i3', label: 'Inhaltsplanung' },
        { id: 'l4-i4', label: 'Umsetzung' },
        { id: 'l4-i5', label: 'Monitoring' },
        { id: 'l4-i6', label: 'Abschluss & Bericht' }
    ]
  },
  {
    id: 'a',
    title: 'Fehler im Payment-Setup',
    scenario: 'Typische IHK-Prüfungsaufgabe. Wo ist der Logik-Fehler beim Payment-Ablauf?',
    isLongSequence: false,
    correctSequence: ['Zahlungsanbieter auswählen', 'API programmieren', 'Kunden testen lassen', 'Go-Live'],
    faulty: [
        { label: 'Zahlungsanbieter auswählen' },
        { label: 'Kunden testen lassen' },
        { label: 'API programmieren' },
        { label: 'Go-Live' }
    ],
    inventory: [
        { id: 'l4-a-1', label: 'Zahlungsanbieter auswählen' },
        { id: 'l4-a-2', label: 'API programmieren' },
        { id: 'l4-a-3', label: 'Kunden testen lassen' },
        { id: 'l4-a-4', label: 'Go-Live' }
    ]
  },
  {
    id: 'b',
    title: 'Dokumentations-Chaos',
    scenario: 'Szenario: Was muss zwingend wofür da sein? Tausche Lastenheft und Pflichtenheft!',
    isLongSequence: false,
    correctSequence: ['Projekt-Idee', 'Lastenheft', 'Pflichtenheft', 'Umsetzung'],
    faulty: [
        { label: 'Projekt-Idee' },
        { label: 'Pflichtenheft' },
        { label: 'Lastenheft' },
        { label: 'Umsetzung' }
    ],
    inventory: [
        { id: 'l4-b-1', label: 'Projekt-Idee' },
        { id: 'l4-b-2', label: 'Lastenheft' },
        { id: 'l4-b-3', label: 'Pflichtenheft' },
        { id: 'l4-b-4', label: 'Umsetzung' }
    ]
  },
  {
    id: 'c',
    title: 'Der falsche Meilenstein',
    scenario: 'Szenario: Ein Meilenstein wurde völlig falsch gesetzt. Repariere den Weg!',
    isLongSequence: false,
    correctSequence: ['Zielgruppe analysieren', 'Design-Entwürfe machen', 'Designfreigabe (Meilenstein)', 'Programmieren'],
    faulty: [
        { label: 'Design-Entwürfe machen' },
        { label: 'Designfreigabe (Meilenstein)' },
        { label: 'Zielgruppe analysieren' },
        { label: 'Programmieren' }
    ],
    inventory: [
        { id: 'l4-c-1', label: 'Zielgruppe analysieren' },
        { id: 'l4-c-2', label: 'Design-Entwürfe machen' },
        { id: 'l4-c-3', label: 'Designfreigabe (Meilenstein)' },
        { id: 'l4-c-4', label: 'Programmieren' }
    ]
  },
  {
    id: 'd',
    title: 'Marketing-Fail',
    scenario: 'Szenario: Der Tester hat einen Denkfehler gemacht – Bringe es in den logischen Ablauf.',
    isLongSequence: false,
    correctSequence: ['Newsletter verfassen', 'A/B-Test aufsetzen', 'Newsletter versenden', 'A/B-Test auswerten'],
    faulty: [
        { label: 'Newsletter verfassen' },
        { label: 'Newsletter versenden' },
        { label: 'A/B-Test auswerten' },
        { label: 'A/B-Test aufsetzen' }
    ],
    inventory: [
        { id: 'l4-d-1', label: 'Newsletter verfassen' },
        { id: 'l4-d-2', label: 'A/B-Test aufsetzen' },
        { id: 'l4-d-3', label: 'Newsletter versenden' },
        { id: 'l4-d-4', label: 'A/B-Test auswerten' }
    ]
  }
];
