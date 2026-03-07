import React, { createContext, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'klr_game_progress_v1';
const XP_PER_LEVEL = 100;

const DEFAULT_PROGRESS = {
    startupName: 'Neon Cart Labs',
    xp: 0,
    currentLevel: 1,
    unlockedLevels: [1]
};

const readInitialProgress = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PROGRESS;
        const parsed = JSON.parse(raw);
        return {
            startupName: typeof parsed.startupName === 'string' && parsed.startupName.trim() ? parsed.startupName.trim() : DEFAULT_PROGRESS.startupName,
            xp: Number.isFinite(parsed.xp) && parsed.xp >= 0 ? Math.floor(parsed.xp) : DEFAULT_PROGRESS.xp,
            currentLevel: Number.isFinite(parsed.currentLevel) && parsed.currentLevel >= 1 ? Math.floor(parsed.currentLevel) : DEFAULT_PROGRESS.currentLevel,
            unlockedLevels: Array.isArray(parsed.unlockedLevels) && parsed.unlockedLevels.length
                ? [...new Set(parsed.unlockedLevels.map((n) => Math.floor(Number(n))).filter((n) => n >= 1))].sort((a, b) => a - b)
                : DEFAULT_PROGRESS.unlockedLevels
        };
    } catch {
        return DEFAULT_PROGRESS;
    }
};

const KLRGameContext = createContext(null);

export function KLRGameProvider({ children }) {
    const [progress, setProgress] = useState(readInitialProgress);

    const persist = (next) => {
        setProgress(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    const setStartupName = (startupName) => {
        persist({
            ...progress,
            startupName: startupName?.trim() || DEFAULT_PROGRESS.startupName
        });
    };

    const grantXp = (amount) => {
        const gain = Math.max(0, Math.floor(Number(amount) || 0));
        const nextXp = progress.xp + gain;
        const levelFromXp = Math.max(1, Math.floor(nextXp / XP_PER_LEVEL) + 1);
        persist({
            ...progress,
            xp: nextXp,
            currentLevel: Math.max(progress.currentLevel, levelFromXp)
        });
    };

    const unlockLevel = (levelId) => {
        const level = Math.max(1, Math.floor(Number(levelId) || 1));
        persist({
            ...progress,
            unlockedLevels: [...new Set([...progress.unlockedLevels, level])].sort((a, b) => a - b),
            currentLevel: Math.max(progress.currentLevel, level)
        });
    };

    const resetProgress = () => {
        persist(DEFAULT_PROGRESS);
    };

    const value = useMemo(() => ({
        progress,
        setStartupName,
        grantXp,
        unlockLevel,
        resetProgress
    }), [progress]);

    return <KLRGameContext.Provider value={value}>{children}</KLRGameContext.Provider>;
}

export function useKLRGame() {
    const ctx = useContext(KLRGameContext);
    if (!ctx) {
        throw new Error('useKLRGame must be used inside KLRGameProvider');
    }
    return ctx;
}

export const KLR_GAME_CONSTANTS = {
    STORAGE_KEY,
    XP_PER_LEVEL
};
