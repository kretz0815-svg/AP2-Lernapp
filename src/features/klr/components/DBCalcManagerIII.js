const ROUND_FACTOR = 100;

class DBCalc3MathEngine {
  static round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * ROUND_FACTOR) / ROUND_FACTOR;
  }

  static randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randStep(min, max, step) {
    const steps = Math.floor((max - min) / step);
    return min + DBCalc3MathEngine.randInt(0, steps) * step;
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
    const normalized = DBCalc3MathEngine.normalizeLocaleNumber(raw);
    if (!normalized) return Number.NaN;
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : Number.NaN;
  }

  static formatMoney(value) {
    return `${DBCalc3MathEngine.round2(value).toFixed(2).replace('.', ',')} EUR`;
  }

  static compareField(field, actualRaw, expectedRaw) {
    if (field.mode === 'choice') {
      const actual = String(actualRaw || '').trim().toUpperCase();
      const expected = String(expectedRaw || '').trim().toUpperCase();
      return actual === expected;
    }

    if (field.mode === 'contains_all') {
      const haystack = String(actualRaw || '').toLowerCase();
      const needles = Array.isArray(expectedRaw) ? expectedRaw : [];
      return needles.every((needle) => haystack.includes(String(needle).toLowerCase()));
    }

    const actual = DBCalc3MathEngine.parseLocaleNumber(actualRaw);
    const expected = Number(expectedRaw);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    return Math.abs(actual - expected) <= (field.tolerance ?? 0.02);
  }

  static generateScenario() {
    const companies = ['Glöbenstern GmbH', 'Wolkenpfad Handels GmbH', 'Höhenquell Sortiment GmbH', 'Fjällkrone Equipment GmbH'];
    const products = ['Outdoor-Kochset X220', 'Gipfelkocher M320', 'Waldflamme K410', 'Bergpfad Cookset V500'];
    const successorProducts = ['Outdoor-Kochset X260', 'Gipfelkocher M360', 'Waldflamme K450', 'Bergpfad Cookset V560'];
    const idx = DBCalc3MathEngine.randInt(0, companies.length - 1);

    const qty = DBCalc3MathEngine.randStep(9000, 15000, 500);
    const salesPrice = DBCalc3MathEngine.randStep(72, 92, 1);
    const material = DBCalc3MathEngine.randStep(34, 42, 0.1);
    const varSales = DBCalc3MathEngine.randStep(5.6, 7.6, 0.1);
    const varPackaging = DBCalc3MathEngine.randStep(1.8, 3.1, 0.1);
    const variableTotal = DBCalc3MathEngine.round2(material + varSales + varPackaging);

    const fixProductPerUnit = DBCalc3MathEngine.randStep(6.5, 9.5, 0.1);
    const fixBereichYear = DBCalc3MathEngine.randStep(180000, 260000, 5000);
    const fixProductYear = DBCalc3MathEngine.round2(fixProductPerUnit * qty);
    const fixTotal = DBCalc3MathEngine.round2(fixBereichYear + fixProductYear);

    const db1Unit = DBCalc3MathEngine.round2(salesPrice - variableTotal);
    const db2Unit = DBCalc3MathEngine.round2(db1Unit - fixProductPerUnit);
    const fixBereichPerUnit = DBCalc3MathEngine.round2(fixBereichYear / qty);
    const db3Unit = DBCalc3MathEngine.round2(db2Unit - fixBereichPerUnit);

    const breakEvenQty = Math.ceil(fixTotal / db1Unit);
    const isEconomicAtPlan = qty >= breakEvenQty ? 'JA' : 'NEIN';

    const db3Total = DBCalc3MathEngine.round2(db3Unit * qty);
    const removableFix = DBCalc3MathEngine.randStep(Math.max(50000, Math.round(db3Total * 0.7)), Math.max(60000, Math.round(db3Total * 1.3)), 1000);
    const nonRemovableFix = DBCalc3MathEngine.round2(Math.max(20000, fixTotal - removableFix));
    const removeDecision = removableFix > db3Total ? 'JA' : 'NEIN';
    const removeReason = removeDecision === 'JA'
      ? 'Streichung kann sinnvoll sein: Einsparbare Fixkosten sind höher als der entfallende DB III gesamt.'
      : 'Nicht streichen: Der entfallende DB III gesamt ist höher als die einsparbaren Fixkosten.';

    const newPurchase = DBCalc3MathEngine.randStep(39, 48, 0.5);
    const handlingRate = DBCalc3MathEngine.randStep(24, 31, 1);
    const adminOverhead = DBCalc3MathEngine.randStep(3.8, 5.4, 0.1);
    const salesOverhead = DBCalc3MathEngine.randStep(2.8, 4.4, 0.1);
    const selfCost = DBCalc3MathEngine.round2(newPurchase + (newPurchase * handlingRate / 100) + adminOverhead + salesOverhead);

    const stochasticQuantity = DBCalc3MathEngine.randStep(2500, 4000, 250);

    const costClassRows = [
      { key: 'materialClass', label: `Wareneinsatz: ${DBCalc3MathEngine.formatMoney(material)} je Stück`, expected: 'V' },
      { key: 'packagingClass', label: `Verpackungskosten: ${DBCalc3MathEngine.formatMoney(varPackaging)} je Stück`, expected: 'V' },
      { key: 'storageClass', label: `Miete Lagerhalle: ${DBCalc3MathEngine.formatMoney(DBCalc3MathEngine.randStep(42000, 62000, 1000))} p.a.`, expected: 'F' },
      { key: 'marketingClass', label: `Marketingpauschale Sortiment: ${DBCalc3MathEngine.formatMoney(DBCalc3MathEngine.randStep(26000, 42000, 1000))} p.a.`, expected: 'F' },
      { key: 'shippingClass', label: `Versandkosten: ${DBCalc3MathEngine.formatMoney(DBCalc3MathEngine.randStep(3.4, 5.2, 0.1))} je Stück`, expected: 'V' },
      { key: 'deprClass', label: `Abschreibungen Maschinen: ${DBCalc3MathEngine.formatMoney(DBCalc3MathEngine.randStep(54000, 82000, 1000))} p.a.`, expected: 'F' },
    ];

    return {
      companyName: companies[idx],
      productName: products[idx],
      successorProductName: successorProducts[idx],
      qty,
      salesPrice,
      material,
      varSales,
      varPackaging,
      variableTotal,
      fixProductPerUnit,
      fixBereichYear,
      fixBereichPerUnit,
      fixProductYear,
      fixTotal,
      db1Unit,
      db2Unit,
      db3Unit,
      breakEvenQty,
      isEconomicAtPlan,
      db3Total,
      removableFix,
      nonRemovableFix,
      removeDecision,
      removeReason,
      newPurchase,
      handlingRate,
      adminOverhead,
      salesOverhead,
      selfCost,
      stochasticQuantity,
      costClassRows,
    };
  }
}

