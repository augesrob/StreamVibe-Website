import React, { useState, useEffect } from 'react';
import { adminSupabase } from '@/lib/adminSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, AlertTriangle, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card className="bg-[#1a1a24] border-gray-800">
    <CardContent className="p-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value ?? '—'}</h3>
      </div>
      <div className={`p-3 rounded-full bg-${color}-500/10`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
    </CardContent>
  </Card>
);

const ForumAdminDashboard = () => {
  const [stats, setStats]       = useState({ posts: 0, threads: 0, users: 0, reports: 0 });
  const [modLogs, setModLogs]   = useState([]);
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [
        { count: postCount },
        { count: threadCount },
        { count: userCount },
        { count: reportCount },
        { data: logs },
        { data: reps },
      ] = await Promise.all([
        adminSupabase.from('forum_posts').select('*', { count: 'exact', head: true }),
        adminSupabase.from('forum_threads').select('*', { count: 'exact', head: true }),
        adminSupabase.from('user_reputation').select('*', { count: 'exact', head: true }),
        adminSupabase.from('spam_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        adminSupabase.from('moderation_logs')
          .select('*, profiles:moderator_id(username)')
          .order('created_at', { ascending: false }).limit(6),
        adminSupabase.from('spam_reports')
          .select('*, profiles:reporter_id(username)')
          .eq('status', 'open')
          .order('created_at', { ascending: false }).limit(6),
      ]);
      setStats({ posts: postCount||0, threads: threadCount||0, users: userCount||0, reports: reportCount||0 });
      setModLogs(logs || []);
      setReports(reps || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Threads" value={stats.threads} icon={MessageSquare} color="blue"   />
        <StatCard title="Total Posts"   value={stats.posts}   icon={Activity}      color="cyan"   />
        <StatCard title="Forum Users"   value={stats.users}   icon={Users}         color="purple" />
        <StatCard title="Open Reports"  value={stats.reports} icon={AlertTriangle}  color="red"    />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Mod Actions */}
        <Card className="bg-[#1a1a24] border-gray-800">
          <CardHeader><CardTitle className="text-white text-base">Recent Mod Actions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-500">Moderator</TableHead>
                  <TableHead className="text-gray-500">Action</TableHead>
                  <TableHead className="text-gray-500">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modLogs.length === 0
                  ? <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">No actions yet</TableCell></TableRow>
                  : modLogs.map(log => (
                    <TableRow key={log.id} className="border-gray-800">
                      <TableCell className="text-cyan-400 font-medium">
                        {log.profiles?.username || 'System'}
                      </TableCell>
                      <TableCell className="text-gray-300 capitalize text-sm">
                        {log.action_type || log.action || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(log.created_at))} ago
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Open Spam Reports */}
        <Card className="bg-[#1a1a24] border-gray-800">
          <CardHeader><CardTitle className="text-white text-base">Open Spam Reports</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-500">Reporter</TableHead>
                  <TableHead className="text-gray-500">Reason</TableHead>
                  <TableHead className="text-gray-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0
                  ? <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-6">No open reports 🎉</TableCell></TableRow>
                  : reports.map(r => (
                    <TableRow key={r.id} className="border-gray-800">
                      <TableCell className="text-white">{r.profiles?.username || 'Unknown'}</TableCell>
                      <TableCell className="text-gray-300 text-sm max-w-[150px] truncate">{r.reason}</TableCell>
                      <TableCell>
                        <Badge className="bg-red-900/40 text-red-400 border-red-800 text-xs">Open</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForumAdminDashboard;
