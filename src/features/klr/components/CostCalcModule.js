import { askGemini } from '../../../geminiClient';

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

function generateSortimentRetourenNaming() {
  const companies = ['Glöbenstern GmbH', 'Höhenquell Handels GmbH', 'Würzpfad Outfit GmbH', 'Löwenkamm Sortiment GmbH'];
  const categoryNames = ['Outdoor-Sortiment', 'Bergsport-Sortiment', 'Trekking-Sortiment', 'Abenteuer-Sortiment'];
  const jacketNames = ['Nordlicht-Jacke', 'Fjällpfad-Jacke', 'Sturmhügel-Jacke', 'Wolkenkamm-Jacke'];
  const pantsNames = ['Steinpfad-Hose', 'Höhenlinie-Hose', 'Waldkamm-Hose', 'Gipfelspur-Hose'];

  const idx = randInt(0, companies.length - 1);
  return {
    companyName: companies[idx],
    categoryName: categoryNames[idx],
    jacketProductName: jacketNames[idx],
    pantsProductName: pantsNames[idx],
  };
}

function generateSortimentRetourenData() {
  const naming = generateSortimentRetourenNaming();

  const totalOrders = randStep(10400, 16800, 80);
  const returnRateRaw = randStep(8, 19, 0.1);
  const cancellationRateRaw = randStep(2.5, 7.5, 0.1);
  const returnedOrders = Math.round(totalOrders * (returnRateRaw / 100));
  const canceledOrders = Math.round(totalOrders * (cancellationRateRaw / 100));

  const soldJackets = randStep(2600, 4400, 100);
  const complaintRateRaw = randStep(2.6, 6.4, 0.1);
  const complaintsTotal = Math.max(1, Math.round(soldJackets * (complaintRateRaw / 100)));
  const justifiedShareRaw = randStep(56, 84, 1);
  const justifiedComplaints = Math.max(1, Math.round(complaintsTotal * (justifiedShareRaw / 100)));
  const unjustifiedComplaints = Math.max(0, complaintsTotal - justifiedComplaints);

  const avgOrderRevenue = randStep(68, 94, 1);
  const avgContributionPerOrder = randStep(18, 31, 1);
  const ordersPerYear = randStep(4, 8, 1);
  const customerYears = randStep(3, 6, 1);
  const yearlyMarketingCostPerCustomer = randStep(12, 28, 1);

  const fixedCostPants = randStep(155000, 265000, 5000);
  const salesPricePants = randStep(59, 89, 1);
  const dbTargetPants = randStep(18, 34, 1);
  const variableCostPants = commercialRound(salesPricePants - dbTargetPants);
  const breakEvenQtyPantsBase = Math.ceil(fixedCostPants / dbTargetPants);
  const planFactor = [0.82, 0.91, 0.98, 1.04, 1.12, 1.21][randInt(0, 5)];
  const plannedSalesPants = Math.max(1200, Math.round((breakEvenQtyPantsBase * planFactor) / 50) * 50);

  const outdoorRevenueQ1 = randStep(1220000, 1960000, 10000);
  const profitabilityRaw = randStep(5.4, 11.2, 0.1);
  const outdoorProfitQ1 = commercialRound(outdoorRevenueQ1 * (profitabilityRaw / 100));

  const listSalesPriceGross = randStep(99, 149, 1);
  const vatRate = 19;
  const customerDiscountRate = randStep(8, 18, 1);
  const customerSkontoRate = randStep(1, 3, 0.5);
  const profitMarkupRate = randStep(12, 24, 1);
  const handlingCostRate = randStep(20, 32, 1);

  const returnRate = commercialRound((returnedOrders / totalOrders) * 100);
  const cancellationRate = commercialRound((canceledOrders / totalOrders) * 100);
  const complaintRate = commercialRound((complaintsTotal / soldJackets) * 100);
  const justifiedComplaintShare = commercialRound((justifiedComplaints / complaintsTotal) * 100);
  const qualityIssueLikely = justifiedComplaintShare >= 60 ? 'JA' : 'NEIN';

  const clv = commercialRound(
    (avgContributionPerOrder * ordersPerYear * customerYears)
    - (yearlyMarketingCostPerCustomer * customerYears)
  );

  const dbUnitPants = commercialRound(salesPricePants - variableCostPants);
  const breakEvenQtyPants = Math.ceil(fixedCostPants / dbUnitPants);
  const isPantsEconomicAtPlan = plannedSalesPants >= breakEvenQtyPants ? 'JA' : 'NEIN';

  const operatingResultAtPlan = commercialRound((plannedSalesPants * dbUnitPants) - fixedCostPants);
  const revenueProfitability = commercialRound((outdoorProfitQ1 / outdoorRevenueQ1) * 100);

  const listSalesPriceNet = commercialRound(listSalesPriceGross / (1 + vatRate / 100));
  const targetSalesPrice = commercialRound(listSalesPriceNet * (1 - customerDiscountRate / 100));
  const cashSalesPrice = commercialRound(targetSalesPrice * (1 - customerSkontoRate / 100));
  const selfCost = commercialRound(cashSalesPrice / (1 + profitMarkupRate / 100));
  const maxPurchasePrice = commercialRound(selfCost / (1 + handlingCostRate / 100));

  return {
    ...naming,
    totalOrders,
    returnedOrders,
    canceledOrders,
    returnRate,
    cancellationRate,
    soldJackets,
    complaintsTotal,
    justifiedComplaints,
    unjustifiedComplaints,
    complaintRate,
    justifiedComplaintShare,
    qualityIssueLikely,
    avgOrderRevenue,
    avgContributionPerOrder,
    ordersPerYear,
    customerYears,
    yearlyMarketingCostPerCustomer,
    clv,
    fixedCostPants,
    salesPricePants,
    variableCostPants,
    plannedSalesPants,
    dbUnitPants,
    breakEvenQtyPants,
    operatingResultAtPlan,
    isPantsEconomicAtPlan,
    outdoorRevenueQ1,
    outdoorProfitQ1,
    revenueProfitability,
    listSalesPriceGross,
    vatRate,
    customerDiscountRate,
    customerSkontoRate,
    profitMarkupRate,
    handlingCostRate,
    listSalesPriceNet,
    targetSalesPrice,
    cashSalesPrice,
    selfCost,
    maxPurchasePrice,
  };
}

