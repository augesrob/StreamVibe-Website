import React from 'react';
import ForumLayout from '@/components/forum/ForumLayout';

// Updated CommunityFeed to simply serve the ForumLayout
const CommunityFeed = () => {
  return (
    <div className="w-full">
       <ForumLayout />
    </div>
  );
};

export default CommunityFeed;