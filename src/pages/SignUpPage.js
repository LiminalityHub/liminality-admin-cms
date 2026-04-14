import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignUpPage() {
  const { signup, currentUser, isApproved, hasProfileName } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      return setError('Passwords do not match.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      await signup(email, password);
      setDone(true);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Try logging in.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // If the user is logged in but not approved, show the 'done' state
  React.useEffect(() => {
    if (currentUser && !isApproved) {
      setDone(true);
    } else if (currentUser && isApproved) {
      navigate(hasProfileName ? '/posts' : '/profile');
    }
  }, [currentUser, hasProfileName, isApproved, navigate]);

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Account Created</h1>
          <p className="auth-info">
            Your account is pending admin approval. You'll be notified once
            access has been granted.
          </p>
          <button
            className="auth-btn primary"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Request access to Liminality Admin</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <label htmlFor="signup-confirm">Confirm Password</label>
          <input
            id="signup-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />

          <button type="submit" className="auth-btn primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
