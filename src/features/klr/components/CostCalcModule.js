const ROUND_FACTOR = 100;

function commercialRound(value) {
  return Math.round((Number(value) + Number.EPSILON) * ROUND_FACTOR) / ROUND_FACTOR;
}

function normalizeLocaleNumber(raw) {
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
    if (decimalSeparator === ',') {
      normalized = normalized.replace(',', '.');
    }
  }

  normalized = normalized.replace(/(?!^)-/g, '');
  return normalized;
}

function parseLocaleNumber(raw) {
  const normalized = normalizeLocaleNumber(raw);
  if (!normalized) return Number.NaN;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

function formatMoney(value) {
  return `${commercialRound(value).toFixed(2).replace('.', ',')} EUR`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function compareValues(actual, expected, tolerance, mode) {
  if (mode === 'choice') {
    return String(actual || '').trim().toUpperCase() === String(expected).trim().toUpperCase();
  }

  if (mode === 'contains_all') {
    const haystack = String(actual || '').toLowerCase();
    const needles = Array.isArray(expected) ? expected : [];
    return needles.every((needle) => haystack.includes(String(needle).toLowerCase()));
  }

  if (mode === 'contains_any') {
    const haystack = String(actual || '').toLowerCase();
    const needles = Array.isArray(expected) ? expected : [];
    return needles.some((needle) => haystack.includes(String(needle).toLowerCase()));
  }

  const a = Number(actual);
  const e = Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(e)) return false;
  return Math.abs(a - e) <= tolerance;
}

function generateVariantNaming() {
  const companies = ['Bergfuchs GmbH', 'Nordwald Märkte GmbH', 'Felsfeder Handel GmbH', 'Höhenpfad Outfitters GmbH'];
  const categoryNames = ['Outdoor-Ausrüstung', 'Trekkingbedarf', 'Bergsportzubehör', 'Naturausrüstung'];

  const idx = randInt(0, companies.length - 1);
  return {
    companyName: companies[idx],
    categoryName: categoryNames[idx],
  };
}

function generateConsistentData() {
  const naming = generateVariantNaming();

  const profit = 120000;
  const equity = 800000;
  const revenue = 2400000;
  const cashBank = 40000;
  const shortTermLiabilities = 150000;
  const receivables = 80000;

  const ekRent = commercialRound((profit / equity) * 100);
  const umsatzRent = commercialRound((profit / revenue) * 100);
  const liq1 = commercialRound((cashBank / shortTermLiabilities) * 100);
  const liq2 = commercialRound(((cashBank + receivables) / shortTermLiabilities) * 100);

  return {
    ...naming,
    scenarioRole: 'Junior-Controller',
    profit,
    equity,
    revenue,
    cashBank,
    shortTermLiabilities,
    receivables,
    ekRent,
    umsatzRent,
    liq1,
    liq2,
  };
}

export class CostCalcModule {
  constructor(options = {}) {
    this.containerId = options.containerId || 'calc-boss-module';
    this.containerEl = options.containerEl || null;
    this.state = {
      currentTask: 0,
      points: 0,
      scoredTasks: {},
      userInputs: {},
      taskResults: {},
      lastValidation: null,
      data: generateConsistentData(),
    };

    this.tasks = this.createTasks();
  }

  mount() {
    const container = this.containerEl || document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Container #${this.containerId} not found.`);
    }

    this.container = container;
    this.renderShell();
    this.bindGlobalActions();
    this.renderTask();
  }

  reset() {
    this.state = {
      currentTask: 0,
      points: 0,
      scoredTasks: {},
      userInputs: {},
      taskResults: {},
      lastValidation: null,
      data: generateConsistentData(),
    };
    this.renderTask();
  }

  createTasks() {
    return [
      {
        id: 1,
        title: '1. Die Basis: Rentabilitaeten berechnen',
        prompt: (ctx) => `Szenario Jahresabschluss: Die ${ctx.companyName} (${ctx.categoryName}) setzt dich als ${ctx.scenarioRole} ein. Berechne die Eigenkapital- und Umsatzrentabilitaet. Runde auf zwei Nachkommastellen. Daten: Gewinn ${formatMoney(ctx.profit)}, Eigenkapital ${formatMoney(ctx.equity)}, Umsatz ${formatMoney(ctx.revenue)}.`,
        fields: [
          { key: 'ek_rent', label: 'Eigenkapitalrentabilitaet', unit: '%', tolerance: 0.02, ariaLabel: 'Eigenkapitalrentabilitaet in Prozent' },
          { key: 'umsatz_rent', label: 'Umsatzrentabilitaet', unit: '%', tolerance: 0.02, ariaLabel: 'Umsatzrentabilitaet in Prozent' },
        ],
        // Solver 1: Prueft die Anwendung beider Rentabilitaetsformeln.
        solver: (ctx) => ({
          ek_rent: commercialRound((ctx.profit / ctx.equity) * 100),
          umsatz_rent: commercialRound((ctx.profit / ctx.revenue) * 100),
        }),
      },
      {
        id: 2,
        title: '2. Liquiditaet 1: Die Barreserve',
        prompt: (ctx) => `Ermittle die Liquiditaet 1. Grades. Runde kaufmaennisch auf zwei Nachkommastellen. Daten: Kasse/Bank ${formatMoney(ctx.cashBank)}, kurzfristige Verbindlichkeiten ${formatMoney(ctx.shortTermLiabilities)}.`,
        fields: [
          { key: 'liq_1', label: 'Liquiditaet 1. Grades', unit: '%', tolerance: 0.02, ariaLabel: 'Liquiditaet 1 in Prozent' },
        ],
        // Solver 2: Prueft die Barzahlungsfaehigkeit.
        solver: (ctx) => ({
          liq_1: commercialRound((ctx.cashBank / ctx.shortTermLiabilities) * 100),
        }),
      },
      {
        id: 3,
        title: '3. Liquiditaet 2: Kunden einbeziehen',
        prompt: (ctx) => `Addiere die Forderungen und berechne die Liquiditaet 2. Grades. Daten: Forderungen ${formatMoney(ctx.receivables)}. Die Werte aus Etappe 2 bleiben bestehen.`,
        fields: [
          { key: 'liq_2', label: 'Liquiditaet 2. Grades', unit: '%', tolerance: 0.02, ariaLabel: 'Liquiditaet 2 in Prozent' },
        ],
        dependsOn: [2],
        dependencyHint: 'Quick Ratio baut auf den korrekten Basiswerten aus Etappe 2 auf.',
        // Solver 3: Prueft kurzfristige Zahlungsfaehigkeit inkl. Forderungen.
        solver: (ctx) => ({
          liq_2: commercialRound(((ctx.cashBank + ctx.receivables) / ctx.shortTermLiabilities) * 100),
        }),
      },
      {
        id: 4,
        title: '4. Kritische Analyse (Transfer)',
        prompt: () => 'Bewerte die Liquiditaet 2. Grades aus Etappe 3. Welche Aussage trifft zu? 1) Alles super, wir haben genug Cash. 2) Kritisch, da der Wert unter 100 % liegt und wir auf Warenverkaeufe angewiesen sind. 3) Zu hoch, das Geld arbeitet nicht.',
        fields: [
          { key: 'liq2_analysis', label: 'Richtige Option', unit: '1, 2 oder 3', mode: 'choice', ariaLabel: 'Richtige Transferoption fuer Liquiditaet 2' },
        ],
        dependsOn: [3],
        dependencyHint: 'Die Interpretation ist nur belastbar, wenn die Liquiditaet 2 korrekt gerechnet wurde.',
        // Solver 4: Bewertet die fachlich korrekte Interpretation des Quick Ratio.
        solver: () => ({
          liq2_analysis: '2',
        }),
      },
      {
        id: 5,
        title: '5. Massnahmen zur Steigerung der Liquiditaet',
        prompt: () => 'Welche Massnahme verbessert die Liquiditaet 2. Grades sofort? Nenne mindestens eine sinnvolle Controlling-Massnahme.',
        fields: [
          {
            key: 'liq_action',
            label: 'Massnahme (Freitext)',
            unit: 'Text',
            mode: 'contains_any',
            inputType: 'textarea',
            ariaLabel: 'Freitext zu Liquiditaetsmassnahmen',
          },
        ],
        // Solver 5: Akzeptiert mehrere typische Sofortmassnahmen.
        solver: () => ({
          liq_action: ['factoring', 'mahnwesen', 'skonto', 'lager abbauen', 'forderungsmanagement'],
        }),
      },
      {
        id: 6,
        title: '6. Zielkonflikt: Rentabilitaet vs. Liquiditaet',
        prompt: () => 'Wenn wir Schulden sofort tilgen (Cash sinkt), was passiert mit der Liquiditaet 1. Grades? A) Sie steigt deutlich. B) Sie sinkt, weil Kasse/Bank unmittelbar abnimmt. C) Sie bleibt unveraendert.',
        fields: [
          { key: 'target_conflict', label: 'Richtige Option', unit: 'A, B oder C', mode: 'choice', ariaLabel: 'Richtige Option zum Zielkonflikt' },
        ],
        // Solver 6: Prueft das Verstaendnis des Zielkonflikts.
        solver: () => ({
          target_conflict: 'B',
        }),
      },
    ];
  }

  renderShell() {
    this.container.innerHTML = `
      <section class="ccm-shell" aria-live="polite">
        <header class="ccm-header">
          <p class="ccm-kicker">Controlling-Lab</p>
          <h2 class="ccm-title">Finanz-Analyse & Liquiditaetsmanagement</h2>
          <p class="ccm-product">${this.state.data.companyName} · Rolle: ${this.state.data.scenarioRole}</p>
          <div class="ccm-progress-wrap" aria-label="Lernfortschritt">
            <div class="ccm-progress-bar" data-role="progress-bar"></div>
          </div>
          <p class="ccm-progress-label" data-role="progress-label"></p>
        </header>

        <article class="ccm-card" data-role="task-card"></article>

        <footer class="ccm-footer">
          <div class="ccm-score" data-role="score"></div>
          <div class="ccm-actions">
            <button type="button" class="ccm-btn ccm-btn-primary" data-action="check">Pruefen</button>
            <button type="button" class="ccm-btn ccm-btn-secondary" data-action="next">Weiter</button>
            <button type="button" class="ccm-btn ccm-btn-ghost" data-action="restart">Neu starten</button>
          </div>
          <p class="ccm-action-hint" data-role="action-hint">Erst pruefen, dann weiter.</p>
        </footer>
      </section>
    `;

    this.progressBar = this.container.querySelector('[data-role="progress-bar"]');
    this.progressLabel = this.container.querySelector('[data-role="progress-label"]');
    this.scoreEl = this.container.querySelector('[data-role="score"]');
    this.taskCard = this.container.querySelector('[data-role="task-card"]');
    this.nextBtn = this.container.querySelector('[data-action="next"]');
    this.actionHintEl = this.container.querySelector('[data-role="action-hint"]');
  }

  bindGlobalActions() {
    this.container.addEventListener('click', (event) => {
      const action = event.target?.dataset?.action;
      if (action === 'check') this.validateCurrentTask();
      if (action === 'next') this.nextTask();
      if (action === 'restart') this.reset();
    });

    const syncInputToState = (event) => {
      const input = event.target;
      if (!input.matches('.ccm-step-input')) return;
      const task = this.tasks[this.state.currentTask];
      const taskId = task.id;
      this.state.userInputs[taskId] = this.state.userInputs[taskId] || {};
      this.state.userInputs[taskId][input.name] = input.value;

      // Statuslabels erst nach aktivem Pruefen anzeigen.
      if (this.state.lastValidation) {
        this.clearValidationFeedback();
      }
    };

    this.container.addEventListener('input', syncInputToState, true);
  }

  clearValidationFeedback() {
    this.state.lastValidation = null;

    const statusEls = this.container.querySelectorAll('.ccm-step-status');
    statusEls.forEach((el) => {
      el.textContent = '';
      el.classList.remove('ccm-ok', 'ccm-bad');
    });

    const hint = this.container.querySelector('.ccm-hint-box');
    if (hint) hint.remove();

    this.updateActionState();
  }

  canProceedCurrentTask() {
    const task = this.tasks[this.state.currentTask];
    const validation = this.state.lastValidation;
    if (!validation) return false;
    if (validation.taskId !== task.id) return false;
    return validation.allCorrect && !validation.hasFollowError;
  }

  updateActionState() {
    if (!this.nextBtn || !this.actionHintEl) return;

    const canProceed = this.canProceedCurrentTask();
    this.nextBtn.disabled = !canProceed;

    if (canProceed) {
      this.actionHintEl.textContent = 'Etappe geprueft. Du kannst jetzt weiter.';
      return;
    }

    const task = this.tasks[this.state.currentTask];
    const hasValidation = this.state.lastValidation?.taskId === task.id;
    if (!hasValidation) {
      this.actionHintEl.textContent = 'Erst pruefen, dann weiter.';
      return;
    }

    if (this.state.lastValidation?.hasFollowError) {
      this.actionHintEl.textContent = 'Vorstufe korrigieren: Diese Etappe zaehlt erst dann vollstaendig.';
      return;
    }

    this.actionHintEl.textContent = 'Bitte alle Felder auf OK bringen und erneut pruefen.';
  }

  renderTask() {
    const task = this.tasks[this.state.currentTask];
    const userTaskInput = this.state.userInputs[task.id] || {};
    const validation = this.state.lastValidation;

    const rows = task.fields
      .map((field, index) => {
        const value = userTaskInput[field.key] ?? '';
        const status = validation?.fieldChecks?.[field.key];
        const statusText = status === undefined ? '' : status ? 'OK' : 'Fehler';
        const statusClass = status === undefined ? '' : status ? 'ccm-ok' : 'ccm-bad';

        let control = '';
        if (field.inputType === 'textarea') {
          control = `
            <textarea
              class="ccm-step-input"
              id="ccm-${task.id}-${field.key}"
              name="${field.key}"
              aria-label="${field.ariaLabel}"
              placeholder="${field.unit || 'Wert'}"
              rows="4"
              autocomplete="off"
            >${value}</textarea>
          `;
        } else {
          const placeholder = field.mode === 'choice' || field.mode === 'contains_all'
            ? (field.unit || 'Wert')
            : '0,00';

          control = `
            <input
              class="ccm-step-input"
              id="ccm-${task.id}-${field.key}"
              name="${field.key}"
              type="text"
              value="${value}"
              aria-label="${field.ariaLabel}"
              placeholder="${placeholder}"
              autocomplete="off"
            />
          `;
        }

        return `
          <div class="ccm-line-item">
            <label class="ccm-step-label" for="ccm-${task.id}-${field.key}">${index + 1}. ${field.label}</label>
            ${control}
            <span class="ccm-step-status ${statusClass}">${statusText}</span>
          </div>
        `;
      })
      .join('');

    let hintBox = '';
    if (validation?.hintMessage) {
      hintBox = `<div class="ccm-hint-box">${validation.hintMessage}</div>`;
    }

    this.taskCard.innerHTML = `
      <div class="ccm-stage">
        <div class="ccm-stage-head">
          <h3>${task.title}</h3>
          <p>${task.prompt(this.state.data)}</p>
        </div>
        ${rows}
        ${hintBox}
      </div>
    `;

    const progress = ((this.state.currentTask + 1) / this.tasks.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.progressLabel.textContent = `Etappe ${this.state.currentTask + 1} von ${this.tasks.length}`;
    this.scoreEl.textContent = `Punkte: ${this.state.points}`;
    this.updateActionState();
  }

  buildFollowErrorHint(task) {
    if (!task.dependsOn || task.dependsOn.length === 0) return '';

    const invalidDependencies = task.dependsOn.filter((id) => this.state.taskResults[id] === false);
    if (invalidDependencies.length === 0) return '';

    return `Folgefehler-Hinweis: Vorstufe ${invalidDependencies.join(', ')} ist noch falsch. ${task.dependencyHint || ''}`;
  }

  validateCurrentTask(isSoft = false) {
    const task = this.tasks[this.state.currentTask];
    const entered = this.state.userInputs[task.id] || {};
    const expected = task.solver(this.state.data, this.state);

    const fieldChecks = {};
    let allCorrect = true;

    for (const field of task.fields) {
      const raw = entered[field.key];
      const actual = field.mode === 'choice' || field.mode === 'contains_all' || field.mode === 'contains_any'
        ? raw
        : parseLocaleNumber(raw);
      const ok = compareValues(actual, expected[field.key], field.tolerance ?? 0.02, field.mode || 'number');
      fieldChecks[field.key] = ok;
      if (!ok) allCorrect = false;
    }

    const followHint = this.buildFollowErrorHint(task);
    const hasFollowError = Boolean(followHint);
    const validatedWithDependencies = allCorrect && !hasFollowError;
    const successHint = allCorrect ? 'Alle Eingaben korrekt. Sehr stark.' : '';
    const baseHint = !allCorrect && !isSoft
      ? (task.id === 5
        ? 'Nenne mindestens eine konkrete Massnahme, z. B. Factoring, Mahnwesen oder Skonto.'
        : 'Bitte Werte pruefen. Tipp: Rechne kaufmaennisch auf 2 Dezimalstellen.')
      : '';

    this.state.lastValidation = {
      taskId: task.id,
      fieldChecks,
      allCorrect,
      hasFollowError,
      hintMessage: followHint || successHint || baseHint,
    };

    this.state.taskResults[task.id] = validatedWithDependencies;

    if (validatedWithDependencies && !isSoft && !this.state.scoredTasks[task.id]) {
      this.state.points += 10;
      this.state.scoredTasks[task.id] = true;
    }

    this.renderTask();
  }

  nextTask() {
    if (!this.canProceedCurrentTask()) {
      const task = this.tasks[this.state.currentTask];
      this.state.lastValidation = {
        taskId: task.id,
        fieldChecks: this.state.lastValidation?.fieldChecks || {},
        allCorrect: this.state.lastValidation?.allCorrect || false,
        hasFollowError: this.state.lastValidation?.hasFollowError || false,
        hintMessage: this.state.lastValidation?.hintMessage || 'Bitte zuerst auf "Pruefen" klicken und alle Felder korrekt loesen.',
      };
      this.renderTask();
      return;
    }

    const atLastTask = this.state.currentTask >= this.tasks.length - 1;
    if (!atLastTask) {
      this.state.currentTask += 1;
      this.state.lastValidation = null;
      this.renderTask();
      return;
    }

    this.state.lastValidation = {
      fieldChecks: {},
      allCorrect: true,
      hintMessage: `Modul abgeschlossen. Endstand: ${this.state.points} Punkte.`,
    };
    this.renderTask();
  }
}

export function bootstrapCostCalcModule(options = {}) {
  const module = new CostCalcModule(options);
  module.mount();
  return module;
}

if (typeof window !== 'undefined') {
  window.CostCalcModule = CostCalcModule;
  window.bootstrapCostCalcModule = bootstrapCostCalcModule;
}
