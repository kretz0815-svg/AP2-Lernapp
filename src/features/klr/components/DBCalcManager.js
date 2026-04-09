const ROUND_FACTOR = 100;

class DBCalcMathEngine {
  static round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * ROUND_FACTOR) / ROUND_FACTOR;
  }

  static randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randStep(min, max, step) {
    const steps = Math.floor((max - min) / step);
    return min + DBCalcMathEngine.randInt(0, steps) * step;
  }

  static normalizeLocaleNumber(raw) {
    if (raw === null || raw === undefined) return '';
    let normalized = String(raw)
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^0-9,.-]/g, '');

    if (!normalized) return '';

    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';

    if (lastComma !== -1 || lastDot !== -1) {
      const thousandsSeparator = decimalSeparator === ',' ? /\./g : /,/g;
      normalized = normalized.replace(thousandsSeparator, '');
      if (decimalSeparator === ',') normalized = normalized.replace(',', '.');
    }

    normalized = normalized.replace(/(?!^)-/g, '');
    return normalized;
  }

  static parseLocaleNumber(raw) {
    const normalized = DBCalcMathEngine.normalizeLocaleNumber(raw);
    if (!normalized) return Number.NaN;
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : Number.NaN;
  }

  static formatMoney(value) {
    return `${DBCalcMathEngine.round2(value).toFixed(2).replace('.', ',')} EUR`;
  }

  static formatPercent(value) {
    return `${DBCalcMathEngine.round2(value).toFixed(2).replace('.', ',')} %`;
  }

  static generateScenario() {
    const companies = ['Glöbenstern GmbH', 'Fjällkrone GmbH', 'Wolkenpfad Handels GmbH', 'Höhenquell GmbH'];
    const productNamesA = ['Nordlicht-Uhr A', 'Bergblick-Uhr A', 'Waldspur-Uhr A', 'Sturmkamm-Uhr A'];
    const productNamesB = ['Nordlicht-Uhr B', 'Bergblick-Uhr B', 'Waldspur-Uhr B', 'Sturmkamm-Uhr B'];
    const categories = ['Outdoor-Zeitmesser', 'Bergsport-Zubehör', 'Trekking-Accessoires', 'Abenteuer-Equipment'];
    const idx = DBCalcMathEngine.randInt(0, companies.length - 1);

    const qtyA = DBCalcMathEngine.randStep(500, 900, 50);
    const qtyB = DBCalcMathEngine.randStep(300, 700, 50);

    const pA = DBCalcMathEngine.randStep(68, 96, 1);
    const pB = DBCalcMathEngine.randStep(98, 148, 1);
    const kvA = DBCalcMathEngine.randStep(28, Math.max(29, pA - 14), 1);
    const kvB = DBCalcMathEngine.randStep(45, Math.max(46, pB - 20), 1);

    const kfixErzA = DBCalcMathEngine.randStep(4500, 9500, 500);
    const kfixErzB = DBCalcMathEngine.randStep(7000, 13000, 500);
    const kfixUnt = DBCalcMathEngine.randStep(14000, 32000, 1000);

    const db1UnitA = DBCalcMathEngine.round2(pA - kvA);
    const db1UnitB = DBCalcMathEngine.round2(pB - kvB);
    const db1TotalA = DBCalcMathEngine.round2(db1UnitA * qtyA);
    const db1TotalB = DBCalcMathEngine.round2(db1UnitB * qtyB);
    const db2A = DBCalcMathEngine.round2(db1TotalA - kfixErzA);
    const db2B = DBCalcMathEngine.round2(db1TotalB - kfixErzB);
    const operatingResult = DBCalcMathEngine.round2(db2A + db2B - kfixUnt);

    const longPugA = DBCalcMathEngine.round2(kvA + (kfixErzA / qtyA) + (kfixUnt / (qtyA + qtyB)));
    const longPugB = DBCalcMathEngine.round2(kvB + (kfixErzB / qtyB) + (kfixUnt / (qtyA + qtyB)));

    const targetQtyB = DBCalcMathEngine.randStep(Math.max(200, qtyB - 150), qtyB + 200, 50);
    const solutionPriceB = DBCalcMathEngine.randStep(kvB + 8, kvB + 30, 1);
    const knownContributionA = DBCalcMathEngine.round2((pA - kvA) * qtyA);
    const targetProfit = DBCalcMathEngine.round2(
      knownContributionA
      + ((solutionPriceB - kvB) * targetQtyB)
      - kfixErzA
      - kfixErzB
      - kfixUnt
    );

    const engpassA = DBCalcMathEngine.randStep(8, 20, 1);
    const engpassB = DBCalcMathEngine.randStep(10, 24, 1);
    const relDbA = DBCalcMathEngine.round2(db1UnitA / engpassA);
    const relDbB = DBCalcMathEngine.round2(db1UnitB / engpassB);
    const priority = relDbA >= relDbB ? 'A' : 'B';

    return {
      companyName: companies[idx],
      categoryName: categories[idx],
      productAName: productNamesA[idx],
      productBName: productNamesB[idx],
      qtyA,
      qtyB,
      pA,
      pB,
      kvA,
      kvB,
      kfixErzA,
      kfixErzB,
      kfixUnt,
      db1UnitA,
      db1UnitB,
      db1TotalA,
      db1TotalB,
      db2A,
      db2B,
      operatingResult,
      longPugA,
      longPugB,
      targetQtyB,
      targetProfit,
      solutionPriceB,
      engpassA,
      engpassB,
      relDbA,
      relDbB,
      priority,
    };
  }

  static compareField(field, actualRaw, expectedRaw) {
    if (field.mode === 'choice') {
      const actual = String(actualRaw || '').trim().toUpperCase();
      const expected = String(expectedRaw).trim().toUpperCase();
      const accepted = field.choiceAliases?.[expected]
        ? field.choiceAliases[expected].map((entry) => String(entry).trim().toUpperCase())
        : (Array.isArray(field.accepted) ? field.accepted : [expected]);
      return accepted.includes(actual);
    }

    const actual = DBCalcMathEngine.parseLocaleNumber(actualRaw);
    const expected = Number(expectedRaw);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    return Math.abs(actual - expected) <= (field.tolerance ?? 0.02);
  }
}

