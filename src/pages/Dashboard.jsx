import React from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

// Tab components
import ProfileTab    from '@/components/dashboard/ProfileTab';
import SettingsTab   from '@/components/dashboard/SettingsTab';
import CommunityFeed from '@/components/dashboard/CommunityFeed';
import LiveFeed      from '@/components/dashboard/LiveFeed';
import DownloadsTab  from '@/components/dashboard/DownloadsTab';
import GamesHub      from '@/pages/tools/GamesHub';

// Tool cards
import { Gavel, Layers, ExternalLink } from 'lucide-react';

function ToolCard({ icon: Icon, title, description, href, badge }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(href)}
      className="bg-[#1a1a24] border border-gray-800 rounded-xl p-5 cursor-pointer
        hover:border-cyan-600 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]
        transition-all group flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20
          border border-cyan-500/20 flex items-center justify-center group-hover:from-cyan-500/30">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        {badge && (
          <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">
            {badge}
          </span>
        )}
      </div>

      <div>
        <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
          {title} <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-cyan-500" />
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen text-slate-100">
      <Helmet><title>Dashboard - StreamVibe</title></Helmet>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600
            bg-clip-text text-transparent">
            Creator Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Welcome back, <span className="text-white font-medium">{user?.email}</span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#1a1a24] border border-gray-800 p-1 w-full flex flex-wrap justify-start h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">🛠 Tools</TabsTrigger>
          <TabsTrigger value="games">🎮 Games</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileTab />
            <LiveFeed />
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">StreamVibe Tools</h2>
            <p className="text-gray-400 mb-6">
              Live stream tools to boost engagement and grow your audience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ToolCard
                icon={Gavel}
                title="Live Auction"
                description="Run live gift auctions on your TikTok stream. Auto-detects leaders, snipe protection, real-time bid feed, and stream overlay."
                href="/tools/auction"
                badge="NEW"
              />
              <ToolCard
                icon={Layers}
                title="Overlay Setup"
                description="Customise your stream overlay theme, background opacity, and get your browser source URL for TikTok Live Studio."
                href="/tools/overlay-setup"
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Games Tab — only visible when logged in ── */}
        <TabsContent value="games">
          <GamesHub />
        </TabsContent>

        <TabsContent value="community">
          <CommunityFeed />
        </TabsContent>

        <TabsContent value="downloads">
          <DownloadsTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Dashboard;
