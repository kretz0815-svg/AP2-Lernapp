import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { BACKGROUND_PRESETS } from '../utils/constants';
import ResetModal from '../components/ResetModal';
import './AppearanceSettingsPage.css';

function AppearanceSettingsPage() {
    const {
        setAppMode,
        pomodoroPortal,
        burgerMenuPortal,
        colorPickerValue,
        activeBackgroundColor,
        handleBackgroundColorChange,
        handleCustomColorTextChange,
        backgroundEffectsEnabled,
        handleBackgroundEffectsToggle,
        backgroundEffectsIntensity,
        handleBackgroundEffectsIntensityChange,
        backgroundMode,
        backgroundPresetId,
        handleBackgroundPresetChange,
        handleBackgroundUpload,
        backgroundImageData,
        appearanceNotice,
        resetBackgroundColor,
        resetModalVisible,
        setResetModalVisible,
        handleResetExecute,
        openResetModal
    } = useAppContext();

    return (
        <div className="app-container" style={{ zIndex: 10 }}>
            {pomodoroPortal}
            {burgerMenuPortal}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            <header className="appearance-header">
                <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '0.8rem' }}>
                    <button className="btn-nav" onClick={() => setAppMode('dashboard')}>&larr; Menü</button>
                </div>
                <h1 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--text-light)' }}>Darstellung anpassen</h1>
                <p className="subtitle" style={{ marginTop: '0.5rem' }}>Passe den Hintergrund im Hauptmenu an.</p>
            </header>

            <section className="appearance-panel appearance-main-panel">
                <h3 className="appearance-section-title">Backgroundfarbe</h3>
                <div className="appearance-row">
                    <input
                        type="color"
                        value={colorPickerValue}
                        onChange={(e) => handleBackgroundColorChange(e.target.value)}
                        className="background-color-picker"
                        aria-label="Backgroundfarbe auswählen"
                    />
                    <input
                        type="text"
                        value={activeBackgroundColor}
                        onChange={(e) => handleCustomColorTextChange(e.target.value.trim())}
                        className="background-color-input"
                        placeholder="#0f172a"
                    />
                </div>

                <div className="appearance-toggle-row">
                    <label htmlFor="background-effects-toggle" style={{ color: 'var(--text-light)', fontSize: '0.92rem', fontWeight: 600 }}>
                        Fleckigen Effekt anzeigen
                    </label>
                    <input
                        id="background-effects-toggle"
                        type="checkbox"
                        checked={backgroundEffectsEnabled}
                        onChange={(e) => handleBackgroundEffectsToggle(e.target.checked)}
                        className="appearance-effects-toggle"
                    />
                </div>

                <div className="appearance-slider-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label htmlFor="background-effects-intensity" style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 600 }}>
                            Effekt-Staerke
                        </label>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{backgroundEffectsIntensity}%</span>
                    </div>
                    <input
                        id="background-effects-intensity"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={backgroundEffectsIntensity}
                        onChange={(e) => handleBackgroundEffectsIntensityChange(e.target.value)}
                        disabled={!backgroundEffectsEnabled}
                        className="appearance-effects-slider"
                    />
                </div>

                <h3 style={{ marginTop: '1.1rem', marginBottom: '0.7rem', color: 'var(--text-light)' }}>Preset-Styles</h3>
                <div className="appearance-presets">
                    {BACKGROUND_PRESETS.map((preset) => {
                        const isSelected = backgroundMode === 'preset' && backgroundPresetId === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                className={`appearance-preset-card ${isSelected ? 'active' : ''}`}
                                onClick={() => handleBackgroundPresetChange(preset.id)}
                            >
                                <span className="appearance-preset-swatch" style={{ background: `linear-gradient(135deg, ${preset.glow1}, ${preset.glow2}), ${preset.color}` }}></span>
                                <span>{preset.name}</span>
                            </button>
                        );
                    })}
                </div>

                <h3 style={{ marginTop: '1.1rem', marginBottom: '0.7rem', color: 'var(--text-light)' }}>Eigenes Hintergrundbild</h3>
                <label className="appearance-upload-label">
                    Bild hochladen
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="appearance-upload-input"
                        onChange={(e) => handleBackgroundUpload(e.target.files?.[0])}
                    />
                </label>
                <p style={{ marginTop: '0.45rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Empfehlung: max. 2.5 MB, Querformat für bestes Ergebnis.</p>
                {backgroundMode === 'upload' && backgroundImageData ? (
                    <p style={{ marginTop: '0.35rem', color: 'var(--success)', fontSize: '0.84rem' }}>Eigenes Bild ist aktiv.</p>
                ) : null}
                {appearanceNotice ? (
                    <p style={{ marginTop: '0.35rem', color: appearanceNotice.includes('fehl') || appearanceNotice.includes('gross') || appearanceNotice.includes('Bitte') ? 'var(--error)' : 'var(--success)', fontSize: '0.84rem' }}>
                        {appearanceNotice}
                    </p>
                ) : null}

                <div className="appearance-actions">
                    <button className="btn-secondary" onClick={resetBackgroundColor}>Standard wiederherstellen</button>
                    <button className="btn-primary" onClick={() => setAppMode('dashboard')}>Fertig</button>
                </div>

                <div className="reset-account-section">
                    <h3 className="reset-account-title">Gesamten Fortschritt zurücksetzen</h3>
                    <p className="reset-account-desc">
                        Setzt deinen kompletten Lernfortschritt auf Null zurück: Quiz, Wisor, Karteikarten, Statistiken und Notizen.
                    </p>
                    <button
                        className="btn-secondary btn-reset-account"
                        onClick={(e) => openResetModal(e, 'fullAccount')}
                    >
                        Account zurücksetzen
                    </button>
                </div>
            </section>

            <ResetModal
                isOpen={resetModalVisible}
                onClose={() => setResetModalVisible(false)}
                onConfirm={handleResetExecute}
                title="Bist du dir sicher?"
                description="Dein gesamter Lernstand wird unwiderruflich auf Null zurückgesetzt. Löse die Aufgabe, um fortzufahren:"
            />
        </div>
    );
}

export default AppearanceSettingsPage;
