import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps routes that require a logged-in AND approved user.
 *
 * - Not logged in  → redirect to /login
 * - Logged in but not approved → redirect to /login (which will show the
 *   pending message after the user next logs in, or we just send them to
 *   the login page since they shouldn't be here)
 * - Logged in and approved → render children
 */
export default function ProtectedRoute({ children, requireProfileName = true }) {
  // DEV BYPASS: skip auth to work on the editor UI
  if (process.env.REACT_APP_DEV_BYPASS_AUTH === 'true') {
    return children;
  }

  const { currentUser, isApproved, loading, hasProfileName } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <p style={{ color: '#ccc' }}>Loading…</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isApproved) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Awaiting Approval</h1>
          <p className="auth-info">
            Your account is pending admin approval. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  if (requireProfileName && !hasProfileName) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}
