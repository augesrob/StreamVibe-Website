import React, { useState, useEffect } from 'react';
import { adminSupabase } from '@/lib/adminSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

const SpamReportsAdmin = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await adminSupabase
      .from('spam_reports')
      .select('*, profiles:reporter_id(username)')
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const resolve = async (id) => {
    await adminSupabase.from('spam_reports').update({ status: 'resolved', resolved: true }).eq('id', id);
    toast({ title: 'Report resolved' });
    fetchReports();
  };

  const dismiss = async (id) => {
    await adminSupabase.from('spam_reports').delete().eq('id', id);
    toast({ title: 'Report dismissed' });
    setReports(p => p.filter(r => r.id !== id));
  };

  return (
    <Card className="bg-[#1a1a24] border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Spam Reports</CardTitle>
        <Button size="sm" variant="outline" onClick={fetchReports} disabled={loading} className="border-slate-700 text-slate-400">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
        : reports.length === 0
          ? <div className="text-center py-10 text-slate-500">No reports — community is clean 🎉</div>
          : <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-500">Reporter</TableHead>
                  <TableHead className="text-gray-500">Reason</TableHead>
                  <TableHead className="text-gray-500">Type</TableHead>
                  <TableHead className="text-gray-500">Status</TableHead>
                  <TableHead className="text-gray-500">Date</TableHead>
                  <TableHead className="text-right text-gray-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id} className="border-gray-800">
                    <TableCell className="text-white font-medium">{r.profiles?.username || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="text-gray-300 text-sm max-w-[180px]">{r.reason}</div>
                      {r.description && <div className="text-xs text-gray-500 mt-0.5 truncate">{r.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs capitalize">
                        {r.target_type || 'post'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={r.status === 'resolved'
                        ? 'bg-green-900/40 text-green-400 border-green-800 text-xs'
                        : 'bg-red-900/40 text-red-400 border-red-800 text-xs'}>
                        {r.status || 'open'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {r.status !== 'resolved' && (
                          <Button size="sm" className="h-7 text-xs bg-green-900/40 border border-green-800 text-green-400 hover:bg-green-900" onClick={() => resolve(r.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" />Resolve
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-400" onClick={() => dismiss(r.id)}>
                          Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        }
      </CardContent>
    </Card>
  );
};

export default SpamReportsAdmin;
