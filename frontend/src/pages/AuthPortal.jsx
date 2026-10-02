import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  classifyApiError, 
  sendRegistrationOtp, 
  verifyRegistrationOtp, 
  verifyLoginOtp,
  resendRegistrationOtp 
} from '../services/api';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  ArrowRight, 
  KeyRound, 
  UserPlus, 
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Shield
} from 'lucide-react';
import logoSvg from '../assets/logo/logo.svg';
import CinematicScene from '../components/CinematicScene';

/**
 * Partially masks an email address for zero-leak privacy (e.g. u***@gmail.com)
 */
function maskEmail(str) {
  if (!str || typeof str !== 'string' || !str.includes('@')) return str || '';
  const [local, domain] = str.split('@');
  if (local.length <= 1) {
    return `${local}***@${domain}`;
  }
  return `${local[0]}***@${domain}`;
}

export default function AuthPortal({ defaultMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setSession } = useAuth();
  const { healthStatus, retryNow } = useBackendHealth();

  // Mode derived from route, falling back to defaultMode
  const mode = location.pathname === '/signup' 
    ? 'signup' 
    : (location.pathname === '/login' ? 'login' : defaultMode);

  // Active Login Tab: 'user' (Operative Login) vs 'admin' (Admin Access)
  const [loginType, setLoginType] = useState('user');

  // Form State - strictly EMPTY strings (NO defaults, NO hardcoded values, NO autofill)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP State - completely isolated from form credential states
  const [isOtpStage, setIsOtpStage] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState('LOGIN'); // 'LOGIN' | 'SIGNUP'
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpCooldown, setOtpCooldown] = useState(60);
  const [successMessage, setSuccessMessage] = useState(null);
  const otpInputsRef = useRef([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const from = location.state?.from?.pathname;

  // STRICT AUTOFILL DEFEAT: Force-clear all credential fields on initial mount, route transition, or tab switch
  useEffect(() => {
    setEmail('');
    setPassword('');
    setAdminEmail('');
    setAdminPassword('');
    setFullName('');
    setConfirmPassword('');
    try {
      localStorage.removeItem('shadowtrace_remember_email');
      sessionStorage.removeItem('shadowtrace_pending_otp');
    } catch {}

    // Secondary delayed clear to defeat aggressive browser password managers (Edge/Chrome password autofill injection)
    const antiAutofillTimer = setTimeout(() => {
      if (!isOtpStage) {
        setEmail('');
        setPassword('');
        setAdminEmail('');
        setAdminPassword('');
      }
    }, 120);

    return () => clearTimeout(antiAutofillTimer);
  }, [location.pathname, loginType]);

  // OTP Cooldown Countdown
  useEffect(() => {
    if (!isOtpStage || otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOtpStage, otpCooldown]);

  // Handle Tab / Mode Transition
  const handleSwitchMode = (newMode) => {
    setError(null);
    setSuccessMessage(null);
    setIsOtpStage(false);
    setEmail('');
    setPassword('');
    setAdminEmail('');
    setAdminPassword('');
    setFullName('');
    setConfirmPassword('');
    if (newMode === 'signup') {
      navigate('/signup', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  // Submit Handler for Operative Login (Step 1: Credentials -> Real OTP)
  const handleUserLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid operative email address format.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const targetEmail = email.trim();
      const res = await login(targetEmail, password, false);

      if (res && res.requiresOtp) {
        const masked = res.maskedEmail || maskEmail(targetEmail);
        const cooldown = res.resendCooldown || 60;
        setOtpTargetEmail(targetEmail);
        setIsOtpStage(true);
        setOtpPurpose('LOGIN');
        setMaskedEmail(masked);
        setOtpCooldown(cooldown);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessMessage(res.message || 'Verification code dispatched to your registered operative email.');
        // Wipe plaintext password from memory immediately
        setPassword('');
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 100);
      } else if (res && (res._id || res.id || res.role)) {
        if (from && from !== '/login' && from !== '/signup') {
          navigate(from, { replace: true });
        } else if (res.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err) {
      const classified = classifyApiError(err);
      setError(classified.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler for Admin Login (DIRECT AUTHENTICATION — STRICTLY NO OTP)
  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      setError('Please enter administrator email and password.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(adminEmail.trim())) {
      setError('Please enter a valid administrator email address format.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Authenticate with isAdminLogin flag
      const res = await login(adminEmail.trim(), adminPassword, true);

      if (res && (res._id || res.id || res.role === 'admin')) {
        setAdminPassword('');
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      const classified = classifyApiError(err);
      setError(classified.message || 'Administrator access denied.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler for Signup (Step 1: Details -> Real OTP)
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a secure contact email.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid operative email address format.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password confirmation mismatch. Both passwords must match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const targetEmail = email.trim();
      const res = await sendRegistrationOtp({
        fullName: fullName.trim(),
        email: targetEmail,
        password
      });

      const masked = res.maskedEmail || maskEmail(targetEmail);
      const cooldown = res.resendCooldown || 60;
      setOtpTargetEmail(targetEmail);
      setIsOtpStage(true);
      setOtpPurpose('SIGNUP');
      setMaskedEmail(masked);
      setOtpCooldown(cooldown);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(res.message || 'Verification code dispatched to your registered operative email.');
      // Clear sensitive password from state immediately
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      const classified = classifyApiError(err);
      setError(classified.message);
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Handlers
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      if (cleaned) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = cleaned[i] || '';
        }
        setOtpDigits(newDigits);
        const nextIdx = Math.min(cleaned.length, 5);
        otpInputsRef.current[nextIdx]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const targetIdx = Math.min(pasted.length, 5);
      otpInputsRef.current[targetIdx]?.focus();
    }
  };

  // Submit Handler for OTP Verification (Step 2: OTP -> Authenticated Session)
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setError('Invalid verification code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let res;
      if (otpPurpose === 'LOGIN') {
        res = await verifyLoginOtp(otpTargetEmail, otpCode);
      } else {
        res = await verifyRegistrationOtp(otpTargetEmail, otpCode);
      }

      if (res && res.token && res.user) {
        setSuccessMessage('Identity verified. Clearance established.');
        setSession(res.token, res.user);

        setTimeout(() => {
          if (from && from !== '/login' && from !== '/signup') {
            navigate(from, { replace: true });
          } else if (res.user.role === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 200);
      }
    } catch (err) {
      const classified = classifyApiError(err);
      setError(classified.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Handler (enforces 60s rate limit)
  const handleResendOtp = async () => {
    if (otpCooldown > 0 || loading) return;
    try {
      setLoading(true);
      setError(null);
      const res = await resendRegistrationOtp(otpTargetEmail, otpPurpose);
      const cooldown = res.resendCooldown || 60;
      setOtpCooldown(cooldown);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(res.message || 'New verification code dispatched.');
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 50);
    } catch (err) {
      const classified = classifyApiError(err);
      setError(classified.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cinematic-auth-root">
      {/* Background Atmosphere across both columns */}
      <div className="cinematic-shared-bg" aria-hidden="true">
        <div className="cinematic-ambient-orb gold-top" />
        <div className="cinematic-ambient-orb gold-bottom" />
        <div className="cinematic-ambient-orb blue-center" />
        <div className="cinematic-grid-overlay" />
        <div className="cinematic-scanline" />
      </div>

      {/* Main Split-Screen Grid Layout */}
      <div className="cinematic-auth-grid">
        {/* LEFT COLUMN: Authentication Panel */}
        <section className="cinematic-left-panel" aria-label="ShadowTrace Authentication">
          <div className="cinematic-auth-card">
            {/* Brand Header */}
            <header className="cinematic-brand-header">
              <div className="cinematic-logo-badge">
                <img src={logoSvg} alt="ShadowTrace Emblem" className="cinematic-logo-img" />
              </div>
              <h1 className="cinematic-brand-title">SHADOWTRACE</h1>
              <p className="cinematic-brand-tagline">TRACE • ANALYZE • REVEAL</p>
              <div className="cinematic-brand-subtitle">
                <span className={`cinematic-live-dot ${healthStatus === 'connected' ? '' : (healthStatus === 'unavailable' ? 'offline' : 'warning')}`} />
                <span>
                  {healthStatus === 'connected' 
                    ? 'SHADOWTRACE SYSTEM ONLINE' 
                    : (healthStatus === 'unavailable' 
                        ? 'BACKEND CONNECTION LOST' 
                        : 'CONNECTING TO SHADOWTRACE...')}
                </span>
                {healthStatus === 'unavailable' && (
                  <button
                    type="button"
                    className="cinematic-status-retry-btn"
                    onClick={retryNow}
                    title="Retry connection"
                  >
                    RETRY
                  </button>
                )}
              </div>
            </header>

            {/* Mode Switch Tabs: [ OPERATIVE LOGIN ] [ ADMIN ACCESS ] */}
            {!isOtpStage ? (
              mode === 'login' ? (
                <nav className="cinematic-mode-switch" aria-label="Clearance Mode">
                  <button
                    type="button"
                    id="tab-operative-login"
                    className={`cinematic-mode-btn ${loginType === 'user' ? 'active' : ''}`}
                    onClick={() => {
                      setLoginType('user');
                      setError(null);
                      setSuccessMessage(null);
                      setEmail('');
                      setPassword('');
                    }}
                  >
                    <KeyRound size={14} />
                    <span>OPERATIVE LOGIN</span>
                  </button>
                  <button
                    type="button"
                    id="tab-admin-access"
                    className={`cinematic-mode-btn ${loginType === 'admin' ? 'active' : ''}`}
                    onClick={() => {
                      setLoginType('admin');
                      setError(null);
                      setSuccessMessage(null);
                      setAdminEmail('');
                      setAdminPassword('');
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>ADMIN ACCESS</span>
                  </button>
                </nav>
              ) : (
                <nav className="cinematic-mode-switch" aria-label="Clearance Mode">
                  <button
                    type="button"
                    id="tab-back-to-login"
                    className="cinematic-mode-btn"
                    onClick={() => handleSwitchMode('login')}
                  >
                    <KeyRound size={14} />
                    <span>LOGIN</span>
                  </button>
                  <button
                    type="button"
                    id="tab-active-signup"
                    className="cinematic-mode-btn active"
                    disabled
                  >
                    <UserPlus size={14} />
                    <span>CREATE ACCOUNT</span>
                  </button>
                </nav>
              )
            ) : (
              <div className="otp-stage-badge-bar">
                <span className="otp-stage-badge">
                  <Lock size={12} />
                  <span>TWO-FACTOR AUTHENTICATION ACTIVE</span>
                </span>
              </div>
            )}

            {/* Status Notifications */}
            {successMessage && (
              <div className="cinematic-success-banner" role="status">
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="cinematic-error-banner" role="alert">
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Form Stage */}
            <div className="cinematic-form-container">
              {isOtpStage ? (
                /* OTP VERIFICATION FORM */
                <form onSubmit={handleVerifyOtpSubmit} className="cinematic-form-stage" key="form-otp" autoComplete="off">
                  <div className="otp-header-callout">
                    <div className="otp-icon-badge">
                      <ShieldCheck size={28} color="#F3D275" />
                    </div>
                    <h2 className="otp-title">IDENTITY VERIFICATION</h2>
                    <p className="otp-subtitle">Enter the 6-digit verification code sent to your registered email.</p>
                    <div className="otp-email-pill-container">
                      <span className="otp-email-pill mono-font">
                        Code sent to: {maskedEmail || maskEmail(otpTargetEmail)}
                      </span>
                    </div>
                  </div>

                  {/* 6 Digit Input Boxes */}
                  <div className="otp-inputs-row" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        id={`otp-digit-${idx}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        placeholder="_"
                        className={`otp-digit-input ${digit ? 'filled' : ''}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        autoFocus={idx === 0}
                        disabled={loading}
                        autoComplete="off"
                        aria-label={`Verification digit ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Action Buttons: VERIFY CODE & RESEND CODE */}
                  <div className="otp-actions-stack">
                    <button
                      type="submit"
                      id="verify-otp-submit-btn"
                      className="cinematic-submit-btn"
                      disabled={loading || otpDigits.join('').length !== 6}
                    >
                      {loading ? (
                        <>
                          <span className="cinematic-btn-spinner" />
                          <span>VERIFYING CODE...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          <span>VERIFY CODE</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <div className="otp-resend-wrapper">
                      <button
                        type="button"
                        id="resend-otp-btn"
                        className="otp-resend-btn"
                        onClick={handleResendOtp}
                        disabled={loading || otpCooldown > 0}
                      >
                        <RotateCcw size={14} />
                        <span>{otpCooldown > 0 ? `RESEND CODE (${otpCooldown}s)` : 'RESEND CODE'}</span>
                      </button>
                      {otpCooldown > 0 && (
                        <span className="otp-cooldown-caption">
                          Please wait {otpCooldown} seconds before requesting another code.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Back Link */}
                  <div className="cinematic-card-footer">
                    <span>Need to change email or restart? </span>
                    <button
                      type="button"
                      className="cinematic-link-btn"
                      onClick={() => {
                        setIsOtpStage(false);
                        setError(null);
                        setSuccessMessage(null);
                        setEmail('');
                        setPassword('');
                      }}
                    >
                      {otpPurpose === 'LOGIN' ? 'BACK TO LOGIN' : 'BACK TO REGISTRATION'}
                    </button>
                  </div>
                </form>
              ) : mode === 'login' ? (
                loginType === 'user' ? (
                  /* OPERATIVE LOGIN FORM */
                  <form onSubmit={handleUserLoginSubmit} className="cinematic-form-stage" key="form-operative-login" autoComplete="off">
                    {/* Anti-autofill decoy inputs */}
                    <input type="text" name="decoy_user_email" style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" aria-hidden="true" autoComplete="off" />
                    <input type="password" name="decoy_user_cipher" style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" aria-hidden="true" autoComplete="new-password" />

                    {/* Operative Email */}
                    <div className="cinematic-field-group">
                      <label className="cinematic-field-label" htmlFor="user-login-email">
                        EMAIL
                      </label>
                      <div className="cinematic-input-shell">
                        <Mail size={16} className="cinematic-input-icon" />
                        <input
                          id="user-login-email"
                          name="operative_id_email"
                          type="email"
                          className="cinematic-input"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="username"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck="false"
                          readOnly
                          onFocus={(e) => e.target.removeAttribute('readonly')}
                          onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                          onTouchStart={(e) => e.target.removeAttribute('readonly')}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="cinematic-field-group">
                      <label className="cinematic-field-label" htmlFor="user-login-password">
                        PASSWORD
                      </label>
                      <div className="cinematic-input-shell">
                        <Lock size={16} className="cinematic-input-icon" />
                        <input
                          id="user-login-password"
                          name="operative_sec_password"
                          type={showPassword ? 'text' : 'password'}
                          className="cinematic-input"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          readOnly
                          onFocus={(e) => e.target.removeAttribute('readonly')}
                          onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                          onTouchStart={(e) => e.target.removeAttribute('readonly')}
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="cinematic-visibility-btn"
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex="-1"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Forgot Clearance Link */}
                    <div className="cinematic-options-row" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="cinematic-forgot-btn"
                        onClick={() => setShowRecoveryModal(true)}
                      >
                        Forgot Clearance?
                      </button>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      id="login-submit-btn"
                      className="cinematic-submit-btn"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="cinematic-btn-spinner" />
                          <span>VERIFYING CREDENTIALS...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound size={16} />
                          <span>ACCESS THE DIGITAL SHADOW</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    {/* Switch to Signup */}
                    <div className="cinematic-card-footer">
                      <span>Don't have an operative account? </span>
                      <button
                        type="button"
                        className="cinematic-link-btn"
                        onClick={() => handleSwitchMode('signup')}
                      >
                        CREATE ACCOUNT
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ADMIN ACCESS LOGIN FORM */
                  <form onSubmit={handleAdminLoginSubmit} className="cinematic-form-stage" key="form-admin-login" autoComplete="off">
                    {/* Anti-autofill decoy inputs */}
                    <input type="text" name="decoy_admin_email" style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" aria-hidden="true" autoComplete="off" />
                    <input type="password" name="decoy_admin_cipher" style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" aria-hidden="true" autoComplete="new-password" />

                    {/* Admin Email */}
                    <div className="cinematic-field-group">
                      <label className="cinematic-field-label" htmlFor="admin-login-email">
                        ADMIN EMAIL
                      </label>
                      <div className="cinematic-input-shell">
                        <Mail size={16} className="cinematic-input-icon" />
                        <input
                          id="admin-login-email"
                          name="admin_authority_email"
                          type="email"
                          className="cinematic-input"
                          placeholder="Enter administrator email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          autoComplete="username"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck="false"
                          readOnly
                          onFocus={(e) => e.target.removeAttribute('readonly')}
                          onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                          onTouchStart={(e) => e.target.removeAttribute('readonly')}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Admin Password */}
                    <div className="cinematic-field-group">
                      <label className="cinematic-field-label" htmlFor="admin-login-password">
                        ADMIN PASSWORD
                      </label>
                      <div className="cinematic-input-shell">
                        <Lock size={16} className="cinematic-input-icon" />
                        <input
                          id="admin-login-password"
                          name="admin_master_cipher"
                          type={showAdminPassword ? 'text' : 'password'}
                          className="cinematic-input"
                          placeholder="Enter administrator password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          autoComplete="current-password"
                          readOnly
                          onFocus={(e) => e.target.removeAttribute('readonly')}
                          onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                          onTouchStart={(e) => e.target.removeAttribute('readonly')}
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="cinematic-visibility-btn"
                          onClick={() => setShowAdminPassword((prev) => !prev)}
                          tabIndex="-1"
                          aria-label={showAdminPassword ? 'Hide administrator password' : 'Show administrator password'}
                        >
                          {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Security Notice */}
                    <div className="cinematic-options-row" style={{ justifyContent: 'flex-start' }}>
                      <span style={{ fontSize: '0.75rem', color: '#8E9BAE', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Shield size={12} color="#F3D275" />
                        Authorized System Administrators Only
                      </span>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      id="admin-submit-btn"
                      className="cinematic-submit-btn"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="cinematic-btn-spinner" />
                          <span>AUTHENTICATING COMMAND CONSOLE...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          <span>ACCESS COMMAND CONSOLE</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    {/* Switch back to Operative */}
                    <div className="cinematic-card-footer">
                      <span>Standard operative clearance? </span>
                      <button
                        type="button"
                        className="cinematic-link-btn"
                        onClick={() => {
                          setLoginType('user');
                          setError(null);
                          setAdminEmail('');
                          setAdminPassword('');
                        }}
                      >
                        OPERATIVE LOGIN
                      </button>
                    </div>
                  </form>
                )
              ) : (
                /* SIGNUP / REGISTRATION FORM */
                <form onSubmit={handleSignupSubmit} className="cinematic-form-stage" key="form-signup" autoComplete="off">
                  {/* Anti-autofill decoy inputs */}
                  <input type="text" name="decoy_signup_user" style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" aria-hidden="true" autoComplete="off" />
                  <input type="password" name="decoy_signup_pass" style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} tabIndex="-1" aria-hidden="true" autoComplete="new-password" />

                  {/* Full Name */}
                  <div className="cinematic-field-group">
                    <label className="cinematic-field-label" htmlFor="signup-name">
                      FULL NAME
                    </label>
                    <div className="cinematic-input-shell">
                      <User size={16} className="cinematic-input-icon" />
                      <input
                        id="signup-name"
                        name="registration_fullname"
                        type="text"
                        className="cinematic-input"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        readOnly
                        onFocus={(e) => e.target.removeAttribute('readonly')}
                        onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                        onTouchStart={(e) => e.target.removeAttribute('readonly')}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="cinematic-field-group">
                    <label className="cinematic-field-label" htmlFor="signup-email">
                      EMAIL
                    </label>
                    <div className="cinematic-input-shell">
                      <Mail size={16} className="cinematic-input-icon" />
                      <input
                        id="signup-email"
                        name="registration_email"
                        type="email"
                        className="cinematic-input"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck="false"
                        readOnly
                        onFocus={(e) => e.target.removeAttribute('readonly')}
                        onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                        onTouchStart={(e) => e.target.removeAttribute('readonly')}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="cinematic-field-group">
                    <label className="cinematic-field-label" htmlFor="signup-password">
                      PASSWORD
                    </label>
                    <div className="cinematic-input-shell">
                      <Lock size={16} className="cinematic-input-icon" />
                      <input
                        id="signup-password"
                        name="registration_cipher_key"
                        type={showPassword ? 'text' : 'password'}
                        className="cinematic-input"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        readOnly
                        onFocus={(e) => e.target.removeAttribute('readonly')}
                        onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                        onTouchStart={(e) => e.target.removeAttribute('readonly')}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="cinematic-visibility-btn"
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex="-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="cinematic-field-group">
                    <label className="cinematic-field-label" htmlFor="signup-confirm-password">
                      CONFIRM PASSWORD
                    </label>
                    <div className="cinematic-input-shell">
                      <Lock size={16} className="cinematic-input-icon" />
                      <input
                        id="signup-confirm-password"
                        name="registration_cipher_confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="cinematic-input"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        readOnly
                        onFocus={(e) => e.target.removeAttribute('readonly')}
                        onMouseEnter={(e) => e.target.removeAttribute('readonly')}
                        onTouchStart={(e) => e.target.removeAttribute('readonly')}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="cinematic-visibility-btn"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        tabIndex="-1"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="signup-submit-btn"
                    className="cinematic-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="cinematic-btn-spinner" />
                        <span>ENROLLING OPERATIVE...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>INITIALIZE CLEARANCE</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  {/* Switch to Login */}
                  <div className="cinematic-card-footer">
                    <span>Already have security clearance? </span>
                    <button
                      type="button"
                      className="cinematic-link-btn"
                      onClick={() => handleSwitchMode('login')}
                    >
                      LOGIN
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Cinematic Visual Scene */}
        <CinematicScene />
      </div>

      {/* Intelligence Credential Recovery Modal */}
      {showRecoveryModal && (
        <div className="cinematic-modal-backdrop" onClick={() => setShowRecoveryModal(false)}>
          <div className="cinematic-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cinematic-modal-title">
              <ShieldCheck size={20} />
              <span>CLEARANCE RECOVERY PROTOCOL</span>
            </div>
            <div className="cinematic-modal-body">
              ShadowTrace operates under zero-trust intelligence agency encryption protocols. 
              Cipher reset mandates system administrator re-verification.
              <br /><br />
              If you have lost your operative credentials, please contact your System Administrator directly for identity verification.
            </div>
            <button
              type="button"
              className="cinematic-modal-close-btn"
              onClick={() => setShowRecoveryModal(false)}
            >
              ACKNOWLEDGE & RETURN
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
