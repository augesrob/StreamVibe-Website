import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const BulkStatusDialog = ({ open, onOpenChange, keyIds, onSuccess }) => {
    const { toast } = useToast();
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('bulk_update_license_keys', {
                p_key_ids: keyIds,
                p_status: status
            });

            if (error) throw error;
            if (data.success) {
                toast({ title: "Success", description: data.message });
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1a1a24] border-gray-800 text-white sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Update Status for Selected Keys</DialogTitle>
                    <DialogDescription>
                        Changing status for {keyIds.length} keys.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Label>New Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="bg-[#12121a] border-gray-700 text-white mt-1">
                            <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a24] border-gray-700 text-white">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="redeemed">Redeemed</SelectItem>
                            <SelectItem value="frozen">Frozen</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BulkStatusDialog;