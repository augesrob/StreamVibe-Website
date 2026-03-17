import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Search, RefreshCw, Edit, Ban, Globe, Trash2 } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [actionDialog, setActionDialog] = useState({ open: false, type: null, user: null });
    const [editUserDialog, setEditUserDialog] = useState({ open: false, user: null });
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: uData, error: uError } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false });
            if (uError) throw uError;
            const { data: rData } = await supabase.from('rbac_roles').select('name').order('name');
            setUsers(uData || []);
            setRoles(rData || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleRoleChange = async (userId, newRole) => {
       const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
       if(error) toast({ variant: "destructive", title: "Update Failed", description: error.message });
       else {
          toast({ title: "Role Updated", description: `User role changed to ${newRole}` });
          setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
       }
    };

    const openActionDialog = (type, user) => setActionDialog({ open: true, type, user });

    const executeAction = async () => {
        if (!actionDialog.user || !actionDialog.type) return;
        setActionLoading(true);
        try {
            let result;
            if (actionDialog.type === 'delete') {
                const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: actionDialog.user.id });
                if (error) throw error;
                result = data;
            } else if (actionDialog.type === 'ban') {
                const { data, error } = await supabase.rpc('admin_ban_user', { target_user_id: actionDialog.user.id, reason: 'Admin manual ban' });
                if (error) throw error;
                result = data;
            } else if (actionDialog.type === 'ban_ip') {
                if (!actionDialog.user.current_ip) throw new Error("User has no recorded IP address");
                const { data, error } = await supabase.rpc('admin_ban_ip', { target_ip: actionDialog.user.current_ip, reason: `Banned from user ${actionDialog.user.username}` });
                if (error) throw error;
                result = data;
            }
            if (result && result.success) {
                toast({ title: "Success", description: result.message });
                if (actionDialog.type === 'delete') setUsers(users.filter(u => u.id !== actionDialog.user.id));
                if (actionDialog.type === 'ban') fetchData();
            } else {
                toast({ variant: "destructive", title: "Action Failed", description: result?.message || "Unknown error" });
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setActionLoading(false);
            setActionDialog({ open: false, type: null, user: null });
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updates = {
            username: formData.get('username'),
            bio: formData.get('bio'),
            plan_tier: formData.get('plan_tier'),
            role: formData.get('role')
        };
        
        const { error } = await supabase.from('profiles').update(updates).eq('id', editUserDialog.user.id);
        if(error) toast({ variant: "destructive", title: "Error", description: error.message });
        else {
            toast({ title: "Success", description: "User profile updated" });
            setEditUserDialog({ open: false, user: null });
            fetchData();
        }
    };

    const filteredUsers = users.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.id?.includes(searchTerm) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle>User Management</CardTitle><CardDescription>View all users, assign roles, and manage access.</CardDescription></div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-500"/>
                            <Input placeholder="Search users..." className="pl-8 bg-[#12121a] border-gray-700 w-[200px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent>
                {loading ? <div className="py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-500"/></div> : (
                    <div className="rounded-md border border-gray-800">
                    <Table>
                    <TableHeader><TableRow><TableHead>User Profile</TableHead><TableHead>ID</TableHead><TableHead>Role</TableHead><TableHead>IP Address</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredUsers.map(u => {
                            const isBanned = u.permissions?.banned === 'true' || u.permissions?.banned === true;
                            return (
                                <TableRow key={u.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
                                                {u.avatar_url ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">{u.username?.[0]?.toUpperCase() || '?'}</span>}
                                            </div>
                                            <div className="flex flex-col"><span className="font-medium text-sm text-white flex items-center gap-2">{u.username || 'No Username'}{isBanned && <Badge variant="destructive" className="text-[10px] h-4 px-1">BANNED</Badge>}</span><span className="text-xs text-gray-500">{u.email}</span></div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-gray-500">{u.id.slice(0, 8)}...</TableCell>
                                    <TableCell>
                                        <Select value={u.role || 'user'} onValueChange={(val) => handleRoleChange(u.id, val)}>
                                            <SelectTrigger className="w-[120px] h-8 bg-[#12121a] border-gray-700 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#1a1a24] text-white border-gray-800">{roles.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}{!roles.find(r => r.name === u.role) && u.role && <SelectItem value={u.role}>{u.role}</SelectItem>}{!roles.find(r => r.name === 'user') && <SelectItem value="user">user</SelectItem>}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-gray-500">{u.current_ip || 'N/A'}</TableCell>
                                    <TableCell><Badge variant={u.locked_hwid ? "destructive" : "outline"} className="text-[10px]">{u.locked_hwid ? "HWID LOCK" : "OK"}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" onClick={() => setEditUserDialog({ open: true, user: u })} title="Edit User"><Edit className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-400 hover:text-orange-300 hover:bg-orange-400/10" onClick={() => openActionDialog('ban', u)} title="Ban User"><Ban className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" onClick={() => openActionDialog('ban_ip', u)} disabled={!u.current_ip} title="Ban IP Address"><Globe className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => openActionDialog('delete', u)} title="Delete User"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    </Table>
                    </div>
                )}
                </CardContent>
            </Card>

            <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog(prev => ({ ...prev, open: false }))}>
                <AlertDialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                             {actionDialog.type === 'delete' && "Delete User Account"}
                             {actionDialog.type === 'ban' && "Ban User Account"}
                             {actionDialog.type === 'ban_ip' && "Ban IP Address"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">Confirm action for <span className="text-white font-semibold">{actionDialog.user?.username}</span></AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel disabled={actionLoading} className="text-black">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeAction} disabled={actionLoading} className="bg-red-600 hover:bg-red-700 text-white">Confirm</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={editUserDialog.open} onOpenChange={(open) => !open && setEditUserDialog(prev => ({ ...prev, open: false }))}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <DialogHeader><DialogTitle>Edit User Profile</DialogTitle></DialogHeader>
                    {editUserDialog.user && (
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="space-y-2"><Label>Username</Label><Input name="username" defaultValue={editUserDialog.user.username} className="bg-[#12121a] border-gray-700 text-white"/></div>
                            <div className="space-y-2"><Label>Bio</Label><Textarea name="bio" defaultValue={editUserDialog.user.bio} className="bg-[#12121a] border-gray-700 text-white"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Plan Tier</Label><Input name="plan_tier" defaultValue={editUserDialog.user.plan_tier} className="bg-[#12121a] border-gray-700 text-white"/></div>
                                <div className="space-y-2"><Label>Role</Label>
                                    <Select name="role" defaultValue={editUserDialog.user.role}>
                                        <SelectTrigger className="bg-[#12121a] border-gray-700"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#1a1a24] text-white border-gray-800">{roles.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter><Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Save Changes</Button></DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserManagement;