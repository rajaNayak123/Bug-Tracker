import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bug, AlertCircle } from 'lucide-react';
import { ApiError } from '../api/client';

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isRegister && (!name || name.trim().length < 2)) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    try {
      setLoading(true);
      if (isRegister) {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          setError('Rate limit reached: Maximum 5 attempts per minute. Please wait 1 minute before trying again.');
        } else {
          setError(err.message || 'Authentication failed. Please verify your credentials.');
        }
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 4rem)',
      padding: '1.5rem',
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '3.5rem',
            height: '3.5rem',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            marginBottom: '1rem',
          }}>
            <Bug size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {isRegister ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {isRegister
              ? 'Join Bug Tracker Lite to manage issues with secure AWS S3 attachments.'
              : 'Sign in with your registered email and password.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" id="auth-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="register-name">Full Name</label>
              <input
                id="register-name"
                type="text"
                className="form-input"
                placeholder="Jane Developer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem' }}></span>
                <span>{isRegister ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{isRegister ? 'Register Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                id="switch-to-login-btn"
                className="btn-ghost"
                style={{ color: 'var(--accent-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                id="switch-to-register-btn"
                className="btn-ghost"
                style={{ color: 'var(--accent-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
