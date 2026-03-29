import React, { useState, useRef, useEffect } from 'react';
import { fetchYouTubeVideos } from '../youtubeClient';
import { askGemini } from '../geminiClient';
import FloatingPortal from './FloatingPortal';
import GeminiPanel from './GeminiPanel';
import Confetti from './Confetti';

// ═══════════════════════════════════════════════════════════════
// KALKULATIONS-BOSS – Interaktives Lernspiel für Handelskalkulation
// ═══════════════════════════════════════════════════════════════

const round2 = (n) => Math.round(n * 100) / 100;
const toCents = (n) => Math.round((Number(n) + Number.EPSILON) * 100);

// ── Kaufmännische Rundung (Source of Truth) ──────────────────
const commercialRound = (v) => Math.round(v * 100) / 100;
const FLAWLESS_COMPLETED_STORAGE_KEY = 'kalk_boss_completed_flawless';

// ── Zufällige glatte Zahl in einem Bereich ──────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPrice = (min, max) => commercialRound(randInt(Math.round(min * 100), Math.round(max * 100)) / 100);

// Format helper for hints
const fmt = (v) => v.toFixed(2).replace('.', ',');
const formatEuro = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatEuroWithSymbol = (v) => `${formatEuro(v)}\u00A0€`;

// ── Level-Metadaten (statisch, nur Darstellung) ─────────────
const LEVEL_CONFIG = [
    {
        id: 1, title: 'Vorwärtskalkulation', subtitle: 'Anfänger',
        story: 'Berechne den Angebotspreis für einen Kunden.',
        direction: 'forward', color: '#22c55e',
        youtubeQuery: 'Vorwärtskalkulation Handelskalkulation Kaufmann einfach erklärt',
    },
    {
        id: 2, title: 'Rückwärtskalkulation', subtitle: 'Mittel',
        story: 'Der Marktpreis steht fest. Wie hoch darf dein Einkaufspreis maximal sein?',
        direction: 'backward', color: '#f59e0b',
        youtubeQuery: 'Rückwärtskalkulation Handelskalkulation Kaufmann einfach erklärt',
    },
    {
        id: 3, title: 'Differenzkalkulation', subtitle: 'Schwer',
        story: 'Kunde diktiert den Verkaufspreis, Lieferant den Einkaufspreis. Wie viel Gewinn bleibt?',
        direction: 'diff', color: '#ef4444',
        youtubeQuery: 'Differenzkalkulation Handelskalkulation Kaufmann einfach erklärt',
    },
    {
        id: 4, title: 'Boss-Modus', subtitle: 'Boss',
        story: 'Alle Kalkulationsarten – mit begrenzten Leben! Schaffst du den Deal?',
        direction: 'boss', color: '#a855f7',
        youtubeQuery: 'Handelskalkulation komplett einfach erklärt IHK',
    },
    {
        id: 5, title: 'Spannen-Profi', subtitle: 'Generator',
        story: 'Endlos-Training zur Handelsspanne für E-Commerce Kaufleute.',
        direction: 'retail_margin', color: '#0ea5e9',
        youtubeQuery: 'Handelsspanne berechnen Handelskalkulation einfach erklärt',
    },
    {
        id: 6, title: 'Mathe-Boss-Modus: Break-Even-Point', subtitle: 'Kritischer Umsatz',
        story: 'Drei E-Commerce-Entscheidungen: Finde den kritischen Umsatz, bei dem intern und extern gleich teuer sind.',
        direction: 'critical_revenue', color: '#14b8a6',
        youtubeQuery: 'Break-Even-Point kritischer Umsatz E-Commerce einfach erklärt',
    },
];

const CRITICAL_REVENUE_SCENARIOS = [
    {
        title: 'Level 1: Das CRM-Dilemma',
        story: 'Wir brauchen ein neues Kundenbindungsprogramm für die nächsten 12 Monate.',
        internalLabel: 'Interne IT-Abteilung',
        externalLabel: 'Externe Agentur',
        externalFixLabel: 'Einrichtungspauschale extern',
        monthlyHint: 'Tipp: Hast du daran gedacht, alle monatlichen internen Kosten mit 12 zu multiplizieren?',
        provisionPercent: 5,
        generateInternal: () => {
            const development = randInt(6, 12) * 1000;
            const operationMonthly = randInt(10, 20) * 100;
            const serverMonthly = randInt(4, 10) * 100;
            return {
                internalFix: development,
                internalMonthly: operationMonthly + serverMonthly,
                parts: [
                    { label: 'Entwicklung (einmalig)', value: development },
                    { label: `Betrieb (${operationMonthly.toLocaleString('de-DE')} € × 12)`, value: operationMonthly * 12 },
                    { label: `Server (${serverMonthly.toLocaleString('de-DE')} € × 12)`, value: serverMonthly * 12 },
                ]
            };
        }
    },
    {
        title: 'Level 2: Der KI-Retourenmanager',
        story: 'Wir wollen eine KI zur Retourenvermeidung für ein Jahr einbinden.',
        internalLabel: 'Eigenentwicklung',
        externalLabel: 'SaaS-Provider',
        externalFixLabel: 'Setup-Gebühr extern',
        monthlyHint: 'Tipp: Wartung + API-Lizenzen sind monatlich – beide Positionen über 12 Monate einrechnen.',
        provisionPercent: 2,
        generateInternal: () => {
            const development = randInt(10, 16) * 1000;
            const maintenanceMonthly = randInt(8, 14) * 100;
            const apiMonthly = randInt(2, 6) * 100;
            return {
                internalFix: development,
                internalMonthly: maintenanceMonthly + apiMonthly,
                parts: [
                    { label: 'Entwicklung (einmalig)', value: development },
                    { label: `Wartung (${maintenanceMonthly.toLocaleString('de-DE')} € × 12)`, value: maintenanceMonthly * 12 },
                    { label: `API-Lizenzen (${apiMonthly.toLocaleString('de-DE')} € × 12)`, value: apiMonthly * 12 },
                ]
            };
        }
    },
    {
        title: 'Level 3: Der 3D-Konfigurator',
        story: 'Wir bauen einen 3D-Konfigurator für individualisierte Produkte (Kalkulation auf 12 Monate).',
        internalLabel: 'Eigenes Entwickler-Team',
        externalLabel: 'Externe Agentur',
        externalFixLabel: 'Basiszahlung extern',
        monthlyHint: 'Tipp: Vergiss nicht: interne Entwicklung = Personentage × Tagessatz, plus Cloud-Server über 12 Monate.',
        provisionPercent: 4,
        generateInternal: () => {
            const devDays = randInt(80, 140);
            const dayRate = randInt(25, 40) * 10;
            const cloudMonthly = randInt(20, 35) * 100;
            const development = devDays * dayRate;
            return {
                internalFix: development,
                internalMonthly: cloudMonthly,
                parts: [
                    { label: `Entwicklung (${devDays} Tage × ${dayRate.toLocaleString('de-DE')} €)`, value: development },
                    { label: `Cloud-Server (${cloudMonthly.toLocaleString('de-DE')} € × 12)`, value: cloudMonthly * 12 },
                ]
            };
        }
    }
];

// ══════════════════════════════════════════════════════════════
// DYNAMISCHE LEVEL-GENERIERUNG
// ══════════════════════════════════════════════════════════════

