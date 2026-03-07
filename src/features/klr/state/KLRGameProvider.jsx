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
        const xpNum = Number(parsed.xp);
        const levelNum = Number(parsed.currentLevel);
        return {
            startupName: typeof parsed.startupName === 'string' && parsed.startupName.trim() ? parsed.startupName.trim() : DEFAULT_PROGRESS.startupName,
            xp: Number.isFinite(xpNum) && xpNum >= 0 ? Math.floor(xpNum) : DEFAULT_PROGRESS.xp,
            currentLevel: Number.isFinite(levelNum) && levelNum >= 1 ? Math.floor(levelNum) : DEFAULT_PROGRESS.currentLevel,
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

    const persist = (updater) => {
        setProgress((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                // z. B. Privater Modus oder Quota – State trotzdem aktualisieren
            }
            return next;
        });
    };

    const setStartupName = (startupName) => {
        persist((prev) => ({
            ...prev,
            startupName: startupName?.trim() || DEFAULT_PROGRESS.startupName
        }));
    };

    const grantXp = (amount) => {
        const gain = Math.max(0, Math.floor(Number(amount) || 0));
        persist((prev) => {
            const nextXp = prev.xp + gain;
            const levelFromXp = Math.max(1, Math.floor(nextXp / XP_PER_LEVEL) + 1);
            return {
                ...prev,
                xp: nextXp,
                currentLevel: Math.max(prev.currentLevel, levelFromXp)
            };
        });
    };

    const unlockLevel = (levelId) => {
        const level = Math.max(1, Math.floor(Number(levelId) || 1));
        persist((prev) => ({
            ...prev,
            unlockedLevels: [...new Set([...prev.unlockedLevels, level])].sort((a, b) => a - b),
            currentLevel: Math.max(prev.currentLevel, level)
        }));
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
