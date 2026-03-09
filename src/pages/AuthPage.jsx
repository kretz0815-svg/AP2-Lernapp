import React from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { ACCESS_MODE_KEY } from '../utils/constants';

function AuthPage({
    email, setEmail,
    password, setPassword,
    handleLogin, handleRegister, handleGoogleLogin,
    authLoading, authMsg,
    captchaRef, captchaSiteKey, currentHost,
    captchaToken, setCaptchaToken,
    captchaError, setCaptchaError,
    pinInput, setPinInput, SECRET_PIN,
    authError, setAuthError,
    clearGuestProgressData,
    setAppMode
}) {
    return (
        <div className="app-container" style={{ zIndex: 10 }}>
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>

            <div className="card-face fade-in" style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '3rem', margin: '0 auto', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '2rem' }}>Login / Account</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Erstelle einen Account oder logge dich ein, um deinen Lernfortschritt auf all deinen Geräten ("Cloud") synchron zu halten.</p>
                <form autoComplete="on" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <input
                        type="email"
                        id="login-email"
                        name="email"
                        autoComplete="email"
                        className="wisor-input"
                        placeholder="E-Mail Adresse"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ fontSize: '1rem', padding: '1rem' }}
                    />
                    <input
                        type="password"
                        id="login-password"
                        name="password"
                        autoComplete="current-password"
                        className="wisor-input"
                        placeholder="Passwort"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ fontSize: '1rem', padding: '1rem' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                        {captchaSiteKey ? (
                            <HCaptcha
                                ref={captchaRef}
                                sitekey={captchaSiteKey}
                                theme="dark"
                                onLoad={() => setCaptchaError('')}
                                onVerify={(token) => {
                                    setCaptchaToken(token);
                                    setCaptchaError('');
                                }}
                                onExpire={() => setCaptchaToken(null)}
                                onError={() => {
                                    setCaptchaToken(null);
                                    setCaptchaError(`hCaptcha konnte nicht geladen werden. Prüfe die Domain-Freigabe für "${currentHost}" im hCaptcha-Dashboard und den Sitekey.`);
                                }}
                            />
                        ) : (
                            <p style={{ color: 'var(--error)', fontWeight: 'bold', margin: 0 }}>
                                hCaptcha Sitekey fehlt (VITE_HCAPTCHA_SITE_KEY).
                            </p>
                        )}
                    </div>
                    {captchaError && <p style={{ color: 'var(--error)', marginBottom: '0.75rem', fontWeight: 'bold' }}>{captchaError}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }} disabled={authLoading || !captchaToken}>Login</button>
                        <button type="button" onClick={handleRegister} className="btn-secondary" style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }} disabled={authLoading || !captchaToken}>Registrieren</button>
                    </div>

                    <button
                        id="google-login-btn"
                        type="button"
                        className="btn-secondary"
                        onClick={handleGoogleLogin}
                        disabled={authLoading}
                        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
                    >
                        Mit Google anmelden
                    </button>
                </form>

                {authMsg && <p style={{ color: authMsg.includes('Erfolg') || authMsg.includes('erstellt') ? 'var(--success)' : 'var(--error)', marginBottom: '1rem', fontWeight: 'bold' }}>{authMsg}</p>}

                <hr style={{ margin: '1.5rem 0', borderColor: 'var(--glass-border)' }} />

                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.8rem' }}>Alternativ: Lokaler Gast Zugang (Nur auf diesem Gerät)</p>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (pinInput === SECRET_PIN) {
                        setAuthError(false);
                        localStorage.setItem(ACCESS_MODE_KEY, 'guest');
                        clearGuestProgressData();
                        localStorage.setItem('masterpat_auth', 'true');
                        setAppMode('intro');
                        window.location.reload(); // Zum Laden der User Data vom Device
                    } else {
                        setAuthError(true);
                        setPinInput('');
                    }
                }}>
                    <input
                        type="password"
                        className="wisor-input"
                        placeholder="App-PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        style={{ textAlign: 'center', letterSpacing: '0.2rem', marginBottom: '1rem', padding: '0.7rem', fontSize: '1rem' }}
                    />
                    {authError && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontWeight: 'bold' }}>Falsche PIN!</p>}
                    <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}>Als Gast (Lokal) fortfahren</button>
                </form>
            </div>
        </div>
    );
}

export default AuthPage;