class DBCalcUIRenderer {
  static renderShell(container, title, contextLine) {
    container.innerHTML = `
      <section class="dbc-shell" aria-live="polite">
        <header class="dbc-header">
          <p class="dbc-kicker">DB-Manager</p>
          <h2 class="dbc-title">${title}</h2>
          <p class="dbc-context">${contextLine}</p>
          <div class="dbc-progress-wrap">
            <div class="dbc-progress-bar" data-role="progress-bar"></div>
          </div>
          <p class="dbc-progress-label" data-role="progress-label"></p>
        </header>

        <article class="dbc-card" data-role="task-card"></article>

        <footer class="dbc-footer">
          <div class="dbc-score" data-role="score"></div>
          <div class="dbc-actions">
            <button type="button" class="dbc-btn dbc-btn-primary" data-action="check">Prüfen</button>
            <button type="button" class="dbc-btn dbc-btn-secondary" data-action="next">Weiter</button>
            <button type="button" class="dbc-btn dbc-btn-secondary" data-action="formula" data-role="formula-btn">Formel anzeigen</button>
            <button type="button" class="dbc-btn dbc-btn-ghost" data-action="restart">Neu starten</button>
          </div>
          <p class="dbc-action-hint" data-role="action-hint">Erst prüfen, dann weiter.</p>
        </footer>
      </section>
    `;
  }

