import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Hash, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ForumCategoryView = ({ categories, onNavigate }) => {
  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category.id} className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg border border-cyan-500/20">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">{category.name}</h2>
                {category.description && <p className="text-sm text-gray-400">{category.description}</p>}
             </div>
          </div>

          <div className="grid gap-4">
             {category.forum_subforums?.map((subforum) => (
               <Card 
                  key={subforum.id} 
                  className="bg-[#1a1a24] border-gray-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
                  onClick={() => onNavigate('subforum', subforum.id, subforum)}
               >
                 <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                          <Hash className="w-5 h-5 text-gray-500 group-hover:text-cyan-400" />
                       </div>
                       <div>
                          <h3 className="text-lg font-semibold text-gray-100 group-hover:text-cyan-400 transition-colors">{subforum.name}</h3>
                          <p className="text-sm text-gray-400">{subforum.description}</p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all" />
                 </CardContent>
               </Card>
             ))}
             {(!category.forum_subforums || category.forum_subforums.length === 0) && (
               <div className="p-8 text-center border border-dashed border-gray-800 rounded-lg text-gray-500">
                 No subforums in this category yet.
               </div>
             )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ForumCategoryView;