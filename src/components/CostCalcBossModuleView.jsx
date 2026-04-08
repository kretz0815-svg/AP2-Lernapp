import React, { useEffect, useRef, useState } from 'react';
import { bootstrapCostCalcModule } from '../features/klr';
import '../features/klr/components/costCalcModule.css';

export default function CostCalcBossModuleView({ onBack }) {
  const mountRef = useRef(null);
  const [moduleVariant, setModuleVariant] = useState('cost-calc');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
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
    <div className="app-container ccm-view-root" style={{ zIndex: 10 }}>
      <header className="ccm-view-header" style={{ width: '100%', maxWidth: '980px', marginBottom: '0.85rem' }}>
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

        <div className="ccm-view-switcher" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={moduleVariant === 'cost-calc' ? 'ccm-view-switch-btn active' : 'ccm-view-switch-btn'}
            onClick={() => setModuleVariant('cost-calc')}
          >
            Kalkulationsboss
          </button>
          <button
            type="button"
            className={moduleVariant === 'finance-liquidity' ? 'ccm-view-switch-btn active' : 'ccm-view-switch-btn'}
            onClick={() => setModuleVariant('finance-liquidity')}
          >
            Finanz-Analyse
          </button>
        </div>
      </header>

      <div className="ccm-view-module-wrap" style={{ width: '100%', maxWidth: '980px' }}>
        <div id="calc-boss-module" ref={mountRef} />
      </div>
    </div>
  );
}
