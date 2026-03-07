const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

const intInRange = (min, max, rng = Math.random) => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(rng() * (hi - lo + 1)) + lo;
};

const divisors = (n) => {
    const out = [];
    for (let i = 1; i * i <= n; i += 1) {
        if (n % i !== 0) continue;
        out.push(i);
        if (i !== n / i) out.push(n / i);
    }
    return out.sort((a, b) => a - b);
};

const validateLevel2 = (math) => {
    if (!Number.isInteger(math.baseCost)) throw new Error('Level 2 invalid: baseCost must be integer');
    if (!Number.isInteger(math.key.total) || math.key.total <= 0) throw new Error('Level 2 invalid: key.total');
    if (math.baseCost % math.key.total !== 0) throw new Error('Level 2 invalid: baseCost not divisible by key.total');
    const shareSum = math.allocations.lager + math.allocations.packstation + math.allocations.buero;
    if (shareSum !== math.baseCost) throw new Error('Level 2 invalid: allocation sum mismatch');
    if (!Object.values(math.allocations).every(Number.isInteger)) throw new Error('Level 2 invalid: allocations must be integers');
};

const validateLevel4 = (math) => {
    if (!Number.isInteger(math.fixedCost) || math.fixedCost <= 0) throw new Error('Level 4 invalid: fixedCost');
    if (!Number.isInteger(math.variableCostPerUnit) || math.variableCostPerUnit <= 0) throw new Error('Level 4 invalid: variableCostPerUnit');
    if (!Array.isArray(math.allowedPrices) || math.allowedPrices.length === 0) throw new Error('Level 4 invalid: allowedPrices');
    for (const price of math.allowedPrices) {
        const db = price - math.variableCostPerUnit;
        if (db <= 0) throw new Error('Level 4 invalid: non-positive DB');
        if (math.fixedCost % db !== 0) throw new Error('Level 4 invalid: break-even not integer for allowed price');
    }
    if (!Number.isInteger(math.target.breakEvenUnits) || math.target.breakEvenUnits <= 0) throw new Error('Level 4 invalid: target break-even units');
};

export function generateLevel2Math(rng = Math.random) {
    const totalSqm = pick([60, 80, 100, 120, 150, 200], rng);
    const costPerSqm = pick([20, 25, 30, 35, 40, 45, 50, 60], rng);

    let lagerSqm = 0;
    let packSqm = 0;
    let bueroSqm = 0;

    for (let attempts = 0; attempts < 200; attempts += 1) {
        lagerSqm = intInRange(Math.floor(totalSqm * 0.45), Math.floor(totalSqm * 0.7), rng);
        packSqm = intInRange(Math.floor(totalSqm * 0.15), Math.floor(totalSqm * 0.35), rng);
        bueroSqm = totalSqm - lagerSqm - packSqm;
        if (bueroSqm >= Math.floor(totalSqm * 0.1) && bueroSqm <= Math.floor(totalSqm * 0.3)) break;
    }

    const baseCost = totalSqm * costPerSqm;
    const allocations = {
        lager: lagerSqm * costPerSqm,
        packstation: packSqm * costPerSqm,
        buero: bueroSqm * costPerSqm
    };

    const math = {
        level: 2,
        scenario: 'Lagermiete',
        unit: 'm²',
        baseCost,
        key: {
            lager: lagerSqm,
            packstation: packSqm,
            buero: bueroSqm,
            total: totalSqm
        },
        costPerKeyUnit: costPerSqm,
        allocations
    };

    validateLevel2(math);
    return math;
}

export function generateLevel4Math(rng = Math.random) {
    const fixedCost = pick([5000, 6000, 7200, 8000, 9000, 10000, 12000, 15000], rng);
    const variableCostPerUnit = pick([15, 20, 24, 25, 30, 35, 40], rng);

    const allowedDeckungsbeitraege = divisors(fixedCost)
        .filter((db) => db > 0 && db <= 120)
        .filter((db) => variableCostPerUnit + db <= 220);

    if (allowedDeckungsbeitraege.length < 4) {
        throw new Error('Level 4 invalid: too few valid deckungsbeitraege');
    }

    const allowedPrices = allowedDeckungsbeitraege
        .map((db) => variableCostPerUnit + db)
        .sort((a, b) => a - b);

    const targetPrice = pick(allowedPrices, rng);
    const db = targetPrice - variableCostPerUnit;
    const breakEvenUnits = fixedCost / db;

    const math = {
        level: 4,
        fixedCost,
        variableCostPerUnit,
        allowedDeckungsbeitraege,
        allowedPrices,
        target: {
            price: targetPrice,
            deckungsbeitrag: db,
            breakEvenUnits
        },
        slider: {
            min: allowedPrices[0],
            max: allowedPrices[allowedPrices.length - 1],
            allowedSteps: allowedPrices
        }
    };

    validateLevel4(math);
    return math;
}

export function generateLevelMath(levelId, rng = Math.random) {
    if (levelId === 2) return generateLevel2Math(rng);
    if (levelId === 4) return generateLevel4Math(rng);
    throw new Error(`No generator implemented for level ${levelId}`);
}
