
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlans, setUserPlans] = useState([]);

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      const { data: { session: activeSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error fetching session:', error);
      }
      
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      if (activeSession?.user) {
        checkAdminStatus(activeSession.user.id);
        fetchUserPlans(activeSession.user.id);
      }
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        fetchUserPlans(session.user.id);
      } else {
        setIsAdmin(false);
        setUserPlans([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId) => {
    // Check if user has admin role via metadata or separate table if needed
    // For this implementation, we check the profiles table or metadata
    try {
        // Option 1: Check user metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin') {
            setIsAdmin(true);
            return;
        }
    } catch (e) {
        console.error("Error checking admin status", e);
    }
  };

  const fetchUserPlans = async (userId) => {
    try {
      // Fetching from user_plans and joining with plans
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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Error signing out", description: error.message });
    } else {
      toast({ title: "Signed out", description: "You have been successfully signed out." });
    }
  };

  const refreshPlans = async () => {
    if (user) {
      await fetchUserPlans(user.id);
    }
  };

  const value = {
    session,
    user,
    signOut,
    loading,
    isAdmin,
    userPlans,
    refreshPlans
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
