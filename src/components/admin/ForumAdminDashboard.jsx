import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, AlertTriangle, Activity, CheckCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";

const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card className="bg-[#1a1a24] border-gray-800">
        <CardContent className="p-6 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-full bg-${color}-500/10 text-${color}-500`}>
                <Icon className="w-6 h-6" />
            </div>
        </CardContent>
    </Card>
);

const ForumAdminDashboard = () => {
    const { toast } = useToast();
    const [stats, setStats] = useState({ posts: 0, threads: 0, users: 0, reports: 0 });
    const [modLogs, setModLogs] = useState([]);
    const [spamReports, setSpamReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Parallel fetch for overview stats (approximate using count)
                const [
                    { count: postCount },
                    { count: threadCount },
                    { count: userCount },
                    { count: reportCount },
                    { data: logs },
                    { data: reports }
                ] = await Promise.all([
                    supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
                    supabase.from('forum_threads').select('*', { count: 'exact', head: true }),
                    supabase.from('user_reputation').select('*', { count: 'exact', head: true }), // Active forum users
                    supabase.from('spam_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'), // Assuming status column exists or we count all
                    supabase.from('moderation_logs').select('*, moderator:moderator_id(username)').order('created_at', { ascending: false }).limit(5),
                    supabase.from('spam_reports').select('*, reporter:reporter_id(username)').order('created_at', { ascending: false }).limit(5)
                ]);

                setStats({ posts: postCount || 0, threads: threadCount || 0, users: userCount || 0, reports: reportCount || 0 });
                setModLogs(logs || []);
                setSpamReports(reports || []);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Threads" value={stats.threads} icon={MessageSquare} color="blue" />
                <StatCard title="Total Posts" value={stats.posts} icon={Activity} color="cyan" />
                <StatCard title="Forum Users" value={stats.users} icon={Users} color="purple" />
                <StatCard title="Open Reports" value={stats.reports} icon={AlertTriangle} color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Moderation Actions */}
                <Card className="bg-[#1a1a24] border-gray-800">
                    <CardHeader><CardTitle>Recent Moderation Actions</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Moderator</TableHead><TableHead>Action</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {modLogs.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-gray-500">No recent actions</TableCell></TableRow> : (
                                    modLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium text-cyan-400">{log.moderator?.username}</TableCell>
                                            <TableCell>{log.action_type}</TableCell>
                                            <TableCell className="text-xs text-gray-400">{formatDistanceToNow(new Date(log.created_at))} ago</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Spam Reports */}
                <Card className="bg-[#1a1a24] border-gray-800">
                    <CardHeader><CardTitle>Recent Spam Reports</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Reporter</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {spamReports.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-gray-500">No reports</TableCell></TableRow> : (
                                    spamReports.map(rep => (
                                        <TableRow key={rep.id}>
                                            <TableCell>{rep.reporter?.username}</TableCell>
                                            <TableCell className="max-w-[150px] truncate">{rep.reason}</TableCell>
                                            <TableCell><span className="text-xs px-2 py-1 bg-gray-800 rounded border border-gray-700">Open</span></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ForumAdminDashboard;