function generateLevel(config) {
    // Boss-Modus: zufällig eine der 3 Kalkulationsarten wählen
    if (config.direction === 'boss') {
        const types = ['forward', 'backward', 'diff'];
        const pick = types[Math.floor(Math.random() * types.length)];
        const subConfig = { ...config, direction: pick };
        const level = generateLevel(subConfig);
        // Restore boss metadata
        level.id = 4;
        level.title = 'Boss-Modus';
        level.color = '#a855f7';
        level.direction = 'boss';
        level.bossSubType = pick;
        level.subtitle = pick === 'forward' ? '⬇ Vorwärts' : pick === 'backward' ? '⬆ Rückwärts' : '🔀 Differenz';
        return level;
    }

    const hk_pct = randInt(10, 30);
    const gewinn_pct = randInt(5, 20);
    const skonto_pct = randInt(1, 3);
    const rabatt_pct = randInt(5, 15);

    if (config.direction === 'forward') {
        // ── Vorwärtskalkulation: Vollständig Top → Down ──
        const lieferrabatt_pct = randInt(5, 20);
        const lieferskonto_pct = randInt(1, 3);
        const provision_pct = randInt(2, 8);

        // Einkaufsseite
        const lep = randPrice(200, 800);
        const lieferrabatt = commercialRound(lep / 100 * lieferrabatt_pct);
        const zep = commercialRound(lep - lieferrabatt);
        const lieferskonto = commercialRound(zep / 100 * lieferskonto_pct);
        const bep = commercialRound(zep - lieferskonto);
        const bezugskosten = randPrice(10, 80);
        const bezugspreis = commercialRound(bep + bezugskosten);

        // Verkaufsseite
        const hk = commercialRound(bezugspreis / 100 * hk_pct);
        const sk = commercialRound(bezugspreis + hk);
        const gewinn = commercialRound(sk / 100 * gewinn_pct);
        const bvp = commercialRound(sk + gewinn);

        // Im Hundert: BVP = (100 - skonto_pct - provision_pct)% des ZVP
        const combined_pct = skonto_pct + provision_pct;
        const provision = commercialRound(bvp / (100 - combined_pct) * provision_pct);
        const skonto = commercialRound(bvp / (100 - combined_pct) * skonto_pct);
        const zvp = commercialRound(bvp + provision + skonto);

        // Im Hundert: ZVP = (100 - rabatt_pct)% des LVP
        const rabatt = commercialRound(zvp / (100 - rabatt_pct) * rabatt_pct);
        const lvp = commercialRound(zvp + rabatt);

        return {
            ...config, given: { lep, lieferrabatt_pct, lieferskonto_pct, bezugskosten, hk_pct, gewinn_pct, provision_pct, skonto_pct, rabatt_pct },
            steps: [
                { key: 'lep', label: 'Listeneinkaufspreis', value: lep, given: true },
                {
                    key: 'lieferrabatt', label: 'Lieferrabatt', sublabel: `${lieferrabatt_pct} % vom LEP`, value: lieferrabatt, given: false,
                    hint: `${fmt(lep)} ÷ 100 × ${lieferrabatt_pct} = ${fmt(lieferrabatt)} €\n(Vom Hundert: Basis = Listeneinkaufspreis)`
                },
                {
                    key: 'zep', label: '= Zieleinkaufspreis', value: zep, given: false, isSum: true,
                    hint: `${fmt(lep)} − ${fmt(lieferrabatt)} = ${fmt(zep)} €`
                },
                {
                    key: 'lieferskonto', label: 'Lieferskonto', sublabel: `${lieferskonto_pct} % vom ZEP`, value: lieferskonto, given: false,
                    hint: `${fmt(zep)} ÷ 100 × ${lieferskonto_pct} = ${fmt(lieferskonto)} €\n(Vom Hundert: Basis = Zieleinkaufspreis)`
                },
                {
                    key: 'bep', label: '= Bareinkaufspreis', value: bep, given: false, isSum: true,
                    hint: `${fmt(zep)} − ${fmt(lieferskonto)} = ${fmt(bep)} €`
                },
                { key: 'bezugskosten', label: 'Bezugskosten', value: bezugskosten, given: true },
                {
                    key: 'bezugspreis', label: '= Bezugspreis (Einstandspreis)', value: bezugspreis, given: false, isSum: true,
                    hint: `${fmt(bep)} + ${fmt(bezugskosten)} = ${fmt(bezugspreis)} €`
                },
                {
                    key: 'hk', label: 'Handlungskosten', sublabel: `${hk_pct} % vom Bezugspreis`, value: hk, given: false,
                    hint: `${fmt(bezugspreis)} ÷ 100 × ${hk_pct} = ${fmt(hk)} €\n(Vom Hundert: Basis = Bezugspreis)`
                },
                {
                    key: 'sk', label: '= Selbstkosten', value: sk, given: false, isSum: true,
                    hint: `${fmt(bezugspreis)} + ${fmt(hk)} = ${fmt(sk)} €`
                },
                {
                    key: 'gewinn', label: 'Gewinn', sublabel: `${gewinn_pct} % der SK`, value: gewinn, given: false,
                    hint: `${fmt(sk)} ÷ 100 × ${gewinn_pct} = ${fmt(gewinn)} €\n(Vom Hundert: Basis = Selbstkosten)`
                },
                {
                    key: 'bvp', label: '= Barverkaufspreis', value: bvp, given: false, isSum: true,
                    hint: `${fmt(sk)} + ${fmt(gewinn)} = ${fmt(bvp)} €`
                },
                {
                    key: 'provision', label: 'Vertreterprovision', sublabel: `${provision_pct} %`, value: provision, given: false,
                    hint: ` Im Hundert rechnen!\n${fmt(bvp)} ÷ ${100 - combined_pct} × ${provision_pct} = ${fmt(provision)} €\n(BVP = ${100 - combined_pct}% des ZVP)`
                },
                {
                    key: 'skonto', label: 'Kundenskonto', sublabel: `${skonto_pct} %`, value: skonto, given: false,
                    hint: ` Im Hundert rechnen!\n${fmt(bvp)} ÷ ${100 - combined_pct} × ${skonto_pct} = ${fmt(skonto)} €\n(BVP = ${100 - combined_pct}% des ZVP)`
                },
                {
                    key: 'zvp', label: '= Zielverkaufspreis', value: zvp, given: false, isSum: true,
                    hint: `${fmt(bvp)} + ${fmt(provision)} + ${fmt(skonto)} = ${fmt(zvp)} €`
                },
                {
                    key: 'rabatt', label: 'Kundenrabatt', sublabel: `${rabatt_pct} %`, value: rabatt, given: false,
                    hint: ` Im Hundert rechnen!\n${fmt(zvp)} ÷ ${100 - rabatt_pct} × ${rabatt_pct} = ${fmt(rabatt)} €\n(ZVP = ${100 - rabatt_pct}% des LVP)`
                },
                {
                    key: 'lvp', label: '= Listenverkaufspreis', value: lvp, given: false, isSum: true,
                    hint: `${fmt(zvp)} + ${fmt(rabatt)} = ${fmt(lvp)} €`
                },
            ]
        };
    }

    if (config.direction === 'backward') {
        // ── Rückwärtskalkulation: Bottom → Up ──
        const lvp = randPrice(400, 900);
        // Vom Hundert: Rabatt vom LVP
        const rabatt = commercialRound(lvp / 100 * rabatt_pct);
        const zvp = commercialRound(lvp - rabatt);
        // Vom Hundert: Skonto vom ZVP
        const skonto = commercialRound(zvp / 100 * skonto_pct);
        const bvp = commercialRound(zvp - skonto);
        // Auf Hundert: BVP = (100 + gewinn_pct)% der SK
        const gewinn = commercialRound(bvp / (100 + gewinn_pct) * gewinn_pct);
        const sk = commercialRound(bvp - gewinn);
        // Auf Hundert: SK = (100 + hk_pct)% des EP
        const hk = commercialRound(sk / (100 + hk_pct) * hk_pct);
        const ep = commercialRound(sk - hk);

        const bezugskosten = randPrice(10, 80);
        const lieferskonto_pct = randInt(1, 3);
        const lieferrabatt_pct = randInt(5, 20);

        const bep = commercialRound(ep - bezugskosten);
        // Im Hundert: BEP = (100 - lieferskonto_pct)% des ZEP
        const lieferskonto = commercialRound(bep / (100 - lieferskonto_pct) * lieferskonto_pct);
        const zep = commercialRound(bep + lieferskonto);
        // Im Hundert: ZEP = (100 - lieferrabatt_pct)% des LEP
        const lieferrabatt = commercialRound(zep / (100 - lieferrabatt_pct) * lieferrabatt_pct);
        const lep = commercialRound(zep + lieferrabatt);

        return {
            ...config, given: { lvp, hk_pct, gewinn_pct, skonto_pct, rabatt_pct, bezugskosten, lieferskonto_pct, lieferrabatt_pct },
            steps: [
                { key: 'lvp', label: 'Listenverkaufspreis', value: lvp, given: true },
                {
                    key: 'rabatt', label: 'Kundenrabatt', sublabel: `${rabatt_pct} %`, value: rabatt, given: false,
                    hint: `${fmt(lvp)} ÷ 100 × ${rabatt_pct} = ${fmt(rabatt)} €\n(Vom Hundert: Basis = LVP)`
                },
                {
                    key: 'zvp', label: '= Zielverkaufspreis', value: zvp, given: false, isSum: true,
                    hint: `${fmt(lvp)} − ${fmt(rabatt)} = ${fmt(zvp)} €`
                },
                {
                    key: 'skonto', label: 'Kundenskonto', sublabel: `${skonto_pct} %`, value: skonto, given: false,
                    hint: `${fmt(zvp)} ÷ 100 × ${skonto_pct} = ${fmt(skonto)} €\n(Vom Hundert: Basis = ZVP)`
                },
                {
                    key: 'bvp', label: '= Barverkaufspreis', value: bvp, given: false, isSum: true,
                    hint: `${fmt(zvp)} − ${fmt(skonto)} = ${fmt(bvp)} €`
                },
                {
                    key: 'gewinn', label: 'Gewinn', sublabel: `${gewinn_pct} %`, value: gewinn, given: false,
                    hint: ` Auf Hundert rechnen!\n${fmt(bvp)} ÷ ${100 + gewinn_pct} × ${gewinn_pct} = ${fmt(gewinn)} €\n(BVP = ${100 + gewinn_pct}% der SK)`
                },
                {
                    key: 'sk', label: '= Selbstkosten', value: sk, given: false, isSum: true,
                    hint: `${fmt(bvp)} − ${fmt(gewinn)} = ${fmt(sk)} €`
                },
                {
                    key: 'hk', label: 'Handlungskosten', sublabel: `${hk_pct} %`, value: hk, given: false,
                    hint: ` Auf Hundert rechnen!\n${fmt(sk)} ÷ ${100 + hk_pct} × ${hk_pct} = ${fmt(hk)} €\n(SK = ${100 + hk_pct}% des EP)`
                },
                {
                    key: 'ep', label: '= Einstandspreis (Bezugspreis)', value: ep, given: false, isSum: true,
                    hint: `${fmt(sk)} − ${fmt(hk)} = ${fmt(ep)} €`
                },
                { key: 'bezugskosten', label: 'Bezugskosten', value: bezugskosten, given: true },
                {
                    key: 'bep', label: '= Bareinkaufspreis', value: bep, given: false, isSum: true,
                    hint: `${fmt(ep)} − ${fmt(bezugskosten)} = ${fmt(bep)} €`
                },
                {
                    key: 'lieferskonto', label: 'Lieferskonto', sublabel: `${lieferskonto_pct} %`, value: lieferskonto, given: false,
                    hint: ` Im Hundert rechnen!\n${fmt(bep)} ÷ ${100 - lieferskonto_pct} × ${lieferskonto_pct} = ${fmt(lieferskonto)} €\n(BEP = ${100 - lieferskonto_pct}% des ZEP)`
                },
                {
                    key: 'zep', label: '= Zieleinkaufspreis', value: zep, given: false, isSum: true,
                    hint: `${fmt(bep)} + ${fmt(lieferskonto)} = ${fmt(zep)} €`
                },
                {
                    key: 'lieferrabatt', label: 'Lieferrabatt', sublabel: `${lieferrabatt_pct} %`, value: lieferrabatt, given: false,
                    hint: ` Im Hundert rechnen!\n${fmt(zep)} ÷ ${100 - lieferrabatt_pct} × ${lieferrabatt_pct} = ${fmt(lieferrabatt)} €\n(ZEP = ${100 - lieferrabatt_pct}% des LEP)`
                },
                {
                    key: 'lep', label: '= Listeneinkaufspreis', value: lep, given: false, isSum: true,
                    hint: `${fmt(zep)} + ${fmt(lieferrabatt)} = ${fmt(lep)} €`
                }
            ]
        };
    }

    if (config.direction === 'retail_margin') {
        // ── Handelsspannen-Generator ──
        // 1. GENERIERUNGS-LOGIK: Wähle saubere Wertepaare (E-Preis/V-Preis)
        const lvpBase = [50, 100, 150, 200, 250, 300, 400, 500, 800, 1000];
        const marginPctBase = [10, 20, 25, 30, 40, 50, 60, 75];
        
        let lvp, margin_pct, ep;
        // Sicherstellen, dass nur glatte Euro-Beträge entstehen
        do {
            lvp = lvpBase[Math.floor(Math.random() * lvpBase.length)];
            margin_pct = marginPctBase[Math.floor(Math.random() * marginPctBase.length)];
            ep = lvp * (1 - margin_pct / 100);
        } while (!Number.isInteger(ep));

        // 2. AUFGABEN-VARIATION: 3 versch. Textvorlagen
        const scenarios = [
            `Dein Shop bietet ein neues Produkt an. Der Einstandspreis (Bezugspreis) beträgt ${ep} €. Du verkaufst es im Shop für ${lvp} € (netto).`,
            `Auf einem Marktplatz wird ein Artikel zum Listenverkaufspreis von ${lvp} € (netto) angeboten. Dein Einstandspreis liegt bei ${ep} €.`,
            `Du kalkulierst für einen Zubehörartikel. Der Bezugspreis liegt bei ${ep} €. Im E-Commerce Shop soll der Preis bei ${lvp} € (netto) liegen.`
        ];
        const story = scenarios[Math.floor(Math.random() * scenarios.length)];

        return {
            ...config, story, given: { ep, lvp },
            steps: [
                { key: 'ep', label: 'Einstandspreis', value: ep, given: true },
                { key: 'lvp', label: 'Listenverkaufspreis (netto)', value: lvp, given: true },
                {
                    key: 'margin_pct_input', label: 'Handelsspanne in %', value: margin_pct, given: false, isPercent: true,
                    // 3. KI-FEEDBACK-LOOP (wird in die UI via Hint ausgespielt)
                    hint: `Schritt-für-Schritt-Herleitung:\n1. Differenz (Spanne in €) = LVP - EP = ${lvp} € - ${ep} € = ${lvp - ep} €\n2. Formel = (Spanne in € / LVP) * 100\n3. Rechnung = (${lvp - ep} / ${lvp}) * 100 = ${margin_pct} %\n(Lob bei Korrekt: Top! Die Spanne von ${margin_pct}% wurde korrekt ermittelt.)`
                },
            ]
        };
    }

    if (config.direction === 'critical_revenue') {
        return {
            ...config,
            steps: []
        };
    }

    // ── Differenzkalkulation: Zangengriff ──
    const ep = randPrice(100, 500);
    const lvp = randPrice(Math.max(ep + 50, ep * 1.1), ep * 1.8);
    // Phase 1: Vorwärts (EP → SK)
    const hk = commercialRound(ep / 100 * hk_pct);
    const sk = commercialRound(ep + hk);
    // Phase 2: Rückwärts (LVP → BVP) — vom Hundert
    const rabatt = commercialRound(lvp / 100 * rabatt_pct);
    const zvp = commercialRound(lvp - rabatt);
    const skonto = commercialRound(zvp / 100 * skonto_pct);
    const bvp = commercialRound(zvp - skonto);
    // Phase 3: Differenz
    const gewinn = commercialRound(bvp - sk);
    // Phase 4: Prozentsatz
    const gewinn_pct_result = commercialRound((gewinn / sk) * 100);

    return {
        ...config, given: { ep, hk_pct, lvp, rabatt_pct, skonto_pct },
        steps: [
            { key: 'ep', label: 'Einstandspreis', value: ep, given: true, phase: 1 },
            {
                key: 'hk', label: 'Handlungskosten', sublabel: `${hk_pct} % vom EP`, value: hk, given: false, phase: 1,
                hint: `${fmt(ep)} ÷ 100 × ${hk_pct} = ${fmt(hk)} €`
            },
            {
                key: 'sk', label: '= Selbstkosten', value: sk, given: false, isSum: true, phase: 1,
                hint: `${fmt(ep)} + ${fmt(hk)} = ${fmt(sk)} €`
            },
            { key: 'lvp', label: 'Listenverkaufspreis', value: lvp, given: true, phase: 2 },
            {
                key: 'rabatt', label: 'Kundenrabatt', sublabel: `${rabatt_pct} %`, value: rabatt, given: false, phase: 2,
                hint: `${fmt(lvp)} ÷ 100 × ${rabatt_pct} = ${fmt(rabatt)} €`
            },
            {
                key: 'zvp', label: '= Zielverkaufspreis', value: zvp, given: false, isSum: true, phase: 2,
                hint: `${fmt(lvp)} − ${fmt(rabatt)} = ${fmt(zvp)} €`
            },
            {
                key: 'skonto', label: 'Kundenskonto', sublabel: `${skonto_pct} %`, value: skonto, given: false, phase: 2,
                hint: `${fmt(zvp)} ÷ 100 × ${skonto_pct} = ${fmt(skonto)} €`
            },
            {
                key: 'bvp', label: '= Barverkaufspreis', value: bvp, given: false, isSum: true, phase: 2,
                hint: `${fmt(zvp)} − ${fmt(skonto)} = ${fmt(bvp)} €`
            },
            {
                key: 'gewinn', label: 'Gewinn (absolut)', value: gewinn, given: false, isSum: true, phase: 3,
                hint: `BVP − SK = ${fmt(bvp)} − ${fmt(sk)} = ${fmt(gewinn)} €`
            },
            {
                key: 'gewinn_pct', label: 'Gewinn in %', value: gewinn_pct_result, given: false, phase: 4, isPercent: true,
                hint: `(${fmt(gewinn)} ÷ ${fmt(sk)}) × 100 = ${fmt(gewinn_pct_result)} %\n(Gewinn ÷ Selbstkosten × 100)`
            },
        ]
    };
}