  static buildEditableRows(level, values, validation) {
    return level.fields.map((field, index) => {
      const value = values[field.key] ?? '';
      const status = validation?.fieldChecks?.[field.key];
      const statusText = status === undefined ? '' : status ? 'OK' : 'Fehler';
      const statusClass = status === undefined ? '' : status ? 'dbc-ok' : 'dbc-bad';
      const placeholder = field.mode === 'choice' ? (field.unit || 'A oder B') : (field.unit || '0,00');
      return `
        <div class="dbc-line">
          <label class="dbc-label" for="dbc-${level.id}-${field.key}">${index + 1}. ${field.label}</label>
          <input
            id="dbc-${level.id}-${field.key}"
            class="dbc-input"
            name="${field.key}"
            type="text"
            value="${value}"
            placeholder="${placeholder}"
            autocomplete="off"
            aria-label="${field.ariaLabel || field.label}"
          />
          <span class="dbc-status ${statusClass}">${statusText}</span>
        </div>
      `;
    }).join('');
  }

  static buildReadonlyRows(level, values) {
    return level.fields.map((field, index) => {
      const value = values[field.key] ?? '—';
      return `
        <div class="dbc-line dbc-line-readonly">
          <span class="dbc-label">${index + 1}. ${field.label}</span>
          <div class="dbc-static">${value}</div>
          <span class="dbc-status dbc-ok">OK</span>
        </div>
      `;
    }).join('');
  }
}

export class DBCalcManager {
  constructor(options = {}) {
    this.containerId = options.containerId || 'calc-boss-module';
    this.containerEl = options.containerEl || null;
    this.onLearningEvent = typeof options.onLearningEvent === 'function' ? options.onLearningEvent : null;

    this.state = {
      levelIndex: 0,
      points: 0,
      scored: {},
      userInputs: {},
      levelResults: {},
      failedAttempts: {},
      showFormula: {},
      lastValidation: null,
      data: DBCalcMathEngine.generateScenario(),
    };

    this.levels = this.buildLevels();
  }

