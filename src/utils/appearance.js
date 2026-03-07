import { BACKGROUND_PRESETS } from './constants';

// ─── Validation ─────────────────────────────────────────────────
export const isValidHexColor = (value) => /^#([A-Fa-f0-9]{6})$/.test(String(value || '').trim());

// ─── Color Conversion ───────────────────────────────────────────
export const hexToRgb = (hexColor) => {
    const clean = hexColor.replace('#', '');
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16)
    };
};

// ─── Background Layer Management ────────────────────────────────
export const clearBackgroundLayers = () => {
    document.body.style.removeProperty('--app-bg-image');
    document.body.style.removeProperty('--app-bg-image-overlay');
};

// ─── Effect Strength ────────────────────────────────────────────
export const clampEffectStrength = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return 100;
    return Math.min(100, Math.max(0, Math.round(numeric)));
};

export const withScaledAlpha = (r, g, b, alpha, strength = 100) => {
    const factor = clampEffectStrength(strength) / 100;
    const scaledAlpha = Math.max(0, Math.min(1, alpha * factor));
    return `rgba(${r}, ${g}, ${b}, ${scaledAlpha.toFixed(3)})`;
};

export const scaleRgbaAlpha = (rgbaValue, strength = 100) => {
    const match = String(rgbaValue).match(/^rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)$/i);
    if (!match) return rgbaValue;
    const [, r, g, b, a] = match;
    return withScaledAlpha(Number(r), Number(g), Number(b), Number(a), strength);
};

// ─── Apply Functions (DOM side-effects) ─────────────────────────
export const applyEffectStrength = (strength = 100) => {
    const normalized = clampEffectStrength(strength);
    document.body.style.setProperty('--app-effect-strength', String(normalized));
    document.body.style.setProperty('--blob-opacity', (0.3 * (normalized / 100)).toFixed(3));
};

export const applyBackgroundEffectsVisibility = (enabled) => {
    if (enabled) {
        document.body.classList.remove('no-bg-effects');
    } else {
        document.body.classList.add('no-bg-effects');
    }
};

export const applyCustomBackgroundColor = (hexColor, strength = 100) => {
    clearBackgroundLayers();

    if (!isValidHexColor(hexColor)) {
        document.body.style.removeProperty('--app-bg-color');
        document.body.style.removeProperty('--app-glow-1');
        document.body.style.removeProperty('--app-glow-2');
        return;
    }

    const { r, g, b } = hexToRgb(hexColor);
    document.body.style.setProperty('--app-bg-color', hexColor);
    document.body.style.setProperty('--app-glow-1', withScaledAlpha(r, g, b, 0.22, strength));
    document.body.style.setProperty('--app-glow-2', withScaledAlpha(r, g, b, 0.12, strength));
};

export const applyPresetBackground = (presetId, strength = 100) => {
    const preset = BACKGROUND_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
        document.body.style.removeProperty('--app-bg-color');
        document.body.style.removeProperty('--app-glow-1');
        document.body.style.removeProperty('--app-glow-2');
        clearBackgroundLayers();
        return;
    }

    clearBackgroundLayers();
    document.body.style.setProperty('--app-bg-color', preset.color);
    document.body.style.setProperty('--app-glow-1', scaleRgbaAlpha(preset.glow1, strength));
    document.body.style.setProperty('--app-glow-2', scaleRgbaAlpha(preset.glow2, strength));
};

export const applyUploadedBackground = (imageData, fallbackColor, strength = 100) => {
    if (!imageData) {
        clearBackgroundLayers();
        return;
    }

    const color = isValidHexColor(fallbackColor) ? fallbackColor : '#0f172a';
    const { r, g, b } = hexToRgb(color);

    document.body.style.setProperty('--app-bg-color', color);
    document.body.style.setProperty('--app-glow-1', withScaledAlpha(r, g, b, 0.24, strength));
    document.body.style.setProperty('--app-glow-2', withScaledAlpha(r, g, b, 0.14, strength));
    document.body.style.setProperty('--app-bg-image', `url("${imageData}")`);
    document.body.style.setProperty('--app-bg-image-overlay', 'linear-gradient(135deg, rgba(2, 6, 23, 0.65), rgba(2, 6, 23, 0.35))');
};
