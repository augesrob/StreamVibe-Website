import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ModeratorPanel = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
     const fetchLogs = async () => {
        const { data } = await supabase
           .from('moderation_logs')
           .select('*, profiles:moderator_id(username)')
           .order('created_at', { ascending: false })
           .limit(20);
        if (data) setLogs(data);
     };
     fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
       <Card className="bg-[#1a1a24] border-gray-800">
          <CardHeader>
             <CardTitle>Moderation Logs</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                   <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">Moderator</TableHead>
                      <TableHead className="text-gray-400">Action</TableHead>
                      <TableHead className="text-gray-400">Reason</TableHead>
                      <TableHead className="text-gray-400">Time</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {logs.map(log => (
                      <TableRow key={log.id} className="border-gray-800">
                         <TableCell className="text-white">{log.profiles?.username}</TableCell>
                         <TableCell className="text-cyan-400 uppercase text-xs font-bold">{log.action_type}</TableCell>
                         <TableCell className="text-gray-300">{log.reason || '-'}</TableCell>
                         <TableCell className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                   ))}
                   {logs.length === 0 && (
                      <TableRow>
                         <TableCell colSpan={4} className="text-center py-4 text-gray-500">No logs found.</TableCell>
                      </TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
       </Card>
    </div>
  );
};

export default ModeratorPanel;