import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PostForm from '../components/PostForm';
import { fetchPostById, updatePost } from '../api/client';
import { useAuth } from '../context/AuthContext';

function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profileName } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Edit Post — Liminality';

    const loadPost = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPostById(id);
        setPost(data);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load post.');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await updatePost(id, payload);
      navigate('/posts', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Edit Post">
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : post ? (
        <PostForm
          initialData={post}
          submitLabel="Save changes"
          onSubmit={handleUpdate}
          isSaving={saving}
          authorName={profileName}
        />
      ) : (
        <p className="muted">Post not found.</p>
      )}
    </AdminLayout>
  );
}

export default EditPostPage;
