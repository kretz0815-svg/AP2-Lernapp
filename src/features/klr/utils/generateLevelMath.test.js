import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel2Math, generateLevel4Math } from './generateLevelMath.js';

test('Level 2 generates integer-safe allocations with exact sum', () => {
    for (let i = 0; i < 120; i += 1) {
        const math = generateLevel2Math();
        const { lager, packstation, buero, total } = math.key;
        const sumAlloc = math.allocations.lager + math.allocations.packstation + math.allocations.buero;

        assert.equal(lager + packstation + buero, total);
        assert.equal(sumAlloc, math.baseCost);
        assert.equal(math.baseCost % total, 0);
        assert.equal(Number.isInteger(math.costPerKeyUnit), true);
        assert.equal(Number.isInteger(math.allocations.lager), true);
        assert.equal(Number.isInteger(math.allocations.packstation), true);
        assert.equal(Number.isInteger(math.allocations.buero), true);
    }
});

test('Level 4 generates only valid prices with integer break-even units', () => {
    for (let i = 0; i < 120; i += 1) {
        const math = generateLevel4Math();
        assert.ok(math.allowedPrices.length > 0);

        for (const price of math.allowedPrices) {
            const db = price - math.variableCostPerUnit;
            assert.ok(db > 0);
            assert.equal(math.fixedCost % db, 0);
        }

        assert.equal(
            Number.isInteger(math.target.breakEvenUnits),
            true,
            'Target break-even must be integer'
        );
    }
});
