import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import BreakEvenPoint from '../components/BreakEvenPoint';
import FloatingNotes from '../components/FloatingNotes';
import FloatingCalculator from '../components/FloatingCalculator';

function BreakEvenPage() {
    const {
        setAppMode,
        appendLearningEvent,
        pomodoroPortal,
        burgerMenuPortal
    } = useAppContext();

    return (
        <>
            {pomodoroPortal}
            {burgerMenuPortal}
            <BreakEvenPoint onBack={() => setAppMode('dashboard')} onLearningEvent={appendLearningEvent} />
            <FloatingNotes questionId="break_even_point" questionText="Break-Even-Point Training" />
            <FloatingCalculator />
        </>
    );
}

export default BreakEvenPage;
