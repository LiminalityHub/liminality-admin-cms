import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';

function ProfilePage() {
  const navigate = useNavigate();
  const {
    profileName,
    suggestedName,
    hasProfileName,
    updateProfileName,
  } = useAuth();

  const [name, setName] = useState(profileName || suggestedName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = hasProfileName ? 'Profile — Liminality' : 'Complete Profile — Liminality';
  }, [hasProfileName]);

  useEffect(() => {
    setName((currentName) => currentName || profileName || suggestedName);
  }, [profileName, suggestedName]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateProfileName(trimmedName);
      navigate('/posts', { replace: true });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title={hasProfileName ? 'Profile' : 'Complete Your Profile'}>
      {!hasProfileName ? (
        <p className="muted">
          Add the name that should appear automatically as the author on your articles.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="card stack-lg" style={{ maxWidth: '520px' }}>
        {error ? <p className="error-text">{error}</p> : null}

        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            autoComplete="name"
            placeholder="Your author name"
          />
        </label>

        <div>
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving...' : hasProfileName ? 'Save profile' : 'Continue to CMS'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

export default ProfilePage;
