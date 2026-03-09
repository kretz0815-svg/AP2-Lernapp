import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import KalkulationsBoss from '../components/KalkulationsBoss';
import FloatingNotes from '../components/FloatingNotes';
import FloatingCalculator from '../components/FloatingCalculator';

function KalkulationPage() {
    const {
        setAppMode,
        appendLearningEvent,
        authUser,
        pomodoroPortal,
        burgerMenuPortal
    } = useAppContext();

    return (
        <>
            {pomodoroPortal}
            {burgerMenuPortal}
            <KalkulationsBoss onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} isGuest={!authUser} />
            <FloatingNotes questionId="kalkulation" questionText="Kalkulations-Boss" />
            <FloatingCalculator />
        </>
    );
}

export default KalkulationPage;
