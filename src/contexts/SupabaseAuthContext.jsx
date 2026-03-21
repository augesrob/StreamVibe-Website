import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [session, setSession]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [userPlans, setUserPlans] = useState([]);

  const checkAdmin = (u) => {
    if (!u) { setIsAdmin(false); return; }
    const role = u.app_metadata?.role || u.user_metadata?.role;
    setIsAdmin(role === 'admin');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      checkAdmin(activeSession?.user ?? null);
      if (activeSession?.user) fetchUserPlans(activeSession.user.id);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkAdmin(session?.user ?? null);
      if (session?.user) fetchUserPlans(session.user.id);
      else setUserPlans([]);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserPlans = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString());
      if (error) throw error;
      setUserPlans(data || []);
    } catch (error) {
      console.error('Error fetching user plans:', error);
    }
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ variant: 'destructive', title: 'Sign In Failed', description: error.message });
    else toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
    return { error };
  };

  const signUpWithEmail = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: error.message });
    } else {
      // Create/update profile row with username if provided
      if (data.user && metadata.username) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: metadata.username,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (profileErr) {
          console.warn('Profile upsert failed:', profileErr);
        }
      }
      toast({ title: 'Account created!', description: 'Please check your email to verify your account.' });
    }

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast({ variant: 'destructive', title: 'Error signing out', description: error.message });
    else toast({ title: 'Signed out', description: 'You have been successfully signed out.' });
  };

  const refreshPlans = async () => {
    if (user) await fetchUserPlans(user.id);
  };

  const value = {
    session, user, loading, isAdmin, userPlans,
    signIn, signUpWithEmail, signOut, refreshPlans,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
