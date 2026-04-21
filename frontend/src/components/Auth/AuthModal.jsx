/**
 * AuthModal — Login / Signup overlay
 */
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthModal.module.css';

const AuthModal = ({ onClose }) => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); return; }
        await signup(form.name, form.email, form.password);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.card}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>

        <div className={styles.logoBadge}>♫</div>
        <h2 className={styles.title}>
          {mode === 'login' ? 'Welcome back' : 'Join Rhythmix'}
        </h2>
        <p className={styles.sub}>
          {mode === 'login'
            ? 'Sign in to your account'
            : 'Create your free account'}
        </p>

        <form onSubmit={submit} className={styles.form}>
          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className={styles.switch}>
          {mode === 'login' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
