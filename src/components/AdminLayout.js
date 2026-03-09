import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminLayout({ title, children }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/posts" className="brand">Liminality Admin</Link>
          <div className="topbar-actions">
            <span className="muted">{user?.email || 'Admin'}</span>
            <button type="button" className="button button-outline" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        {title ? <h1 className="page-title">{title}</h1> : null}
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
