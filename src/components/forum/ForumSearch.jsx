import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, MessageCircle } from 'lucide-react';

const ForumSearch = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    
    // Simple ILIKE search on threads
    const { data } = await supabase
      .from('forum_threads')
      .select('*, profiles:user_id(username)')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (data) setResults(data);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="flex gap-2">
          <Input 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder="Search forum threads..."
             className="bg-[#1a1a24] border-gray-800 h-12 text-lg"
          />
          <Button onClick={handleSearch} className="h-12 w-12 bg-cyan-600 hover:bg-cyan-700">
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
       </div>

       <div className="space-y-3">
          {hasSearched && results.length === 0 && !loading && (
             <div className="text-center text-gray-500 py-10">No results found for "{query}"</div>
          )}
          
          {results.map(thread => (
             <Card 
                key={thread.id} 
                className="bg-[#1a1a24] border-gray-800 hover:border-cyan-500/50 cursor-pointer"
                onClick={() => onNavigate('thread', thread.id, thread)}
             >
                <CardContent className="p-4">
                   <h3 className="font-semibold text-white mb-1">{thread.title}</h3>
                   <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>@{thread.profiles?.username}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {thread.reply_count}</span>
                   </div>
                </CardContent>
             </Card>
          ))}
       </div>
    </div>
  );
};

export default ForumSearch;