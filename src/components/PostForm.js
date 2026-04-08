import { useMemo, useState, useRef, useEffect } from 'react';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import NotionEditor from './NotionEditor';

const INITIAL_TAGS = [
  "visionOS", "machine learning", "LLM", "design", "iOS",
  "computer vision", "spatial computing", "macOS", "tutorial",
  "UI", "UX", "Style", "cognitive ergonomics"
];

function PostForm({ initialData, submitLabel, onSubmit, isSaving }) {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    author: initialData?.author || '',
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    status: initialData?.status || 'published',
    tags: initialData?.tags || [],
  });
  
  const [availableTags, setAvailableTags] = useState(INITIAL_TAGS);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [error, setError] = useState('');
  const suggestionsRef = useRef(null);
  const manageMenuRef = useRef(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'tags'));
        const fetchedTags = querySnapshot.docs.map(doc => doc.data().name);
        setAvailableTags(prev => {
          const combined = [...new Set([...prev, ...fetchedTags])];
          return combined;
        });
      } catch (e) {
        console.error('Error fetching tags:', e);
      }
    };
    fetchTags();
  }, []);

  const customTags = useMemo(() => {
    const legacySet = new Set(INITIAL_TAGS.map(t => t.toLowerCase()));
    return availableTags.filter(tag => !legacySet.has(tag.toLowerCase()));
  }, [availableTags]);

  const isValid = useMemo(() => {
    return Boolean(
      form.title.trim() &&
      form.excerpt.trim() &&
      form.content.trim() &&
      form.author.trim() &&
      form.date
    );
  }, [form]);

  const filteredSuggestions = useMemo(() => {
    if (!tagInput.trim()) return [];
    const query = tagInput.toLowerCase();
    return availableTags.filter(tag => 
      tag.toLowerCase().includes(query) && 
      !form.tags.includes(tag)
    );
  }, [tagInput, form.tags, availableTags]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (manageMenuRef.current && !manageMenuRef.current.contains(event.target)) {
        setShowManageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const deleteCustomTag = async (tagToDelete) => {
    try {
      setError('');
      await deleteDoc(doc(db, 'tags', tagToDelete.toLowerCase()));
      setAvailableTags(prev => prev.filter(t => t !== tagToDelete));
      // Also remove it from current post if it was selected
      setForm(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tagToDelete)
      }));
    } catch (e) {
      console.error('Firestore Delete Error:', e.code, e.message);
      setError(`Failed to delete tag: ${e.code === 'permission-denied' ? 'Permission denied. Check your Firebase Rules.' : e.message}`);
    }
  };

  const addTag = async (tag) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    
    if (form.tags.length >= 3) {
      setError('You can only select up to 3 tags.');
      return;
    }

    const alreadyAdded = form.tags.find(t => t.toLowerCase() === cleanTag.toLowerCase());
    if (alreadyAdded) {
      setTagInput('');
      setShowSuggestions(false);
      return;
    }

    // Add to current post immediately for snappy UX
    setForm(prev => ({ ...prev, tags: [...prev.tags, cleanTag] }));
    setTagInput('');
    setShowSuggestions(false);
    setError('');

    // Check if it's a new global tag and persist if needed
    const isNewGlobal = !availableTags.some(t => t.toLowerCase() === cleanTag.toLowerCase());
    if (isNewGlobal) {
      try {
        setAvailableTags(prev => [...prev, cleanTag]);
        // Use lowercase as ID to avoid duplicates like "iOS" vs "ios"
        await setDoc(doc(db, 'tags', cleanTag.toLowerCase()), {
          name: cleanTag
        });
      } catch (e) {
        console.error('Error saving new tag to Firestore:', e);
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setForm(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(t => t !== tagToRemove) 
    }));
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
      
      <label className="field">
        <span>Title</span>
        <input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
      </label>

      <label className="field">
        <span>Excerpt</span>
        <textarea rows={3} value={form.excerpt} onChange={(e) => updateField('excerpt', e.target.value)} />
      </label>

      <div className="field">
        <span>Tags (max 3)</span>
        <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder={form.tags.length >= 3 ? "Limit reached" : "Type to add a tag..."}
              value={tagInput}
              disabled={form.tags.length >= 3}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="suggestions-menu" ref={suggestionsRef}>
                {filteredSuggestions.map(suggestion => (
                  <div 
                    key={suggestion} 
                    className="suggestion-item"
                    onClick={() => addTag(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              type="button" 
              className="icon-button"
              title="Manage tags in memory"
              onClick={() => setShowManageMenu(!showManageMenu)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>

            {showManageMenu && (
              <div className="manage-tags-menu" ref={manageMenuRef}>
                <div className="manage-tags-header">Tags in Memory</div>
                {customTags.length === 0 ? (
                  <div className="empty-state">No custom tags added yet.</div>
                ) : (
                  customTags.map(tag => (
                    <div key={tag} className="manage-tag-item">
                      <span>{tag}</span>
                      <button 
                        type="button" 
                        className="icon-button small danger" 
                        title="Delete from memory"
                        onClick={() => deleteCustomTag(tag)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button 
            type="button" 
            className="button" 
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim() || form.tags.length >= 3}
          >
            Add
          </button>
        </div>

        <div className="tag-picker" style={{ marginTop: '8px' }}>
          {form.tags.map((tag) => (
            <div key={tag} className="tag-option selected" onClick={() => removeTag(tag)}>
              {tag} ✕
            </div>
          ))}
        </div>
        <p className="tag-help">{form.tags.length}/3 tags added</p>
      </div>

      <div className="field">
        <span>Content</span>
        <NotionEditor value={form.content} onChange={(html) => updateField('content', html)} />
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