function createCriticalRevenueRound(scenarioIndex = 0) {
    const scenario = CRITICAL_REVENUE_SCENARIOS[scenarioIndex] || CRITICAL_REVENUE_SCENARIOS[0];
    const generated = scenario.generateInternal();

    const totalInternalCost = generated.internalFix + generated.internalMonthly * 12;
    const pct = scenario.provisionPercent;

    const diffCandidates = [];
    for (let diff = 10000; diff <= 20000; diff += 1000) {
        if (diff < totalInternalCost && (diff * 100) % pct === 0) diffCandidates.push(diff);
    }
    const diff = diffCandidates.length ? diffCandidates[randInt(0, diffCandidates.length - 1)] : (Math.floor((Math.min(totalInternalCost - 1000, 15000)) / pct) * pct);
    const externalFix = totalInternalCost - diff;
    const revenue = Math.round((diff * 100) / pct);

    const plausibleFallbacks = [
        Math.round((revenue * 0.6) / 100) * 100,
        Math.round((revenue * 0.8) / 100) * 100,
        Math.round((revenue * 1.25) / 100) * 100,
        Math.round((revenue * 1.5) / 100) * 100
    ];
    let fallbackIdx = 0;
    const nextFallback = () => {
        const candidate = plausibleFallbacks[fallbackIdx % plausibleFallbacks.length];
        fallbackIdx += 1;
        return Math.max(1000, candidate);
    };
    const normalizeDistractor = (value) => {
        const rounded = Math.round(Number(value || 0) / 100) * 100;
        // Keep options realistic relative to the true solution.
        if (!Number.isFinite(rounded) || rounded <= 0 || rounded < revenue * 0.35 || rounded > revenue * 2.2) {
            return nextFallback();
        }
        return rounded;
    };

    const distractorForgot12Raw = (generated.internalFix + generated.internalMonthly - externalFix) / (pct / 100);
    const distractorAddedRaw = (totalInternalCost + externalFix) / (pct / 100);
    const distractorRandomRaw = Math.random() < 0.5 ? revenue * 1.4 : revenue * 0.55;

    const distractorForgot12 = normalizeDistractor(distractorForgot12Raw);
    const distractorAdded = normalizeDistractor(distractorAddedRaw);
    const distractorRandom = normalizeDistractor(distractorRandomRaw);

    const optionsRaw = [revenue, distractorForgot12, distractorAdded, distractorRandom]
        .map((v) => Math.max(1000, Math.round(v / 100) * 100));

    const optionsUnique = [];
    optionsRaw.forEach((opt, idx) => {
        let candidate = opt;
        while (optionsUnique.includes(candidate)) {
            candidate += (idx + 1) * 1000;
        }
        optionsUnique.push(candidate);
    });

    const options = optionsUnique
        .map((value) => ({ id: `${value}_${Math.random()}`, value, isCorrect: value === revenue }))
        .sort(() => Math.random() - 0.5);

    return {
        scenarioIndex,
        ...scenario,
        internalFix: generated.internalFix,
        internalMonthly: generated.internalMonthly,
        internalParts: generated.parts,
        externalFix,
        provisionPercent: pct,
        totalInternalCost,
        revenue,
        options,
        solutionSteps: [
            `Schritt 1: Interne Gesamtkosten für 12 Monate berechnen`,
            ...generated.parts.map((p) => `• ${p.label}: ${formatEuroWithSymbol(p.value)}`),
            `• Gesamtkosten intern: ${formatEuroWithSymbol(totalInternalCost)}`,
            `Schritt 2: Gleichung aufstellen`,
            `${formatEuro(totalInternalCost)} = ${formatEuro(externalFix)} + ${(pct / 100).toFixed(2).replace('.', ',')} · U`,
            `Schritt 3: Nach U auflösen`,
            `${formatEuro(totalInternalCost - externalFix)} = ${(pct / 100).toFixed(2).replace('.', ',')} · U`,
            `U = ${formatEuroWithSymbol(totalInternalCost - externalFix)} / ${(pct / 100).toFixed(2).replace('.', ',')}`,
            `Ergebnis: U = ${formatEuroWithSymbol(revenue)}`
        ]
    };
}

