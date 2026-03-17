import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useUserReputation = (userId) => {
  const [reputation, setReputation] = useState({ points: 0, badges: [] });
  const [level, setLevel] = useState({ name: 'Newbie', color: 'gray' });
  const [loading, setLoading] = useState(true);

  const calculateLevel = (points) => {
    if (points > 500) return { name: 'Expert', color: 'amber' };
    if (points > 200) return { name: 'Contributor', color: 'purple' };
    if (points > 50) return { name: 'Member', color: 'blue' };
    return { name: 'Newbie', color: 'gray' };
  };

  const fetchReputation = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data) {
        setReputation(data);
        setLevel(calculateLevel(data.points));
      } else {
        // Initialize if missing
        const { data: newData } = await supabase
          .from('user_reputation')
          .insert({ user_id: userId, points: 0, badges: [] })
          .select()
          .single();
        if (newData) {
          setReputation(newData);
          setLevel(calculateLevel(0));
        }
      }
    } catch (err) {
      console.error('Error fetching reputation:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addReputation = async (amount = 1) => {
    if (!userId) return;
    const newPoints = (reputation.points || 0) + amount;
    
    // Optimistic update
    setReputation(prev => ({ ...prev, points: newPoints }));
    setLevel(calculateLevel(newPoints));

    await supabase
      .from('user_reputation')
      .update({ points: newPoints, updated_at: new Date() })
      .eq('user_id', userId);
  };

  const subtractReputation = async (amount = 1) => {
    if (!userId) return;
    const newPoints = Math.max(0, (reputation.points || 0) - amount);
    
    setReputation(prev => ({ ...prev, points: newPoints }));
    setLevel(calculateLevel(newPoints));

    await supabase
      .from('user_reputation')
      .update({ points: newPoints, updated_at: new Date() })
      .eq('user_id', userId);
  };

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  return { reputation, level, loading, refetch: fetchReputation, addReputation, subtractReputation };
};