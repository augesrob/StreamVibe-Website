import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const BulkAddTimeDialog = ({ open, onOpenChange, keyIds, onSuccess }) => {
    const { toast } = useToast();
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('bulk_extend_license_keys', {
                p_key_ids: keyIds,
                p_days: parseInt(days)
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
                    <DialogTitle>Add Time to Selected Keys</DialogTitle>
                    <DialogDescription>
                        This will extend the expiration date for {keyIds.length} selected keys.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Label>Days to Add</Label>
                    <Input 
                        type="number" 
                        value={days} 
                        onChange={(e) => setDays(e.target.value)}
                        className="bg-[#12121a] border-gray-700 text-white mt-1"
                    />
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Time
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BulkAddTimeDialog;