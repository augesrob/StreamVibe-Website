import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Pin, Lock, Calendar, User, Eye, Plus, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ThreadCreationModal from './ThreadCreationModal';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ForumSubforumView = ({ subforumId, subforumData, onNavigate }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    if (subforumId) fetchThreads();
  }, [subforumId, sort]);

  const fetchThreads = async () => {
    setLoading(true);
    let query = supabase
      .from('forum_threads')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('subforum_id', subforumId);

    // Apply Sorting
    if (sort === 'newest') {
       query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'active') {
       query = query.order('is_pinned', { ascending: false }).order('updated_at', { ascending: false });
    } else if (sort === 'popular') {
       query = query.order('is_pinned', { ascending: false }).order('view_count', { ascending: false });
    }
    
    const { data } = await query;
    if (data) setThreads(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#1a1a24] p-6 rounded-xl border border-gray-800 shadow-md gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">{subforumData?.name}</h1>
              <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">Subforum</Badge>
           </div>
           <p className="text-gray-400 max-w-2xl">{subforumData?.description}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
           <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[130px] bg-[#12121a] border-gray-700 h-9">
                 <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                 <SelectItem value="newest">Newest</SelectItem>
                 <SelectItem value="active">Active</SelectItem>
                 <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
           </Select>
           
           {user && (
              <Button onClick={() => setIsCreateOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-500/20">
                 <Plus className="w-4 h-4 mr-2" /> New Thread
              </Button>
           )}
        </div>
      </div>

      <div className="space-y-3">
        {threads.map((thread) => (
          <Card 
            key={thread.id} 
            className={`
              bg-[#1a1a24] border-gray-800 hover:border-cyan-500/30 transition-all cursor-pointer group shadow-sm hover:shadow-cyan-900/10
              ${thread.is_pinned ? 'thread-pinned' : ''}
              ${thread.is_locked ? 'thread-locked' : ''}
            `}
            onClick={() => onNavigate('thread', thread.id, thread)}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
               <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="mt-1 hidden sm:block">
                     {thread.is_pinned ? <Pin className="w-5 h-5 text-amber-500 fill-amber-500/20" /> : 
                      thread.is_locked ? <Lock className="w-5 h-5 text-red-500" /> :
                      <MessageCircle className="w-5 h-5 text-cyan-500/50 group-hover:text-cyan-400 transition-colors" />}
                  </div>
                  <div className="min-w-0">
                     <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors text-lg truncate pr-4">
                        {thread.is_pinned && <span className="text-amber-500 mr-2 text-xs uppercase tracking-wide border border-amber-500/30 px-1 rounded">Pinned</span>}
                        {thread.title}
                     </h3>
                     <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1.5">
                        <span className="flex items-center gap-1 hover:text-gray-300">
                           <User className="w-3 h-3" /> {thread.profiles?.username || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                           <Calendar className="w-3 h-3" /> {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                        </span>
                        {/* Fake "Last Reply" for visual completeness - requires robust query in real app */}
                        <span className="flex items-center gap-1 text-gray-600 border-l border-gray-800 pl-3 ml-1">
                           <ArrowUpRight className="w-3 h-3" /> Last activity {formatDistanceToNow(new Date(thread.updated_at))} ago
                        </span>
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-6 text-sm text-gray-500 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-800 pt-3 sm:pt-0 sm:pl-4 sm:border-l sm:border-gray-800/50">
                  <div className="flex flex-col items-center min-w-[50px]">
                     <span className="font-bold text-gray-300">{thread.reply_count}</span>
                     <span className="text-[10px] uppercase tracking-wide">Replies</span>
                  </div>
                  <div className="flex flex-col items-center min-w-[50px]">
                     <span className="font-bold text-gray-300">{thread.view_count}</span>
                     <span className="text-[10px] uppercase tracking-wide">Views</span>
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
        {threads.length === 0 && !loading && (
           <div className="text-center py-16 bg-[#1a1a24] rounded-xl border border-gray-800 border-dashed">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-gray-400">No threads yet</h3>
              <p className="text-gray-500 mb-4">Be the first to start a conversation in this subforum!</p>
              {user && (
                 <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30">
                    Create Thread
                 </Button>
              )}
           </div>
        )}
      </div>

      <ThreadCreationModal 
         isOpen={isCreateOpen} 
         onClose={() => setIsCreateOpen(false)} 
         subforumId={subforumId}
         onSuccess={fetchThreads}
      />
    </div>
  );
};

export default ForumSubforumView;