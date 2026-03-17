import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Radio, AlertCircle } from 'lucide-react';

const LiveFeed = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemberStreams = async () => {
      try {
        // Query profiles from our own database where is_live is true
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, followers_count, is_live')
          .eq('is_live', true)
          .eq('is_unlisted', false);

        if (error) throw error;
        setStreams(data || []);
      } catch (err) {
        console.error("Failed to fetch live members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberStreams();

    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
          fetchMemberStreams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div className="text-center p-8 text-gray-500">Scanning community for live members...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="text-red-500 animate-pulse" /> Community Live Now
         </h2>
         <Badge variant="outline" className="border-green-500 text-green-400">
            Internal Network
         </Badge>
      </div>

      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-800 rounded-lg bg-[#1a1a24]/50">
           <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Radio className="w-8 h-8 opacity-50" />
           </div>
           <h3 className="text-lg font-medium text-white mb-2">No Members Currently Live</h3>
           <p className="text-gray-400 max-w-sm">
             It looks like no one from the StreamVibe community is broadcasting right now.
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {streams.map((streamer) => (
             <Card key={streamer.id} className="bg-[#1a1a24] border-gray-800 overflow-hidden relative opacity-90 hover:opacity-100 transition-opacity">
                <div className="relative aspect-video bg-gray-900 flex items-center justify-center group">
                   <div className="absolute inset-0 overflow-hidden">
                      <img 
                        src={streamer.avatar_url} 
                        alt="Background" 
                        className="w-full h-full object-cover blur-md opacity-30 scale-110" 
                      />
                   </div>
                   
                   <div className="relative z-10 flex flex-col items-center text-center p-4">
                      <Avatar className="w-16 h-16 border-4 border-red-500 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                        <AvatarImage src={streamer.avatar_url} />
                        <AvatarFallback>{streamer.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-white font-semibold text-lg drop-shadow-md">@{streamer.username}</span>
                   </div>

                   <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg z-20">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> LIVE
                   </div>
                </div>

                <div className="p-4 border-t border-gray-800">
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                         <Users className="w-3 h-3" />
                         <span>{streamer.followers_count?.toLocaleString() || 0} followers</span>
                      </div>
                   </div>
                   <p className="text-sm text-gray-300 line-clamp-2 italic">
                     {streamer.bio || "Streaming now on TikTok!"}
                   </p>
                   
                   <div className="mt-3 pt-3 border-t border-gray-800/50 flex items-center gap-2 text-xs text-gray-500">
                      <AlertCircle className="w-3 h-3" />
                      <span>Stream preview unavailable externally</span>
                   </div>
                </div>
             </Card>
           ))}
        </div>
      )}
    </div>
  );
};

export default LiveFeed;