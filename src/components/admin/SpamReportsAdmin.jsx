import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, Ban, Trash2 } from 'lucide-react';

const SpamReportsAdmin = () => {
    const { toast } = useToast();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('spam_reports')
            .select(`
                *,
                reporter:reporter_id(username)
            `)
            .order('created_at', { ascending: false });
        
        if (data) setReports(data);
        setLoading(false);
    };

    const resolveReport = async (id) => {
        // In real app, update 'status' column. Assuming DELETE for now to "Clear" report from view
        const { error } = await supabase.from('spam_reports').delete().eq('id', id);
        if (!error) {
            toast({ title: "Resolved", description: "Report cleared." });
            setReports(reports.filter(r => r.id !== id));
        }
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader><CardTitle>Spam Reports</CardTitle></CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reporter</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Target Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-gray-500">No open reports.</TableCell></TableRow> : (
                                reports.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.reporter?.username}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{r.reason}</div>
                                            <div className="text-xs text-gray-500">{r.description}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{r.target_type}</Badge></TableCell>
                                        <TableCell className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" onClick={() => resolveReport(r.id)}>
                                                <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default SpamReportsAdmin;