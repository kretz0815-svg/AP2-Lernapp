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

function formatPercent(value) {
  return `${commercialRound(value).toFixed(2).replace('.', ',')} %`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randStep(min, max, step) {
  const steps = Math.floor((max - min) / step);
  return min + randInt(0, steps) * step;
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

function generateCostNaming() {
  const companies = ['Glühfuchs Handels GmbH', 'Nordlöwe Märkte GmbH', 'Alpenfeder Vertrieb GmbH', 'Waldkröte Outdoor GmbH'];
  const brands = ['Outdoor-Stirnlampe S900', 'Trail-Lite S900', 'SummitBeam S900', 'NightPath S900'];
  const successorBrands = ['Outdoor-Stirnlampe S950', 'Trail-Lite S950', 'SummitBeam S950', 'NightPath S950'];
  const categoryNames = ['Outdoor-Zubehör', 'Outdoor-Equipment', 'Outdoor-Lichttechnik', 'Trekking-Zubehör'];

  const idx = randInt(0, companies.length - 1);
  return {
    companyName: companies[idx],
    productName: brands[idx],
    successorProductName: successorBrands[idx],
    categoryName: categoryNames[idx],
  };
}

function generateCostData() {
  const naming = generateCostNaming();

  const quantity = randStep(8000, 12000, 500);
  const salesPrice = randStep(74, 88, 1);

  const materialCost = randStep(24, 33, 0.1);
  const packagingCost = randStep(2.8, 4.6, 0.1);
  const shippingCost = randStep(3.8, 5.4, 0.1);
  const variableSalesCost = randStep(8.6, 12.4, 0.1);
  const variableCostPerUnit = commercialRound(materialCost + packagingCost + shippingCost + variableSalesCost);

  const warehouseRent = randStep(42000, 62000, 1000);
  const productManagementSalaries = randStep(54000, 76000, 1000);
  const machineDepreciation = randStep(42000, 68000, 1000);
  const fixedTotal = commercialRound(warehouseRent + productManagementSalaries + machineDepreciation);

  const dbUnit = commercialRound(salesPrice - variableCostPerUnit);
  const dbTotal = commercialRound(dbUnit * quantity);
  const operatingResult = commercialRound(dbTotal - fixedTotal);

  const shortTermPUG = commercialRound(variableCostPerUnit);
  const longTermPUG = commercialRound(variableCostPerUnit + fixedTotal / quantity);
  const breakEvenQty = Math.ceil(fixedTotal / dbUnit);
  const breakEvenRevenue = commercialRound(breakEvenQty * salesPrice);

  const specialOrderQty = randStep(2000, 3500, 250);

  const removableFixedCost = randStep(Math.round(fixedTotal * 0.45), Math.round(fixedTotal * 0.7), 1000);
  const remainingFixedCost = commercialRound(fixedTotal - removableFixedCost);
  const discontinueDecision = dbTotal > removableFixedCost ? 'NEIN' : 'JA';
  const discontinueReason = dbTotal > removableFixedCost
    ? 'Nicht streichen: Der entfallende Deckungsbeitrag ist höher als die einsparbaren Fixkosten.'
    : 'Streichung kann sinnvoll sein: Einsparbare Fixkosten übersteigen den entfallenden Deckungsbeitrag.';

  const purchasePriceS950 = randStep(35, 46, 1);
  const handlingCostPercentS950 = randStep(22, 30, 1);
  const adminOverheadS950 = randStep(2.8, 4.4, 0.1);
  const salesOverheadS950 = randStep(3.0, 4.8, 0.1);
  const handlingCostAmountS950 = commercialRound(purchasePriceS950 * (handlingCostPercentS950 / 100));
  const selfCostS950 = commercialRound(purchasePriceS950 + handlingCostAmountS950 + adminOverheadS950 + salesOverheadS950);

  return {
    ...naming,
    quantity,
    salesPrice,
    variableCostPerUnit,
    materialCost,
    packagingCost,
    shippingCost,
    variableSalesCost,
    fixedTotal,
    warehouseRent,
    productManagementSalaries,
    machineDepreciation,
    dbUnit,
    dbTotal,
    operatingResult,
    shortTermPUG,
    longTermPUG,
    breakEvenQty,
    breakEvenRevenue,
    specialOrderQty,
    removableFixedCost,
    remainingFixedCost,
    discontinueDecision,
    discontinueReason,
    purchasePriceS950,
    handlingCostPercentS950,
    adminOverheadS950,
    salesOverheadS950,
    handlingCostAmountS950,
    selfCostS950,
  };
}

function generateFinanceNaming() {
  const companies = ['Bergfuchs GmbH', 'Nordwald Märkte GmbH', 'Felsfeder Handel GmbH', 'Höhenpfad Outfitters GmbH'];
  const categoryNames = ['Outdoor-Ausrüstung', 'Trekkingbedarf', 'Bergsportzubehör', 'Naturausrüstung'];

  const idx = randInt(0, companies.length - 1);
  return {
    companyName: companies[idx],
    categoryName: categoryNames[idx],
  };
}

function generateFinanceData() {
  const naming = generateFinanceNaming();

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
    this.variant = options.variant || 'cost-calc';
    this.state = {
      currentTask: 0,
      points: 0,
      scoredTasks: {},
      userInputs: {},
      taskResults: {},
      lastValidation: null,
      data: this.buildDataForVariant(),
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
    this.tasks = this.createTasks();
    this.state = {
      currentTask: 0,
      points: 0,
      scoredTasks: {},
      userInputs: {},
      taskResults: {},
      lastValidation: null,
      data: this.buildDataForVariant(),
    };
    this.renderTask();
  }

  buildDataForVariant() {
    if (this.variant === 'finance-liquidity') return generateFinanceData();
    return generateCostData();
  }

  createTasks() {
    if (this.variant === 'finance-liquidity') return this.createFinanceTasks();
    return this.createCostCalcTasks();
  }

  createCostCalcTasks() {
    const stage2Fields = shuffleArray([
      { key: 'materialClass', label: 'Materialkosten', unit: 'F oder V', mode: 'choice', ariaLabel: 'Materialkosten als F oder V klassifizieren' },
      { key: 'packagingClass', label: 'Verpackungskosten', unit: 'F oder V', mode: 'choice', ariaLabel: 'Verpackungskosten als F oder V klassifizieren' },
      { key: 'shippingClass', label: 'Versandkosten', unit: 'F oder V', mode: 'choice', ariaLabel: 'Versandkosten als F oder V klassifizieren' },
      { key: 'varSalesClass', label: 'Variable Vertriebskosten', unit: 'F oder V', mode: 'choice', ariaLabel: 'Variable Vertriebskosten als F oder V klassifizieren' },
      { key: 'warehouseClass', label: 'Miete Lagerhalle', unit: 'F oder V', mode: 'choice', ariaLabel: 'Miete Lagerhalle als F oder V klassifizieren' },
      { key: 'pmClass', label: 'Gehaelter Produktmanagement', unit: 'F oder V', mode: 'choice', ariaLabel: 'Gehaelter Produktmanagement als F oder V klassifizieren' },
      { key: 'deprClass', label: 'Abschreibungen Maschinen', unit: 'F oder V', mode: 'choice', ariaLabel: 'Abschreibungen Maschinen als F oder V klassifizieren' },
    ]);

    return [
      {
        id: 1,
        title: '1. Stueckdeckungsbeitrag & Betriebsergebnis',
        prompt: (ctx) => `Die ${ctx.companyName} prueft in ${ctx.categoryName} das Produkt ${ctx.productName}. Gegeben: Verkaufspreis netto ${formatMoney(ctx.salesPrice)} je Stk, variable Kosten ${formatMoney(ctx.variableCostPerUnit)} je Stk, Fixkosten gesamt ${formatMoney(ctx.fixedTotal)} p.a., geplanter Absatz ${ctx.quantity} Stk p.a..`,
        fields: [
          { key: 'dbUnit', label: 'Stueckdeckungsbeitrag', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Stueckdeckungsbeitrag in Euro' },
          { key: 'operatingResult', label: 'Betriebsergebnis', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Betriebsergebnis in Euro' },
        ],
        solver: (ctx) => ({
          dbUnit: commercialRound(ctx.salesPrice - ctx.variableCostPerUnit),
          operatingResult: commercialRound((ctx.salesPrice - ctx.variableCostPerUnit) * ctx.quantity - ctx.fixedTotal),
        }),
      },
      {
        id: 2,
        title: '2. Kostenarten-Zuordnung (Fix/Variabel)',
        prompt: (ctx) => `Klassifiziere jede Kostenart mit F (Fix) oder V (Variabel): Material ${formatMoney(ctx.materialCost)} je Stk, Verpackung ${formatMoney(ctx.packagingCost)} je Stk, Versand ${formatMoney(ctx.shippingCost)} je Stk, variable Vertriebskosten ${formatMoney(ctx.variableSalesCost)} je Stk, Miete Lagerhalle ${formatMoney(ctx.warehouseRent)} p.a., Gehaelter Produktmanagement ${formatMoney(ctx.productManagementSalaries)} p.a., Abschreibungen Maschinen ${formatMoney(ctx.machineDepreciation)} p.a..`,
        fields: stage2Fields,
        dependsOn: [1],
        dependencyHint: 'Wenn Etappe 1 falsch war, pruefe zuerst Deckungsbeitrag und Kostenbasis.',
        solver: () => ({
          materialClass: 'V',
          packagingClass: 'V',
          shippingClass: 'V',
          varSalesClass: 'V',
          warehouseClass: 'F',
          pmClass: 'F',
          deprClass: 'F',
        }),
      },
      {
        id: 3,
        title: '3. Kurzfristige Preisuntergrenze',
        prompt: (ctx) => `Ein Grosskunde fordert einen Sonderpreis fuer ${ctx.specialOrderQty} Stk ${ctx.productName}. Berechne die kurzfristige Preisuntergrenze je Stueck (nur variable Kosten).`,
        fields: [
          { key: 'shortTermPUG', label: 'Kurzfristige PUG je Stueck', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Kurzfristige Preisuntergrenze in Euro' },
        ],
        dependsOn: [2],
        dependencyHint: 'Kurzfristige PUG basiert direkt auf den variablen Kosten.',
        solver: (ctx) => ({
          shortTermPUG: commercialRound(ctx.variableCostPerUnit),
        }),
      },
      {
        id: 4,
        title: '4. Langfristige Preisgrenze',
        prompt: (ctx) => `Fuer die langfristige Planung sind alle Kosten zu beruecksichtigen: variable Kosten ${formatMoney(ctx.variableCostPerUnit)} je Stk, Fixkosten ${formatMoney(ctx.fixedTotal)} p.a., Absatz ${ctx.quantity} Stk p.a..`,
        fields: [
          { key: 'longTermPUG', label: 'Langfristige PUG je Stueck', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Langfristige Preisuntergrenze in Euro' },
        ],
        dependsOn: [2, 3],
        dependencyHint: 'Langfristige PUG = variable Kosten + Fixkostenanteil je Stueck.',
        solver: (ctx) => ({
          longTermPUG: commercialRound(ctx.variableCostPerUnit + ctx.fixedTotal / ctx.quantity),
        }),
      },
      {
        id: 5,
        title: '5. Break-even-Analyse',
        prompt: (ctx) => `Ermittle fuer ${ctx.productName}: Verkaufspreis ${formatMoney(ctx.salesPrice)} je Stk, variable Kosten ${formatMoney(ctx.variableCostPerUnit)} je Stk, Fixkosten ${formatMoney(ctx.fixedTotal)} p.a.. Rundungsregel: Break-even-Menge immer zuerst auf volle Stueck aufrunden; den Break-even-Umsatz danach mit genau dieser aufgerundeten Menge berechnen.`,
        fields: [
          { key: 'dbUnit', label: 'Stueckdeckungsbeitrag', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Stueckdeckungsbeitrag in Euro fuer Break-even' },
          { key: 'breakEvenQty', label: 'Break-even-Menge', unit: 'Stk', tolerance: 0.5, ariaLabel: 'Break-even Menge in Stueck' },
          { key: 'breakEvenRevenue', label: 'Break-even-Umsatz', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Break-even Umsatz in Euro' },
        ],
        dependsOn: [1, 2],
        dependencyHint: 'Der Break-even braucht einen positiven Stueckdeckungsbeitrag.',
        solver: (ctx) => ({
          dbUnit: commercialRound(ctx.salesPrice - ctx.variableCostPerUnit),
          breakEvenQty: Math.ceil(ctx.fixedTotal / ctx.dbUnit),
          breakEvenRevenue: commercialRound(Math.ceil(ctx.fixedTotal / ctx.dbUnit) * ctx.salesPrice),
        }),
      },
      {
        id: 6,
        title: '6. Sortimentsentscheidung',
        prompt: (ctx) => `Pruefe, ob ${ctx.productName} aus dem Sortiment genommen werden soll. Deckungsbeitrag gesamt bei ${ctx.quantity} Stk: ${formatMoney(ctx.dbTotal)}. Entfallende Fixkosten bei Streichung: ${formatMoney(ctx.removableFixedCost)}. Verbleibende Fixkosten: ${formatMoney(ctx.remainingFixedCost)}.`,
        fields: [
          { key: 'dbTotal', label: 'Deckungsbeitrag gesamt', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Deckungsbeitrag gesamt in Euro' },
          { key: 'discontinueDecision', label: 'Streichung wirtschaftlich sinnvoll? (JA/NEIN)', unit: 'JA oder NEIN', mode: 'choice', ariaLabel: 'Sortimentsentscheidung mit JA oder NEIN beantworten' },
        ],
        dependsOn: [5],
        dependencyHint: 'Vergleiche entfallenden Deckungsbeitrag mit wirklich einsparbaren Fixkosten.',
        solver: (ctx) => ({
          dbTotal: commercialRound(ctx.dbTotal),
          discontinueDecision: ctx.discontinueDecision,
        }),
      },
      {
        id: 7,
        title: '7. Wirtschaftliche Bewertung',
        prompt: () => 'Formuliere eine kurze Gesamtbewertung. Nenne explizit: Stueckdeckungsbeitrag, Preisuntergrenzen, Break-even, Fixkosten, Sortimentsentscheidung.',
        fields: [
          {
            key: 'businessEvaluation',
            label: 'Bewertungstext (mind. 2-3 Saetze)',
            unit: 'Text',
            mode: 'contains_all',
            ariaLabel: 'Wirtschaftliche Bewertung als Freitext',
            inputType: 'textarea',
          },
        ],
        dependsOn: [1, 3, 4, 5, 6],
        dependencyHint: 'Verwende nur begruendete Aussagen auf Basis der vorherigen Etappen.',
        solver: () => ({
          businessEvaluation: ['deckungsbeitrag', 'preisuntergrenze', 'break-even', 'fixkosten', 'sortiment'],
        }),
      },
      {
        id: 8,
        title: '8. Handelskalkulation: Einstandspreis -> Selbstkosten',
        prompt: (ctx) => `Fuer das Nachfolgemodell ${ctx.successorProductName}: Einstandspreis ${formatMoney(ctx.purchasePriceS950)}, Handlungskostenzuschlag ${formatPercent(ctx.handlingCostPercentS950)}, Verwaltungsgemeinkosten ${formatMoney(ctx.adminOverheadS950)} je Stk, Vertriebsgemeinkosten ${formatMoney(ctx.salesOverheadS950)} je Stk.`,
        fields: [
          { key: 'selfCostS950', label: 'Selbstkosten pro Stueck', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Selbstkosten pro Stueck in Euro' },
        ],
        dependsOn: [7],
        dependencyHint: 'Reihenfolge beachten: Einstand + Handlungskosten + Verwaltungs- und Vertriebsgemeinkosten.',
        solver: (ctx) => ({
          selfCostS950: commercialRound(
            ctx.purchasePriceS950
            + (ctx.purchasePriceS950 * ctx.handlingCostPercentS950 / 100)
            + ctx.adminOverheadS950
            + ctx.salesOverheadS950
          ),
        }),
      },
    ];
  }

  createFinanceTasks() {
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
    const isFinance = this.variant === 'finance-liquidity';
    const kicker = isFinance ? 'Controlling-Lab' : 'Kalkulationsboss';
    const title = isFinance ? 'Finanz-Analyse & Liquiditaetsmanagement' : 'Kostenrechnung & Preisuntergrenze';
    const contextLine = isFinance
      ? `${this.state.data.companyName} · Rolle: ${this.state.data.scenarioRole}`
      : `${this.state.data.companyName} · Produkt: ${this.state.data.productName}`;

    this.container.innerHTML = `
      <section class="ccm-shell" aria-live="polite">
        <header class="ccm-header">
          <p class="ccm-kicker">${kicker}</p>
          <h2 class="ccm-title">${title}</h2>
          <p class="ccm-product">${contextLine}</p>
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

      // Feedback bleibt sichtbar; bei Aenderung ist aber eine neue Pruefung erforderlich.
      if (this.state.lastValidation?.taskId === task.id) {
        this.state.lastValidation.isDirty = true;
        this.updateActionState();
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
    if (validation.isDirty) return false;
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

    if (this.state.lastValidation?.isDirty) {
      this.actionHintEl.textContent = 'Eingabe geaendert: Bitte erneut pruefen.';
      return;
    }

    if (this.state.lastValidation?.hasFollowError) {
      this.actionHintEl.textContent = 'Vorstufe korrigieren: Diese Etappe zaehlt erst dann vollstaendig.';
      return;
    }

    this.actionHintEl.textContent = 'Bitte alle Felder auf OK bringen und erneut pruefen.';
  }

  buildEditableRows(task, userTaskInput, validation) {
    return task.fields
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
  }

  buildReadonlyRows(task, userTaskInput) {
    return task.fields
      .map((field, index) => {
        const raw = userTaskInput[field.key];
        const value = raw === undefined || raw === null || String(raw).trim() === '' ? '—' : String(raw);
        return `
          <div class="ccm-line-item ccm-line-item-readonly">
            <span class="ccm-step-label">${index + 1}. ${field.label}</span>
            <div class="ccm-step-static">${value}</div>
            <span class="ccm-step-status ccm-ok">OK</span>
          </div>
        `;
      })
      .join('');
  }

  renderTask() {
    const task = this.tasks[this.state.currentTask];
    const userTaskInput = this.state.userInputs[task.id] || {};
    const validation = this.state.lastValidation;

    const previousSections = this.tasks
      .slice(0, this.state.currentTask)
      .map((doneTask) => {
        const doneInput = this.state.userInputs[doneTask.id] || {};
        const doneRows = this.buildReadonlyRows(doneTask, doneInput);
        const donePrompt = typeof doneTask.prompt === 'function' ? doneTask.prompt(this.state.data) : '';
        return `
          <div class="ccm-stage ccm-stage-previous">
            <div class="ccm-stage-head">
              <h3>${doneTask.title}</h3>
              <p>${donePrompt}</p>
            </div>
            ${doneRows}
          </div>
        `;
      })
      .join('');

    const rows = this.buildEditableRows(task, userTaskInput, validation);

    let hintBox = '';
    if (validation?.hintMessage) {
      hintBox = `<div class="ccm-hint-box">${validation.hintMessage}</div>`;
    }

    this.taskCard.innerHTML = `
      <div class="ccm-stage-stack">
        ${previousSections}
        <div class="ccm-stage ccm-stage-current">
          <div class="ccm-stage-head">
            <h3>${task.title}</h3>
            <p>${task.prompt(this.state.data)}</p>
          </div>
          ${rows}
          ${hintBox}
        </div>
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
    const successHint = allCorrect
      ? (this.variant === 'cost-calc' && task.id === 6
        ? `${this.state.data.discontinueReason} Alle Eingaben korrekt.`
        : 'Alle Eingaben korrekt. Sehr stark.')
      : '';
    const hasContainsAll = task.fields.some((field) => field.mode === 'contains_all');
    const hasContainsAny = task.fields.some((field) => field.mode === 'contains_any');
    const baseHint = !allCorrect && !isSoft
      ? (hasContainsAny
        ? 'Nenne mindestens eine konkrete Massnahme, z. B. Factoring, Mahnwesen oder Skonto.'
        : hasContainsAll
          ? 'Bitte alle geforderten Kernaspekte im Text nennen.'
          : 'Bitte Werte pruefen. Tipp: Rechne kaufmaennisch auf 2 Dezimalstellen.')
      : '';

    this.state.lastValidation = {
      taskId: task.id,
      fieldChecks,
      allCorrect,
      hasFollowError,
      isDirty: false,
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
        isDirty: this.state.lastValidation?.isDirty || false,
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