class DBCalc3UIRenderer {
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

      if (field.inputType === 'textarea') {
        return `
          <div class="dbc-line" style="grid-template-columns: 1fr;">
            <label class="dbc-label" for="dbc3-${level.id}-${field.key}">${index + 1}. ${field.label}</label>
            <textarea id="dbc3-${level.id}-${field.key}" class="dbc-input" name="${field.key}" rows="4" style="height:auto; padding:0.6rem;">${value}</textarea>
            <span class="dbc-status ${statusClass}" style="justify-self:start;">${statusText}</span>
          </div>
        `;
      }

      return `
        <div class="dbc-line">
          <label class="dbc-label" for="dbc3-${level.id}-${field.key}">${index + 1}. ${field.label}</label>
          <input id="dbc3-${level.id}-${field.key}" class="dbc-input" name="${field.key}" type="text" value="${value}" placeholder="${field.unit || '0,00'}" autocomplete="off" />
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

export class DBCalcManagerIII {
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
      data: DBCalc3MathEngine.generateScenario(),
    };

    this.levels = this.buildLevels();
  }

  buildLevels() {
    const F = DBCalc3MathEngine.formatMoney;
    return [
      {
        id: 1,
        title: '1. Deckungsbeitrag I, II und III',
        prompt: (d) => `Die ${d.companyName} prüft ${d.productName}. Gegeben: Verkaufspreis ${F(d.salesPrice)}, Wareneinsatz ${F(d.material)}, variable Vertriebskosten ${F(d.varSales)}, variable Verpackungskosten ${F(d.varPackaging)}, fixe Produktgemeinkosten ${F(d.fixProductPerUnit)} je Stück, fixe Bereichskosten ${F(d.fixBereichYear)} p.a., Absatz ${d.qty} Stück p.a..`,
        formulaHint: 'DB I = p - variable Kosten; DB II = DB I - fixe Produktkosten je Stück; DB III = DB II - fixe Bereichskosten je Stück',
        fields: [
          { key: 'db1Unit', label: 'DB I je Stück', unit: 'EUR', tolerance: 0.02 },
          { key: 'db2Unit', label: 'DB II je Stück', unit: 'EUR', tolerance: 0.02 },
          { key: 'db3Unit', label: 'DB III je Stück', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          db1Unit: DBCalc3MathEngine.round2(d.salesPrice - d.variableTotal),
          db2Unit: DBCalc3MathEngine.round2((d.salesPrice - d.variableTotal) - d.fixProductPerUnit),
          db3Unit: DBCalc3MathEngine.round2(((d.salesPrice - d.variableTotal) - d.fixProductPerUnit) - (d.fixBereichYear / d.qty)),
        }),
      },
      {
        id: 2,
        title: '2. Fixkosten und variable Kosten zuordnen',
        prompt: (d) => `Ordne mit F (fix) oder V (variabel): ${d.costClassRows.map((r) => r.label).join(' · ')}.`,
        formulaHint: 'Variable Kosten verändern sich mit der Menge. Fixkosten fallen unabhängig von der Menge an.',
        dependsOn: [1],
        dependencyHint: 'Kläre zuerst die Kostenbasis sauber, damit Folgeetappen stabil bleiben.',
        fields: (this.state.data.costClassRows || []).map((row) => ({
          key: row.key, label: row.label, unit: 'F oder V', mode: 'choice',
        })),
        solver: (d) => {
          const out = {};
          d.costClassRows.forEach((row) => { out[row.key] = row.expected; });
          return out;
        },
      },
      {
        id: 3,
        title: '3. Kurzfristige Preisuntergrenze',
        prompt: (d) => `Ein Großhändler fordert einen Sonderpreis für ${d.stochasticQuantity} Stück ${d.productName}.`,
        formulaHint: 'Kurzfristige Preisuntergrenze = variable Gesamtkosten je Stück',
        dependsOn: [2],
        dependencyHint: 'Kurzfristige PUG basiert direkt auf den variablen Kosten pro Stück.',
        fields: [
          { key: 'shortPug', label: 'Kurzfristige Preisuntergrenze', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          shortPug: DBCalc3MathEngine.round2(d.variableTotal),
        }),
      },
      {
        id: 4,
        title: '4. Langfristige Preisgrenze',
        prompt: (d) => `Langfristig müssen alle Kosten gedeckt sein: kurzfristige PUG aus Etappe 3, fixe Produktkosten ${F(d.fixProductPerUnit)} je Stück, fixe Bereichskosten ${F(d.fixBereichYear)} p.a., Absatz ${d.qty} Stück p.a..`,
        formulaHint: 'Langfristige Preisgrenze = kurzfristige PUG + fixe Produktkosten je Stück + fixe Bereichskosten je Stück',
        dependsOn: [3],
        dependencyHint: 'Langfristige Grenze setzt die kurzfristige PUG korrekt voraus.',
        fields: [
          { key: 'longPug', label: 'Langfristige Preisgrenze', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          longPug: DBCalc3MathEngine.round2(d.variableTotal + d.fixProductPerUnit + (d.fixBereichYear / d.qty)),
        }),
      },
      {
        id: 5,
        title: '5. Break-even-Analyse',
        prompt: (d) => `Gegeben: Verkaufspreis ${F(d.salesPrice)} je Stück, variable Gesamtkosten ${F(d.variableTotal)} je Stück, Fixkosten gesamt ${F(d.fixBereichYear)} + ${F(d.fixProductYear)} = ${F(d.fixTotal)}, geplanter Absatz ${d.qty} Stück.`,
        formulaHint: 'DB je Stück = p - variable Kosten; Break-even-Menge = Fixkosten gesamt / DB je Stück (aufgerundet)',
        dependsOn: [1, 4],
        dependencyHint: 'Break-even basiert auf korrekt berechnetem DB I je Stück.',
        fields: [
          { key: 'db1Unit', label: 'Deckungsbeitrag pro Stück', unit: 'EUR', tolerance: 0.02 },
          { key: 'breakEvenQty', label: 'Break-even-Menge', unit: 'Stück', tolerance: 0.5 },
          { key: 'isEconomicAtPlan', label: `Bei ${this.state.data.qty.toLocaleString('de-DE')} Stück wirtschaftlich? (JA/NEIN)`, unit: 'JA oder NEIN', mode: 'choice' },
        ],
        solver: (d) => ({
          db1Unit: DBCalc3MathEngine.round2(d.salesPrice - d.variableTotal),
          breakEvenQty: Math.ceil(d.fixTotal / d.db1Unit),
          isEconomicAtPlan: d.isEconomicAtPlan,
        }),
      },
      {
        id: 6,
        title: '6. Sortimentsentscheidung',
        prompt: (d) => `DB III je Stück aus Etappe 1, Absatz ${d.qty} Stück, nicht entfallende Fixkosten ${F(d.nonRemovableFix)}, entfallende Fixkosten ${F(d.removableFix)}.`,
        formulaHint: 'Entfallender DB III gesamt = DB III je Stück × Menge; Streichung sinnvoll wenn entfallende Fixkosten > entfallender DB III gesamt',
        dependsOn: [1, 5],
        dependencyHint: 'Nutze zuerst den korrekten DB III je Stück und den Planabsatz.',
        fields: [
          { key: 'db3Total', label: 'DB III gesamt', unit: 'EUR', tolerance: 0.02 },
          { key: 'removeDecision', label: 'Sortimentsstreichung wirtschaftlich sinnvoll? (JA/NEIN)', unit: 'JA oder NEIN', mode: 'choice' },
        ],
        solver: (d) => ({
          db3Total: DBCalc3MathEngine.round2(d.db3Unit * d.qty),
          removeDecision: d.removeDecision,
        }),
      },
      {
        id: 7,
        title: '7. Wirtschaftliche Bewertung',
        prompt: () => 'Formuliere eine kurze Bewertung zum Produkt. Nenne explizit: DB I, DB II, DB III, kurzfristige Preisuntergrenze, langfristige Preisgrenze, Break-even, Fixkosten, Sortimentsentscheidung.',
        formulaHint: 'Verknüpfe Kennzahlen und Entscheidung logisch: Beitrag, Grenzen, Risiko, Empfehlung.',
        dependsOn: [1, 3, 4, 5, 6],
        dependencyHint: 'Die Bewertung soll auf den vorherigen Kennzahlen beruhen.',
        fields: [
          { key: 'evaluation', label: 'Bewertungstext (mind. 2-3 Sätze)', inputType: 'textarea', mode: 'contains_all' },
        ],
        solver: () => ({
          evaluation: ['db i', 'db ii', 'db iii', 'kurzfrist', 'langfrist', 'break', 'fixkosten', 'sortiment'],
        }),
      },
      {
        id: 8,
        title: '8. Handelskalkulation: Einstandspreis → Selbstkosten',
        prompt: (d) => `Für das Nachfolgemodell ${d.successorProductName}: Einstandspreis ${F(d.newPurchase)}, Handlungskostenzuschlag ${d.handlingRate.toFixed(0)} %, Verwaltungsgemeinkosten ${F(d.adminOverhead)} je Stück, Vertriebsgemeinkosten ${F(d.salesOverhead)} je Stück.`,
        formulaHint: 'Selbstkosten = Einstandspreis + Handlungskostenbetrag + Verwaltungsgemeinkosten + Vertriebsgemeinkosten',
        dependsOn: [7],
        dependencyHint: 'Nutze die vollständige Zuschlagsreihenfolge.',
        fields: [
          { key: 'selfCost', label: 'Selbstkosten pro Stück', unit: 'EUR', tolerance: 0.02 },
        ],
        solver: (d) => ({
          selfCost: DBCalc3MathEngine.round2(d.newPurchase + (d.newPurchase * d.handlingRate / 100) + d.adminOverhead + d.salesOverhead),
        }),
      },
    ];
  }

  mount() {
    const container = this.containerEl || document.getElementById(this.containerId);
    if (!container) throw new Error(`Container #${this.containerId} not found.`);

