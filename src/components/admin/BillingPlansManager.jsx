
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';

const BillingPlansManager = () => {
    const { toast } = useToast();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, plan: null });
    const [editingPlan, setEditingPlan] = useState(null);
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        duration_days: 30,
        features: '',
    });

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('plans').select('*').order('price');
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleOpenDialog = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                price: plan.price,
                duration_days: plan.duration_days || 30,
                features: plan.features ? (Array.isArray(plan.features) ? plan.features.join('\n') : JSON.stringify(plan.features)) : '',
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                price: '',
                duration_days: 30,
                features: '',
            });
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        // Parse features safely
        let featuresArray = [];
        try {
            featuresArray = formData.features.split('\n').filter(f => f.trim() !== '');
        } catch (e) {
            featuresArray = [];
        }

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            duration_days: parseInt(formData.duration_days),
            features: featuresArray 
        };

        let error;
        if (editingPlan) {
            ({ error } = await supabase.from('plans').update(payload).eq('id', editingPlan.id));
        } else {
            ({ error } = await supabase.from('plans').insert(payload));
        }

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Success", description: `Plan ${editingPlan ? 'updated' : 'created'} successfully.` });
            setDialogOpen(false);
            fetchPlans();
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.plan) return;
        
        const { error } = await supabase.from('plans').delete().eq('id', deleteDialog.plan.id);
        
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Deleted", description: "Plan removed successfully." });
            fetchPlans();
        }
        setDeleteDialog({ open: false, plan: null });
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Billing Plans</CardTitle>
                    <CardDescription>Manage subscription tiers and pricing.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="w-4 h-4 mr-2" /> New Plan
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="rounded-md border border-gray-800 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Duration (Days)</TableHead>
                                    <TableHead>Features</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell className="font-medium">
                                            {plan.name}
                                        </TableCell>
                                        <TableCell>${plan.price}</TableCell>
                                        <TableCell>{plan.duration_days} Days</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {Array.isArray(plan.features) && plan.features.slice(0, 3).map((f, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs border-gray-600">{f}</Badge>
                                                ))}
                                                {Array.isArray(plan.features) && plan.features.length > 3 && <span className="text-xs text-gray-500">+{plan.features.length - 3} more</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(plan)}>
                                                    <Edit className="w-4 h-4 text-blue-400" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, plan })}>
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                        <DialogDescription>Configure the billing plan details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-[#12121a] border-gray-700" />
                        </div>
                        <div className="space-y-2">
                            <Label>Price ($)</Label>
                            <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-[#12121a] border-gray-700" />
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (Days)</Label>
                            <Input type="number" value={formData.duration_days} onChange={e => setFormData({...formData, duration_days: e.target.value})} className="bg-[#12121a] border-gray-700" />
                        </div>
                        
                        <div className="col-span-2 space-y-2">
                            <Label>Features (One per line)</Label>
                            <Textarea 
                                value={formData.features} 
                                onChange={e => setFormData({...formData, features: e.target.value})} 
                                className="bg-[#12121a] border-gray-700 min-h-[100px]"
                                placeholder="Feature 1&#10;Feature 2&#10;Feature 3" 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-black">Cancel</Button>
                        <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">Save Plan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, plan: null })}>
                <AlertDialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete <span className="font-bold text-white">"{deleteDialog.plan?.name}"</span>?
                            This might affect users currently subscribed to this plan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel className="text-black">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

export default BillingPlansManager;
