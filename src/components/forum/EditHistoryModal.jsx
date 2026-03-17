import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const EditHistoryModal = ({ isOpen, onClose, postId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     if (isOpen && postId) {
        fetchHistory();
     }
  }, [isOpen, postId]);

  const fetchHistory = async () => {
     setLoading(true);
     const { data } = await supabase
        .from('post_edit_history')
        .select('*, profiles:editor_id(username)')
        .eq('post_id', postId)
        .order('edited_at', { ascending: false });
     if (data) setHistory(data);
     setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="bg-[#1a1a24] border-gray-800 text-white max-w-3xl">
          <DialogHeader>
             <DialogTitle>Edit History</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
             {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-cyan-500" /></div>
             ) : history.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No edit history found.</div>
             ) : (
                <div className="space-y-6">
                   {history.map((edit, idx) => (
                      <div key={edit.id} className="border-l-2 border-gray-700 pl-4 relative">
                         <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-700" />
                         <div className="text-xs text-gray-400 mb-2">
                            Edited by <span className="text-cyan-400">{edit.profiles?.username}</span> • {formatDistanceToNow(new Date(edit.edited_at))} ago
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-900/10 p-3 rounded text-sm text-gray-300">
                               <p className="text-xs text-red-400 mb-1 font-bold">BEFORE</p>
                               {edit.old_content}
                            </div>
                            <div className="bg-green-900/10 p-3 rounded text-sm text-gray-300">
                               <p className="text-xs text-green-400 mb-1 font-bold">AFTER</p>
                               {edit.new_content}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </ScrollArea>
       </DialogContent>
    </Dialog>
  );
};

export default EditHistoryModal;