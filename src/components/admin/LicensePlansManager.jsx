
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Key, Download, Copy, ShieldCheck, PlusCircle } from 'lucide-react';
import { exportKeysAsCSV } from '@/lib/license-key-utils';
import { callEdgeFunctionWithTimeout } from '@/lib/edge-functions';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LicensePlansManager = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [genDialog, setGenDialog] = useState({ open: false, plan: null });
    const [genParams, setGenParams] = useState({ quantity: 10, expiration_days: 30 });
    const [generatedKeys, setGeneratedKeys] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Custom Key State
    const [customKeys, setCustomKeys] = useState([]);
    const [customParams, setCustomParams] = useState({
        plan_id: '',
        duration_days: 30,
        lock_to_ip: false,
        lock_to_hwid: false
    });
    const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('plans').select('*').order('price');
        if (!error) setPlans(data || []);
        setLoading(false);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const { data, error } = await callEdgeFunctionWithTimeout('generate-license-keys', {
                body: {
                    plan_id: genDialog.plan.id,
                    quantity: parseInt(genParams.quantity),
                    expiration_days: parseInt(genParams.expiration_days)
                }
            });
            
            if (error) throw new Error(error.message);
            
            if (data.success) {
                setGeneratedKeys(data.keys);
                toast({ title: "Success", description: `${data.keys.length} keys generated.` });
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Generation Failed", description: e.message });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateCustom = async () => {
        if (!customParams.plan_id) {
            toast({ variant: "destructive", title: "Error", description: "Please select a plan." });
            return;
        }

        setIsGeneratingCustom(true);
        try {
            // Call Supabase RPC directly 
            const { data, error } = await supabase.rpc('generate_custom_license_key', {
                p_plan_id: customParams.plan_id,
                p_duration_days: parseInt(customParams.duration_days),
                p_lock_to_ip: customParams.lock_to_ip,
                p_lock_to_hwid: customParams.lock_to_hwid
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            const newKey = {
                ...data,
                plan_name: plans.find(p => p.id === customParams.plan_id)?.name || 'Unknown',
                created_at: new Date().toISOString()
            };

            setCustomKeys(prev => [newKey, ...prev]);
            toast({ title: "Custom Key Generated", description: data.key_code });

        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Custom Generation Failed", description: e.message });
        } finally {
            setIsGeneratingCustom(false);
        }
    };

    const closeGenDialog = () => {
        setGenDialog({ open: false, plan: null });
        setGeneratedKeys(null);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regular Plans Management */}
                <Card className="bg-[#1a1a24] border-gray-800 lg:col-span-1">
                    <CardHeader><CardTitle>Standard Plans</CardTitle><CardDescription>Manage plans and generate bulk standard keys.</CardDescription></CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="animate-spin mx-auto"/> : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Plan Name</TableHead><TableHead>Duration</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {plans.map(plan => (
                                        <TableRow key={plan.id}>
                                            <TableCell className="font-medium">{plan.name}</TableCell>
                                            <TableCell>{plan.duration_days} Days</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => setGenDialog({ open: true, plan })} className="bg-purple-600 hover:bg-purple-700">
                                                    <Key className="w-3 h-3 mr-2"/> Bulk Gen
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Custom Key Generator */}
                <Card className="bg-[#1a1a24] border-gray-800 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-cyan-500"/> Generate Custom Key</CardTitle>
                        <CardDescription>Create single keys with security locks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Plan</Label>
                                <Select onValueChange={(v) => setCustomParams({...customParams, plan_id: v})}>
                                    <SelectTrigger className="bg-[#12121a] border-gray-700"><SelectValue placeholder="Select Plan" /></SelectTrigger>
                                    <SelectContent className="bg-[#1a1a24] border-gray-700 text-white">
                                        {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (${p.price})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (Days)</Label>
                                <Input type="number" value={customParams.duration_days} onChange={e => setCustomParams({...customParams, duration_days: e.target.value})} className="bg-[#12121a] border-gray-700"/>
                            </div>
                        </div>
                        
                        <div className="flex gap-6 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="lock_ip" checked={customParams.lock_to_ip} onCheckedChange={(c) => setCustomParams({...customParams, lock_to_ip: c})} />
                                <Label htmlFor="lock_ip" className="cursor-pointer">Lock to IP</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="lock_hwid" checked={customParams.lock_to_hwid} onCheckedChange={(c) => setCustomParams({...customParams, lock_to_hwid: c})} />
                                <Label htmlFor="lock_hwid" className="cursor-pointer">Lock to HWID</Label>
                            </div>
                        </div>

                        <Button onClick={handleGenerateCustom} disabled={isGeneratingCustom} className="w-full bg-cyan-600 hover:bg-cyan-700">
                            {isGeneratingCustom ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <PlusCircle className="w-4 h-4 mr-2"/>} Generate Custom Key
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Generated Custom Keys Table */}
            {customKeys.length > 0 && (
                <Card className="bg-[#1a1a24] border-gray-800">
                    <CardHeader><CardTitle>Recently Generated Custom Keys</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Key Code</TableHead><TableHead>Plan</TableHead><TableHead>Duration</TableHead><TableHead>IP Lock</TableHead><TableHead>HWID Lock</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {customKeys.map((key) => (
                                    <TableRow key={key.key_code}>
                                        <TableCell className="font-mono text-cyan-400">{key.key_code}</TableCell>
                                        <TableCell>{key.plan_name}</TableCell>
                                        <TableCell>{key.duration_days} days</TableCell>
                                        <TableCell>{key.lock_to_ip ? <Badge className="bg-green-900 text-green-300">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                                        <TableCell>{key.lock_to_hwid ? <Badge className="bg-green-900 text-green-300">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => {
                                                navigator.clipboard.writeText(key.key_code);
                                                toast({ title: "Copied", description: "Key copied to clipboard" });
                                            }}>
                                                <Copy className="w-4 h-4"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Bulk Gen Dialog */}
            <Dialog open={genDialog.open} onOpenChange={open => !open && closeGenDialog()}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Generate Keys for {genDialog.plan?.name}</DialogTitle>
                        <DialogDescription>Create bulk license keys for distribution.</DialogDescription>
                    </DialogHeader>
                    
                    {!generatedKeys ? (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input type="number" value={genParams.quantity} onChange={e => setGenParams({...genParams, quantity: e.target.value})} className="bg-[#12121a] border-gray-700"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Days)</Label>
                                    <Input type="number" value={genParams.expiration_days} onChange={e => setGenParams({...genParams, expiration_days: e.target.value})} className="bg-[#12121a] border-gray-700"/>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-green-400 font-medium">Keys Generated!</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => exportKeysAsCSV(generatedKeys)}><Download className="w-4 h-4 mr-2"/> CSV</Button>
                                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(generatedKeys.map(k => k.key_code).join('\n'))}><Copy className="w-4 h-4"/></Button>
                                </div>
                            </div>
                            <ScrollArea className="bg-black/50 p-4 rounded border border-gray-800 h-[200px] font-mono text-xs">
                                {generatedKeys.map(k => <div key={k.id}>{k.key_code}</div>)}
                            </ScrollArea>
                        </div>
                    )}

                    <DialogFooter>
                        {!generatedKeys ? (
                            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-cyan-600 hover:bg-cyan-700">
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Key className="w-4 h-4 mr-2"/>} Generate
                            </Button>
                        ) : (
                            <Button onClick={closeGenDialog}>Done</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LicensePlansManager;
