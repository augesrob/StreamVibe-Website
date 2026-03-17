import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Calendar as CalendarIcon, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

const Calendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '' });

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return;
    
    const startDateTime = new Date(`${newEvent.date}T${newEvent.time}`);
    
    try {
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        title: newEvent.title,
        start_time: startDateTime.toISOString()
      });
      if (error) throw error;
      
      setIsDialogOpen(false);
      setNewEvent({ title: '', date: '', time: '' });
      fetchEvents();
    } catch (err) {
      console.error("Error adding event:", err);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
       await supabase.from('events').delete().eq('id', id);
       setEvents(events.filter(e => e.id !== id));
    } catch (err) {
       console.error("Error deleting event:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="text-cyan-400" /> Content Schedule
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-1" /> Add Stream
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#12121a] border-cyan-500/20 text-white">
            <DialogHeader>
              <DialogTitle>Schedule New Stream</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Stream Title</label>
                <input 
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  placeholder="e.g., Friday Night Gaming"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm text-gray-400">Date</label>
                    <input 
                      type="date"
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm text-gray-400">Time</label>
                    <input 
                      type="time"
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                      value={newEvent.time}
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                    />
                 </div>
              </div>
              <Button onClick={handleAddEvent} className="w-full bg-cyan-600 hover:bg-cyan-700">
                Save Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {loading ? (
            <div className="text-center py-8 text-gray-500">Loading schedule...</div>
        ) : events.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-800 rounded-lg">
                <p className="text-gray-400">No upcoming streams scheduled.</p>
            </div>
        ) : (
            events.map(event => (
                <div key={event.id} className="bg-[#1a1a24] border border-gray-800 p-4 rounded-lg flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="bg-cyan-500/10 p-3 rounded-lg text-center min-w-[60px]">
                            <p className="text-xs text-cyan-400 uppercase font-bold">{format(new Date(event.start_time), 'MMM')}</p>
                            <p className="text-xl font-bold text-white">{format(new Date(event.start_time), 'd')}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white">{event.title}</h4>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {format(new Date(event.start_time), 'h:mm a')}
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteEvent(event.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Calendar;