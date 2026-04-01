const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const CRITERIA_POOL = [
  {
    key: 'kosten', name: 'Anschaffungskosten', type: 'quantitativ',
    texts: {
      1: "verlangt extrem hohe Anschaffungskosten, die weit über dem Budgetschnitt liegen",
      2: "ist vergleichsweise teuer in der Anschaffung",
      3: "liegt preislich im soliden Mittelfeld",
      4: "bietet recht günstige Anschaffungskosten",
      5: "ist extrem kostengünstig und schlägt alle Preisvergleiche"
    }
  },
  {
    key: 'support', name: 'Support & Service', type: 'qualitativ',
    texts: {
      1: "bietet leider gar keinen Support an",
      2: "hat nur einen rudimentären E-Mail-Support mit langen Antwortzeiten",
      3: "bietet einen Standard-Support zu den normalen Geschäftszeiten",
      4: "stellt einen guten Support samt einer Service-Hotline bereit",
      5: "glänzt mit herausragendem 24/7 Premium-Support durch feste Ansprechpartner"
    }
  },
  {
    key: 'usability', name: 'Usability (Bedienbarkeit)', type: 'qualitativ',
    texts: {
      1: "weist eine sehr veraltete und verwirrende Benutzeroberfläche auf",
      2: "ist recht umständlich in der Einarbeitung",
      3: "bietet eine durchschnittlich gute Bedienbarkeit",
      4: "überzeugt durch ein klares und intuitives Design",
      5: "gilt als absoluter Vorreiter in Sachen Nutzerfreundlichkeit und ist sofort verständlich"
    }
  },
  {
    key: 'funktionsumfang', name: 'Funktionsumfang', type: 'quantitativ',
    texts: {
      1: "bietet nur die absoluten Basic-Funktionen an",
      2: "hat einen soliden, aber recht überschaubaren Funktionsumfang",
      3: "deckt exakt die angeforderten Standard-Funktionen ab",
      4: "verfügt über zahlreiche nützliche Zusatzpakete und Module",
      5: "lässt mit einem riesigen All-in-One-Funktionsumfang keine Wünsche offen"
    }
  },
  {
    key: 'schnittstellen', name: 'Schnittstellen & Integration', type: 'qualitativ',
    texts: {
      1: "bietet keinerlei vorgefertigte Schnittstellen",
      2: "unterstützt nur wenige grundlegende Integrationen wie einfachen Datei-Export",
      3: "verfügt über die wichtigsten Standard-Schnittstellen (CSV, XML)",
      4: "bietet eine gute Auswahl an Schnittstellen und REST-APIs",
      5: "lässt sich dank offener, hochmoderner API-Architektur nahtlos in jede Systemlandschaft integrieren"
    }
  }
];

function generateUtilityTask() {
  const providers = ["ShopTrade", "CommerceHub", "eSell Pro"];
  
  // pick 4 random criteria
  const selectedCriteria = [...CRITERIA_POOL].sort(() => 0.5 - Math.random()).slice(0, 4);
  
  // random weights summing to 100
  let weights = [0, 0, 0, 0];
  let remaining = 100;
  for (let i = 0; i < 3; i++) {
    const maxVal = remaining - ((3 - i) * 10);
    const weightRaw = Math.max(10, Math.floor((Math.random() * maxVal) / 5) * 5);
    weights[i] = weightRaw || 10;
    remaining -= weights[i];
  }
  weights[3] = remaining;
  weights.sort(() => 0.5 - Math.random());
  
  const criteriaData = selectedCriteria.map((c, i) => {
    return {
      ...c,
      weight: weights[i],
      scores: providers.map(() => Math.floor(Math.random() * 5) + 1)
    }
  });

  // Calculate master solution
  const masterSolution = {
    providers,
    criteria: criteriaData.map(c => ({
      name: c.name,
      type: c.type,
      weight: c.weight,
      scores: c.scores, // Array of points per provider
      partials: c.scores.map(s => round2((c.weight / 100) * s))
    })),
    totals: [0, 0, 0] // sums
  };

  masterSolution.criteria.forEach(c => {
    c.partials.forEach((partial, pIdx) => {
      masterSolution.totals[pIdx] += partial;
    });
  });

  let winnerIdx = 0;
  for (let i = 1; i < masterSolution.totals.length; i++) {
    if (masterSolution.totals[i] > masterSolution.totals[winnerIdx]) {
      winnerIdx = i;
    }
  }
  masterSolution.winner = providers[winnerIdx];

  // Build Scenario Text
  let text = `Für ein neues E-Commerce-Projekt steht die Auswahl einer passenden Software an. Es stehen drei Anbieter zur Auswahl: ${providers.join(', ')}.\n\n`;
  text += `Die Entscheidungsfindung soll über eine Nutzwertanalyse erfolgen. Im ProjektKickoff wurden folgende Gewichtungen festgelegt:\n`;
  
  criteriaData.forEach(c => {
    text += `Das Kriterium "${c.name}" (Typ: ${c.type}) fließt mit glatt ${c.weight} % in die spätere Bewertung ein.\n`;
  });

  text += `\nNach einer intensiven Marktrecherche ergeben sich folgende Bewertungen:\n\n`;
  
  providers.forEach((p, pIdx) => {
    text += `Bezüglich *${p}*:\n`;
    criteriaData.forEach(c => {
      text += `- Das System ${c.texts[c.scores[pIdx]]} (Wertung: ${c.scores[pIdx]} Punkte).\n`;
    });
    text += '\n';
  });
  
  // Note: add the "Vergessen Sie nicht..." just to add flavor
  text += `Bitte berechnen Sie die Einzel- sowie Gesamtnutzwerte und ermitteln Sie den optimalen Anbieter. Begründen Sie das Ergebnis kurz am Ende.`;

  return {
    providers,
    criteriaData,
    scenarioText: text,
    masterSolution
  };
}

try {
  console.log(generateUtilityTask());
} catch(e) {
  console.error("ERROR", e);
}