export class CostCalcModule {
  constructor(options = {}) {
    this.containerId = options.containerId || 'calc-boss-module';
    this.containerEl = options.containerEl || null;
    this.variant = options.variant || 'cost-calc';
    this.onLearningEvent = typeof options.onLearningEvent === 'function' ? options.onLearningEvent : null;
    this.state = {
      currentTask: 0,
      points: 0,
      scoredTasks: {},
      userInputs: {},
      taskResults: {},
      lastValidation: null,
      showStage7Example: false,
      aiFeedback: '',
      aiFeedbackLoading: false,
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
      showStage7Example: false,
      aiFeedback: '',
      aiFeedbackLoading: false,
      data: this.buildDataForVariant(),
    };
    this.renderTask();
  }

  isStage7BusinessEvaluation(task) {
    return this.variant === 'cost-calc' && task?.id === 7;
  }

  buildDataForVariant() {
    if (this.variant === 'sortiment-retouren-3e') return generateSortimentRetourenData();
    if (this.variant === 'finance-liquidity') return generateFinanceData();
    return generateCostData();
  }

  createTasks() {
    if (this.variant === 'sortiment-retouren-3e') return this.createSortimentRetourenTasks();
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
      { key: 'pmClass', label: 'Gehälter Produktmanagement', unit: 'F oder V', mode: 'choice', ariaLabel: 'Gehälter Produktmanagement als F oder V klassifizieren' },
      { key: 'deprClass', label: 'Abschreibungen Maschinen', unit: 'F oder V', mode: 'choice', ariaLabel: 'Abschreibungen Maschinen als F oder V klassifizieren' },
    ]);

    return [
      {
        id: 1,
        title: '1. Stückdeckungsbeitrag & Betriebsergebnis',
        prompt: (ctx) => `Die ${ctx.companyName} prüft in ${ctx.categoryName} das Produkt ${ctx.productName}. Gegeben: Verkaufspreis netto ${formatMoney(ctx.salesPrice)} je Stk, variable Kosten ${formatMoney(ctx.variableCostPerUnit)} je Stk, Fixkosten gesamt ${formatMoney(ctx.fixedTotal)} p.a., geplanter Absatz ${ctx.quantity} Stk p.a..`,
        fields: [
          { key: 'dbUnit', label: 'Stückdeckungsbeitrag', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Stückdeckungsbeitrag in Euro' },
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
        prompt: (ctx) => `Klassifiziere jede Kostenart mit F (Fix) oder V (Variabel): Material ${formatMoney(ctx.materialCost)} je Stk, Verpackung ${formatMoney(ctx.packagingCost)} je Stk, Versand ${formatMoney(ctx.shippingCost)} je Stk, variable Vertriebskosten ${formatMoney(ctx.variableSalesCost)} je Stk, Miete Lagerhalle ${formatMoney(ctx.warehouseRent)} p.a., Gehälter Produktmanagement ${formatMoney(ctx.productManagementSalaries)} p.a., Abschreibungen Maschinen ${formatMoney(ctx.machineDepreciation)} p.a..`,
        fields: stage2Fields,
        dependsOn: [1],
        dependencyHint: 'Wenn Etappe 1 falsch war, prüfe zuerst Deckungsbeitrag und Kostenbasis.',
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
        prompt: (ctx) => `Ein Großkunde fordert einen Sonderpreis für ${ctx.specialOrderQty} Stk ${ctx.productName}. Berechne die kurzfristige Preisuntergrenze je Stück (nur variable Kosten).`,
        fields: [
          { key: 'shortTermPUG', label: 'Kurzfristige PUG je Stück', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Kurzfristige Preisuntergrenze in Euro' },
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
        prompt: (ctx) => `Für die langfristige Planung sind alle Kosten zu berücksichtigen: variable Kosten ${formatMoney(ctx.variableCostPerUnit)} je Stk, Fixkosten ${formatMoney(ctx.fixedTotal)} p.a., Absatz ${ctx.quantity} Stk p.a..`,
        fields: [
          { key: 'longTermPUG', label: 'Langfristige PUG je Stück', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Langfristige Preisuntergrenze in Euro' },
        ],
        dependsOn: [2, 3],
        dependencyHint: 'Langfristige PUG = variable Kosten + Fixkostenanteil je Stück.',
        solver: (ctx) => ({
          longTermPUG: commercialRound(ctx.variableCostPerUnit + ctx.fixedTotal / ctx.quantity),
        }),
      },
      {
        id: 5,
        title: '5. Break-even-Analyse',
        prompt: (ctx) => `Ermittle für ${ctx.productName}: Verkaufspreis ${formatMoney(ctx.salesPrice)} je Stk, variable Kosten ${formatMoney(ctx.variableCostPerUnit)} je Stk, Fixkosten ${formatMoney(ctx.fixedTotal)} p.a.. Rundungsregel: Break-even-Menge immer zuerst auf volle Stück aufrunden; den Break-even-Umsatz danach mit genau dieser aufgerundeten Menge berechnen.`,
        fields: [
          { key: 'dbUnit', label: 'Stückdeckungsbeitrag', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Stückdeckungsbeitrag in Euro für Break-even' },
          { key: 'breakEvenQty', label: 'Break-even-Menge', unit: 'Stk', tolerance: 0.5, ariaLabel: 'Break-even Menge in Stück' },
          { key: 'breakEvenRevenue', label: 'Break-even-Umsatz', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Break-even Umsatz in Euro' },
        ],
        dependsOn: [1, 2],
        dependencyHint: 'Der Break-even braucht einen positiven Stückdeckungsbeitrag.',
        solver: (ctx) => ({
          dbUnit: commercialRound(ctx.salesPrice - ctx.variableCostPerUnit),
          breakEvenQty: Math.ceil(ctx.fixedTotal / ctx.dbUnit),
          breakEvenRevenue: commercialRound(Math.ceil(ctx.fixedTotal / ctx.dbUnit) * ctx.salesPrice),
        }),
      },
      {
        id: 6,
        title: '6. Sortimentsentscheidung',
        prompt: (ctx) => `Prüfe, ob ${ctx.productName} aus dem Sortiment genommen werden soll. Deckungsbeitrag gesamt bei ${ctx.quantity} Stk: ${formatMoney(ctx.dbTotal)}. Entfallende Fixkosten bei Streichung: ${formatMoney(ctx.removableFixedCost)}. Verbleibende Fixkosten: ${formatMoney(ctx.remainingFixedCost)}.`,
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
        prompt: () => 'Formuliere eine kurze Gesamtbewertung. Nenne explizit: Stückdeckungsbeitrag, Preisuntergrenzen, Break-even, Fixkosten, Sortimentsentscheidung.',
        fields: [
          {
            key: 'businessEvaluation',
            label: 'Bewertungstext (mind. 2-3 Sätze)',
            unit: 'Text',
            mode: 'contains_all',
            ariaLabel: 'Wirtschaftliche Bewertung als Freitext',
            inputType: 'textarea',
          },
        ],
        dependsOn: [1, 3, 4, 5, 6],
        dependencyHint: 'Verwende nur begründete Aussagen auf Basis der vorherigen Etappen.',
        solver: () => ({
          businessEvaluation: ['deckungsbeitrag', 'preisuntergrenze', 'break-even', 'fixkosten', 'sortiment'],
        }),
      },
      {
        id: 8,
        title: '8. Handelskalkulation: Einstandspreis -> Selbstkosten',
        prompt: (ctx) => `Für das Nachfolgemodell ${ctx.successorProductName}: Einstandspreis ${formatMoney(ctx.purchasePriceS950)}, Handlungskostenzuschlag ${formatPercent(ctx.handlingCostPercentS950)}, Verwaltungsgemeinkosten ${formatMoney(ctx.adminOverheadS950)} je Stk, Vertriebsgemeinkosten ${formatMoney(ctx.salesOverheadS950)} je Stk.`,
        fields: [
          { key: 'selfCostS950', label: 'Selbstkosten pro Stück', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Selbstkosten pro Stück in Euro' },
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
        title: '1. Die Basis: Rentabilitäten berechnen',
        prompt: (ctx) => `Szenario Jahresabschluss: Die ${ctx.companyName} (${ctx.categoryName}) setzt dich als ${ctx.scenarioRole} ein. Berechne die Eigenkapital- und Umsatzrentabilität. Runde auf zwei Nachkommastellen. Daten: Gewinn ${formatMoney(ctx.profit)}, Eigenkapital ${formatMoney(ctx.equity)}, Umsatz ${formatMoney(ctx.revenue)}.`,
        fields: [
          { key: 'ek_rent', label: 'Eigenkapitalrentabilität', unit: '%', tolerance: 0.02, ariaLabel: 'Eigenkapitalrentabilität in Prozent' },
          { key: 'umsatz_rent', label: 'Umsatzrentabilität', unit: '%', tolerance: 0.02, ariaLabel: 'Umsatzrentabilität in Prozent' },
        ],
        // Solver 1: Prüft die Anwendung beider Rentabilitätsformeln.
        solver: (ctx) => ({
          ek_rent: commercialRound((ctx.profit / ctx.equity) * 100),
          umsatz_rent: commercialRound((ctx.profit / ctx.revenue) * 100),
        }),
      },
      {
        id: 2,
        title: '2. Liquidität 1: Die Barreserve',
        prompt: (ctx) => `Ermittle die Liquidität 1. Grades. Runde kaufmännisch auf zwei Nachkommastellen. Daten: Kasse/Bank ${formatMoney(ctx.cashBank)}, kurzfristige Verbindlichkeiten ${formatMoney(ctx.shortTermLiabilities)}.`,
        fields: [
          { key: 'liq_1', label: 'Liquidität 1. Grades', unit: '%', tolerance: 0.02, ariaLabel: 'Liquidität 1 in Prozent' },
        ],
        // Solver 2: Prüft die Barzahlungsfähigkeit.
        solver: (ctx) => ({
          liq_1: commercialRound((ctx.cashBank / ctx.shortTermLiabilities) * 100),
        }),
      },
      {
        id: 3,
        title: '3. Liquidität 2: Kunden einbeziehen',
        prompt: (ctx) => `Addiere die Forderungen und berechne die Liquidität 2. Grades. Daten: Forderungen ${formatMoney(ctx.receivables)}. Die Werte aus Etappe 2 bleiben bestehen.`,
        fields: [
          { key: 'liq_2', label: 'Liquidität 2. Grades', unit: '%', tolerance: 0.02, ariaLabel: 'Liquidität 2 in Prozent' },
        ],
        dependsOn: [2],
        dependencyHint: 'Quick Ratio baut auf den korrekten Basiswerten aus Etappe 2 auf.',
        // Solver 3: Prüft kurzfristige Zahlungsfähigkeit inkl. Forderungen.
        solver: (ctx) => ({
          liq_2: commercialRound(((ctx.cashBank + ctx.receivables) / ctx.shortTermLiabilities) * 100),
        }),
      },
      {
        id: 4,
        title: '4. Kritische Analyse (Transfer)',
        prompt: () => 'Bewerte die Liquidität 2. Grades aus Etappe 3. Welche Aussage trifft zu? 1) Alles super, wir haben genug Cash. 2) Kritisch, da der Wert unter 100 % liegt und wir auf Warenverkäufe angewiesen sind. 3) Zu hoch, das Geld arbeitet nicht.',
        fields: [
          { key: 'liq2_analysis', label: 'Richtige Option', unit: '1, 2 oder 3', mode: 'choice', ariaLabel: 'Richtige Transferoption für Liquidität 2' },
        ],
        dependsOn: [3],
        dependencyHint: 'Die Interpretation ist nur belastbar, wenn die Liquidität 2 korrekt gerechnet wurde.',
        // Solver 4: Bewertet die fachlich korrekte Interpretation des Quick Ratio.
        solver: () => ({
          liq2_analysis: '2',
        }),
      },
      {
        id: 5,
        title: '5. Maßnahmen zur Steigerung der Liquidität',
        prompt: () => 'Welche Maßnahme verbessert die Liquidität 2. Grades sofort? Nenne mindestens eine sinnvolle Controlling-Maßnahme.',
        fields: [
          {
            key: 'liq_action',
            label: 'Maßnahme (Freitext)',
            unit: 'Text',
            mode: 'contains_any',
            inputType: 'textarea',
            ariaLabel: 'Freitext zu Liquiditätsmaßnahmen',
          },
        ],
        // Solver 5: Akzeptiert mehrere typische Sofortmaßnahmen.
        solver: () => ({
          liq_action: ['factoring', 'mahnwesen', 'skonto', 'lager abbauen', 'forderungsmanagement'],
        }),
      },
      {
        id: 6,
        title: '6. Zielkonflikt: Rentabilität vs. Liquidität',
        prompt: () => 'Wenn wir Schulden sofort tilgen (Cash sinkt), was passiert mit der Liquidität 1. Grades? A) Sie steigt deutlich. B) Sie sinkt, weil Kasse/Bank unmittelbar abnimmt. C) Sie bleibt unverändert.',
        fields: [
          { key: 'target_conflict', label: 'Richtige Option', unit: 'A, B oder C', mode: 'choice', ariaLabel: 'Richtige Option zum Zielkonflikt' },
        ],
        // Solver 6: Prüft das Verstaendnis des Zielkonflikts.
        solver: () => ({
          target_conflict: 'B',
        }),
      },
    ];
  }

  createSortimentRetourenTasks() {
    return [
      {
        id: 1,
        title: '1. Retourenquote berechnen',
        prompt: (ctx) => `Die ${ctx.companyName} prüft das ${ctx.categoryName}. Gegeben: Gesamtbestellungen ${ctx.totalOrders}, retournierte Bestellungen ${ctx.returnedOrders}.`,
        fields: [
          { key: 'returnRate', label: 'Retourenquote', unit: '%', tolerance: 0.02, ariaLabel: 'Retourenquote in Prozent' },
        ],
        solver: (ctx) => ({
          returnRate: commercialRound((ctx.returnedOrders / ctx.totalOrders) * 100),
        }),
      },
      {
        id: 2,
        title: '2. Stornoquote berechnen',
        prompt: (ctx) => `Im selben Quartal wurden ${ctx.canceledOrders} Bestellungen vor Versand storniert, bei insgesamt ${ctx.totalOrders} Bestellungen.`,
        fields: [
          { key: 'cancellationRate', label: 'Stornoquote', unit: '%', tolerance: 0.02, ariaLabel: 'Stornoquote in Prozent' },
        ],
        dependsOn: [1],
        dependencyHint: 'Nutze denselben Bezugswert wie bei der Retourenquote: Gesamtbestellungen.',
        solver: (ctx) => ({
          cancellationRate: commercialRound((ctx.canceledOrders / ctx.totalOrders) * 100),
        }),
      },
      {
        id: 3,
        title: '3. Reklamationsanalyse',
        prompt: (ctx) => `Segment ${ctx.jacketProductName}: verkauft ${ctx.soldJackets} Stück, Reklamationen gesamt ${ctx.complaintsTotal}, davon berechtigt ${ctx.justifiedComplaints}, unberechtigt ${ctx.unjustifiedComplaints}.`,
        fields: [
          { key: 'complaintRate', label: 'Reklamationsquote', unit: '%', tolerance: 0.02, ariaLabel: 'Reklamationsquote in Prozent' },
          { key: 'justifiedComplaintShare', label: 'Anteil berechtigter Reklamationen', unit: '%', tolerance: 0.02, ariaLabel: 'Anteil berechtigter Reklamationen in Prozent' },
          { key: 'qualityIssueLikely', label: 'Qualitätsproblem wahrscheinlich? (JA/NEIN)', unit: 'JA oder NEIN', mode: 'choice', ariaLabel: 'Qualitätsproblem mit JA oder NEIN bewerten' },
        ],
        dependsOn: [1, 2],
        dependencyHint: 'Bewertung ist nur belastbar, wenn Quoten sauber berechnet wurden.',
        solver: (ctx) => ({
          complaintRate: commercialRound((ctx.complaintsTotal / ctx.soldJackets) * 100),
          justifiedComplaintShare: commercialRound((ctx.justifiedComplaints / ctx.complaintsTotal) * 100),
          qualityIssueLikely: ctx.qualityIssueLikely,
        }),
      },
      {
        id: 4,
        title: '4. Customer Lifetime Value (CLV)',
        prompt: (ctx) => `Aktive Kundengruppe: Ø Umsatz je Bestellung ${formatMoney(ctx.avgOrderRevenue)}, Ø Deckungsbeitrag je Bestellung ${formatMoney(ctx.avgContributionPerOrder)}, ${ctx.ordersPerYear} Bestellungen/Jahr, Kundenbeziehung ${ctx.customerYears} Jahre, Marketingkosten ${formatMoney(ctx.yearlyMarketingCostPerCustomer)} pro Kunde und Jahr.`,
        fields: [
          { key: 'clv', label: 'Customer Lifetime Value', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Customer Lifetime Value in Euro' },
        ],
        dependsOn: [3],
        dependencyHint: 'Verwende den Deckungsbeitrag als Basis und ziehe Marketingkosten über die Laufzeit ab.',
        solver: (ctx) => ({
          clv: commercialRound(
            (ctx.avgContributionPerOrder * ctx.ordersPerYear * ctx.customerYears)
            - (ctx.yearlyMarketingCostPerCustomer * ctx.customerYears)
          ),
        }),
      },
      {
        id: 5,
        title: '5. Break-even-Analyse Sortiment',
        prompt: (ctx) => `Für ${ctx.pantsProductName}: Fixkosten ${formatMoney(ctx.fixedCostPants)} p.a., Verkaufspreis ${formatMoney(ctx.salesPricePants)} je Stück, variable Kosten ${formatMoney(ctx.variableCostPants)} je Stück, geplanter Absatz ${ctx.plannedSalesPants} Stück.`,
        fields: [
          { key: 'dbUnitPants', label: 'Deckungsbeitrag pro Stück', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Deckungsbeitrag pro Stück in Euro' },
          { key: 'breakEvenQtyPants', label: 'Break-even-Menge', unit: 'Stück', tolerance: 0.5, ariaLabel: 'Break-even-Menge in Stück' },
          { key: 'isPantsEconomicAtPlan', label: 'Beim geplanten Absatz wirtschaftlich? (JA/NEIN)', unit: 'JA oder NEIN', mode: 'choice', ariaLabel: 'Wirtschaftlichkeit beim geplanten Absatz mit JA oder NEIN bewerten' },
        ],
        dependsOn: [4],
        dependencyHint: 'Break-even-Menge immer aufrunden und dann mit dem Planabsatz vergleichen.',
        solver: (ctx) => ({
          dbUnitPants: commercialRound(ctx.salesPricePants - ctx.variableCostPants),
          breakEvenQtyPants: Math.ceil(ctx.fixedCostPants / (ctx.salesPricePants - ctx.variableCostPants)),
          isPantsEconomicAtPlan: ctx.isPantsEconomicAtPlan,
        }),
      },
      {
        id: 6,
        title: '6. Umsatzrentabilität',
        prompt: (ctx) => `Q1-Daten ${ctx.companyName}: Umsatz ${formatMoney(ctx.outdoorRevenueQ1)}, Gewinn ${formatMoney(ctx.outdoorProfitQ1)}.`,
        fields: [
          { key: 'revenueProfitability', label: 'Umsatzrentabilität', unit: '%', tolerance: 0.02, ariaLabel: 'Umsatzrentabilität in Prozent' },
        ],
        dependsOn: [5],
        dependencyHint: 'Setze Gewinn ins Verhältnis zum Umsatz und multipliziere mit 100.',
        solver: (ctx) => ({
          revenueProfitability: commercialRound((ctx.outdoorProfitQ1 / ctx.outdoorRevenueQ1) * 100),
        }),
      },
      {
        id: 7,
        title: '7. Mini-Handelskalkulation rückwärts',
        prompt: (ctx) => `Vorgaben Vertrieb: Listenverkaufspreis brutto ${formatMoney(ctx.listSalesPriceGross)}, Umsatzsteuer ${ctx.vatRate} %, Kundenrabatt ${ctx.customerDiscountRate} %, Kundenskonto ${ctx.customerSkontoRate} %, Gewinnzuschlag ${ctx.profitMarkupRate} %, Handlungskostenzuschlag ${ctx.handlingCostRate} %.`,
        fields: [
          { key: 'maxPurchasePrice', label: 'Maximal zulässiger Einstandspreis', unit: 'EUR', tolerance: 0.02, ariaLabel: 'Maximal zulässiger Einstandspreis in Euro' },
        ],
        dependsOn: [6],
        dependencyHint: 'Rechne strikt rückwärts von brutto über netto, Rabatt, Skonto, Gewinn und Handlungskosten.',
        solver: (ctx) => ({
          maxPurchasePrice: commercialRound(
            (
              (
                commercialRound(
                  commercialRound(
                    commercialRound(ctx.listSalesPriceGross / (1 + ctx.vatRate / 100))
                    * (1 - ctx.customerDiscountRate / 100)
                  )
                  * (1 - ctx.customerSkontoRate / 100)
                ) / (1 + ctx.profitMarkupRate / 100)
              ) / (1 + ctx.handlingCostRate / 100)
            )
          ),
        }),
      },
      {
        id: 8,
        title: '8. Maßnahmen zur Retourenoptimierung',
        prompt: () => 'Formuliere drei konkrete Maßnahmen zur Reduzierung der Retourenquote. Nutze die Ergebnisse zu Retouren, Storno, Reklamationen und CLV.',
        fields: [
          {
            key: 'measureSizing',
            label: 'Maßnahme 1 (z. B. Größenberatung/Produktdarstellung)',
            unit: 'Text',
            mode: 'contains_any',
            inputType: 'textarea',
            ariaLabel: 'Maßnahme 1 zur Retourenreduzierung',
          },
          {
            key: 'measureQuality',
            label: 'Maßnahme 2 (z. B. Qualität/Reklamation)',
            unit: 'Text',
            mode: 'contains_any',
            inputType: 'textarea',
            ariaLabel: 'Maßnahme 2 zur Retourenreduzierung',
          },
          {
            key: 'measureProcess',
            label: 'Maßnahme 3 (z. B. Storno/Prozess/CLV)',
            unit: 'Text',
            mode: 'contains_any',
            inputType: 'textarea',
            ariaLabel: 'Maßnahme 3 zur Retourenreduzierung',
          },
        ],
        dependsOn: [1, 2, 3, 4, 7],
        dependencyHint: 'Leite Maßnahmen direkt aus den Kennzahlen und Ursachen ab.',
        solver: () => ({
          measureSizing: ['größe', 'größen', 'produktbild', 'produktbeschreibung', 'maßtabelle', 'passform'],
          measureQuality: ['qualitätsprüfung', 'qualitätskontrolle', 'materialprüfung', 'reklamation', 'lieferant', 'fehleranalyse'],
          measureProcess: ['storno', 'lieferzeit', 'checkout', 'mahnwesen', 'clv', 'kundenbindung', 'service'],
        }),
      },
    ];
  }

  renderShell() {
    const isFinance = this.variant === 'finance-liquidity';
    const isSortiment = this.variant === 'sortiment-retouren-3e';
    const kicker = isSortiment ? 'Sortiments-Lab' : isFinance ? 'Controlling-Lab' : 'Kostenrechnung';
    const title = isSortiment ? 'Sortimentsanalyse & Retourenmanagement' : isFinance ? 'Finanz-Analyse & Liquiditätsmanagement' : 'Kostenrechnung & Preisuntergrenze';
    const contextLine = isSortiment
      ? `${this.state.data.companyName} · Bereich: ${this.state.data.categoryName}`
      : isFinance
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
            <button type="button" class="ccm-btn ccm-btn-primary" data-action="check">Prüfen</button>
            <button type="button" class="ccm-btn ccm-btn-secondary" data-action="next">Weiter</button>
            <button type="button" class="ccm-btn ccm-btn-secondary" data-action="ai-check">KI-Textcheck</button>
            <button type="button" class="ccm-btn ccm-btn-ghost" data-action="restart">Neu starten</button>
          </div>
          <p class="ccm-action-hint" data-role="action-hint">Erst prüfen, dann weiter.</p>
        </footer>
      </section>
    `;

    this.progressBar = this.container.querySelector('[data-role="progress-bar"]');
    this.progressLabel = this.container.querySelector('[data-role="progress-label"]');
    this.scoreEl = this.container.querySelector('[data-role="score"]');
    this.taskCard = this.container.querySelector('[data-role="task-card"]');
    this.nextBtn = this.container.querySelector('[data-action="next"]');
    this.aiCheckBtn = this.container.querySelector('[data-action="ai-check"]');
    this.actionHintEl = this.container.querySelector('[data-role="action-hint"]');
  }

  bindGlobalActions() {
    this.container.addEventListener('click', (event) => {
      const action = event.target?.dataset?.action;
      if (action === 'check') this.validateCurrentTask();
      if (action === 'next') this.nextTask();
      if (action === 'restart') this.reset();
      if (action === 'toggle-stage7-example') {
        this.state.showStage7Example = !this.state.showStage7Example;
        this.renderTask();
      }
      if (action === 'ai-check') this.runAiTextCheck();
    });

    const syncInputToState = (event) => {
      const input = event.target;
      if (!input.matches('.ccm-step-input')) return;
      const task = this.tasks[this.state.currentTask];
      const taskId = task.id;
      this.state.userInputs[taskId] = this.state.userInputs[taskId] || {};
      this.state.userInputs[taskId][input.name] = input.value;

      // Feedback bleibt sichtbar; bei Aenderung ist aber eine neue Prüfung erforderlich.
      if (this.state.lastValidation?.taskId === task.id) {
        this.state.lastValidation.isDirty = true;
        this.updateActionState();
      }

      if (this.isStage7BusinessEvaluation(task)) {
        this.state.aiFeedback = '';
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

    const currentTask = this.tasks[this.state.currentTask];
    const aiCheckActive = this.isStage7BusinessEvaluation(currentTask);
    if (this.aiCheckBtn) {
      const stageInput = this.state.userInputs[currentTask.id] || {};
      const hasText = String(stageInput.businessEvaluation || '').trim().length > 0;
      this.aiCheckBtn.style.display = aiCheckActive ? 'inline-flex' : 'none';
      this.aiCheckBtn.disabled = !aiCheckActive || !hasText || this.state.aiFeedbackLoading;
      this.aiCheckBtn.textContent = this.state.aiFeedbackLoading ? 'KI prüft...' : 'KI-Textcheck';
    }

    const canProceed = this.canProceedCurrentTask();
    this.nextBtn.disabled = !canProceed;

    if (canProceed) {
      this.actionHintEl.textContent = 'Etappe geprüft. Du kannst jetzt weiter.';
      return;
    }

    const task = this.tasks[this.state.currentTask];
    const hasValidation = this.state.lastValidation?.taskId === task.id;
    if (!hasValidation) {
      this.actionHintEl.textContent = 'Erst prüfen, dann weiter.';
      return;
    }

    if (this.state.lastValidation?.isDirty) {
      this.actionHintEl.textContent = 'Eingabe geändert: Bitte erneut prüfen.';
      return;
    }

    if (this.state.lastValidation?.hasFollowError) {
      this.actionHintEl.textContent = 'Vorstufe korrigieren: Diese Etappe zählt erst dann vollständig.';
      return;
    }

    this.actionHintEl.textContent = 'Bitte alle Felder auf OK bringen und erneut prüfen.';
  }

  async runAiTextCheck() {
    const task = this.tasks[this.state.currentTask];
    if (!this.isStage7BusinessEvaluation(task)) return;

    const entered = this.state.userInputs[task.id] || {};
    const text = String(entered.businessEvaluation || '').trim();
    if (!text) {
      this.state.aiFeedback = 'Bitte zuerst einen Bewertungstext eingeben.';
      this.renderTask();
      return;
    }

    this.state.aiFeedbackLoading = true;
    this.state.aiFeedback = '';
    this.updateActionState();

    const prompt = [
      'Bitte prüfe meinen Bewertungstext zur Kostenrechnung fachlich und didaktisch.',
      'Gib mir kurz und klar:',
      '1) Was ist gut (1 Satz).',
      '2) Maximal 3 konkrete Verbesserungen als Liste.',
      '3) Einen verbesserten Beispielsatz (1-2 Sätze).',
      '',
      `Mein Text: ${text}`,
    ].join('\n');

    const contextQuestion = 'Etappe 7: Wirtschaftliche Bewertung in der Kostenrechnung';
    const contextAnswer = 'Der Text soll Deckungsbeitrag, Preisuntergrenze, Break-even, Fixkosten und Sortimentsentscheidung fachlich korrekt verbinden.';

    try {
      const response = await askGemini(prompt, contextQuestion, contextAnswer);
      this.state.aiFeedback = String(response || 'Keine KI-Antwort erhalten.').trim();
    } catch (_ERROR) {
      this.state.aiFeedback = 'Die KI-Prüfung konnte gerade nicht geladen werden. Bitte erneut versuchen.';
    } finally {
      this.state.aiFeedbackLoading = false;
      this.renderTask();
    }
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

    const stage7Tools = this.isStage7BusinessEvaluation(task)
      ? `
        <div class="ccm-inline-tools">
          <button type="button" class="ccm-inline-btn" data-action="toggle-stage7-example">Info / Beispiel</button>
        </div>
      `
      : '';

    const stage7Example = this.isStage7BusinessEvaluation(task) && this.state.showStage7Example
      ? `
        <div class="ccm-example-box">
          Beispiel: Der Stückdeckungsbeitrag ist positiv, dadurch liegt die kurzfristige Preisuntergrenze unter dem Verkaufspreis. Die Break-even-Menge ist erreichbar, dennoch bleiben die hohen Fixkosten ein Risiko. Deshalb ist die Sortimentsentscheidung nur sinnvoll, wenn der Deckungsbeitrag dauerhaft über den einsparbaren Fixkosten liegt.
        </div>
      `
      : '';

    const stage7AiFeedback = this.isStage7BusinessEvaluation(task) && this.state.aiFeedback
      ? `<div class="ccm-ai-box">${this.state.aiFeedback.replace(/\n/g, '<br/>')}</div>`
      : '';

    this.taskCard.innerHTML = `
      <div class="ccm-stage-stack">
        ${previousSections}
        <div class="ccm-stage ccm-stage-current">
          <div class="ccm-stage-head">
            <h3>${task.title}</h3>
            <p>${task.prompt(this.state.data)}</p>
          </div>
          ${stage7Tools}
          ${stage7Example}
          ${rows}
          ${hintBox}
          ${stage7AiFeedback}
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
        ? 'Nenne mindestens eine konkrete Maßnahme, z. B. Factoring, Mahnwesen oder Skonto.'
        : hasContainsAll
          ? 'Bitte alle geforderten Kernaspekte im Text nennen.'
          : 'Bitte Werte prüfen. Tipp: Rechne kaufmännisch auf 2 Dezimalstellen.')
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

    if (!isSoft && this.onLearningEvent) {
      const taskPrompt = typeof task.prompt === 'function' ? task.prompt(this.state.data) : '';
      this.onLearningEvent({
        mode: 'cost_calc_module',
        questionId: `${this.variant}_stage_${task.id}`,
        questionText: `${task.title}: ${String(taskPrompt).slice(0, 160)}`,
        correct: validatedWithDependencies,
        userAnswer: JSON.stringify(entered).slice(0, 240),
        expectedAnswer: 'Alle Felder korrekt und ohne Folgefehler.',
        topic: this.variant === 'finance-liquidity'
          ? 'Finanz-Analyse & Liquiditätsmanagement'
          : this.variant === 'sortiment-retouren-3e'
            ? 'Sortimentsanalyse & Retourenmanagement'
            : 'Kostenrechnung & Preisuntergrenze',
      });
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
        hintMessage: this.state.lastValidation?.hintMessage || 'Bitte zuerst auf "Prüfen" klicken und alle Felder korrekt lösen.',
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
