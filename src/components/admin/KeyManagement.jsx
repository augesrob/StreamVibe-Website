import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Key } from 'lucide-react';

const KeyManagement = () => {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [generating, setGenerating] = useState(false);

    const fetchKeys = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('license_keys').select('*, billing_plans(name), profiles(username)').order('created_at', { ascending: false });
        if (error) toast({ variant: "destructive", title: "Error", description: error.message });
        else setKeys(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchKeys(); }, []);

    const handleGenerateKey = async () => {
        setGenerating(true);
        try {
            const { data: plan } = await supabase.from('billing_plans').select('id').eq('name', 'Pro').maybeSingle();
            
            if (!plan) {
                 // Fallback if 'Pro' doesn't exist
                 throw new Error("Pro plan not found. Create a plan named 'Pro' first.");
            }

            const newKey = `KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const { error } = await supabase.from('license_keys').insert({
                key_code: newKey,
                plan_id: plan.id,
                status: 'active',
                type: 'generated',
                duration_days: 30,
                duration_unit: 'days'
            });
            if (error) throw error;
            toast({ title: "Success", description: "Key generated" });
            fetchKeys();
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>License Keys</CardTitle><CardDescription>Manage user licenses and keys.</CardDescription></div>
                <Button onClick={handleGenerateKey} disabled={generating} className="bg-cyan-600 hover:bg-cyan-700">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4 mr-2"/>} Generate Key
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin mx-auto"/> : (
                    <Table>
                        <TableHeader><TableRow><TableHead>Key Code</TableHead><TableHead>User</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {keys.map(k => (
                                <TableRow key={k.id}>
                                    <TableCell className="font-mono">{k.key_code}</TableCell>
                                    <TableCell>{k.profiles?.username || '-'}</TableCell>
                                    <TableCell>{k.billing_plans?.name}</TableCell>
                                    <TableCell><Badge variant={k.status === 'active' ? 'default' : 'secondary'}>{k.status}</Badge></TableCell>
                                    <TableCell>{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default KeyManagement;