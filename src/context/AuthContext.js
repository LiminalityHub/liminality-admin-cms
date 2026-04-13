import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sign up: create Supabase Auth account + users profile record
  async function signup(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    
    // In Supabase, we might use a trigger to create the profile, 
    // but here we'll manually create it to match previous logic
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([{ 
          id: data.user.id, 
          email, 
          is_approved: false 
        }]);
      // Note: If this fails (e.g. email confirmation required), 
      // handleAuthChange will try to create it later.
      if (profileError) console.warn('Initial profile creation failed (normal if email confirmation is required):', profileError.message);
    }
    
    return data;
  }

  // Google Login
  async function googleLogin() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
    return data;
  }

  // Login
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  // Logout
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function updateProfileName(name) {
    const { data: { user } } = await supabase.auth.getUser();
    const trimmedName = name.trim();

    if (!user) {
      throw new Error('You must be logged in to update your profile.');
    }

    if (!trimmedName) {
      throw new Error('Name is required.');
    }

    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email || '',
        name: trimmedName,
        // We don't want to reset is_approved if it's already set
      }, { onConflict: 'id' });

    if (error) throw error;

    setProfile((prev) => ({
      ...(prev || {}),
      email: user.email || '',
      name: trimmedName,
      is_approved: prev?.is_approved ?? isApproved,
    }));
  }

  // Listen to auth state changes and load the users table profile status
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user ?? null);
    });

    async function handleAuthChange(user) {
      setCurrentUser(user);
      if (user) {
        try {
          // 1. Try to fetch the profile
          let { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          // 2. Fallback: If no profile exists (PGRST116), try to create it now
          // This handles cases where signup insert failed or Google Login was used
          if (error && error.code === 'PGRST116') {
             console.log('No profile found, creating one for:', user.email);
             const { data: newProfile, error: insertError } = await supabase
               .from('users')
               .upsert([{ 
                 id: user.id, 
                 email: user.email, 
                 is_approved: false 
               }], { onConflict: 'id' })
               .select()
               .single();
             
             if (!insertError) {
               data = newProfile;
               error = null;
             } else {
               console.error('Failed to create fallback profile:', insertError);
             }
          } else if (error) {
             console.error('Error fetching profile:', error);
          }

          setProfile(data);
          setIsApproved(data?.is_approved === true);
        } catch (err) {
          console.error('Profile fetch catch:', err);
          setProfile(null);
          setIsApproved(false);
        }
      } else {
        setProfile(null);
        setIsApproved(false);
      }
      setLoading(false);
    }

    return () => subscription.unsubscribe();
  }, []);

  const profileName = profile?.name?.trim() || '';
  const hasProfileName = profileName.length > 0;
  // Supabase user metadata can also store full_name
  const suggestedName = profileName || currentUser?.user_metadata?.full_name || '';

  const value = {
    currentUser,
    profile,
    profileName,
    suggestedName,
    hasProfileName,
    isApproved,
    loading,
    signup,
    googleLogin,
    login,
    logout,
    updateProfileName,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
