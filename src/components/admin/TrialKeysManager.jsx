
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Loader2, Zap } from 'lucide-react';

const TrialKeysManager = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [quantity, setQuantity] = useState(5);

    const fetchPlans = async () => {
        setLoading(true);
        // Corrected table name from 'billing_plans' to 'plans'
        const { data } = await supabase.from('plans').select('*');
        setPlans(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchPlans(); }, []);

    const handleCreateTrials = async () => {
        if (!selectedPlan) return;
        try {
            const { data, error } = await supabase.rpc('create_trial_keys', {
                p_plan_id: selectedPlan.id,
                p_count: parseInt(quantity),
                p_trial_days: 7
            });
            
            if (error) throw error;
            if (data.success) {
                toast({ title: "Success", description: `${data.keys.length} trial keys created.` });
                setDialogOpen(false);
            } else {
                toast({ variant: "destructive", title: "Error", description: data.message });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        }
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader><CardTitle>Trial Key Management</CardTitle><CardDescription>Manage promotional trial access.</CardDescription></CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin mx-auto"/> : (
                    <Table>
                        <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Trial Limit</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {plans.map(plan => (
                                <TableRow key={plan.id}>
                                    <TableCell>{plan.name}</TableCell>
                                    <TableCell>Standard (7 Days)</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => { setSelectedPlan(plan); setDialogOpen(true); }}>
                                            <Zap className="w-4 h-4 mr-2"/> Create Trials
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <DialogHeader><DialogTitle>Create Trial Keys: {selectedPlan?.name}</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Label>Quantity</Label>
                        <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="bg-[#12121a] border-gray-700"/>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateTrials}>Generate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default TrialKeysManager;
