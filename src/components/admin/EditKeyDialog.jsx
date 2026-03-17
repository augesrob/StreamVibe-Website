import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import AssignKeyDialog from './AssignKeyDialog';

const EditKeyDialog = ({ open, onOpenChange, keyData, onSuccess, billingPlans }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({});
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);

    useEffect(() => {
        if (keyData) {
            setFormData({
                id: keyData.id,
                plan_id: keyData.plan_id,
                status: keyData.status,
                expires_at: keyData.expires_at ? keyData.expires_at.split('T')[0] : '', // Simple date format
                duration_days: keyData.duration_days || 30,
                lock_to_ip: keyData.metadata?.lock_to_ip || false,
                lock_to_hwid: keyData.metadata?.lock_to_hwid || false,
                locked_ip: keyData.user_id ? (keyData.profiles?.locked_ip || '') : '',
                locked_hwid: keyData.user_id ? (keyData.profiles?.locked_hwid || '') : ''
            });
        }
    }, [keyData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('update_license_key', {
                p_key_id: formData.id,
                p_plan_id: formData.plan_id,
                p_status: formData.status,
                p_expires_at: formData.expires_at || null,
                p_duration_days: parseInt(formData.duration_days),
                p_locked_ip: formData.locked_ip,
                p_locked_hwid: formData.locked_hwid,
                p_lock_to_ip: formData.lock_to_ip,
                p_lock_to_hwid: formData.lock_to_hwid
            });

            if (error) throw error;
            if (data.success) {
                toast({ title: "Success", description: "Key updated successfully" });
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                throw new Error(data.message);
            }

        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (!keyData) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit License Key</DialogTitle>
                        <DialogDescription className="font-mono text-cyan-400">{keyData.key_code}</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                                <SelectTrigger className="bg-[#12121a] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-gray-700 text-white">
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="redeemed">Redeemed</SelectItem>
                                    <SelectItem value="frozen">Frozen</SelectItem>
                                    <SelectItem value="revoked">Revoked</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Plan</Label>
                            <Select value={formData.plan_id} onValueChange={(v) => setFormData({...formData, plan_id: v})}>
                                <SelectTrigger className="bg-[#12121a] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-gray-700 text-white">
                                    {billingPlans.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Assigned User</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={keyData.profiles?.username || "Unassigned"} 
                                    disabled 
                                    className="bg-[#12121a] border-gray-700 text-gray-400"
                                />
                                <Button size="icon" variant="outline" onClick={() => setAssignDialogOpen(true)} title="Reassign">
                                    <UserPlus className="w-4 h-4"/>
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (Days)</Label>
                            <Input 
                                type="number" 
                                value={formData.duration_days}
                                onChange={e => setFormData({...formData, duration_days: e.target.value})}
                                className="bg-[#12121a] border-gray-700 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Expires At</Label>
                            <Input 
                                type="date" 
                                value={formData.expires_at}
                                onChange={e => setFormData({...formData, expires_at: e.target.value})}
                                className="bg-[#12121a] border-gray-700 text-white"
                            />
                        </div>
                        
                        <div className="col-span-2 border-t border-gray-800 pt-4 mt-2">
                            <Label className="text-lg text-cyan-400 mb-4 block">Lock Settings</Label>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="edit-lock-ip" 
                                            checked={formData.lock_to_ip} 
                                            onCheckedChange={(c) => setFormData({...formData, lock_to_ip: c})}
                                        />
                                        <Label htmlFor="edit-lock-ip">Lock to IP</Label>
                                    </div>
                                    {formData.lock_to_ip && (
                                        <Input 
                                            placeholder="Locked IP Address"
                                            value={formData.locked_ip}
                                            onChange={e => setFormData({...formData, locked_ip: e.target.value})}
                                            className="bg-[#12121a] border-gray-700 text-white"
                                        />
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="edit-lock-hwid" 
                                            checked={formData.lock_to_hwid} 
                                            onCheckedChange={(c) => setFormData({...formData, lock_to_hwid: c})}
                                        />
                                        <Label htmlFor="edit-lock-hwid">Lock to HWID</Label>
                                    </div>
                                    {formData.lock_to_hwid && (
                                        <Input 
                                            placeholder="Locked HWID"
                                            value={formData.locked_hwid}
                                            onChange={e => setFormData({...formData, locked_hwid: e.target.value})}
                                            className="bg-[#12121a] border-gray-700 text-white"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AssignKeyDialog 
                open={assignDialogOpen} 
                onOpenChange={setAssignDialogOpen}
                keyId={keyData.id}
                onSuccess={() => {
                    onSuccess();
                    onOpenChange(false); // Close edit dialog too if reassigned
                }}
            />
        </>
    );
};

export default EditKeyDialog;