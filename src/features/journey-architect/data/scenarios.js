export const L1_SCENARIOS = [
  {
    id: 'l1',
    title: 'Die 5-Phasen-Journey',
    scenario: 'Das klassische "Sprint"-Modell. Kunden durchlaufen einen schnellen Zyklus von der ersten Wahrnehmung bis zur Weiterempfehlung.',
    challenges: [
      {
        id: 'c1',
        type: 'dnd',
        title: 'Challenge 1: Phasen-Sortierung',
        task: 'Sortiere die 5 Phasen in die richtige Reihenfolge in den "Kunden-Trichter".',
        cards: [
          { id: 'p1', label: 'Awareness', order: 0 },
          { id: 'p2', label: 'Consideration', order: 1 },
          { id: 'p3', label: 'Conversion', order: 2 },
          { id: 'p4', label: 'Retention', order: 3 },
          { id: 'p5', label: 'Advocacy', order: 4 }
        ]
      },
      {
        id: 'c2',
        type: 'mc',
        title: 'Challenge 2: Touchpoint-Zuordnung',
        task: '"Ein Kunde liest Testberichte auf einem Vergleichsportal." In welcher Phase der 5-Phasen-Journey befindet er sich?',
        answers: [
          { text: 'Awareness', correct: false },
          { text: 'Consideration', correct: true },
          { text: 'Retention', correct: false },
          { text: 'Conversion', correct: false }
        ]
      },
      {
        id: 'c3',
        type: 'oq',
        title: 'Challenge 3: Offene Frage',
        task: 'Ein Kunde hat gerade einen Schokoriegel gekauft. Nenne eine konkrete Maßnahme, die du als Marke in der \'Retention\'-Phase ergreifen kannst.',
        youtubeQuery: 'Customer Journey Retention Phase Marketing Maßnahmen'
      }
    ]
  }
];

export const L2_SCENARIOS = [
  {
    id: 'l2',
    title: 'Die 7-Phasen-Journey',
    scenario: 'Das "Deep Dive"-Modell für komplexere Prozesse. Es betrachtet den Vorgang viel detaillierter.',
    challenges: [
      {
        id: 'c1',
        type: 'dnd',
        title: 'Challenge 1: Phasen-Sortierung',
        task: 'Die 7 Phasen werden ungeordnet angezeigt. Sortiere sie korrekt.',
        cards: [
          { id: 'p1', label: 'Awareness', order: 0 },
          { id: 'p2', label: 'Knowledge', order: 1 },
          { id: 'p3', label: 'Consideration', order: 2 },
          { id: 'p4', label: 'Selection/Purchase', order: 3 },
          { id: 'p5', label: 'Service/Experience', order: 4 },
          { id: 'p6', label: 'Loyalty', order: 5 },
          { id: 'p7', label: 'Expansion/Evangelism', order: 6 }
        ]
      },
      {
        id: 'c2',
        type: 'mc',
        title: 'Challenge 2: Unterscheidung',
        task: 'Welches Element ist ein wesentlicher Unterschied zwischen der \'Knowledge\'-Phase in diesem Modell und der \'Awareness\'-Phase im 5-Phasen-Modell?',
        answers: [
          { text: 'Die \'Knowledge\'-Phase ist passiv, Awareness ist aktiv.', correct: false },
          { text: 'In der \'Knowledge\'-Phase vergleicht der Kunde aktiv Produkte, während er in der \'Awareness\'-Phase nur das Problem erkennt.', correct: true },
          { text: '\'Knowledge\' ist der Kaufprozess, Awareness ist die Nachbetreuung.', correct: false },
          { text: 'Es gibt keinen Unterschied.', correct: false }
        ]
      },
      {
        id: 'c3',
        type: 'oq',
        title: 'Challenge 3: B2B-Kontext',
        task: 'Du verkaufst eine teure SaaS-Software. Beschreibe eine Marketing-Maßnahme für die \'Service/Experience\'-Phase und erkläre, warum sie entscheidend ist.',
        youtubeQuery: 'B2B SaaS Customer Service Experience Phase'
      }
    ]
  }
];

export const L3_SCENARIOS = [
  {
    id: 'l3',
    title: 'Die 8-Phasen-Journey',
    scenario: 'Das erweiterte Brand-Experience-Journey ("Loyalty"-Modell).',
    challenges: [
      {
        id: 'c1',
        type: 'dnd',
        title: 'Challenge 1: Komplette Sortierung',
        task: 'Bringe alle 8 Stufen in die korrekte Reihenfolge.',
        cards: [
          { id: 'p1', label: 'Pre-Awareness', order: 0 },
          { id: 'p2', label: 'Awareness', order: 1 },
          { id: 'p3', label: 'Research', order: 2 },
          { id: 'p4', label: 'Preference', order: 3 },
          { id: 'p5', label: 'Purchase', order: 4 },
          { id: 'p6', label: 'Use/Experience', order: 5 },
          { id: 'p7', label: 'Retention', order: 6 },
          { id: 'p8', label: 'Loyalty', order: 7 }
        ]
      },
      {
        id: 'c2',
        type: 'mc',
        title: 'Challenge 2: Die Schlüsselphase "Preference"',
        task: 'Was ist das Hauptziel der \'Preference\'-Phase?',
        answers: [
          { text: 'Den Kunden auf das Produkt aufmerksam machen.', correct: false },
          { text: 'Den Kunden dazu bringen, das Produkt aktiv gegenüber der Konkurrenz zu bevorzugen.', correct: true },
          { text: 'Die Zahlungsabwicklung so einfach wie möglich machen.', correct: false },
          { text: 'Den Kunden dazu bringen, das Produkt weiterzuempfehlen.', correct: false }
        ]
      },
      {
        id: 'c3',
        type: 'oq',
        title: 'Challenge 3: Zusammenhang',
        task: 'Wie hängen die Phase \'Pre-Awareness\' und \'Advocacy\' zusammen? Wie beeinflusst ein loyaler Kunde die Pre-Awareness eines potenziellen Neukunden?',
        youtubeQuery: 'Customer Journey Loyalty Advocacy Pre-Awareness'
      }
    ]
  }
];

export const L4_SCENARIOS = [
  {
    id: 'l4',
    title: 'Mastermind-Herausforderung',
    scenario: 'Beweise, dass du ein echter Journey Architect bist.',
    challenges: [
      {
        id: 'c1',
        type: 'dnd-master',
        title: 'Challenge 1: Die 3 Trichter',
        task: 'Ordne alle 20 Phasen den 3 richtigen Modellen zu.',
        trichters: [
          {
            id: 't5', name: '5-Phasen-Modell', phases: [
              'Awareness (5)', 'Consideration (5)', 'Conversion', 'Retention (5)', 'Advocacy'
            ]
          },
          {
            id: 't7', name: '7-Phasen-Modell', phases: [
              'Awareness (7)', 'Knowledge', 'Consideration (7)', 'Selection/Purchase', 'Service/Experience', 'Loyalty (7)', 'Expansion/Evangelism'
            ]
          },
          {
            id: 't8', name: '8-Phasen-Modell', phases: [
              'Pre-Awareness', 'Awareness (8)', 'Research', 'Preference', 'Purchase', 'Use/Experience', 'Retention (8)', 'Loyalty (8)'
            ]
          }
        ]
      },
      {
        id: 'c2',
        type: 'oq',
        title: 'Challenge 2: Reflexion & Ausblick',
        task: 'Du hast nun 3 verschiedene Customer Journeys kennengelernt. Nenne eine Situation, in der du dich für das 7-Phasen-Modell und nicht für das 8-Phasen-Modell entscheiden würdest, und begründe deine Wahl.',
        youtubeQuery: 'Vergleich Customer Journey Modelle 5 7 8 Phasen'
      },
      {
        id: 'c3',
        type: 'dnd',
        title: 'Challenge 3: Auswendiglernen-Check',
        task: 'Baue das 8-Phasen-Modell aus dem Gedächtnis auf.',
        cards: [
          { id: 'p1', label: 'Pre-Awareness', order: 0 },
          { id: 'p2', label: 'Awareness', order: 1 },
          { id: 'p3', label: 'Research', order: 2 },
          { id: 'p4', label: 'Preference', order: 3 },
          { id: 'p5', label: 'Purchase', order: 4 },
          { id: 'p6', label: 'Use/Experience', order: 5 },
          { id: 'p7', label: 'Retention', order: 6 },
          { id: 'p8', label: 'Loyalty', order: 7 }
        ]
      }
    ]
  }
];
