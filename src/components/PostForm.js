import { useMemo, useState } from 'react';

function PostForm({ initialData, submitLabel, onSubmit, isSaving }) {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    author: initialData?.author || '',
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    status: initialData?.status || 'published',
  });
  const [error, setError] = useState('');

  const isValid = useMemo(() => {
    return Boolean(
      form.title.trim() &&
      form.excerpt.trim() &&
      form.content.trim() &&
      form.author.trim() &&
      form.date
    );
  }, [form]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValid) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(submitError.message || 'Unable to save post.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card stack-lg">
      {error ? <p className="error-text">{error}</p> : null}

      <label className="field">
        <span>Title</span>
        <input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
      </label>

      <label className="field">
        <span>Excerpt</span>
        <textarea rows={3} value={form.excerpt} onChange={(e) => updateField('excerpt', e.target.value)} />
      </label>

      <label className="field">
        <span>Content (HTML)</span>
        <textarea rows={14} value={form.content} onChange={(e) => updateField('content', e.target.value)} />
      </label>

      <div className="grid-3">
        <label className="field">
          <span>Author</span>
          <input value={form.author} onChange={(e) => updateField('author', e.target.value)} />
        </label>

        <label className="field">
          <span>Date</span>
          <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
        </label>

        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      <div>
        <button type="submit" className="button" disabled={!isValid || isSaving}>
          {isSaving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default PostForm;
