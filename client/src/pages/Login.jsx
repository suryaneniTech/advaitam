import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login, loginWithOtp } = useAuth();
  const [tab, setTab] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState('email');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setError('');
    setInfo('');
    setOtp('');
    setOtpStep('email');
    setOtpSent(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      const { message } = await api.sendOtp(email);
      setOtpStep('code');
      setOtpSent(true);
      setInfo(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      await loginWithOtp(email, otp);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      const { message } = await api.sendOtp(email);
      setOtp('');
      setInfo(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="auth-card">
        <header className="auth-header">
          <span className="brand-mark">A</span>
          <h1 className="brand-title">Advaitam</h1>
          <p className="brand-tagline">Sign in to continue</p>
        </header>

        <div className="auth-tabs" role="tablist" aria-label="Sign in method">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'password'}
            className={`auth-tab ${tab === 'password' ? 'active' : ''}`}
            onClick={() => switchTab('password')}
          >
            Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'otp'}
            className={`auth-tab ${tab === 'otp' ? 'active' : ''}`}
            onClick={() => switchTab('otp')}
          >
            Login with OTP
          </button>
        </div>

        {tab === 'password' ? (
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : otpStep === 'email' ? (
          <form className="auth-form" onSubmit={handleSendOtp}>
            {error && <div className="alert alert-error">{error}</div>}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <p className="auth-hint">
              We&apos;ll email you a 6-digit sign-in code. New users are registered automatically.
            </p>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending code…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            {error && <div className="alert alert-error">{error}</div>}
            {info && <div className="alert alert-info">{info}</div>}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                readOnly
                className="input-readonly"
              />
            </label>

            <label className="field">
              <span>Sign-in code</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={submitting || otp.length !== 6}>
              {submitting ? 'Verifying…' : 'Verify & sign in'}
            </button>

            <div className="auth-form-actions">
              <button
                type="button"
                className="btn btn-link"
                disabled={submitting}
                onClick={() => {
                  setOtpStep('email');
                  setOtp('');
                  setError('');
                  setInfo('');
                  setOtpSent(false);
                }}
              >
                Change email
              </button>
              {otpSent && (
                <button
                  type="button"
                  className="btn btn-link"
                  disabled={submitting}
                  onClick={handleResendOtp}
                >
                  Resend code
                </button>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
