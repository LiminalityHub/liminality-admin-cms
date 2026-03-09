import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PostForm from '../components/PostForm';
import { createPost } from '../api/client';

function NewPostPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createPost(payload);
      navigate('/posts', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Create Post">
      <PostForm submitLabel="Create post" onSubmit={handleCreate} isSaving={saving} />
    </AdminLayout>
  );
}

export default NewPostPage;
