import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, User } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const AssignKeyDialog = ({ open, onOpenChange, keyId, keyIds = [], onSuccess }) => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searching, setSearching] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setUsers([]);
            return;
        }

        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username')
                .or(`username.ilike.%${term}%`)
                .limit(5);
            
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedUser) return;
        setAssigning(true);
        try {
            // Check if single or bulk
            if (keyId) {
                const { data, error } = await supabase.rpc('assign_license_key_to_user', {
                    p_key_id: keyId,
                    p_user_id: selectedUser.id
                });
                if (error) throw error;
                if (!data.success) throw new Error(data.message);
                toast({ title: "Success", description: "Key assigned successfully." });
            } else if (keyIds.length > 0) {
                 // Loop for bulk - simplified for now, ideally strictly SQL bulk func
                 for (const id of keyIds) {
                     await supabase.rpc('assign_license_key_to_user', { p_key_id: id, p_user_id: selectedUser.id });
                 }
                 toast({ title: "Success", description: `${keyIds.length} keys assigned to ${selectedUser.username}.` });
            }

            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1a1a24] border-gray-800 text-white sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Assign License Key</DialogTitle>
                    <DialogDescription>
                        Search for a user to assign this license to.
                        {keyIds.length > 0 && <span className="block mt-1 text-yellow-500 text-xs">Bulk assigning {keyIds.length} keys.</span>}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Search User</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Username..." 
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-8 bg-[#12121a] border-gray-700 text-white"
                            />
                        </div>
                    </div>

                    <ScrollArea className="h-[150px] border border-gray-800 rounded bg-[#12121a] p-2">
                        {searching ? (
                            <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin"/></div>
                        ) : users.length === 0 && searchTerm.length > 1 ? (
                            <div className="text-center text-xs text-gray-500 p-2">No users found</div>
                        ) : (
                            <div className="space-y-1">
                                {users.map(u => (
                                    <div 
                                        key={u.id}
                                        onClick={() => setSelectedUser(u)}
                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${selectedUser?.id === u.id ? 'bg-cyan-900/50 text-cyan-400' : 'hover:bg-[#252533]'}`}
                                    >
                                        <User className="w-3 h-3"/>
                                        {u.username}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    
                    {selectedUser && (
                         <div className="text-sm text-center bg-cyan-950/30 p-2 rounded border border-cyan-900/50">
                             Selected: <span className="font-bold text-cyan-400">{selectedUser.username}</span>
                         </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={!selectedUser || assigning} className="bg-cyan-600 hover:bg-cyan-700">
                        {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AssignKeyDialog;