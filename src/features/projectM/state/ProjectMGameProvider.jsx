/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'project_m_game_progress_v1';

const DEFAULT_PROGRESS = {
    xp: 0,
    currentLevel: 1,
    unlockedLevels: [1],
    completedLevels: []
};

const readInitialProgress = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PROGRESS;
        const parsed = JSON.parse(raw);
        const xpNum = Number(parsed.xp);
        const levelNum = Number(parsed.currentLevel);
        return {
            xp: Number.isFinite(xpNum) && xpNum >= 0 ? Math.floor(xpNum) : DEFAULT_PROGRESS.xp,
            currentLevel: Number.isFinite(levelNum) && levelNum >= 1 ? Math.floor(levelNum) : DEFAULT_PROGRESS.currentLevel,
            unlockedLevels: Array.isArray(parsed.unlockedLevels) && parsed.unlockedLevels.length
                ? [...new Set(parsed.unlockedLevels.map((n) => Math.floor(Number(n))).filter((n) => n >= 1))].sort((a, b) => a - b)
                : DEFAULT_PROGRESS.unlockedLevels,
            completedLevels: Array.isArray(parsed.completedLevels)
                ? [...new Set(parsed.completedLevels.map((n) => Math.floor(Number(n))).filter((n) => n >= 1))].sort((a, b) => a - b)
                : DEFAULT_PROGRESS.completedLevels
        };
    } catch {
        return DEFAULT_PROGRESS;
    }
};

const ProjectMGameContext = createContext(null);

export function ProjectMGameProvider({ children }) {
    const [progress, setProgress] = useState(readInitialProgress);

    const persist = (updater) => {
        setProgress((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Storage unavailable: keep in-memory state.
            }
            return next;
        });
    };

    const grantXp = (amount) => {
        const gain = Math.max(0, Math.floor(Number(amount) || 0));
        persist((prev) => ({
            ...prev,
            xp: prev.xp + gain
        }));
    };

    const unlockLevel = (levelId) => {
        const level = Math.max(1, Math.floor(Number(levelId) || 1));
        persist((prev) => ({
            ...prev,
            unlockedLevels: [...new Set([...prev.unlockedLevels, level])].sort((a, b) => a - b),
            currentLevel: Math.max(prev.currentLevel, level)
        }));
    };

    const markLevelComplete = (levelId) => {
        const level = Math.max(1, Math.floor(Number(levelId) || 1));
        persist((prev) => ({
            ...prev,
            completedLevels: [...new Set([...prev.completedLevels, level])].sort((a, b) => a - b),
            currentLevel: Math.max(prev.currentLevel, level)
        }));
    };

    const resetProgress = () => {
        persist(DEFAULT_PROGRESS);
    };

    const value = {
        progress,
        grantXp,
        unlockLevel,
        markLevelComplete,
        resetProgress
    };

    return <ProjectMGameContext.Provider value={value}>{children}</ProjectMGameContext.Provider>;
}

export function useProjectMGame() {
    const ctx = useContext(ProjectMGameContext);
    if (!ctx) throw new Error('useProjectMGame must be used inside ProjectMGameProvider');
    return ctx;
}