  buildLevels() {
    const F = DBCalcMathEngine.formatMoney;
    const P = DBCalcMathEngine.formatPercent;

    return [
      {
        id: 1,
        title: '1. DB I pro Stück (Produkte A und B)',
        prompt: (d) => `${d.companyName} (${d.categoryName}) produziert ${d.productAName} und ${d.productBName}. Gegeben: pA ${F(d.pA)}, kvA ${F(d.kvA)}, pB ${F(d.pB)}, kvB ${F(d.kvB)}.`,
        formulaHint: 'DB I je Stück = Verkaufspreis p - variable Stückkosten kv',
        fields: [
          { key: 'db1UnitA', label: 'DB I je Stück Produkt A', unit: 'EUR', tolerance: 0.02 },
          { key: 'db1UnitB', label: 'DB I je Stück Produkt B', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          db1UnitA: DBCalcMathEngine.round2(d.pA - d.kvA),
          db1UnitB: DBCalcMathEngine.round2(d.pB - d.kvB),
        }),
      },
      {
        id: 2,
        title: '2. Gesamt-DB I (Produkte A und B)',
        prompt: (d) => `Absatzmengen: A ${d.qtyA} Stück, B ${d.qtyB} Stück. Nutze die DB I je Stück aus Etappe 1.`,
        formulaHint: 'Gesamt-DB I = DB I je Stück × Absatzmenge',
        dependsOn: [1],
        dependencyHint: 'Prüfe zuerst Etappe 1: Ohne korrekten DB I je Stück entstehen Folgefehler.',
        fields: [
          { key: 'db1TotalA', label: 'Gesamt-DB I Produkt A', unit: 'EUR', tolerance: 0.02 },
          { key: 'db1TotalB', label: 'Gesamt-DB I Produkt B', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          db1TotalA: DBCalcMathEngine.round2((d.pA - d.kvA) * d.qtyA),
          db1TotalB: DBCalcMathEngine.round2((d.pB - d.kvB) * d.qtyB),
        }),
      },
      {
        id: 3,
        title: '3. DB II je Produkt',
        prompt: (d) => `Erzeugnisfixe Kosten: A ${F(d.kfixErzA)}, B ${F(d.kfixErzB)}.`,
        formulaHint: 'DB II = Gesamt-DB I - erzeugnisfixe Kosten',
        dependsOn: [2],
        dependencyHint: 'DB II ist erst belastbar, wenn die Gesamt-DB I-Werte korrekt sind.',
        fields: [
          { key: 'db2A', label: 'DB II Produkt A', unit: 'EUR', tolerance: 0.02 },
          { key: 'db2B', label: 'DB II Produkt B', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          db2A: DBCalcMathEngine.round2(((d.pA - d.kvA) * d.qtyA) - d.kfixErzA),
          db2B: DBCalcMathEngine.round2(((d.pB - d.kvB) * d.qtyB) - d.kfixErzB),
        }),
      },
      {
        id: 4,
        title: '4. Betriebsergebnis',
        prompt: (d) => `Unternehmensfixe Kosten gesamt: ${F(d.kfixUnt)}.`,
        formulaHint: 'Betriebsergebnis = Summe DB II - unternehmensfixe Kosten',
        dependsOn: [3],
        dependencyHint: 'Erst DB II korrekt abschließen, dann Betriebsergebnis rechnen.',
        fields: [
          { key: 'operatingResult', label: 'Betriebsergebnis gesamt', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          operatingResult: DBCalcMathEngine.round2(
            ((((d.pA - d.kvA) * d.qtyA) - d.kfixErzA) + (((d.pB - d.kvB) * d.qtyB) - d.kfixErzB)) - d.kfixUnt
          ),
        }),
      },
      {
        id: 5,
        title: '5. Kurzfristige Preisuntergrenze',
        prompt: () => 'Bestimme die kurzfristige PUG für beide Produkte.',
        formulaHint: 'Kurzfristige PUG = variable Stückkosten kv',
        dependsOn: [1],
        dependencyHint: 'Kurzfristige PUG hängt direkt an den variablen Kosten je Stück.',
        fields: [
          { key: 'shortPugA', label: 'Kurzfristige PUG Produkt A', unit: 'EUR', tolerance: 0.02 },
          { key: 'shortPugB', label: 'Kurzfristige PUG Produkt B', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          shortPugA: DBCalcMathEngine.round2(d.kvA),
          shortPugB: DBCalcMathEngine.round2(d.kvB),
        }),
      },
      {
        id: 6,
        title: '6. Langfristige Preisuntergrenze (Vollkostenbasis)',
        prompt: (d) => `Vollkostenansatz mit erzeugnisfixen Kosten und anteiligen unternehmensfixen Kosten. Gesamtabsatz: ${d.qtyA + d.qtyB} Stück.`,
        formulaHint: 'Langfristige PUG = kv + (erzeugnisfixe Kosten / Menge) + (unternehmensfixe Kosten / Gesamtmenge)',
        dependsOn: [5],
        dependencyHint: 'Kurzfristige PUG zuerst sichern, dann Vollkostenaufschlag ergänzen.',
        fields: [
          { key: 'longPugA', label: 'Langfristige PUG Produkt A', unit: 'EUR', tolerance: 0.02 },
          { key: 'longPugB', label: 'Langfristige PUG Produkt B', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          longPugA: DBCalcMathEngine.round2(d.kvA + (d.kfixErzA / d.qtyA) + (d.kfixUnt / (d.qtyA + d.qtyB))),
          longPugB: DBCalcMathEngine.round2(d.kvB + (d.kfixErzB / d.qtyB) + (d.kfixUnt / (d.qtyA + d.qtyB))),
        }),
      },
      {
        id: 7,
        title: '7. Zielpreis-Kalkulation (Rückwärtsrechnung)',
        prompt: (d) => `Für ${d.productBName}: Bei geplanter Menge ${d.targetQtyB} Stück soll ein Betriebsergebnis von ${F(d.targetProfit)} erreicht werden. Welcher Preis p je Stück ist für Produkt B nötig?`,
        formulaHint: 'pB = kvB + (Zielgewinn + Kfix_erzA + Kfix_erzB + Kfix_unt - DB_A) / Menge_B',
        dependsOn: [4],
        dependencyHint: 'Für die Rückwärtsrechnung brauchst du die Struktur aus DB I/II und Betriebsergebnis.',
        fields: [
          { key: 'targetPriceB', label: 'Erforderlicher Preis p für Produkt B', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => {
          const dbA = (d.pA - d.kvA) * d.qtyA;
          const neededContributionB = d.targetProfit + d.kfixErzA + d.kfixErzB + d.kfixUnt - dbA;
          return {
            targetPriceB: DBCalcMathEngine.round2(d.kvB + (neededContributionB / d.targetQtyB)),
          };
        },
      },
      {
        id: 8,
        title: '8. Engpass-Priorisierung (relativer DB)',
        prompt: (d) => `${d.productAName} benötigt ${d.engpassA} Min/Einheit und ${d.productBName} benötigt ${d.engpassB} Min/Einheit am Engpass. Berechne den relativen DB und entscheide, welches Produkt priorisiert wird.`,
        formulaHint: 'Relativer DB = DB I je Stück / Engpasseinheit',
        dependsOn: [1],
        dependencyHint: 'Der relative DB baut auf korrekt berechnetem DB I je Stück auf.',
        fields: [
          { key: 'relDbA', label: 'Relativer DB Produkt A', unit: 'EUR/Min', tolerance: 0.02 },
          { key: 'relDbB', label: 'Relativer DB Produkt B', unit: 'EUR/Min', tolerance: 0.02 },
          {
            key: 'priority',
            label: 'Priorität bei Engpass (A oder B)',
            unit: 'A oder B',
            mode: 'choice',
            choiceAliases: {
              A: ['A', 'PRODUKT A', 'TYP A'],
              B: ['B', 'PRODUKT B', 'TYP B'],
            },
          },
        ],
        solver: (d) => ({
          relDbA: DBCalcMathEngine.round2((d.pA - d.kvA) / d.engpassA),
          relDbB: DBCalcMathEngine.round2((d.pB - d.kvB) / d.engpassB),
          priority: d.priority,
        }),
      },
    ];
  }

  mount() {
    const container = this.containerEl || document.getElementById(this.containerId);
    if (!container) throw new Error(`Container #${this.containerId} not found.`);

    this.container = container;
    DBCalcUIRenderer.renderShell(
      container,
      'DB I & DB II Fixkostendeckungsrechnung',
      `${this.state.data.companyName} · ${this.state.data.categoryName}`
    );

    this.progressBar = container.querySelector('[data-role="progress-bar"]');
    this.progressLabel = container.querySelector('[data-role="progress-label"]');
    this.scoreEl = container.querySelector('[data-role="score"]');
    this.taskCard = container.querySelector('[data-role="task-card"]');
    this.actionHintEl = container.querySelector('[data-role="action-hint"]');
    this.nextBtn = container.querySelector('[data-action="next"]');
    this.formulaBtn = container.querySelector('[data-role="formula-btn"]');

    this.bindActions();
    this.renderLevel();
  }

  reset() {
    this.state = {
      levelIndex: 0,
      points: 0,
      scored: {},
      userInputs: {},
      levelResults: {},
      failedAttempts: {},
      showFormula: {},
      lastValidation: null,
      data: DBCalcMathEngine.generateScenario(),
    };
    this.levels = this.buildLevels();
    this.renderLevel();
  }

  bindActions() {
    this.container.addEventListener('click', (event) => {
      const action = event.target?.dataset?.action;
      if (action === 'check') this.validateCurrentLevel();
      if (action === 'next') this.nextLevel();
      if (action === 'restart') this.reset();
      if (action === 'formula') this.revealFormulaHint();
    });

    this.container.addEventListener('input', (event) => {
      const input = event.target;
      if (!input.matches('.dbc-input')) return;
      const level = this.levels[this.state.levelIndex];
      this.state.userInputs[level.id] = this.state.userInputs[level.id] || {};
      this.state.userInputs[level.id][input.name] = input.value;

      if (this.state.lastValidation?.levelId === level.id) {
        this.state.lastValidation.isDirty = true;
      }
      this.updateActionState();
    }, true);
  }

  getCurrentLevel() {
    return this.levels[this.state.levelIndex];
  }

  buildFollowErrorHint(level) {
    if (!level.dependsOn || level.dependsOn.length === 0) return '';
    const invalid = level.dependsOn.filter((id) => this.state.levelResults[id] === false);
    if (invalid.length === 0) return '';
    return `Folgefehler-Hinweis: Vorstufe ${invalid.join(', ')} ist noch falsch. ${level.dependencyHint || ''}`;
  }

  canProceed() {
    const level = this.getCurrentLevel();
    const v = this.state.lastValidation;
    if (!v) return false;
    if (v.levelId !== level.id) return false;
    if (v.isDirty) return false;
    return v.allCorrect && !v.hasFollowError;
  }

  revealFormulaHint() {
    const level = this.getCurrentLevel();
    this.state.showFormula[level.id] = true;
    this.renderLevel();
  }

  validateCurrentLevel() {
    const level = this.getCurrentLevel();
    const entered = this.state.userInputs[level.id] || {};
    const expected = level.solver(this.state.data, this.state);

    const fieldChecks = {};
    let allCorrect = true;
    for (const field of level.fields) {
      const ok = DBCalcMathEngine.compareField(field, entered[field.key], expected[field.key]);
      fieldChecks[field.key] = ok;
      if (!ok) allCorrect = false;
    }

    const followHint = this.buildFollowErrorHint(level);
    const hasFollowError = Boolean(followHint);
    const validated = allCorrect && !hasFollowError;

    if (!validated) {
      this.state.failedAttempts[level.id] = (this.state.failedAttempts[level.id] || 0) + 1;
      if (this.state.failedAttempts[level.id] >= 3) {
        this.state.showFormula[level.id] = true;
      }
    }

    this.state.lastValidation = {
      levelId: level.id,
      fieldChecks,
      allCorrect,
      hasFollowError,
      isDirty: false,
      hintMessage: followHint || (validated
        ? 'Alle Eingaben korrekt. Sehr stark.'
        : 'Bitte Werte prüfen. Nutze kaufmännische Rundung auf 2 Dezimalstellen.'),
    };

    this.state.levelResults[level.id] = validated;

    if (validated && !this.state.scored[level.id]) {
      this.state.points += 10;
      this.state.scored[level.id] = true;
    }

    if (this.onLearningEvent) {
      this.onLearningEvent({
        mode: 'cost_calc_module',
        questionId: `db_calc_stage_${level.id}`,
        questionText: `${level.title}: ${String(level.prompt(this.state.data)).slice(0, 180)}`,
        correct: validated,
        userAnswer: JSON.stringify(entered).slice(0, 240),
        expectedAnswer: 'Alle Felder korrekt und ohne Folgefehler.',
        topic: 'DB I & DB II Fixkostendeckungsrechnung',
      });
    }

    this.renderLevel();
  }

  nextLevel() {
    if (!this.canProceed()) {
      const level = this.getCurrentLevel();
      this.state.lastValidation = {
        levelId: level.id,
        fieldChecks: this.state.lastValidation?.fieldChecks || {},
        allCorrect: this.state.lastValidation?.allCorrect || false,
        hasFollowError: this.state.lastValidation?.hasFollowError || false,
        isDirty: this.state.lastValidation?.isDirty || false,
        hintMessage: this.state.lastValidation?.hintMessage || 'Bitte zuerst prüfen und korrekt lösen.',
      };
      this.renderLevel();
      return;
    }

    if (this.state.levelIndex < this.levels.length - 1) {
      this.state.levelIndex += 1;
      this.state.lastValidation = null;
      this.renderLevel();
      return;
    }

    this.state.lastValidation = {
      levelId: this.getCurrentLevel().id,
      fieldChecks: {},
      allCorrect: true,
      hasFollowError: false,
      isDirty: false,
      hintMessage: `Modul abgeschlossen. Endstand: ${this.state.points} Punkte.`,
    };
    this.renderLevel();
  }

  renderLevel() {
    const level = this.getCurrentLevel();
    const currentValues = this.state.userInputs[level.id] || {};
    const validation = this.state.lastValidation;

    const previous = this.levels.slice(0, this.state.levelIndex).map((done) => {
      const doneValues = this.state.userInputs[done.id] || {};
      return `
        <div class="dbc-stage dbc-stage-previous">
          <div class="dbc-stage-head">
            <h3>${done.title}</h3>
            <p>${done.prompt(this.state.data)}</p>
          </div>
          ${DBCalcUIRenderer.buildReadonlyRows(done, doneValues)}
        </div>
      `;
    }).join('');

    const rows = DBCalcUIRenderer.buildEditableRows(level, currentValues, validation);
    const hintBox = validation?.hintMessage ? `<div class="dbc-hint">${validation.hintMessage}</div>` : '';
    const formulaVisible = Boolean(this.state.showFormula[level.id]);
    const formulaBox = formulaVisible ? `<div class="dbc-formula">${level.formulaHint}</div>` : '';

    this.taskCard.innerHTML = `
      <div class="dbc-stage-stack">
        ${previous}
        <div class="dbc-stage dbc-stage-current">
          <div class="dbc-stage-head">
            <h3>${level.title}</h3>
            <p>${level.prompt(this.state.data)}</p>
          </div>
          ${rows}
          ${hintBox}
          ${formulaBox}
        </div>
      </div>
    `;

    const progress = ((this.state.levelIndex + 1) / this.levels.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.progressLabel.textContent = `Etappe ${this.state.levelIndex + 1} / ${this.levels.length}`;
    this.scoreEl.textContent = `Punkte: ${this.state.points}`;

    this.updateActionState();
  }

  updateActionState() {
    const level = this.getCurrentLevel();
    const canProceed = this.canProceed();
    this.nextBtn.disabled = !canProceed;

    if (canProceed) {
      this.actionHintEl.textContent = 'Etappe geprüft. Du kannst jetzt weiter.';
    } else if (!this.state.lastValidation || this.state.lastValidation.levelId !== level.id) {
      this.actionHintEl.textContent = 'Erst prüfen, dann weiter.';
    } else if (this.state.lastValidation.isDirty) {
      this.actionHintEl.textContent = 'Eingabe geändert: bitte erneut prüfen.';
    } else if (this.state.lastValidation.hasFollowError) {
      this.actionHintEl.textContent = 'Vorstufe korrigieren: Folgefehler blockiert diese Etappe.';
    } else {
      this.actionHintEl.textContent = 'Bitte alle Felder korrekt lösen.';
    }

    const showFormulaBtn = (this.state.failedAttempts[level.id] || 0) >= 3;
    this.formulaBtn.style.display = showFormulaBtn ? 'inline-flex' : 'none';
  }
}

export function bootstrapDBCalcManager(options = {}) {
  const module = new DBCalcManager(options);
  module.mount();
  return module;
}

if (typeof window !== 'undefined') {
  window.DBCalcManager = DBCalcManager;
  window.bootstrapDBCalcManager = bootstrapDBCalcManager;
}
