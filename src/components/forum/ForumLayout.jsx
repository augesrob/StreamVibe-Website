import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, ChevronRight, Hash, Search as SearchIcon, Bell, Menu } from 'lucide-react';
import '@/styles/ForumStyles.css';

// Components
import ForumCategoryView from './ForumCategoryView';
import ForumSubforumView from './ForumSubforumView';
import ThreadDetailView from './ThreadDetailView';
import ForumSearch from './ForumSearch';
import UserProfileForum from './UserProfileForum';
import AdminForumSettings from './AdminForumSettings';
import ModeratorPanel from './ModeratorPanel';
import NotificationSystem from './NotificationSystem';

const ForumLayout = () => {
  const { user, isAdmin, isModerator } = useAuth();
  const [activeTab, setActiveTab] = useState('forums');
  const [categories, setCategories] = useState([]);
  const [viewState, setViewState] = useState({ type: 'home', id: null, data: null }); // home, subforum, thread, user

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('forum_categories')
      .select('*, forum_subforums(*)')
      .order('order', { ascending: true });
    if (data) setCategories(data);
  };

  const navigateTo = (type, id = null, data = null) => {
    setViewState({ type, id, data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (activeTab !== 'forums' && type !== 'user') setActiveTab('forums');
  };

  const renderBreadcrumbs = () => {
    return (
      <nav className="flex items-center text-sm text-gray-400 mb-6 space-x-2 overflow-x-auto whitespace-nowrap pb-2">
        <button onClick={() => navigateTo('home')} className="hover:text-cyan-400 flex items-center transition-colors">
          <Home className="w-4 h-4 mr-1" /> Home
        </button>
        {viewState.type !== 'home' && (
          <>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            
            {viewState.type === 'subforum' && (
              <span className="text-white font-medium">{viewState.data?.name}</span>
            )}

            {viewState.type === 'thread' && (
              <>
                 <button 
                    onClick={() => navigateTo('subforum', viewState.data?.subforum_id, { name: 'Back to Subforum' })} 
                    className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                 >
                    <Hash className="w-3 h-3" /> Subforum
                 </button>
                 <ChevronRight className="w-4 h-4 text-gray-600" />
                 <span className="text-white font-medium truncate max-w-[200px]" title={viewState.data?.title}>
                   {viewState.data?.title}
                 </span>
              </>
            )}

            {viewState.type === 'user' && <span className="text-white font-medium">User Profile</span>}
          </>
        )}
      </nav>
    );
  };

  const renderContent = () => {
    switch (viewState.type) {
      case 'home':
        return <ForumCategoryView categories={categories} onNavigate={navigateTo} isAdmin={isAdmin} />;
      case 'subforum':
        return <ForumSubforumView subforumId={viewState.id} subforumData={viewState.data} onNavigate={navigateTo} />;
      case 'thread':
        return <ThreadDetailView threadId={viewState.id} threadData={viewState.data} onNavigate={navigateTo} />;
      case 'user':
        return <UserProfileForum userId={viewState.id} />;
      default:
        return <ForumCategoryView categories={categories} onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
           <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
             Community Forum
           </h1>
           <div className="flex items-center gap-3">
              <NotificationSystem onNavigate={navigateTo} />
              {user && (
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => navigateTo('user', user.id)}
                   className="border-gray-700 hover:bg-gray-800"
                 >
                    My Profile
                 </Button>
              )}
           </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="forums" value={activeTab} onValueChange={setActiveTab} className="mb-8">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-800 pb-1">
              <TabsList className="bg-transparent p-0 gap-6 h-auto">
                 <TabsTrigger value="forums" className="data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none px-0 pb-3 transition-all">Forums</TabsTrigger>
                 <TabsTrigger value="search" className="data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none px-0 pb-3 transition-all">Search</TabsTrigger>
                 {(isAdmin || isModerator) && (
                    <TabsTrigger value="moderation" className="data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none px-0 pb-3 transition-all">Moderation</TabsTrigger>
                 )}
                 {isAdmin && (
                    <TabsTrigger value="admin" className="data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none px-0 pb-3 transition-all">Admin</TabsTrigger>
                 )}
              </TabsList>
           </div>

           <TabsContent value="forums" className="space-y-6 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderBreadcrumbs()}
              {renderContent()}
           </TabsContent>

           <TabsContent value="search" className="focus-visible:outline-none animate-in fade-in duration-300">
              <ForumSearch onNavigate={navigateTo} />
           </TabsContent>

           <TabsContent value="moderation" className="focus-visible:outline-none animate-in fade-in duration-300">
              <ModeratorPanel />
           </TabsContent>

           <TabsContent value="admin" className="focus-visible:outline-none animate-in fade-in duration-300">
              <AdminForumSettings />
           </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

export default ForumLayout;