import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useUserReputation } from '@/hooks/useUserReputation';

const ThreadCreationModal = ({ isOpen, onClose, subforumId, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addReputation } = useUserReputation(user?.id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [prefix, setPrefix] = useState('none');
  const [prefixes, setPrefixes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     const fetchPrefixes = async () => {
        const { data } = await supabase.from('thread_prefixes').select('*');
        if (data) setPrefixes(data);
     };
     fetchPrefixes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const finalTitle = prefix !== 'none' ? `[${prefixes.find(p => p.id === prefix)?.text}] ${title}` : title;

      const { data: threadData, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          subforum_id: subforumId,
          user_id: user.id,
          title: finalTitle,
          content: content,
        })
        .select()
        .single();
      
      if (threadError) throw threadError;

      // Award Points for creating thread
      await addReputation(5);

      toast({ title: "Success", description: "Thread created successfully (+5 Rep)" });
      setTitle('');
      setContent('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create thread." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a24] border-gray-800 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Thread</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
           <div className="flex gap-2">
              <div className="w-1/3 space-y-2">
                 <Label>Prefix</Label>
                 <Select value={prefix} onValueChange={setPrefix}>
                    <SelectTrigger className="bg-[#12121a] border-gray-700">
                       <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                       <SelectItem value="none">None</SelectItem>
                       {prefixes.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.text}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>
              <div className="w-2/3 space-y-2">
                 <Label>Title</Label>
                 <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Topic Title"
                    className="bg-[#12121a] border-gray-700"
                    required
                 />
              </div>
           </div>
           
           <div className="space-y-2">
              <Label>Content</Label>
              <Textarea 
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 placeholder="What's on your mind? (Markdown supported)"
                 className="bg-[#12121a] border-gray-700 min-h-[200px]"
                 required
              />
              <p className="text-xs text-gray-500">Be respectful and follow community guidelines.</p>
           </div>
           
           <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                 {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                 Post Thread
              </Button>
           </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ThreadCreationModal;