import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ThreadBookmark = ({ threadId, userId }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId && threadId) {
      checkBookmark();
    }
  }, [userId, threadId]);

  const checkBookmark = async () => {
    const { data } = await supabase
      .from('thread_bookmarks')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .maybeSingle();
    setIsBookmarked(!!data);
  };

  const toggleBookmark = async () => {
    if (!userId) {
       toast({ title: "Login required", description: "Please login to bookmark threads." });
       return;
    }

    if (isBookmarked) {
      await supabase.from('thread_bookmarks').delete().eq('thread_id', threadId).eq('user_id', userId);
      setIsBookmarked(false);
      toast({ description: "Bookmark removed." });
    } else {
      await supabase.from('thread_bookmarks').insert({ thread_id: threadId, user_id: userId });
      setIsBookmarked(true);
      toast({ description: "Thread bookmarked!" });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleBookmark}
      className={`hover:bg-cyan-900/20 ${isBookmarked ? 'text-cyan-400' : 'text-gray-500'}`}
      title={isBookmarked ? "Remove Bookmark" : "Bookmark Thread"}
    >
      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
    </Button>
  );
};

export default ThreadBookmark;