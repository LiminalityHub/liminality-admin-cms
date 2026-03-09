import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { deletePost, fetchPosts } from '../api/client';

function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPosts();
      setPosts(Array.isArray(data) ? data : data.items || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Admin Posts — Liminality';
    loadPosts();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this post?');
    if (!confirmed) return;

    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete post.');
    }
  };

  return (
    <AdminLayout title="Posts">
      <div className="toolbar">
        <Link to="/posts/new" className="button">+ New Post</Link>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="muted">No posts found.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.author}</td>
                  <td>{post.date}</td>
                  <td>{post.status || 'published'}</td>
                  <td className="actions-cell">
                    <Link to={`/posts/${post.id}/edit`} className="button button-outline">Edit</Link>
                    <button type="button" className="button button-danger" onClick={() => handleDelete(post.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default PostsPage;
