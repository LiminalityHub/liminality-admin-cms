import { supabase } from '../supabase';

const POSTS_TABLE = 'posts';
const USERS_TABLE = 'users';

async function processContentImages(html) {
  if (!html) return html;

  // We use a regular DOMParser in the browser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img[src^="data:image/"]'));

  if (imgs.length === 0) return html;

  for (const img of imgs) {
    const dataUrl = img.src;
    try {
      // Convert data URL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      // Generate a sanitized filename
      const extension = blob.type.split('/')[1] || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
      const filePath = `editor-images/${filename}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, blob);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Replace the src in the HTML
      img.src = publicUrl;
    } catch (err) {
      console.error('Failed to process deferred image:', err);
    }
  }

  return doc.body.innerHTML;
}

async function getRequiredAuthorProfile() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to create a post');
  }

  const { data: profile, error } = await supabase
    .from(USERS_TABLE)
    .select('name')
    .eq('id', user.id)
    .single();

  if (error || !profile?.name?.trim()) {
    throw new Error('Complete your profile before writing articles.');
  }

  return { user, profileName: profile.name.trim() };
}

export async function fetchPosts() {
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function fetchPostById(id) {
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      const err = new Error('Post not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
  
  return data;
}

export async function createPost(payload) {
  const { user, profileName } = await getRequiredAuthorProfile();

  // Process any Base64 images in the content before saving
  const processedContent = await processContentImages(payload.content);

  const now = new Date().toISOString();
  const newPost = {
    ...payload,
    content: processedContent,
    author: profileName,
    status: payload.status || 'published',
    created_at: now,
    updated_at: now,
    author_id: user.id
  };

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .insert([newPost])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePost(id, payload) {
  const { profileName } = await getRequiredAuthorProfile();

  // Process any Base64 images in the content before saving
  const processedContent = await processContentImages(payload.content);

  const updatedData = {
    ...payload,
    content: processedContent,
    author: profileName,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .update(updatedData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to delete a post');
  }

  const { error } = await supabase
    .from(POSTS_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
