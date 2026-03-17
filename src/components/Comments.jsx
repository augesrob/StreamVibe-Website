import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Comments = ({ videoId, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
    
    // Subscribe to new comments
    const channel = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `video_id=eq.${videoId}` }, 
        (payload) => {
             // In a real app we would fetch the user profile for this comment too
             // For now we just reload to keep it simple
             fetchComments();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [videoId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          profiles (username, avatar_url)
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const { error } = await supabase.from('comments').insert({
        video_id: videoId,
        user_id: user.id,
        content: newComment.trim()
      });

      if (error) throw error;
      setNewComment('');
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12121a] text-white">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Comments
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
            <p className="text-center text-gray-500">Loading comments...</p>
        ) : comments.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">No comments yet. Be the first!</p>
        ) : (
            comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8">
                <AvatarImage src={comment.profiles?.avatar_url} />
                <AvatarFallback>{comment.profiles?.username?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                <p className="text-xs text-gray-400 mb-0.5">{comment.profiles?.username}</p>
                <p className="text-sm bg-gray-800/50 p-2 rounded-r-lg rounded-bl-lg">
                    {comment.content}
                </p>
                </div>
            </div>
            ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 bg-[#0f0f17]">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-gray-800 border-none rounded-full px-4 text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
          />
          <Button type="submit" size="icon" className="rounded-full bg-cyan-600 hover:bg-cyan-700" disabled={!newComment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Comments;