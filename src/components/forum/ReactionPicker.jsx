import React from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉'];

const ReactionPicker = ({ postId, currentUserId, onReact }) => {
  const handleReact = async (emoji) => {
    if (!currentUserId) return;
    
    // Check if user already reacted with this emoji
    const { data } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .eq('reaction_type', emoji)
      .maybeSingle();

    if (data) {
       // Remove reaction
       await supabase.from('post_reactions').delete().eq('id', data.id);
    } else {
       // Add reaction
       await supabase.from('post_reactions').insert({
          post_id: postId,
          user_id: currentUserId,
          reaction_type: emoji
       });
    }
    if (onReact) onReact();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 text-gray-500 hover:bg-gray-800 hover:text-cyan-400">
           <SmilePlus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-[#1a1a24] border-gray-800 flex gap-1 shadow-xl">
         {REACTIONS.map(emoji => (
            <button 
               key={emoji}
               onClick={() => handleReact(emoji)}
               className="hover:bg-gray-700/50 p-1.5 rounded text-lg transition-colors"
            >
               {emoji}
            </button>
         ))}
      </PopoverContent>
    </Popover>
  );
};

export default ReactionPicker;