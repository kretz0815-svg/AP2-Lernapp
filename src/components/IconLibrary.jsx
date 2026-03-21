import React from 'react';

/**
 * IconLibrary.jsx
 * Centralized SVG Icons for the application to reduce component sizes and improve maintainability.
 * NO UI/UX CHANGES.
 */

export const PomodoroIcon = ({ size = "1.4em", className = "" }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <ellipse cx="50" cy="56" rx="38" ry="34" strokeWidth="6" />
        <path d="M50 22 C50 16, 46 12, 42 14" strokeWidth="4" />
        <path d="M42 28 C36 20, 30 22, 32 28" strokeWidth="3.5" fill="currentColor" />
        <path d="M46 26 C44 18, 38 16, 36 22" strokeWidth="3.5" fill="currentColor" />
        <path d="M50 25 C50 17, 46 14, 44 20" strokeWidth="3.5" fill="currentColor" />
        <path d="M54 26 C56 18, 60 16, 62 22" strokeWidth="3.5" fill="currentColor" />
        <path d="M58 28 C62 20, 68 22, 66 28" strokeWidth="3.5" fill="currentColor" />
        <circle cx="55" cy="55" r="16" strokeWidth="3.5" strokeDasharray="0 25.1 50.2" />
        <circle cx="55" cy="55" r="16" strokeWidth="3.5" strokeDasharray="3 5" strokeDashoffset="-25" />
        <line x1="55" y1="55" x2="55" y2="44" strokeWidth="3.5" />
        <line x1="55" y1="55" x2="63" y2="60" strokeWidth="3.5" />
    </svg>
);

export const SettingsIcon = ({ size = "1.4em", className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

export const InfoIcon = ({ size = "1.4em", className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);
