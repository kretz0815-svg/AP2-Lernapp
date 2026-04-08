import React, { useEffect, useRef, useState } from 'react';
import { bootstrapCostCalcModule } from '../features/klr';
import '../features/klr/components/costCalcModule.css';

export default function CostCalcBossModuleView({ onBack }) {
  const mountRef = useRef(null);
  const [moduleVariant, setModuleVariant] = useState('cost-calc');

  useEffect(() => {
    if (!mountRef.current) return undefined;

    let module;
    try {
      module = bootstrapCostCalcModule({ containerEl: mountRef.current, variant: moduleVariant });
    } catch (_ERROR) {
      mountRef.current.innerHTML = '<div class="ccm-hint-box">Das Modul konnte nicht geladen werden. Bitte Seite neu laden.</div>';
      return undefined;
    }

    return () => {
      if (module?.container) {
        module.container.innerHTML = '';
      }
    };
  }, [moduleVariant]);

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

        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={moduleVariant === 'cost-calc' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setModuleVariant('cost-calc')}
          >
            Kalkulationsboss
          </button>
          <button
            type="button"
            className={moduleVariant === 'finance-liquidity' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setModuleVariant('finance-liquidity')}
          >
            Finanz-Analyse
          </button>
        </div>
      </header>

      <div style={{ width: '100%', maxWidth: '980px' }}>
        <div id="calc-boss-module" ref={mountRef} />
      </div>
    </div>
  );
}