// ── Phase Labels für Level 3 ───
const PHASE_LABELS = {
    1: { title: '⬇ Schritt 1: Vorwärts', color: '#22c55e', desc: 'Vom Einstandspreis bis zu den Selbstkosten' },
    2: { title: '⬆ Schritt 2: Rückwärts', color: '#f59e0b', desc: 'Vom Listenverkaufspreis bis zum Barverkaufspreis' },
    3: { title: '🎯 Schritt 3: Differenz', color: '#ef4444', desc: 'Gewinn = BVP − Selbstkosten' },
    4: { title: '📊 Schritt 4: Prozentsatz', color: '#a855f7', desc: 'Gewinnzuschlagssatz berechnen' },
};

// ═══════════════════════════════════════════════════════════════
// KOMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function KalkulationsBoss({ onBack, onLearningEvent, isGuest }) {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [inputs, setInputs] = useState({});
    const [validated, setValidated] = useState({});
    const [shaking, setShaking] = useState({});
    const [showHint, setShowHint] = useState({});
    const [wrongSteps, setWrongSteps] = useState({});
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [score, setScore] = useState(0);
    const [attempts, setAttempts] = useState({});
    const [levelHadErrors, setLevelHadErrors] = useState(false);

    // Boss-Modus Gamification
    const [lives, setLives] = useState(3);
    const [streak, setStreak] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [floatingPoints, setFloatingPoints] = useState(null); // { idx, points }
    const inputRefs = useRef({});
    const containerRef = useRef(null);
    const [criticalRoundIndex, setCriticalRoundIndex] = useState(0);
    const [criticalRound, setCriticalRound] = useState(null);
    const [criticalInput, setCriticalInput] = useState('');
    const [criticalMistakes, setCriticalMistakes] = useState(0);
    const [criticalFeedback, setCriticalFeedback] = useState('');
    const [criticalSolved, setCriticalSolved] = useState(false);
    const [criticalShowHintModal, setCriticalShowHintModal] = useState(false);
    const [criticalShowSolution, setCriticalShowSolution] = useState(false);
    const [criticalConfetti, setCriticalConfetti] = useState(false);

    // Video & KI state
    const [videoOpen, setVideoOpen] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [geminiVisible, setGeminiVisible] = useState(false);
    const [geminiQuery, setGeminiQuery] = useState('');
    const [geminiResponse, setGeminiResponse] = useState('');
    const [geminiLoading, setGeminiLoading] = useState(false);

    // Completed levels persistent
    const [completedLevels, setCompletedLevels] = useState(() => {
        try { return JSON.parse(localStorage.getItem(FLAWLESS_COMPLETED_STORAGE_KEY) || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem(FLAWLESS_COMPLETED_STORAGE_KEY, JSON.stringify(completedLevels));
    }, [completedLevels]);

    const startLevel = (config) => {
        const level = generateLevel(config);
        setSelectedLevel(level);
        setInputs({});
        setValidated({});
        setShaking({});
        setShowHint({});
        setWrongSteps({});
        setActiveStep(0);
        setCompleted(false);
        setScore(0);
        setAttempts({});
        setLevelHadErrors(false);
        // Boss-Modus reset
        setLives(3);
        setStreak(0);
        setGameOver(false);
        setFloatingPoints(null);
        // Reset video/KI
        setVideoOpen(false);
        setVideos([]);
        setSelectedVideo(null);
        setGeminiVisible(false);
        setGeminiQuery('');
        setGeminiResponse('');
        setCriticalRoundIndex(0);
        setCriticalInput('');
        setCriticalMistakes(0);
        setCriticalFeedback('');
        setCriticalSolved(false);
        setCriticalShowHintModal(false);
        setCriticalShowSolution(false);
        setCriticalConfetti(false);
        if (config.direction === 'critical_revenue') {
            setCriticalRound(createCriticalRevenueRound(0));
            return;
        }
        // Pre-fill given values
        const pre = {};
        level.steps.forEach((s, i) => {
            if (s.given) { pre[i] = s.value.toFixed(2); }
        });
        setInputs(pre);
        const preVal = {};
        level.steps.forEach((s, i) => {
            if (s.given) preVal[i] = true;
        });
        setValidated(preVal);
        // Find first non-given step
        const firstInput = level.steps.findIndex(s => !s.given);
        setActiveStep(firstInput >= 0 ? firstInput : 0);
    };

    const validateCriticalRevenueAnswer = (presetValue = null) => {
        if (!criticalRound || criticalSolved) return;
        const parsed = presetValue !== null
            ? Number(presetValue)
            : Number(String(criticalInput || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (!Number.isFinite(parsed)) {
            setCriticalFeedback('Bitte gib einen gültigen Umsatz in Euro ein.');
            return;
        }

        if (Math.round(parsed) === criticalRound.revenue) {
            setCriticalSolved(true);
            setCriticalShowSolution(true);
            setCriticalConfetti(true);
            setCriticalFeedback(`Richtig! Kritischer Umsatz: ${formatEuroWithSymbol(criticalRound.revenue)}`);
            setScore((prev) => prev + Math.max(80, 200 - criticalMistakes * 30));
            if (onLearningEvent) {
                onLearningEvent({
                    mode: 'kalkulation',
                    questionId: `kalk_6_${criticalRound.scenarioIndex}`,
                    questionText: `${criticalRound.title}: Kritischer Umsatz`,
                    correct: true,
                    userAnswer: String(parsed),
                    expectedAnswer: String(criticalRound.revenue),
                    topic: 'Kalkulationsboss Level 6 · Break-Even-Point'
                });
            }
            setTimeout(() => setCriticalConfetti(false), 2200);
            return;
        }

        const nextMistakes = criticalMistakes + 1;
        setCriticalMistakes(nextMistakes);
        setLevelHadErrors(true);
        setCriticalFeedback('Noch nicht korrekt. Prüfe interne Jahreskosten und die Gleichung.');
        if (nextMistakes === 2) {
            setCriticalShowHintModal(true);
        }
        if (onLearningEvent) {
            onLearningEvent({
                mode: 'kalkulation',
                questionId: `kalk_6_${criticalRound.scenarioIndex}`,
                questionText: `${criticalRound.title}: Kritischer Umsatz`,
                correct: false,
                userAnswer: String(parsed),
                expectedAnswer: String(criticalRound.revenue),
                topic: 'Kalkulationsboss Level 6 · Break-Even-Point'
            });
        }
    };

    const goToNextCriticalRound = () => {
        if (criticalRoundIndex >= CRITICAL_REVENUE_SCENARIOS.length - 1) {
            setCompleted(true);
            return;
        }
        const nextIndex = criticalRoundIndex + 1;
        setCriticalRoundIndex(nextIndex);
        setCriticalRound(createCriticalRevenueRound(nextIndex));
        setCriticalInput('');
        setCriticalMistakes(0);
        setCriticalFeedback('');
        setCriticalSolved(false);
        setCriticalShowHintModal(false);
        setCriticalShowSolution(false);
    };

    const handleInput = (idx, value) => {
        // Allow comma as decimal separator
        const cleaned = value.replace(',', '.');
        setInputs(prev => ({ ...prev, [idx]: cleaned }));
        setWrongSteps(prev => ({ ...prev, [idx]: false }));
    };

    const isBoss = selectedLevel?.id === 4;

    const validateStep = (idx) => {
        const stepIdx = idx !== undefined ? idx : activeStep;
        if (!selectedLevel) return;
        const step = selectedLevel.steps[stepIdx];
        const rawInput = String(inputs[stepIdx] ?? '').trim().replace(',', '.').replace(/[^0-9.-]/g, '');
        const userVal = parseFloat(rawInput);
        if (isNaN(userVal)) return;

        const correct = round2(step.value);
        const correctCents = toCents(correct);
        const userCents = toCents(userVal);

        if (userCents === correctCents) {
            // ✅ CORRECT
            if (onLearningEvent) onLearningEvent({ mode: 'kalkulation', questionId: `kalk_${selectedLevel.id}_${stepIdx}`, questionText: `${selectedLevel.name}: ${step.label}`, correct: true, userAnswer: rawInput, expectedAnswer: correct.toFixed(2) });
            setValidated(prev => ({ ...prev, [stepIdx]: true }));
            setInputs(prev => ({ ...prev, [stepIdx]: correct.toFixed(2) }));
            setShowHint(prev => ({ ...prev, [stepIdx]: false }));
            setWrongSteps(prev => ({ ...prev, [stepIdx]: false }));

            if (isBoss) {
                // Boss scoring: 100 × streak multiplier
                const newStreak = streak + 1;
                setStreak(newStreak);
                const pts = 100 * newStreak;
                setScore(prev => prev + pts);
                setFloatingPoints({ idx: stepIdx, points: pts });
                setTimeout(() => setFloatingPoints(null), 1200);
            } else {
                // Normal scoring: First try = 2pts, second = 1pt
                const att = (attempts[stepIdx] || 0);
                if (att === 0) setScore(prev => prev + 2);
                else if (att === 1) setScore(prev => prev + 1);
            }

            // Find next un-validated step 
            const nextIdx = selectedLevel.steps.findIndex((s, i) => i > stepIdx && !s.given && !validated[i]);
            if (nextIdx >= 0) {
                setActiveStep(nextIdx);
                // Keep focus transition close to the Enter interaction; delayed timeouts are
                // unreliable on some mobile keyboards (especially iOS).
                const focusNext = () => {
                    const el = inputRefs.current[nextIdx];
                    if (!el) return;
                    el.focus({ preventScroll: true });
                    el.select?.();
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                };
                requestAnimationFrame(focusNext);
                setTimeout(focusNext, 0);
            } else {
                // All done!
                setCompleted(true);
                if (!levelHadErrors && !completedLevels.includes(selectedLevel.id)) {
                    setCompletedLevels(prev => [...prev, selectedLevel.id]);
                }
            }
        } else {
            // ❌ WRONG
            if (onLearningEvent) onLearningEvent({ mode: 'kalkulation', questionId: `kalk_${selectedLevel.id}_${stepIdx}`, questionText: `${selectedLevel.name}: ${step.label}`, correct: false, userAnswer: rawInput, expectedAnswer: correct.toFixed(2) });
            setShaking(prev => ({ ...prev, [stepIdx]: true }));
            setAttempts(prev => ({ ...prev, [stepIdx]: (prev[stepIdx] || 0) + 1 }));
            setWrongSteps(prev => ({ ...prev, [stepIdx]: true }));
            setLevelHadErrors(true);
            setTimeout(() => setShaking(prev => ({ ...prev, [stepIdx]: false })), 600);

            if (isBoss) {
                setStreak(0);
                const newLives = lives - 1;
                setLives(newLives);
                if (newLives <= 0) {
                    setGameOver(true);
                    return;
                }
                // Show hint immediately in boss mode
                setShowHint(prev => ({ ...prev, [stepIdx]: true }));
            } else {
                // Show hint after 2 wrong attempts (or 1 for Level 5/Generator)
                if ((attempts[stepIdx] || 0) >= (selectedLevel.id === 5 ? 0 : 1)) {
                    setShowHint(prev => ({ ...prev, [stepIdx]: true }));
                }
            }

            // Keep focus on the current field after a wrong submission (important when using
            // the button, because click temporarily moves focus away from the input).
            requestAnimationFrame(() => {
                const el = inputRefs.current[stepIdx];
                if (!el) return;
                el.focus({ preventScroll: true });
                el.select?.();
            });
        }
    };

    const handleKeyDown = (e, idx) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            validateStep(idx);
        }
    };

    const handleToggleVideos = async () => {
        if (videoOpen) {
            setVideoOpen(false);
            setSelectedVideo(null);
            return;
        }
        setVideoOpen(true);
        if (videos.length === 0) {
            setVideoLoading(true);
            const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
            const query = selectedLevel.youtubeQuery || selectedLevel.title;
            const fetched = await fetchYouTubeVideos(query, apiKey, 4);
            setVideos(fetched);
            setVideoLoading(false);
        }
    };

    const handleGeminiAsk = async () => {
        if (!geminiQuery.trim()) return;
        setGeminiLoading(true);
        setGeminiResponse('');
        const currentStep = selectedLevel.steps[activeStep];
        const contextQuestion = `${selectedLevel.title}: ${currentStep?.label || selectedLevel.story}`;
        const contextAnswer = currentStep?.hint || 'Kalkulationsschema anwenden';
        const response = await askGemini(geminiQuery, contextQuestion, contextAnswer);
        setGeminiResponse(response);
        setGeminiLoading(false);
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER LOGIC
    // ═══════════════════════════════════════════════════════════════

    const totalSteps = selectedLevel?.steps.filter(s => !s.given).length || 0;
    const completedSteps = selectedLevel?.steps.filter((s, i) => !s.given && validated[i]).length || 0;
    const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const shouldMirrorPhase2InDiff = selectedLevel?.id === 3 && selectedLevel?.direction === 'diff';
    const stepIndices = selectedLevel?.steps.map((_, index) => index) || [];
    const renderStepIndices = shouldMirrorPhase2InDiff
        ? [
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 1),
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 3),
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 2).reverse(),
            ...stepIndices.filter((index) => selectedLevel.steps[index].phase === 4),
        ]
        : stepIndices;

    const userValue = inputs[activeStep] || '';

    let view = null;

    if (!selectedLevel) {
        // --- LEVEL AUSWAHL ---
        view = (
            <div className="app-container" style={{ zIndex: 10, overflow: 'visible', padding: '2rem 2.6rem' }}>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <header style={{ width: '100%', textAlign: 'center', position: 'relative', zIndex: 20, paddingTop: '3.5rem' }}>
                    <button onClick={onBack} className="btn-nav" style={{ position: 'absolute', top: '0', left: '3rem', zIndex: 50, pointerEvents: 'auto', minHeight: '42px', padding: '0.55rem 1rem' }}>
                        ← Zurück
                    </button>
                    <h1 style={{ fontFamily: '"Anton", sans-serif', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '2.5rem', transform: 'scaleY(1.15)', color: 'var(--text-light)', marginBottom: '0.3rem', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                        Kalkulations-Boss
                    </h1>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>Meistere die Handelskalkulation Schritt für Schritt</p>
                </header>

                <div className="dashboard-grid" style={{ maxWidth: '980px', padding: '0.3rem', marginTop: '1.2rem' }}>
                    {LEVEL_CONFIG.map(config => {
                        const done = completedLevels.includes(config.id);
                        const locked = isGuest && config.id > 1 && config.id < 5;
                        return (
                            <div key={config.id} className="dash-card" onClick={() => { if (!locked) startLevel(config); }}
                                style={{ borderColor: done ? '#22c55e' : undefined, boxShadow: done ? '0 0 20px rgba(34,197,94,0.22)' : undefined, opacity: locked ? 0.55 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                                    {locked ? '🔒' : config.id === 1 ? '⬇️' : config.id === 2 ? '⬆️' : config.id === 3 ? '🔀' : config.id === 5 ? '🎯' : config.id === 6 ? '🧠' : '👑'}
                                </div>
                                <h2 style={{ color: 'var(--text-light)', margin: 0 }}>Level {config.id}</h2>
                                <h3 style={{ color: config.color, margin: '0.2rem 0', fontWeight: 700, fontSize: '1.1rem' }}>{config.title}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{locked ? 'Nur mit Account verfügbar' : config.story}</p>
                                <div className="chip" style={{ background: done ? `${config.color}33` : undefined, color: done ? config.color : undefined, borderColor: done ? config.color : undefined }}>
                                    {locked ? '🔒 Gesperrt' : done ? '✅ Abgeschlossen' : config.subtitle}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    } else if (selectedLevel.direction === 'critical_revenue') {
        const round = criticalRound;
        const levelCardStyle = {
            position: 'relative',
            width: '100%',
            height: 'auto',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '18px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 16px 35px rgba(0,0,0,0.35)'
        };
        view = (
            <div className="app-container" style={{ zIndex: 10, maxWidth: '860px', padding: 0 }}>
                {criticalConfetti && <Confetti amount={65} />}
                <div style={{ position: 'sticky', top: 0, zIndex: 200, width: '100%', background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '0.75rem 1.2rem 0.6rem 1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
                        <button onClick={() => setSelectedLevel(null)} className="btn-nav" style={{ minHeight: '38px', padding: '0 0.9rem', fontSize: '0.85rem' }}>← Auswahl</button>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: selectedLevel.color, fontWeight: 900, fontSize: '1.1rem' }}>Level 6 · Mathe-Boss</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Szenario {criticalRoundIndex + 1} / {CRITICAL_REVENUE_SCENARIOS.length} · Fehler: {criticalMistakes}</div>
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', padding: '1.2rem 1.25rem 2rem 1.25rem', display: 'grid', gap: '0.9rem' }}>
                    {!round ? (
                        <div style={{ ...levelCardStyle, padding: '1.5rem', textAlign: 'center' }}>Lade Szenario…</div>
                    ) : (
                        <>
                            <div className="fade-in" style={{ ...levelCardStyle, border: `1px solid ${selectedLevel.color}55`, padding: '1.2rem', display: 'grid', gap: '0.75rem' }}>
                                <h2 style={{ margin: '0 0 0.35rem 0', color: selectedLevel.color }}>{round.title}</h2>
                                <p style={{ margin: '0 0 0.9rem 0', color: 'var(--text-muted)' }}>{round.story}</p>
                                <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                                    <div style={{ fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.65rem 0.75rem' }}>
                                        <div style={{ opacity: 0.75, fontSize: '0.78rem', marginBottom: '0.2rem' }}>{round.externalLabel}</div>
                                        <div style={{ color: 'var(--text-light)' }}>{round.externalFixLabel}: <strong>{formatEuroWithSymbol(round.externalFix)}</strong></div>
                                        <div style={{ color: 'var(--text-light)' }}>Provision: <strong>{round.provisionPercent}%</strong> vom Umsatz</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.65rem 0.75rem' }}>
                                        <div style={{ opacity: 0.75, fontSize: '0.78rem', marginBottom: '0.2rem' }}>{round.internalLabel}</div>
                                        {round.internalParts?.map((part) => (
                                            <div key={part.label} style={{ color: 'var(--text-light)', fontSize: '0.86rem', lineHeight: 1.35 }}>
                                                • {part.label}: <strong>{formatEuroWithSymbol(part.value)}</strong>
                                            </div>
                                        ))}
                                        <div style={{ color: 'var(--text-light)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
                                            Interne Gesamtkosten (12 Monate): <strong>{formatEuroWithSymbol(round.totalInternalCost)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="fade-in" style={{ ...levelCardStyle, padding: '1rem' }}>
                                <div style={{ marginBottom: '0.8rem', color: 'var(--text-light)', fontWeight: 700, fontSize: '0.95rem' }}>Bei welchem Umsatz sind beide Alternativen gleich teuer (kritischer Umsatz)?</div>
                                <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                                    <input
                                        className="wisor-input"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="z. B. 340000"
                                        value={criticalInput}
                                        onChange={(e) => setCriticalInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') validateCriticalRevenueAnswer(); }}
                                        style={{ flex: '1 1 320px', minHeight: '44px', textAlign: 'right' }}
                                        disabled={criticalSolved}
                                    />
                                    <button className="btn-primary" style={{ minWidth: '140px' }} disabled={criticalSolved} onClick={() => validateCriticalRevenueAnswer()}>Prüfen</button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.55rem', marginBottom: '0.8rem' }}>
                                    {round.options.map((opt, idx) => (
                                        <button
                                            key={opt.id}
                                            className="btn-secondary"
                                            disabled={criticalSolved}
                                            onClick={() => validateCriticalRevenueAnswer(opt.value)}
                                            style={{ textAlign: 'left', justifyContent: 'flex-start', minHeight: '46px', borderRadius: '12px', padding: '0.6rem 0.9rem', fontSize: '0.96rem' }}
                                        >
                                            <span style={{ fontWeight: 800, marginRight: '0.45rem' }}>{String.fromCharCode(65 + idx)})</span>
                                            <span>{formatEuroWithSymbol(opt.value)}</span>
                                        </button>
                                    ))}
                                </div>

                                {criticalFeedback && (
                                    <div style={{ padding: '0.65rem 0.75rem', borderRadius: '10px', background: criticalSolved ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.12)', border: `1px solid ${criticalSolved ? '#22c55e66' : '#f59e0b66'}`, color: 'var(--text-light)' }}>
                                        {criticalFeedback}
                                    </div>
                                )}

                                {criticalSolved && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.9rem' }}>
                                        <button className="btn-primary" style={{ background: selectedLevel.color }} onClick={goToNextCriticalRound}>
                                            {criticalRoundIndex >= CRITICAL_REVENUE_SCENARIOS.length - 1 ? 'Level abschließen' : 'Nächstes Szenario'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {criticalShowSolution && (
                                <div className="fade-in" style={{ ...levelCardStyle, marginTop: '0.9rem', padding: '1rem' }}>
                                    <h3 style={{ margin: '0 0 0.6rem 0', color: '#22c55e' }}>Rechenweg (100%)</h3>
                                    <div style={{ display: 'grid', gap: '0.35rem' }}>
                                        {round.solutionSteps.map((line) => (
                                            <div key={line} style={{ fontSize: '0.88rem', color: 'var(--text-light)', lineHeight: 1.5 }}>{line}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {criticalShowHintModal && round && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div className="fade-in" style={{ ...levelCardStyle, maxWidth: '520px', width: '100%', border: '1px solid #f59e0b66', background: 'rgba(17,17,17,0.95)', padding: '1.2rem' }}>
                            <h3 style={{ marginTop: 0, color: '#f59e0b' }}>💡 Hinweis freigeschaltet</h3>
                            <p style={{ color: 'var(--text-light)', lineHeight: 1.55, marginBottom: '1rem' }}>{round.monthlyHint}</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 0 }}>
                                Denkweg: Erst interne Jahreskosten vollständig berechnen, dann Gleichung lösen:
                                <br />
                                <strong style={{ color: 'var(--text-light)' }}>Kosten intern = Fix extern + Provision × Umsatz</strong>
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn-primary" onClick={() => setCriticalShowHintModal(false)}>Weiterrechnen</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    } else if (gameOver && isBoss) {
        // --- GAME OVER ---
        view = (
            <div className="app-container" style={{ zIndex: 10 }}>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '500px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '2px solid #ef4444', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💥</div>
                    <h2 style={{ color: '#ef4444', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Deal geplatzt!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Die Geduld deines Verhandlungspartners ist aufgebraucht.</p>
                    <p style={{ color: '#a855f7', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.5rem' }}>Endpunktzahl: {score} Punkte</p>
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn-primary" style={{ background: '#a855f7' }} onClick={() => startLevel(LEVEL_CONFIG[3])}>🔄 Neuen Deal starten</button>
                        <button className="btn-secondary" onClick={() => setSelectedLevel(null)}>📋 Level-Auswahl</button>
                    </div>
                </div>
            </div>
        );
    } else if (completed) {
        // --- LEVEL COMPLETED ---
        const bossStars = lives >= 3 ? 3 : lives >= 2 ? 2 : 1;
        const totalStepsCount = selectedLevel.steps.filter(s => !s.given).length;
        const normalPct = totalStepsCount > 0 ? Math.round((score / (totalStepsCount * 2)) * 100) : 0;
        const normalStars = normalPct >= 90 ? 3 : normalPct >= 60 ? 2 : 1;
        const stars = isBoss ? bossStars : normalStars;
        view = (
            <div className="app-container" style={{ zIndex: 10 }}>
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '500px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: `2px solid ${selectedLevel.color}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{stars === 3 ? '🏆' : stars === 2 ? '⭐' : '💪'}</div>
                    <h2 style={{ color: 'var(--text-light)', fontSize: '1.8rem', marginBottom: '0.5rem' }}>{isBoss ? 'Deal erfolgreich abgeschlossen!' : `Level ${selectedLevel.id} geschafft!`}</h2>
                    {isBoss && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.3rem 0' }}>Kalkulationstyp: {selectedLevel.subtitle}</p>}
                    <p style={{ color: selectedLevel.color, fontWeight: 700, fontSize: '1.2rem', margin: '0.5rem 0' }}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</p>
                    <p style={{ color: 'var(--text-muted)', marginBottom: isBoss ? '0.3rem' : '1.5rem' }}>{isBoss ? `${score} Punkte` : `${score} / ${totalStepsCount * 2} Punkte (${normalPct}%)`}</p>
                    {isBoss && <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{'☕'.repeat(lives)}{'🤍'.repeat(3 - lives)} {lives}/3 Leben übrig</p>}
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => startLevel(LEVEL_CONFIG[selectedLevel.id - 1])}>🔄 {selectedLevel.id === 5 ? 'Nächste Aufgabe' : (isBoss ? 'Nächster Deal' : 'Nochmal')}</button>
                        <button className="btn-secondary" onClick={() => setSelectedLevel(null)}>📋 Level-Auswahl</button>
                        {!isBoss && selectedLevel.id < 4 && (
                            <button className="btn-primary" style={{ background: LEVEL_CONFIG[selectedLevel.id].color }} onClick={() => startLevel(LEVEL_CONFIG[selectedLevel.id])}>➡️ Level {selectedLevel.id + 1}</button>
                        )}
                    </div>
                </div>
            </div>
        );
    } else {
        // --- PRIMARY GAME LOOP ---
        view = (
            <div className="app-container" style={{ zIndex: 10, maxWidth: '650px', padding: 0 }}>
                {/* HUD STICKY */}
                <div style={{ position: 'sticky', top: 0, zIndex: 200, width: '100%', background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', padding: '0.75rem 1.2rem 0.6rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => setSelectedLevel(null)} className="btn-nav" style={{ minHeight: '38px', padding: '0 0.9rem', fontSize: '0.85rem' }}>← Auswahl</button>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {isBoss && (
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: '0.35rem 0.7rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    {Array.from({ length: 3 }).map((_, i) => (<span key={i} style={{ opacity: i < lives ? 1 : 0.2, fontSize: '1rem', transition: 'opacity 0.5s' }}>☕</span>))}
                                </div>
                            )}
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: selectedLevel.color, fontWeight: 900, fontSize: '1.2rem', lineHeight: 1 }}>{score} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>PTS</span></span>
                                {streak > 1 && <span className="fade-in" style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 800 }}>{streak}× COMBO</span>}
                            </div>
                        </div>
                    </div>
                    <div style={{ width: '100%' }}>
                        <div className="progress-container" style={{ height: '6px', marginBottom: '4px', background: 'rgba(255,255,255,0.1)' }}>
                            <div className="progress-bar" style={{ width: `${progressPct}%`, background: selectedLevel.color, boxShadow: `0 0 10px ${selectedLevel.color}44` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ color: 'var(--text-light)', opacity: 0.9 }}><span style={{ color: selectedLevel.color }}>Level {selectedLevel.id}:</span> {selectedLevel.title}</span>
                            <span style={{ color: selectedLevel.color }}>{completedSteps}/{totalSteps}</span>
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', padding: '0 1.25rem 2rem 1.25rem' }}>
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, fontStyle: 'italic', margin: 0 }}>"{selectedLevel.story}"</p>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className={`btn-secondary fade-in ${videoLoading ? 'loading' : ''}`} onClick={handleToggleVideos} style={{ fontSize: '0.8rem', padding: '0.55rem 1rem', borderRadius: '12px' }}>
                            <span>{videoOpen ? '🙈' : '📺'}</span> Videos
                        </button>
                        <button className="btn-secondary fade-in" onClick={() => { setGeminiVisible(!geminiVisible); setGeminiResponse(''); }} style={{ fontSize: '0.8rem', padding: '0.55rem 1rem', borderRadius: '12px' }}>
                            <span>✨</span> KI Hilfe
                        </button>
                    </div>

                    {videoOpen && (
                        <div className="fade-in" style={{ marginBottom: '1.2rem', width: '100%' }}>
                            {!selectedVideo ? (
                                <>
                                    {videoLoading ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>Suche passende Videos... ⏳</div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                            {videos.length > 0 ? videos.map((video) => (
                                                <div key={video.id} className="video-thumbnail-card" onClick={() => setSelectedVideo(video)} style={{ background: 'var(--glass-bg)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}>
                                                    <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                                                    <div style={{ padding: '0.6rem' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginBottom: '0.3rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{video.channelTitle}</span>
                                                    </div>
                                                </div>
                                            )) : <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Keine Videos gefunden.</div>}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ background: 'black', borderRadius: '16px', overflow: 'hidden', position: 'relative', paddingTop: '56.25%' }}>
                                    <iframe src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></iframe>
                                    <button onClick={() => setSelectedVideo(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✕</button>
                                </div>
                            )}
                        </div>
                    )}

                    <GeminiPanel isOpen={geminiVisible} title="Frage an deinen KI-Tutor" placeholder="Was verstehst du nicht?" query={geminiQuery} onQueryChange={setGeminiQuery} onAsk={handleGeminiAsk} isLoading={geminiLoading} response={geminiResponse} />

                    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: selectedLevel.direction === 'backward' ? 'column-reverse' : 'column', gap: '0', position: 'relative', marginTop: '1rem' }}>
                        <div style={{ position: 'absolute', left: '24px', top: '20px', bottom: '20px', width: '3px', background: selectedLevel.direction === 'backward' ? `linear-gradient(0deg, ${selectedLevel.color}44, ${selectedLevel.color}22)` : `linear-gradient(180deg, ${selectedLevel.color}44, ${selectedLevel.color}22)`, borderRadius: '2px', zIndex: 0 }} />

                        {renderStepIndices.map((stepIndex, renderIndex) => {
                            const step = selectedLevel.steps[stepIndex];
                            const prevStepIndex = renderIndex > 0 ? renderStepIndices[renderIndex - 1] : null;
                            const previousPhase = prevStepIndex !== null ? selectedLevel.steps[prevStepIndex]?.phase : null;
                            const isActive = stepIndex === activeStep;
                            const isDone = validated[stepIndex];
                            const isGiven = step.given;
                            const isShaking = shaking[stepIndex];
                            const hintVisible = showHint[stepIndex];
                            const stepStatusColor = isDone ? '#22c55e' : (wrongSteps[stepIndex] ? '#ef4444' : '#f59e0b');
                            const isInlineDiffPhase3 = shouldMirrorPhase2InDiff && step.phase === 3;

                            let phaseHeader = null;
                            if (selectedLevel.direction === 'diff' && step.phase && step.phase !== previousPhase) {
                                const pl = PHASE_LABELS[step.phase];
                                if (!(shouldMirrorPhase2InDiff && (step.phase === 2 || step.phase === 3))) {
                                    phaseHeader = (
                                        <div key={`phase-${step.phase}`} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.8rem', marginBottom: '0.3rem', marginTop: renderIndex > 0 ? '0.8rem' : 0, borderRadius: '10px', background: `${pl.color}15`, border: `1px solid ${pl.color}33` }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pl.color }}>{pl.title}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pl.desc}</span>
                                        </div>
                                    );
                                }
                            }

                            return (
                                <div key={stepIndex}>
                                    {phaseHeader}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0.8rem 0.6rem 0.5rem', marginLeft: '8px', borderRadius: '14px', background: isInlineDiffPhase3 ? `${stepStatusColor}14` : isActive ? 'rgba(255,255,255,0.06)' : 'transparent', border: isInlineDiffPhase3 ? `1px solid ${stepStatusColor}66` : isActive ? `1px solid ${stepStatusColor}55` : '1px solid transparent', transition: 'all 0.3s ease', position: 'relative', zIndex: 1, animation: isShaking ? 'kalkShake 0.5s ease-in-out' : undefined }}>
                                        <div style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, background: isDone ? stepStatusColor : isGiven ? 'rgba(255,255,255,0.15)' : isActive ? `${stepStatusColor}33` : 'rgba(255,255,255,0.06)', color: isDone ? '#fff' : isGiven ? 'var(--text-light)' : isActive ? stepStatusColor : 'var(--text-muted)', border: isActive ? `2px solid ${stepStatusColor}` : isDone ? 'none' : '1px solid rgba(255,255,255,0.15)' }}>{isDone ? '✓' : isGiven ? '📌' : (stepIndex + 1)}</div>
                                        <div style={{ flex: '1 1 auto', minWidth: 0, position: 'relative' }}>
                                            <div style={{ fontSize: step.isSum ? '0.95rem' : '0.85rem', fontWeight: step.isSum ? 700 : 500, color: isDone ? 'var(--text-light)' : isActive ? 'var(--text-light)' : 'var(--text-muted)', lineHeight: 1.3 }}>
                                                {isInlineDiffPhase3 && <span style={{ fontWeight: 800, color: stepStatusColor, marginRight: '0.7rem' }}>{PHASE_LABELS[3].title}</span>}
                                                {step.label} {step.sublabel && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({step.sublabel})</span>}
                                            </div>
                                        </div>
                                        <div style={{ width: '140px', minWidth: '140px', textAlign: 'right', position: 'relative' }}>
                                            {floatingPoints?.idx === stepIndex && (
                                                <div className="fade-out-up" style={{ position: 'absolute', right: '-1rem', top: '-1rem', color: '#fbbf24', fontWeight: 900, fontSize: '1.1rem', zIndex: 10, textShadow: '0 0 8px rgba(251, 191, 36, 0.5)' }}>+{floatingPoints.points}</div>
                                            )}
                                            {isGiven || isDone ? (
                                                <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700, color: isDone && !isGiven ? stepStatusColor : 'var(--text-light)', padding: '0.5rem 0.8rem', borderRadius: '10px', background: isDone && !isGiven ? `${stepStatusColor}15` : 'rgba(255,255,255,0.05)', textAlign: 'right' }}>{step.value.toFixed(2)} {step.isPercent ? '%' : '€'}</div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                                        <input
                                                            className={`wisor-input ${wrongSteps[stepIndex] ? 'shake' : ''}`}
                                                            ref={el => inputRefs.current[stepIndex] = el}
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder={step.isPercent ? '%' : '0.00'}
                                                            value={isActive ? userValue : ''}
                                                            onChange={isActive ? (e) => handleInput(stepIndex, e.target.value) : undefined}
                                                            onKeyDown={isActive ? (e) => handleKeyDown(e, stepIndex) : undefined}
                                                            style={{ flex: 1, height: '40px', fontSize: '1rem', textAlign: 'right', padding: '0 0.8rem', border: `1.5px solid ${stepStatusColor}55`, background: 'rgba(255,255,255,0.05)' }}
                                                        />
                                                        {isActive && (
                                                            <button
                                                                type="button"
                                                                onClick={() => validateStep(stepIndex)}
                                                                title="Eingabe prüfen (Enter)"
                                                                style={{
                                                                    height: '40px',
                                                                    minWidth: '52px',
                                                                    borderRadius: '10px',
                                                                    border: `1.5px solid ${stepStatusColor}88`,
                                                                    background: wrongSteps[stepIndex] ? 'rgba(239,68,68,0.22)' : (validated[stepIndex] ? 'rgba(34,197,94,0.22)' : 'rgba(245,158,11,0.18)'),
                                                                    color: stepStatusColor,
                                                                    fontWeight: 800,
                                                                    fontSize: '0.92rem',
                                                                    cursor: 'pointer',
                                                                    padding: '0 0.55rem'
                                                                }}
                                                            >
                                                                {wrongSteps[stepIndex] ? '✕' : (validated[stepIndex] ? '✓' : 'Enter')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {hintVisible && !isDone && (
                                        <div className="fade-in" style={{ marginLeft: '52px', marginTop: '0.3rem', marginBottom: '0.8rem', padding: '0.7rem 1rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
                                            <span style={{ fontWeight: 700, color: '#f59e0b' }}>💡 Tipp:</span> {step.hint}
                                        </div>
                                    )}
                                    {shouldMirrorPhase2InDiff && step.phase === 2 && step.key === 'lvp' && (() => {
                                        const pl = PHASE_LABELS[2];
                                        return (
                                            <div key="phase-2-relocated" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.8rem', marginLeft: '52px', marginRight: '8px', marginBottom: '0.3rem', marginTop: '0.35rem', borderRadius: '10px', background: `${pl.color}15`, border: `1px solid ${pl.color}33` }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pl.color }}>{pl.title}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pl.desc}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
            {view}

            <FloatingPortal
                questionId={selectedLevel ? `kalk_${selectedLevel.id}` : 'kalk_selection'}
                questionText={selectedLevel ? `${selectedLevel.title}: ${selectedLevel.subtitle}` : 'Kalkulations-Boss'}
                currentAppMode="kalkulation"
            />

            <style>{`
                @keyframes kalkShake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
                    20%, 40%, 60%, 80% { transform: translateX(6px); }
                }
            `}</style>
        </div>
    );
}
