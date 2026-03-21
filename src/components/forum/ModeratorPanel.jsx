import React, { useEffect, useState } from 'react';
import { adminSupabase } from '@/lib/adminSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ModeratorPanel = () => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await adminSupabase
      .from('moderation_logs')
      .select('*, profiles:moderator_id(username)')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const ACTION_COLORS = {
    ban:     'bg-red-900/40 text-red-400 border-red-800',
    unban:   'bg-green-900/40 text-green-400 border-green-800',
    delete:  'bg-orange-900/40 text-orange-400 border-orange-800',
    pin:     'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    lock:    'bg-blue-900/40 text-blue-400 border-blue-800',
    warn:    'bg-purple-900/40 text-purple-400 border-purple-800',
  };

  return (
    <Card className="bg-[#1a1a24] border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Moderation Logs</CardTitle>
        <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading} className="border-slate-700 text-slate-400">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
          : logs.length === 0
            ? <div className="text-center py-10 text-slate-500">No moderation actions yet.</div>
            : <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-500">Moderator</TableHead>
                    <TableHead className="text-gray-500">Action</TableHead>
                    <TableHead className="text-gray-500">Target</TableHead>
                    <TableHead className="text-gray-500">Reason</TableHead>
                    <TableHead className="text-gray-500">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => {
                    const action = log.action_type || log.action || 'action';
                    const color  = ACTION_COLORS[action.toLowerCase()] || 'bg-slate-800 text-slate-400 border-slate-700';
                    return (
                      <TableRow key={log.id} className="border-gray-800">
                        <TableCell className="text-cyan-400 font-medium">
                          {log.profiles?.username || 'System'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs capitalize ${color}`}>{action}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs">
                          {log.target_type && <span className="capitalize">{log.target_type}</span>}
                          {log.target_id && <span className="font-mono ml-1 text-gray-600">{log.target_id.slice(0,8)}…</span>}
                        </TableCell>
                        <TableCell className="text-gray-300 text-sm max-w-[200px] truncate">
                          {log.reason || log.notes || '—'}
                        </TableCell>
                        <TableCell className="text-gray-500 text-xs">
                          {formatDistanceToNow(new Date(log.created_at))} ago
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
        }
      </CardContent>
    </Card>
  );
};

export default ModeratorPanel;
