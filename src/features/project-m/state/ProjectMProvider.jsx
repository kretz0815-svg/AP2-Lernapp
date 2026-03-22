import React, { createContext, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'project_m_progress_v1';
const XP_PER_LEVEL = 100;

const DEFAULT_PROGRESS = {
    teamName: 'SneakerNova Team',
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
            teamName: typeof parsed.teamName === 'string' && parsed.teamName.trim() ? parsed.teamName.trim() : DEFAULT_PROGRESS.teamName,
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

const ProjectMContext = createContext(null);

export function ProjectMProvider({ children }) {
    const [progress, setProgress] = useState(readInitialProgress);

    const persist = (updater) => {
        setProgress((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Ignore errors
            }
            return next;
        });
    };

    const setTeamName = (teamName) => {
        persist((prev) => ({
            ...prev,
            teamName: teamName?.trim() || DEFAULT_PROGRESS.teamName
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
        setTeamName,
        grantXp,
        unlockLevel,
        resetProgress
    }), [progress]);

    return <ProjectMContext.Provider value={value}>{children}</ProjectMContext.Provider>;
}

export function useProjectM() {
    const ctx = useContext(ProjectMContext);
    if (!ctx) {
        throw new Error('useProjectM must be used inside ProjectMProvider');
    }
    return ctx;
}
