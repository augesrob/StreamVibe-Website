import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, MessageSquare, Shield, Crown, Edit, MoreVertical, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { useUserReputation } from '@/hooks/useUserReputation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactionPicker from './ReactionPicker';
import SpamReportModal from './SpamReportModal';
import EditHistoryModal from './EditHistoryModal';
import UserFollowButton from './UserFollowButton';

const PostCard = ({ post, currentUserId, isAdmin, isModerator, onRefresh, threadLocked }) => {
  const { toast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [reactions, setReactions] = useState([]);
  const { level } = useUserReputation(post.user_id); // Fetch user level

  const isAuthor = currentUserId === post.user_id;
  const canDelete = isAdmin || isModerator || isAuthor;
  const canEdit = isAuthor && !threadLocked;

  useEffect(() => {
     fetchReactions();
  }, [post.id]);

  const fetchReactions = async () => {
     const { data } = await supabase.from('post_reactions').select('*').eq('post_id', post.id);
     if (data) setReactions(data);
  };

  const handleDelete = async () => {
     const { error } = await supabase.from('forum_posts').delete().eq('id', post.id);
     if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete post." });
     } else {
        toast({ title: "Deleted", description: "Post deleted." });
        onRefresh();
     }
  };

  const groupedReactions = reactions.reduce((acc, curr) => {
     acc[curr.reaction_type] = (acc[curr.reaction_type] || 0) + 1;
     return acc;
  }, {});

  // Role Badge
  const getRoleBadge = (role, plan) => {
     if (role === 'admin') return <Badge className="badge-admin gap-1"><Shield className="w-3 h-3" /> Admin</Badge>;
     if (role === 'moderator') return <Badge className="badge-mod gap-1"><Shield className="w-3 h-3" /> Mod</Badge>;
     if (plan === 'Pro' || plan === 'Streamer') return <Badge className="badge-pro gap-1"><Crown className="w-3 h-3" /> Pro</Badge>;
     return null;
  };

  // Level Badge
  const getLevelBadge = () => {
     if (!level) return null;
     const colors = {
        'Newbie': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        'Member': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Contributor': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'Expert': 'bg-amber-500/10 text-amber-400 border-amber-500/20'
     };
     return (
        <Badge variant="outline" className={`${colors[level.name] || colors['Newbie']} text-[10px] px-1.5 h-5`}>
           {level.name}
        </Badge>
     );
  };

  return (
    <Card className={`forum-card group ${post.parent_post_id ? 'post-reply-indent' : ''}`}>
       <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* User Info Column */}
          <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 min-w-[80px] sm:min-w-[120px] sm:w-[120px] shrink-0 border-b sm:border-b-0 sm:border-r border-gray-800 pb-3 sm:pb-0 sm:pr-4">
             <Avatar className="w-10 h-10 sm:w-16 sm:h-16 border-2 border-gray-700 shadow-md">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback className="bg-gray-800 text-gray-400">{post.profiles?.username?.[0] || '?'}</AvatarFallback>
             </Avatar>
             
             <div className="text-left sm:text-center">
                <p className="text-sm font-bold text-gray-200 truncate max-w-[120px] hover:text-cyan-400 cursor-pointer transition-colors">
                   {post.profiles?.username}
                </p>
                <div className="flex flex-wrap sm:flex-col gap-1 sm:gap-1.5 mt-1 sm:mt-2 justify-start sm:justify-center items-start sm:items-center">
                   {getRoleBadge(post.profiles?.role, post.profiles?.plan_tier)}
                   {getLevelBadge()}
                </div>
                {currentUserId && currentUserId !== post.user_id && (
                   <div className="mt-2 hidden sm:block">
                      <UserFollowButton targetUserId={post.user_id} currentUserId={currentUserId} />
                   </div>
                )}
             </div>
          </div>
          
          {/* Post Content Column */}
          <div className="flex-1 min-w-0 flex flex-col">
             <div className="flex justify-between items-start mb-3">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                   <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                   {post.updated_at && post.updated_at !== post.created_at && (
                      <span 
                         className="text-gray-600 italic cursor-pointer hover:text-gray-400 border-b border-dotted border-gray-700"
                         onClick={() => setShowEditHistory(true)}
                      >
                         (Edited)
                      </span>
                   )}
                </div>

                <div className="flex items-center gap-1">
                   {/* Action Menu */}
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1a24] border-gray-800 text-gray-200">
                         {canEdit && <DropdownMenuItem onClick={() => {}}><Edit className="w-3 h-3 mr-2" /> Edit</DropdownMenuItem>}
                         {canDelete && <DropdownMenuItem onClick={() => setShowDeleteAlert(true)} className="text-red-400 focus:text-red-400"><Trash2 className="w-3 h-3 mr-2" /> Delete</DropdownMenuItem>}
                         {!isAuthor && <DropdownMenuItem onClick={() => setShowReportModal(true)}><Flag className="w-3 h-3 mr-2" /> Report</DropdownMenuItem>}
                         <DropdownMenuItem onClick={() => setShowEditHistory(true)}>View Edit History</DropdownMenuItem>
                      </DropdownMenuContent>
                   </DropdownMenu>
                </div>
             </div>
             
             <div className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap flex-grow min-h-[60px]">
                {post.content}
             </div>

             {/* Footer Actions */}
             <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                   <ReactionPicker postId={post.id} currentUserId={currentUserId} onReact={fetchReactions} />
                   
                   {/* Display Reactions */}
                   <div className="flex gap-1 ml-2">
                      {Object.entries(groupedReactions).map(([emoji, count]) => (
                         <Badge key={emoji} variant="secondary" className="bg-gray-800 hover:bg-gray-700 text-sm px-1.5 py-0.5 h-6 gap-1">
                            <span>{emoji}</span>
                            <span className="text-xs text-gray-400">{count}</span>
                         </Badge>
                      ))}
                   </div>
                </div>

                {!threadLocked && (
                   <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500 hover:text-cyan-400 hover:bg-cyan-950/30">
                      <MessageSquare className="w-3 h-3 mr-1.5" /> Reply
                   </Button>
                )}
             </div>
          </div>
       </CardContent>

       {/* Modals */}
       <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
         <AlertDialogContent className="bg-[#1a1a24] border-gray-800 text-gray-200">
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Post?</AlertDialogTitle>
             <AlertDialogDescription className="text-gray-400">
               This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 border-none">Delete</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       <SpamReportModal 
         isOpen={showReportModal} 
         onClose={() => setShowReportModal(false)} 
         targetId={post.id} 
         targetType="post" 
       />

       <EditHistoryModal 
         isOpen={showEditHistory}
         onClose={() => setShowEditHistory(false)}
         postId={post.id}
       />
    </Card>
  );
};

export default PostCard;