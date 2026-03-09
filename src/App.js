import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import PostsPage from './pages/PostsPage';
import NewPostPage from './pages/NewPostPage';
import EditPostPage from './pages/EditPostPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/posts"
        element={
          <RequireAuth>
            <PostsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/posts/new"
        element={
          <RequireAuth>
            <NewPostPage />
          </RequireAuth>
        }
      />
      <Route
        path="/posts/:id/edit"
        element={
          <RequireAuth>
            <EditPostPage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/posts" replace />} />
      <Route path="*" element={<Navigate to="/posts" replace />} />
    </Routes>
  );
}

export default App;
