import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getAnalyticsStorageKey, getCustomQuizStorageKey } from '../utils/analytics';
import { ACCESS_MODE_KEY } from '../utils/constants';

export const useAuth = (setAppMode) => {
    const [authUser, setAuthUser] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [authError, setAuthError] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authMsg, setAuthMsg] = useState('');
    const [captchaError, setCaptchaError] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);

    const captchaRef = useRef(null);
    const SECRET_PIN = '261115'; // Guest PIN

    const clearGuestProgressData = () => {
        localStorage.removeItem('ap2_srs_progress');
        localStorage.removeItem('ap2_quiz_progress');
        localStorage.removeItem('ap2_wisor_progress');
        localStorage.removeItem('ap2_wisor_eco_progress');
        localStorage.removeItem('ap2_saved_notes');
        localStorage.removeItem(getAnalyticsStorageKey(null));
        localStorage.removeItem(getCustomQuizStorageKey(null));
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                if (localStorage.getItem(ACCESS_MODE_KEY) === 'guest') {
                    clearGuestProgressData();
                }
                setAuthUser(session.user);
                localStorage.setItem('masterpat_auth', 'true');
                localStorage.setItem(ACCESS_MODE_KEY, 'member');
                if (setAppMode) setAppMode(prev => prev === 'auth' ? 'intro' : prev);
            } else {
                setAuthUser(null);
                localStorage.removeItem('masterpat_auth');
            }
        });

        return () => subscription.unsubscribe();
    }, [setAppMode]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!captchaToken) { setAuthMsg('Bitte bestätige das Captcha.'); return; }
        setAuthLoading(true);
        setAuthMsg('');
        const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        if (error) { setAuthMsg(error.message); setAuthLoading(false); }
        else {
            setAuthMsg('Erfolgreich eingeloggt! Lade Account...');
            if (localStorage.getItem(ACCESS_MODE_KEY) === 'guest') {
                clearGuestProgressData();
            }
            localStorage.setItem('masterpat_auth', 'true');
            localStorage.setItem(ACCESS_MODE_KEY, 'member');
            window.location.reload();
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!captchaToken) { setAuthMsg('Bitte bestätige das Captcha.'); return; }
        setAuthLoading(true);
        setAuthMsg('');
        const { error, data } = await supabase.auth.signUp({ email, password, options: { captchaToken } });
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        if (error) { setAuthMsg(error.message); setAuthLoading(false); }
        else {
            setAuthMsg('Account erstellt! Logge ein...');
            if (data?.session) {
                if (localStorage.getItem(ACCESS_MODE_KEY) === 'guest') {
                    clearGuestProgressData();
                }
                localStorage.setItem('masterpat_auth', 'true');
                localStorage.setItem(ACCESS_MODE_KEY, 'member');
                window.location.reload();
            }
            setAuthLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setAuthMsg('');
        setAuthLoading(true);

        const redirectTo = import.meta.env.VITE_OAUTH_REDIRECT_TO || window.location.origin;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
        });

        if (error) {
            setAuthMsg('Fehler beim Google-Login: ' + error.message);
            setAuthLoading(false);
        } else {
            localStorage.setItem(ACCESS_MODE_KEY, 'member');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('masterpat_auth');
        localStorage.removeItem(ACCESS_MODE_KEY);
        window.location.reload();
    };

    return {
        authUser,
        setAuthUser,
        pinInput,
        setPinInput,
        authError,
        setAuthError,
        email,
        setEmail,
        password,
        setPassword,
        authLoading,
        authMsg,
        setAuthMsg,
        captchaError,
        setCaptchaError,
        captchaToken,
        setCaptchaToken,
        captchaRef,
        SECRET_PIN,
        handleLogin,
        handleRegister,
        handleGoogleLogin,
        handleLogout,
        clearGuestProgressData
    };
};
