import React, { useEffect } from 'react';
import { bootstrapCostCalcModule } from '../features/klr';
import '../features/klr/components/costCalcModule.css';

export default function CostCalcBossModuleView({ onBack }) {
  useEffect(() => {
    const module = bootstrapCostCalcModule({ containerId: 'calc-boss-module' });

    return () => {
      if (module?.container) {
        module.container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="app-container" style={{ zIndex: 10 }}>
      <header style={{ width: '100%', maxWidth: '980px', marginBottom: '0.85rem' }}>
        <button className="btn-nav" onClick={onBack}>&larr; Menue</button>
      </header>

      <div style={{ width: '100%', maxWidth: '980px' }}>
        <div id="calc-boss-module" />
      </div>
    </div>
  );
}