    this.container = container;
    DBCalc3UIRenderer.renderShell(
      container,
      'DB I, DB II & DB III Sortimentssteuerung',
      `${this.state.data.companyName} · Produkt: ${this.state.data.productName}`
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
      data: DBCalc3MathEngine.generateScenario(),
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
      const level = this.getCurrentLevel();
      this.state.userInputs[level.id] = this.state.userInputs[level.id] || {};
      this.state.userInputs[level.id][input.name] = input.value;
      if (this.state.lastValidation?.levelId === level.id) this.state.lastValidation.isDirty = true;
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
      const ok = DBCalc3MathEngine.compareField(field, entered[field.key], expected[field.key]);
      fieldChecks[field.key] = ok;
      if (!ok) allCorrect = false;
    }

    const followHint = this.buildFollowErrorHint(level);
    const hasFollowError = Boolean(followHint);
    const validated = allCorrect && !hasFollowError;

    if (!validated) {
      this.state.failedAttempts[level.id] = (this.state.failedAttempts[level.id] || 0) + 1;
      if (this.state.failedAttempts[level.id] >= 3) this.state.showFormula[level.id] = true;
    }

    const hasTextCheck = level.fields.some((f) => f.mode === 'contains_all');
    this.state.lastValidation = {
      levelId: level.id,
      fieldChecks,
      allCorrect,
      hasFollowError,
      isDirty: false,
      hintMessage: followHint || (validated
        ? (level.id === 6 ? `${this.state.data.removeReason} Alle Eingaben korrekt.` : 'Alle Eingaben korrekt. Sehr stark.')
        : hasTextCheck ? 'Bitte alle geforderten Begriffe im Text nennen.' : 'Bitte Werte prüfen. Nutze kaufmännische Rundung auf 2 Dezimalstellen.'),
    };

    this.state.levelResults[level.id] = validated;
    if (validated && !this.state.scored[level.id]) {
      this.state.points += 10;
      this.state.scored[level.id] = true;
    }

    if (this.onLearningEvent) {
      this.onLearningEvent({
        mode: 'cost_calc_module',
        questionId: `db123_stage_${level.id}`,
        questionText: `${level.title}: ${String(level.prompt(this.state.data)).slice(0, 170)}`,
        correct: validated,
        userAnswer: JSON.stringify(entered).slice(0, 240),
        expectedAnswer: 'Alle Felder korrekt und ohne Folgefehler.',
        topic: 'DB I, DB II & DB III',
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
          ${DBCalc3UIRenderer.buildReadonlyRows(done, doneValues)}
        </div>
      `;
    }).join('');

    const rows = DBCalc3UIRenderer.buildEditableRows(level, currentValues, validation);
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

export function bootstrapDBCalcManagerIII(options = {}) {
  const module = new DBCalcManagerIII(options);
  module.mount();
  return module;
}

if (typeof window !== 'undefined') {
  window.DBCalcManagerIII = DBCalcManagerIII;
  window.bootstrapDBCalcManagerIII = bootstrapDBCalcManagerIII;
}
