import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const UserFollowButton = ({ targetUserId, currentUserId }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (targetUserId && currentUserId) checkFollow();
  }, [targetUserId, currentUserId]);

  const checkFollow = async () => {
    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!currentUserId) {
        toast({ title: "Login required", description: "Log in to follow users." });
        return;
    }
    setLoading(true);
    if (isFollowing) {
        await supabase.from('user_follows').delete().eq('follower_id', currentUserId).eq('following_id', targetUserId);
        setIsFollowing(false);
    } else {
        await supabase.from('user_follows').insert({ follower_id: currentUserId, following_id: targetUserId });
        setIsFollowing(true);
        toast({ description: "User followed!" });
    }
    setLoading(false);
  };

  return (
    <Button 
       variant="outline" 
       size="xs" 
       onClick={handleFollow}
       disabled={loading}
       className={`h-6 text-[10px] px-2 ${isFollowing ? 'bg-cyan-900/20 text-cyan-400 border-cyan-800' : 'border-gray-700 text-gray-400'}`}
    >
       {isFollowing ? (
          <><UserCheck className="w-3 h-3 mr-1" /> Following</>
       ) : (
          <><UserPlus className="w-3 h-3 mr-1" /> Follow</>
       )}
    </Button>
  );
};

export default UserFollowButton;