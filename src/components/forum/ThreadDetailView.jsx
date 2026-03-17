import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator.jsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Pin } from 'lucide-react';
import PostCard from './PostCard';
import PostReplyForm from './PostReplyForm';
import ThreadBookmark from './ThreadBookmark';
import ThreadCreationModal from './ThreadCreationModal';

const ThreadDetailView = ({ threadId, threadData: initialData, onNavigate }) => {
  const { user, isAdmin, isModerator } = useAuth();
  const [thread, setThread] = useState(initialData);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prefixes, setPrefixes] = useState([]);

  useEffect(() => {
    fetchThreadData();
    fetchPrefixes();
    incrementView();
    
    // Subscribe to new posts
    const subscription = supabase
      .channel(`thread-${threadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts', filter: `thread_id=eq.${threadId}` }, fetchThreadData)
      .subscribe();

    return () => {
       subscription.unsubscribe();
    };
  }, [threadId]);

  const fetchPrefixes = async () => {
    const { data } = await supabase.from('thread_prefixes').select('*');
    if (data) setPrefixes(data);
  };

  const fetchThreadData = async () => {
    // Fetch thread details
    const { data: tData } = await supabase
       .from('forum_threads')
       .select(`*, profiles:user_id(username, avatar_url, role)`)
       .eq('id', threadId)
       .single();
    if (tData) setThread(tData);

    // Fetch posts
    const { data: pData } = await supabase
       .from('forum_posts')
       .select(`*, profiles:user_id(username, avatar_url, role, plan_tier)`)
       .eq('thread_id', threadId)
       .order('created_at', { ascending: true });
    
    if (pData) setPosts(pData);
    setLoading(false);
  };

  const incrementView = async () => {
     await supabase.rpc('increment_thread_view', { t_id: threadId }).catch(e => {});
  };

  const handleToggleLock = async () => {
     await supabase.from('forum_threads').update({ is_locked: !thread.is_locked }).eq('id', threadId);
     fetchThreadData();
  };

  const handleTogglePin = async () => {
     await supabase.from('forum_threads').update({ is_pinned: !thread.is_pinned }).eq('id', threadId);
     fetchThreadData();
  };

  if (loading && !thread) return <Loader2 className="w-8 h-8 animate-spin mx-auto mt-10 text-cyan-500" />;

  // Get prefix style if exists
  const prefixObj = prefixes.find(p => thread?.title.startsWith(`[${p.text}]`)); // Rudimentary check, ideally stored as ID

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
       {/* Thread Header */}
       <div className="bg-[#1a1a24] p-6 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="flex justify-between items-start mb-4 relative z-10">
             <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                   {thread?.is_pinned && (
                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50 px-2 py-0.5">
                         <Pin className="w-3 h-3 mr-1" /> Pinned
                      </Badge>
                   )}
                   {thread?.is_locked && (
                      <Badge className="bg-red-500/20 text-red-500 border-red-500/50 px-2 py-0.5">
                         <Lock className="w-3 h-3 mr-1" /> Locked
                      </Badge>
                   )}
                   {prefixObj && (
                      <Badge style={{ backgroundColor: `${prefixObj.color}20`, color: prefixObj.color, borderColor: `${prefixObj.color}40` }} variant="outline">
                         {prefixObj.text}
                      </Badge>
                   )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">{thread?.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                   <span>Started by <span className="text-cyan-400 font-medium">@{thread?.profiles?.username || 'Unknown'}</span></span>
                   <span>•</span>
                   <span>{new Date(thread?.created_at).toLocaleDateString()}</span>
                </div>
             </div>
             
             <div className="flex flex-col items-end gap-2">
                <ThreadBookmark threadId={threadId} userId={user?.id} />
                {(isAdmin || isModerator) && (
                   <div className="flex gap-2 mt-2">
                      <Button size="xs" variant="outline" onClick={handleToggleLock} className="h-7 border-gray-700">
                         {thread?.is_locked ? "Unlock" : "Lock"}
                      </Button>
                      <Button size="xs" variant="outline" onClick={handleTogglePin} className="h-7 border-gray-700">
                         {thread?.is_pinned ? "Unpin" : "Pin"}
                      </Button>
                   </div>
                )}
             </div>
          </div>
          
          <Separator className="bg-gray-800/50 my-6" />
          
          {/* Main Thread Content (OP) */}
          <div className="prose prose-invert max-w-none">
             <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                {thread?.content}
             </div>
          </div>
       </div>

       {/* Posts List */}
       <div className="space-y-4">
          {posts.map((post, index) => (
             <PostCard 
               key={post.id} 
               post={post} 
               currentUserId={user?.id}
               isAdmin={isAdmin}
               isModerator={isModerator}
               onRefresh={fetchThreadData}
               index={index + 1} // +1 because OP is conceptually post 0 but usually listed separately or as first
               threadLocked={thread?.is_locked}
             />
          ))}
       </div>

       {/* Reply Form */}
       <div className="mt-8">
          {thread?.is_locked && !isAdmin ? (
             <div className="bg-red-900/10 border border-red-900/30 p-6 rounded-xl text-center text-red-400 flex flex-col items-center gap-2">
                <div className="p-3 bg-red-900/20 rounded-full"><Lock className="w-6 h-6" /></div>
                <h3 className="font-semibold">Thread Locked</h3>
                <p className="text-sm opacity-80">This thread has been locked by moderation staff. You cannot reply.</p>
             </div>
          ) : user ? (
             <div className="bg-[#1a1a24] border border-gray-800 rounded-xl p-1 overflow-hidden">
                <PostReplyForm threadId={threadId} onSuccess={fetchThreadData} />
             </div>
          ) : (
             <div className="text-center p-8 bg-[#1a1a24] rounded-xl border border-gray-800 border-dashed">
                <p className="text-gray-400 mb-4">Join the conversation to post a reply.</p>
                <Button variant="outline" onClick={() => window.location.href='/login'}>Log In to Reply</Button>
             </div>
          )}
       </div>
    </div>
  );
};

export default ThreadDetailView;