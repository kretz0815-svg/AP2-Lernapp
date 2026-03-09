import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { KLRGameHub } from '../features/klr';
import FloatingNotes from '../components/FloatingNotes';
import FloatingCalculator from '../components/FloatingCalculator';

function KLRPage() {
    const {
        setAppMode,
        appendLearningEvent,
        pomodoroPortal,
        burgerMenuPortal
    } = useAppContext();

    return (
        <>
            <div className="app-container" style={{ zIndex: 10 }}>
                {pomodoroPortal}
                {burgerMenuPortal}
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <KLRGameHub onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
            </div>
            <FloatingNotes questionId="klr_game" questionText="KLR Startup Survival" />
            <FloatingCalculator />
        </>
    );
}

export default KLRPage;
