import React, { useEffect, useRef } from 'react';
import { bootstrapCostCalcModule } from '../features/klr';
import '../features/klr/components/costCalcModule.css';

export default function CostCalcBossModuleView({ onBack }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return undefined;

    let module;
    try {
      module = bootstrapCostCalcModule({ containerEl: mountRef.current });
    } catch (error) {
      mountRef.current.innerHTML = '<div class="ccm-hint-box">Das Modul konnte nicht geladen werden. Bitte Seite neu laden.</div>';
      return undefined;
    }

    return () => {
      if (module?.container) {
        module.container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      <header style={{ width: '100%', maxWidth: '980px', marginBottom: '0.85rem' }}>
        <button
          type="button"
          className="btn-nav"
          onClick={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          &larr; Menue
        </button>
      </header>

      <div style={{ width: '100%', maxWidth: '980px' }}>
        <div id="calc-boss-module" ref={mountRef} />
      </div>
    </div>
  );
}
