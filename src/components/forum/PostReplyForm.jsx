import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PostReplyForm = ({ threadId, parentPostId = null, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setLoading(true);
    try {
       const { error } = await supabase.from('forum_posts').insert({
          thread_id: threadId,
          user_id: user.id,
          parent_post_id: parentPostId,
          content: content
       });

       if (error) throw error;
       
       // Update thread metadata like reply_count, last_updated
       // Note: Trigger or RPC is better, but simple update here:
       // We'll rely on fetch reload for now or basic increment if needed.
       
       setContent('');
       toast({ title: "Reply posted" });
       if (onSuccess) onSuccess();

    } catch (err) {
       console.error(err);
       toast({ variant: "destructive", title: "Error", description: "Failed to post reply." });
    } finally {
       setLoading(false);
    }
  };

  return (
    <Card className="bg-[#1a1a24] border-gray-800">
       <CardContent className="p-4">
          <form onSubmit={handleSubmit}>
             <Textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a reply..."
                className="bg-[#12121a] border-gray-700 min-h-[100px] mb-3"
             />
             <div className="flex justify-end">
                <Button type="submit" disabled={loading || !content.trim()} className="bg-cyan-600 hover:bg-cyan-700">
                   {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                   Post Reply
                </Button>
             </div>
          </form>
       </CardContent>
    </Card>
  );
};

export default PostReplyForm;