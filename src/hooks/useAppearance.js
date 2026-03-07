import { useState, useEffect } from 'react';
import { BACKGROUND_PRESETS, CUSTOM_BACKGROUND_COLOR_KEY } from '../utils/constants';
import { getThemeKey, getAppearanceKey } from '../utils/analytics';
import {
    clampEffectStrength, applyEffectStrength, applyBackgroundEffectsVisibility,
    applyCustomBackgroundColor, applyPresetBackground, applyUploadedBackground, clearBackgroundLayers, isValidHexColor
} from '../utils/appearance';

export const useAppearance = (authUser, appMode) => {
    const [themePreference, setThemePreference] = useState('system');
    const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
    );

    // In "system" mode, follow the OS color scheme 1:1.
    const isLightMode = themePreference === 'light' || (themePreference === 'system' && !systemPrefersDark);

    const [customBackgroundColor, setCustomBackgroundColor] = useState('');
    const [backgroundMode, setBackgroundMode] = useState('color');
    const [backgroundPresetId, setBackgroundPresetId] = useState('');
    const [backgroundImageData, setBackgroundImageData] = useState('');
    const [backgroundEffectsEnabled, setBackgroundEffectsEnabled] = useState(false);
    const [backgroundEffectsIntensity, setBackgroundEffectsIntensity] = useState(100);
    const [appearanceNotice, setAppearanceNotice] = useState('');

    // Listen for real-time OS theme changes
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setSystemPrefersDark(e.matches);
        mq.addEventListener('change', handler);

        return () => {
            mq.removeEventListener('change', handler);
        };
    }, []);

    // Unified effect to apply all appearance states to the DOM
    useEffect(() => {
        // Theme class application
        if (isLightMode) {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }

        // Auth screen adjustments (keep it slightly darker but follow theme)
        if (appMode === 'auth') {
            if (!isLightMode) {
                document.body.style.setProperty('--app-bg-color', '#000000');
            } else {
                document.body.style.removeProperty('--app-bg-color');
            }
            document.body.style.removeProperty('--app-glow-1');
            document.body.style.removeProperty('--app-glow-2');
            document.body.classList.add('no-bg-effects');
            return;
        }

        // Normal app behavior (not auth)
        document.body.classList.remove('no-bg-effects');

        // Apply background settings
        if (backgroundMode === 'preset' && backgroundPresetId) {
            applyPresetBackground(backgroundPresetId, backgroundEffectsIntensity);
        } else if (backgroundMode === 'upload' && backgroundImageData) {
            applyUploadedBackground(backgroundImageData, customBackgroundColor, backgroundEffectsIntensity);
        } else if (backgroundMode === 'color' && isValidHexColor(customBackgroundColor)) {
            applyCustomBackgroundColor(customBackgroundColor, backgroundEffectsIntensity);
        } else {
            // Default or empty color: let CSS handle it via .light-theme class
            applyCustomBackgroundColor('', backgroundEffectsIntensity);
        }

        applyBackgroundEffectsVisibility(backgroundEffectsEnabled);
        applyEffectStrength(backgroundEffectsIntensity);
    }, [
        appMode, isLightMode, backgroundMode, backgroundPresetId,
        backgroundImageData, customBackgroundColor, backgroundEffectsEnabled,
        backgroundEffectsIntensity
    ]);

    const persistBackgroundSettings = (settings) => {
        try {
            if (!authUser) return false;
            const key = getAppearanceKey(authUser);
            localStorage.setItem(key, JSON.stringify(settings));
            localStorage.removeItem(CUSTOM_BACKGROUND_COLOR_KEY);
            return true;
        } catch {
            return false;
        }
    };

    const applyAppearanceDefaults = () => {
        setBackgroundMode('color');
        // Setting to empty string allows CSS to handle the background color
        // based on the .light-theme class on the body.
        setCustomBackgroundColor('');
        setBackgroundEffectsEnabled(false);
        setBackgroundEffectsIntensity(100);
        setBackgroundPresetId('');
        setBackgroundImageData('');
    };

    const loadAppearanceForUser = (user) => {
        if (!user) {
            setThemePreference('system');
            applyAppearanceDefaults();
            return;
        }

        // Try per-user key first, then global fallback
        const userKey = getAppearanceKey(user);
        const themeKey = getThemeKey(user);
        const savedTheme = localStorage.getItem(themeKey);
        // Support 'system', 'light', 'dark' – legacy 'light'/'dark' still work
        if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') {
            setThemePreference(savedTheme);
        } else {
            setThemePreference('system');
        }

        try {
            const savedSettingsRaw = localStorage.getItem(userKey);
            if (savedSettingsRaw) {
                const savedSettings = JSON.parse(savedSettingsRaw);
                const savedMode = savedSettings?.mode || 'default';
                const savedColor = savedSettings?.color || '';
                const savedPreset = savedSettings?.presetId || '';
                const savedImage = savedSettings?.imageData || '';
                const savedEffectsEnabled = savedSettings?.effectsEnabled !== false;
                const savedEffectsIntensity = clampEffectStrength(savedSettings?.effectsIntensity ?? 100);

                setBackgroundMode(savedMode);
                setCustomBackgroundColor(savedColor);
                setBackgroundPresetId(savedPreset);
                setBackgroundImageData(savedImage);
                setBackgroundEffectsEnabled(savedEffectsEnabled);
                setBackgroundEffectsIntensity(savedEffectsIntensity);
                applyEffectStrength(savedEffectsIntensity);
                applyBackgroundEffectsVisibility(savedEffectsEnabled);

                if (!(savedMode === 'preset' && savedPreset) &&
                    !(savedMode === 'upload' && savedImage) &&
                    !(savedMode === 'color' && isValidHexColor(savedColor))) {
                    applyAppearanceDefaults();
                }
                return;
            }
        } catch {
            // Ignore invalid stored settings
        }
        // No saved settings — apply defaults
        applyAppearanceDefaults();
    };

    // Load appearance settings from storage when user or system changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        loadAppearanceForUser(authUser);
    }, [authUser, isLightMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const setThemePref = (pref) => {
        // Guests are locked to dark mode
        if (!authUser) return;
        setThemePreference(pref);
        const themeKey = getThemeKey(authUser);
        localStorage.setItem(themeKey, pref);
        // Apply default colors when no custom settings are saved
        const userKey = getAppearanceKey(authUser);
        const hasSavedSettings = localStorage.getItem(userKey);
        if (!hasSavedSettings) {
            const willBeLight = pref === 'light' || (pref === 'system' && !systemPrefersDark);
            const defaultColor = willBeLight ? '#ffffff' : '#000000';
            setCustomBackgroundColor(defaultColor);
            setBackgroundEffectsEnabled(false);
            applyCustomBackgroundColor(defaultColor, 100);
            applyBackgroundEffectsVisibility(false);
        }
    };

    // Legacy compat: toggleTheme cycles system→light→dark for the burger menu toggle
    const toggleTheme = () => {
        if (!authUser) return;
        const next = themePreference === 'system' ? 'light' : themePreference === 'light' ? 'dark' : 'system';
        setThemePref(next);
    };

    const activeBackgroundColor = customBackgroundColor || (isLightMode ? '#ffffff' : '#000000');
    const colorPickerValue = isValidHexColor(activeBackgroundColor) ? activeBackgroundColor : (isLightMode ? '#ffffff' : '#000000');

    const handleBackgroundColorChange = (nextColor) => {
        setBackgroundMode('color');
        setBackgroundPresetId('');
        setBackgroundImageData('');
        setAppearanceNotice('');
        setCustomBackgroundColor(nextColor);
        persistBackgroundSettings({ mode: 'color', color: nextColor, presetId: '', imageData: '', effectsEnabled: backgroundEffectsEnabled, effectsIntensity: backgroundEffectsIntensity });
        applyCustomBackgroundColor(nextColor, backgroundEffectsIntensity);
    };

    const handleCustomColorTextChange = (inputValue) => {
        setCustomBackgroundColor(inputValue);
        if (isValidHexColor(inputValue)) {
            setBackgroundMode('color');
            setBackgroundPresetId('');
            setBackgroundImageData('');
            persistBackgroundSettings({ mode: 'color', color: inputValue, presetId: '', imageData: '', effectsEnabled: backgroundEffectsEnabled, effectsIntensity: backgroundEffectsIntensity });
            applyCustomBackgroundColor(inputValue, backgroundEffectsIntensity);
        }
    };

    const handleBackgroundPresetChange = (presetId) => {
        const preset = BACKGROUND_PRESETS.find((item) => item.id === presetId);
        if (!preset) return;

        setBackgroundMode('preset');
        setBackgroundPresetId(presetId);
        setBackgroundImageData('');
        setCustomBackgroundColor(preset.color);
        setAppearanceNotice('');
        persistBackgroundSettings({ mode: 'preset', color: preset.color, presetId, imageData: '', effectsEnabled: backgroundEffectsEnabled, effectsIntensity: backgroundEffectsIntensity });
        applyPresetBackground(presetId, backgroundEffectsIntensity);
    };

    const handleBackgroundEffectsIntensityChange = (nextIntensity) => {
        const normalized = clampEffectStrength(nextIntensity);
        setBackgroundEffectsIntensity(normalized);
        applyEffectStrength(normalized);
        setAppearanceNotice('');

        if (backgroundMode === 'preset' && backgroundPresetId) {
            applyPresetBackground(backgroundPresetId, normalized);
        } else if (backgroundMode === 'upload' && backgroundImageData) {
            const uploadColor = isValidHexColor(customBackgroundColor) ? customBackgroundColor : '#0f172a';
            applyUploadedBackground(backgroundImageData, uploadColor, normalized);
        } else if (backgroundMode === 'color' && isValidHexColor(customBackgroundColor)) {
            applyCustomBackgroundColor(customBackgroundColor, normalized);
        }

        persistBackgroundSettings({
            mode: backgroundMode,
            color: customBackgroundColor,
            presetId: backgroundPresetId,
            imageData: backgroundImageData,
            effectsEnabled: backgroundEffectsEnabled,
            effectsIntensity: normalized
        });
    };

    const handleBackgroundEffectsToggle = (enabled) => {
        setBackgroundEffectsEnabled(enabled);
        applyBackgroundEffectsVisibility(enabled);
        setAppearanceNotice('');
        persistBackgroundSettings({
            mode: backgroundMode,
            color: customBackgroundColor,
            presetId: backgroundPresetId,
            imageData: backgroundImageData,
            effectsEnabled: enabled,
            effectsIntensity: backgroundEffectsIntensity
        });
    };

    const handleBackgroundUpload = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setAppearanceNotice('Bitte waehle eine Bilddatei (JPG, PNG, WEBP).');
            return;
        }
        if (file.size > 2_500_000) {
            setAppearanceNotice('Datei ist zu gross. Bitte ein Bild unter 2.5 MB waehlen.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            if (!dataUrl.startsWith('data:image/')) {
                setAppearanceNotice('Bild konnte nicht geladen werden.');
                return;
            }

            const fallbackColor = isValidHexColor(customBackgroundColor) ? customBackgroundColor : '#0f172a';
            const saved = persistBackgroundSettings({ mode: 'upload', color: fallbackColor, presetId: '', imageData: dataUrl, effectsEnabled: backgroundEffectsEnabled, effectsIntensity: backgroundEffectsIntensity });
            if (!saved) {
                setAppearanceNotice('Speichern fehlgeschlagen. Bitte ein kleineres Bild waehlen.');
                return;
            }

            setBackgroundMode('upload');
            setBackgroundPresetId('');
            setBackgroundImageData(dataUrl);
            setCustomBackgroundColor(fallbackColor);
            setAppearanceNotice('Eigenes Bild gespeichert und aktiviert.');
            applyUploadedBackground(dataUrl, fallbackColor, backgroundEffectsIntensity);
        };
        reader.onerror = () => setAppearanceNotice('Bild konnte nicht gelesen werden.');
        reader.readAsDataURL(file);
    };

    const resetBackgroundColor = () => {
        setBackgroundMode('default');
        setBackgroundEffectsEnabled(true);
        setBackgroundEffectsIntensity(100);
        setCustomBackgroundColor('');
        setBackgroundPresetId('');
        setBackgroundImageData('');
        setAppearanceNotice('Standard-Hintergrund wieder aktiv.');
        if (authUser) {
            localStorage.removeItem(getAppearanceKey(authUser));
        }
        localStorage.removeItem(CUSTOM_BACKGROUND_COLOR_KEY);
        applyEffectStrength(100);
        applyBackgroundEffectsVisibility(true);
        applyCustomBackgroundColor('', 100);
        clearBackgroundLayers();
    };

    return {
        themePreference,
        setThemePref,
        toggleTheme,
        isLightMode,
        customBackgroundColor,
        backgroundMode,
        backgroundPresetId,
        backgroundImageData,
        backgroundEffectsEnabled,
        backgroundEffectsIntensity,
        appearanceNotice,
        setAppearanceNotice,
        activeBackgroundColor,
        colorPickerValue,
        handleBackgroundColorChange,
        handleCustomColorTextChange,
        handleBackgroundPresetChange,
        handleBackgroundEffectsIntensityChange,
        handleBackgroundEffectsToggle,
        handleBackgroundUpload,
        resetBackgroundColor
    };
};
