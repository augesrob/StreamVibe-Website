import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Bell, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const NotificationSystem = ({ onNavigate }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const sub = supabase
      .channel('public:forum_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_notifications', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
           setNotifications(prev => [payload.new, ...prev]);
           setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => sub.unsubscribe();
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
       .from('forum_notifications')
       .select('*')
       .eq('user_id', user.id)
       .order('created_at', { ascending: false })
       .limit(20);
    
    if (data) {
       setNotifications(data);
       setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id) => {
     await supabase.from('forum_notifications').update({ is_read: true }).eq('id', id);
     setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
     setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
     await supabase.from('forum_notifications').update({ is_read: true }).eq('user_id', user.id);
     setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
     setUnreadCount(0);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-gray-800">
           <Bell className="w-5 h-5 text-gray-400" />
           {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-cyan-500 text-[10px]">
                 {unreadCount}
              </Badge>
           )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-[#1a1a24] border-gray-800 text-gray-200">
         <div className="flex justify-between items-center px-4 py-2">
            <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
               <button onClick={markAllRead} className="text-xs text-cyan-400 hover:text-cyan-300">Mark all read</button>
            )}
         </div>
         <DropdownMenuSeparator className="bg-gray-800" />
         <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
               <div className="p-4 text-center text-sm text-gray-500">No notifications yet.</div>
            ) : (
               notifications.map(notification => (
                  <DropdownMenuItem 
                     key={notification.id} 
                     className={`flex flex-col items-start p-3 cursor-pointer ${!notification.is_read ? 'bg-cyan-950/20' : ''}`}
                     onClick={() => {
                        markAsRead(notification.id);
                        // Very simple navigation logic - implies reference_id is usually a thread or post
                        // Real implementation would parse 'type' to know where to go
                        // onNavigate('thread', notification.reference_id)
                     }}
                  >
                     <div className="text-sm">{notification.message}</div>
                     <div className="text-[10px] text-gray-500 mt-1 flex justify-between w-full">
                        <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                        {!notification.is_read && <span className="w-2 h-2 rounded-full bg-cyan-500" />}
                     </div>
                  </DropdownMenuItem>
               ))
            )}
         </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationSystem;