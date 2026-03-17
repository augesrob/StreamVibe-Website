import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserReputation } from '@/hooks/useUserReputation';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star } from 'lucide-react';

const UserProfileForum = ({ userId }) => {
  const { reputation, loading } = useUserReputation(userId);
  // In a full implementation, we'd fetch user profile details (username, avatar) here too if not passed down.
  // For now, assuming basic structure.

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <Card className="bg-[#1a1a24] border-gray-800 p-8 text-center">
          <div className="flex flex-col items-center">
             <Avatar className="w-24 h-24 border-4 border-gray-800 mb-4">
                <AvatarFallback>U</AvatarFallback>
             </Avatar>
             <h2 className="text-2xl font-bold text-white mb-2">Forum Member</h2>
             
             <div className="flex gap-6 mt-6">
                <div className="text-center">
                   <div className="flex items-center gap-2 text-amber-400 font-bold text-xl justify-center">
                      <Star className="w-5 h-5 fill-current" />
                      {reputation.points}
                   </div>
                   <p className="text-xs text-gray-500 uppercase tracking-wide">Reputation</p>
                </div>
                {/* Add Post Count here if available in profile stats */}
             </div>

             <div className="mt-8 flex flex-wrap gap-2 justify-center">
                {reputation.badges && reputation.badges.map((badge, i) => (
                   <Badge key={i} variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-900/10">
                      <Trophy className="w-3 h-3 mr-1" /> {badge}
                   </Badge>
                ))}
                {(!reputation.badges || reputation.badges.length === 0) && (
                   <span className="text-gray-500 text-sm">No badges earned yet.</span>
                )}
             </div>
          </div>
       </Card>
       
       <div className="text-center text-gray-500 py-10">
          User post history coming soon.
       </div>
    </div>
  );
};

export default UserProfileForum;