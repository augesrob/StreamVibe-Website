import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Loader2, Copy, RefreshCw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from 'date-fns';

const RecentlyGeneratedKeys = () => {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('license_keys')
                .select('*, billing_plans(name)')
                .in('type', ['paid', 'custom_beta'])
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            setKeys(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const copyKey = (code) => {
        navigator.clipboard.writeText(code);
        toast({ title: "Copied", description: "Key copied to clipboard" });
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recently Generated Keys</CardTitle>
                    <CardDescription>Latest 10 keys created in the system</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchKeys} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent>
                {loading && keys.length === 0 ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-cyan-500" /></div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">No keys found.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-transparent">
                                <TableHead className="text-gray-400">Key Code</TableHead>
                                <TableHead className="text-gray-400">Plan</TableHead>
                                <TableHead className="text-gray-400">Locks</TableHead>
                                <TableHead className="text-gray-400 text-right">Created</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {keys.map((key) => {
                                const lockIp = key.metadata?.lock_to_ip || false;
                                const lockHwid = key.metadata?.lock_to_hwid || false;
                                return (
                                    <TableRow key={key.id} className="border-gray-800 hover:bg-[#252533]">
                                        <TableCell className="font-mono text-cyan-400 text-xs">{key.key_code}</TableCell>
                                        <TableCell>{key.billing_plans?.name || 'Unknown'}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {lockIp && <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-400">IP</Badge>}
                                                {lockHwid && <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-400">HWID</Badge>}
                                                {!lockIp && !lockHwid && <span className="text-xs text-gray-500">-</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-gray-400">
                                            {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyKey(key.key_code)}>
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentlyGeneratedKeys;