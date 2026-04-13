import { supabase } from '../supabase';

const POSTS_TABLE = 'posts';
const USERS_TABLE = 'users';

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

  const now = new Date().toISOString();
  const newPost = {
    ...payload,
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

  const updatedData = {
    ...payload,
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
