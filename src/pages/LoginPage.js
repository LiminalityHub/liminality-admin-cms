import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login, tempAuthEnabled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/posts';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="centered-page">
      <form className="card stack-lg auth-card" onSubmit={handleSubmit}>
        <h1 className="page-title">Liminality Admin</h1>
        <p className="muted">Sign in to manage blog posts.</p>
        {tempAuthEnabled ? (
          <p className="muted">
            Temporary passcode login is enabled for development.
          </p>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </label>

        <label className="field">
          <span>Password or temporary passcode</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
