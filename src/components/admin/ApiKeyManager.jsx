import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Copy, Trash2, Shield, RefreshCw } from 'lucide-react';

const ApiKeyManager = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newKeyDialog, setNewKeyDialog] = useState(false);
    const [createdKey, setCreatedKey] = useState(null);
    const [permissionLevel, setPermissionLevel] = useState('read');

    const fetchKeys = async () => {
        setLoading(true);
        // Assuming we are fetching ALL keys if admin, or just own keys.
        // Task 3 says "Restore API Keys Management tab... Display user's API keys".
        // Usually admin panel shows ALL keys or manages the admin's own keys. 
        // Given it's "Admin Panel", let's show all for now, or just the current user's if it's for personal API access.
        // The prompt says "Display user's API keys", implying the currently logged in admin's keys for using the API.
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', user.id) // Show only own keys for safety/relevance unless specifically "Manage ALL Users' Keys"
            .order('created_at', { ascending: false });

        if (error) toast({ variant: "destructive", title: "Error", description: error.message });
        else setKeys(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchKeys();
    }, [user]);

    const handleCreateKey = async () => {
        // Generate a random key
        const randomKey = `sk_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { data, error } = await supabase.from('api_keys').insert({
            user_id: user.id,
            key_code: randomKey, // In a real app, you might hash this and only show it once. Here we store as is for simplicity or assume backend hashing if RPC.
            key_type: permissionLevel, // Storing permission here
            is_active: true,
            created_at: new Date()
        }).select().single();

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            setCreatedKey(data); // Show full key
            setNewKeyDialog(false); // Close creation dialog (we'll show the result in a separate overlay or modal)
            fetchKeys();
        }
    };

    const handleRevoke = async (id) => {
        const { error } = await supabase.from('api_keys').update({
            is_active: false,
            revoked_at: new Date()
        }).eq('id', id);

        if (error) toast({ variant: "destructive", title: "Error", description: error.message });
        else {
            toast({ title: "Revoked", description: "API Key has been revoked." });
            fetchKeys();
        }
    };

    const handleDelete = async (id) => {
         const { error } = await supabase.from('api_keys').delete().eq('id', id);
         if (error) toast({ variant: "destructive", title: "Error", description: error.message });
         else {
             toast({ title: "Deleted", description: "API Key deleted." });
             fetchKeys();
         }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Key copied to clipboard" });
    };

    return (
        <div className="space-y-6">
            <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>API Keys</CardTitle>
                        <CardDescription>Manage your API access keys. Keep these secret!</CardDescription>
                    </div>
                    <Button onClick={() => setNewKeyDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
                        <Plus className="w-4 h-4 mr-2" /> Create New Key
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : (
                        <div className="rounded-md border border-gray-800">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Key Code (Masked)</TableHead>
                                        <TableHead>Permissions</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Used</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {keys.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">No API Keys found.</TableCell></TableRow>
                                    ) : (
                                        keys.map(key => (
                                            <TableRow key={key.id}>
                                                <TableCell className="font-mono text-gray-400">
                                                    {key.key_code.substring(0, 8)}...****************
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{key.key_type || 'read'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={key.is_active ? "default" : "secondary"} className={key.is_active ? "bg-green-600" : "bg-red-900 text-red-200"}>
                                                        {key.is_active ? "Active" : "Revoked"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-400">
                                                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-400">
                                                    {new Date(key.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {key.is_active && (
                                                            <Button size="sm" variant="outline" onClick={() => handleRevoke(key.id)} className="h-8 border-yellow-800 text-yellow-500 hover:bg-yellow-900/20">
                                                                Revoke
                                                            </Button>
                                                        )}
                                                        <Button size="icon" variant="ghost" onClick={() => handleDelete(key.id)} className="h-8 w-8 text-red-500 hover:bg-red-900/20">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>Select permissions for this key.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Permission Scope</Label>
                            <Select value={permissionLevel} onValueChange={setPermissionLevel}>
                                <SelectTrigger className="bg-[#12121a] border-gray-700"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-gray-800 text-white">
                                    <SelectItem value="read">Read Only</SelectItem>
                                    <SelectItem value="write">Read & Write</SelectItem>
                                    <SelectItem value="admin">Full Admin Access</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewKeyDialog(false)} className="text-black">Cancel</Button>
                        <Button onClick={handleCreateKey} className="bg-cyan-600 hover:bg-cyan-700">Generate Key</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success/Show Key Dialog */}
            <Dialog open={!!createdKey} onOpenChange={(open) => !open && setCreatedKey(null)}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-green-500 flex items-center gap-2"><Shield className="w-5 h-5"/> Key Generated Successfully</DialogTitle>
                        <DialogDescription className="text-gray-300">
                            Please copy this key now. You will <strong className="text-white">NOT</strong> be able to see it again!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-black/50 rounded border border-green-900/50 flex items-center justify-between gap-2 my-2">
                        <code className="font-mono text-green-400 break-all">{createdKey?.key_code}</code>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdKey?.key_code)}>
                            <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setCreatedKey(null)}>I have copied it</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ApiKeyManager;