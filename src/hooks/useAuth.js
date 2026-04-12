import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getAnalyticsStorageKey, getCustomQuizStorageKey } from '../utils/analytics';
import { ACCESS_MODE_KEY } from '../utils/constants';

const REMEMBER_LOGIN_KEY = 'ap2_remember_login';
const REMEMBERED_SESSION_KEY = 'ap2_remembered_supabase_session';

export const useAuth = (setAppMode) => {
    const [authUser, setAuthUser] = useState(null);
    const [authError, setAuthError] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authMsg, setAuthMsg] = useState('');
    const [rememberMe, setRememberMe] = useState(() => {
        try {
            return localStorage.getItem(REMEMBER_LOGIN_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [captchaError, setCaptchaError] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);

    const captchaRef = useRef(null);

    const clearRememberedSession = () => {
        localStorage.removeItem(REMEMBERED_SESSION_KEY);
    };

    const saveRememberedSession = (session) => {
        if (!session?.access_token || !session?.refresh_token) return;
        localStorage.setItem(REMEMBERED_SESSION_KEY, JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at || null,
            stored_at: Date.now()
        }));
    };

    useEffect(() => {
        localStorage.setItem(REMEMBER_LOGIN_KEY, rememberMe ? 'true' : 'false');
    }, [rememberMe]);

    useEffect(() => {
        let cancelled = false;

        const restoreRememberedSession = async () => {
            if (!rememberMe) {
                clearRememberedSession();
                return;
            }

            let remembered = null;
            try {
                remembered = JSON.parse(localStorage.getItem(REMEMBERED_SESSION_KEY) || 'null');
            } catch {
                remembered = null;
            }

            if (!remembered?.access_token || !remembered?.refresh_token) return;

            const { error } = await supabase.auth.setSession({
                access_token: remembered.access_token,
                refresh_token: remembered.refresh_token,
            });

            if (cancelled) return;
            if (error) clearRememberedSession();
        };

        restoreRememberedSession();

        return () => {
            cancelled = true;
        };
    }, [rememberMe]);

    const clearGuestProgressData = () => {
        localStorage.removeItem('ap2_srs_progress');
        localStorage.removeItem('ap2_quiz_progress');
        localStorage.removeItem('ap2_wisor_eco_progress');
        localStorage.removeItem('ap2_marketing_review_progress');
        localStorage.removeItem('ap2_saved_notes');
        localStorage.removeItem(getAnalyticsStorageKey(null));
        localStorage.removeItem(getCustomQuizStorageKey(null));
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setAuthUser(session.user);
                localStorage.setItem('masterpat_auth', 'true');
                localStorage.setItem(ACCESS_MODE_KEY, 'member');
                if (rememberMe) {
                    saveRememberedSession(session);
                } else {
                    clearRememberedSession();
                }
                if (setAppMode) setAppMode(prev => prev === 'auth' ? 'intro' : prev);
            } else {
                setAuthUser(null);
                localStorage.removeItem('masterpat_auth');
                localStorage.removeItem(ACCESS_MODE_KEY);
            }
        });

        return () => subscription.unsubscribe();
    }, [rememberMe, setAppMode]);

    const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_HCAPTCHA_SITEKEY || '';

    const handleLogin = async (e) => {
        e.preventDefault();
        if (captchaSiteKey && !captchaToken) { setAuthMsg('Bitte bestätige das Captcha.'); return; }
        setAuthLoading(true);
        setAuthMsg('');
        const { error } = await supabase.auth.signInWithPassword({ 
            email, 
            password, 
            options: captchaToken ? { captchaToken } : {} 
        });
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        if (error) { setAuthMsg(error.message); setAuthLoading(false); }
        else {
            setAuthMsg('Erfolgreich eingeloggt! Lade Account...');
            localStorage.setItem('masterpat_auth', 'true');
            localStorage.setItem(ACCESS_MODE_KEY, 'member');
            setAuthLoading(false);
            if (setAppMode) setAppMode('dashboard');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (captchaSiteKey && !captchaToken) { setAuthMsg('Bitte bestätige das Captcha.'); return; }
        setAuthLoading(true);
        setAuthMsg('');
        const { error, data } = await supabase.auth.signUp({ 
            email, 
            password, 
            options: captchaToken ? { captchaToken } : {} 
        });
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        if (error) { setAuthMsg(error.message); setAuthLoading(false); }
        else {
            setAuthMsg('Account erstellt! Logge ein...');
            if (data?.session) {
                localStorage.setItem('masterpat_auth', 'true');
                localStorage.setItem(ACCESS_MODE_KEY, 'member');
                if (setAppMode) setAppMode('dashboard');
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
        clearRememberedSession();
        localStorage.removeItem('masterpat_auth');
        localStorage.removeItem(ACCESS_MODE_KEY);
        window.location.reload();
    };

    return {
        authUser,
        setAuthUser,
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
        handleLogin,
        handleRegister,
        handleGoogleLogin,
        handleLogout,
        clearGuestProgressData,
        rememberMe,
        setRememberMe,
    };
};
