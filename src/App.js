import { Navigate, Route, Routes } from 'react-router-dom';
import PostsPage from './pages/PostsPage';
import NewPostPage from './pages/NewPostPage';
import EditPostPage from './pages/EditPostPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { isRecovery } = useAuth();

  // If the user arrived via a password reset link, show the reset form
  if (isRecovery) {
    return <ResetPasswordPage />;
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected CMS routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute requireProfileName={false}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <PostsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts/new"
        element={
          <ProtectedRoute>
            <NewPostPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts/:id/edit"
        element={
          <ProtectedRoute>
            <EditPostPage />
          </ProtectedRoute>
        }
      />

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/posts" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
