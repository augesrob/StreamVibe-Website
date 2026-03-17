
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Edit, Trash2, Shield, User, Copy, RefreshCw, MoreHorizontal, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import EditKeyDialog from './EditKeyDialog';
import BulkAddTimeDialog from './BulkAddTimeDialog';
import AssignKeyDialog from './AssignKeyDialog';
import BulkStatusDialog from './BulkStatusDialog';
import RecentlyGeneratedKeys from './RecentlyGeneratedKeys';

const LicenseKeysManager = () => {
    const { toast } = useToast();
    const [keys, setKeys] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');
    const [lockFilter, setLockFilter] = useState('all');
    
    // Selection
    const [selectedKeys, setSelectedKeys] = useState([]);

    // Dialogs
    const [editDialog, setEditDialog] = useState({ open: false, key: null });
    const [addTimeDialog, setAddTimeDialog] = useState(false);
    const [assignDialog, setAssignDialog] = useState(false);
    const [statusDialog, setStatusDialog] = useState(false);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmData, setDeleteConfirmData] = useState({ type: null, id: null, count: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Corrected table name from 'billing_plans' to 'plans'
            const [plansRes, keysRes] = await Promise.all([
                supabase.from('plans').select('id, name'),
                supabase.from('license_keys').select('*, plans(name), profiles(username, locked_ip, locked_hwid)').order('created_at', { ascending: false })
            ]);

            if (plansRes.error) throw plansRes.error;
            if (keysRes.error) throw keysRes.error;

            setPlans(plansRes.data || []);
            setKeys(keysRes.data || []);
            setSelectedKeys([]);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredKeys = keys.filter(k => {
        const matchesSearch = k.key_code.toLowerCase().includes(search.toLowerCase()) || 
                              (k.profiles?.username || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
        const matchesPlan = planFilter === 'all' || k.plan_id === planFilter;
        
        let matchesLock = true;
        const hasIpLock = k.metadata?.lock_to_ip || false;
        const hasHwidLock = k.metadata?.lock_to_hwid || false;
        if (lockFilter === 'ip') matchesLock = hasIpLock;
        if (lockFilter === 'hwid') matchesLock = hasHwidLock;
        if (lockFilter === 'none') matchesLock = !hasIpLock && !hasHwidLock;

        return matchesSearch && matchesStatus && matchesPlan && matchesLock;
    });

    // Selection Logic
    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedKeys(filteredKeys.map(k => k.id));
        } else {
            setSelectedKeys([]);
        }
    };

    const toggleSelectKey = (id, checked) => {
        if (checked) {
            setSelectedKeys(prev => [...prev, id]);
        } else {
            setSelectedKeys(prev => prev.filter(k => k !== id));
        }
    };

    // Actions
    const handleDeleteSelected = () => {
        setDeleteConfirmData({ type: 'bulk', count: selectedKeys.length });
        setDeleteConfirmOpen(true);
    };
    
    const handleSingleDelete = (id) => {
        setDeleteConfirmData({ type: 'single', id: id });
        setDeleteConfirmOpen(true);
    };

    const executeDelete = async () => {
        setDeleteConfirmOpen(false);
        try {
            if (deleteConfirmData.type === 'bulk') {
                const { error } = await supabase.from('license_keys').delete().in('id', selectedKeys);
                if (error) throw error;
                toast({ title: "Deleted", description: "Keys deleted successfully." });
            } else if (deleteConfirmData.type === 'single') {
                const { error } = await supabase.from('license_keys').delete().eq('id', deleteConfirmData.id);
                if (error) throw error;
                toast({ title: "Deleted", description: "Key deleted." });
            }
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Key copied to clipboard." });
    };

    return (
        <div className="space-y-6">
            <RecentlyGeneratedKeys />

            <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader>
                    <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                        <div>
                            <CardTitle>License Keys Management</CardTitle>
                            <CardDescription>View, edit, and manage all system license keys.</CardDescription>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {selectedKeys.length > 0 && (
                                <div className="flex gap-1 animate-in fade-in slide-in-from-right-4">
                                    <Button size="sm" variant="outline" onClick={() => setStatusDialog(true)}>Set Status</Button>
                                    <Button size="sm" variant="outline" onClick={() => setAddTimeDialog(true)}>Add Time</Button>
                                    <Button size="sm" variant="outline" onClick={() => setAssignDialog(true)}>Assign</Button>
                                    <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>Delete ({selectedKeys.length})</Button>
                                </div>
                            )}
                            <Button size="icon" variant="ghost" onClick={fetchData}><RefreshCw className="w-4 h-4"/></Button>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 flex-col md:flex-row mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input 
                                placeholder="Search keys or users..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 bg-[#12121a] border-gray-700"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px] bg-[#12121a] border-gray-700"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent className="bg-[#1a1a24] border-gray-700 text-white">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="redeemed">Redeemed</SelectItem>
                                <SelectItem value="frozen">Frozen</SelectItem>
                                <SelectItem value="revoked">Revoked</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={planFilter} onValueChange={setPlanFilter}>
                            <SelectTrigger className="w-[150px] bg-[#12121a] border-gray-700"><SelectValue placeholder="Plan" /></SelectTrigger>
                            <SelectContent className="bg-[#1a1a24] border-gray-700 text-white">
                                <SelectItem value="all">All Plans</SelectItem>
                                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={lockFilter} onValueChange={setLockFilter}>
                            <SelectTrigger className="w-[150px] bg-[#12121a] border-gray-700"><SelectValue placeholder="Lock Type" /></SelectTrigger>
                            <SelectContent className="bg-[#1a1a24] border-gray-700 text-white">
                                <SelectItem value="all">All Locks</SelectItem>
                                <SelectItem value="ip">IP Locked</SelectItem>
                                <SelectItem value="hwid">HWID Locked</SelectItem>
                                <SelectItem value="none">No Locks</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="rounded-md border border-gray-800">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#12121a] hover:bg-[#12121a] border-gray-800">
                                    <TableHead className="w-[40px]">
                                        <Checkbox 
                                            checked={filteredKeys.length > 0 && selectedKeys.length === filteredKeys.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Key Code</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Locks</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center h-24"><Loader2 className="animate-spin mx-auto w-6 h-6"/></TableCell></TableRow>
                                ) : filteredKeys.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center h-24 text-gray-500">No keys found.</TableCell></TableRow>
                                ) : (
                                    filteredKeys.map(key => {
                                        const lockIp = key.metadata?.lock_to_ip;
                                        const lockHwid = key.metadata?.lock_to_hwid;
                                        
                                        return (
                                            <TableRow key={key.id} className="border-gray-800 hover:bg-[#252533]">
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selectedKeys.includes(key.id)}
                                                        onCheckedChange={(c) => toggleSelectKey(key.id, c)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-cyan-400 truncate max-w-[120px]">{key.key_code}</span>
                                                        <Copy className="w-3 h-3 cursor-pointer text-gray-500 hover:text-white" onClick={() => copyToClipboard(key.key_code)} />
                                                    </div>
                                                </TableCell>
                                                <TableCell>{key.plans?.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`
                                                        ${key.status === 'active' ? 'border-green-500 text-green-400' : ''}
                                                        ${key.status === 'redeemed' ? 'border-blue-500 text-blue-400' : ''}
                                                        ${key.status === 'revoked' ? 'border-red-500 text-red-400' : ''}
                                                        ${key.status === 'frozen' ? 'border-yellow-500 text-yellow-400' : ''}
                                                    `}>
                                                        {key.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {key.profiles ? (
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <User className="w-3 h-3 text-gray-400"/>
                                                            {key.profiles.username}
                                                        </div>
                                                    ) : <span className="text-gray-600 text-xs italic">Unassigned</span>}
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-400">
                                                    {key.expires_at ? format(new Date(key.expires_at), 'MMM dd, yyyy') : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {lockIp && <Lock className="w-3 h-3 text-blue-400" title="IP Locked"/>}
                                                        {lockHwid && <Shield className="w-3 h-3 text-purple-400" title="HWID Locked"/>}
                                                        {!lockIp && !lockHwid && <span className="text-gray-600">-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4"/></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="bg-[#1a1a24] border-gray-800 text-white" align="end">
                                                            <DropdownMenuItem onClick={() => setEditDialog({ open: true, key })}>
                                                                <Edit className="w-4 h-4 mr-2"/> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleSingleDelete(key.id)} className="text-red-400 focus:text-red-400">
                                                                <Trash2 className="w-4 h-4 mr-2"/> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <EditKeyDialog 
                open={editDialog.open}
                onOpenChange={(o) => setEditDialog(prev => ({ ...prev, open: o }))}
                keyData={editDialog.key}
                billingPlans={plans}
                onSuccess={fetchData}
            />

            <BulkAddTimeDialog 
                open={addTimeDialog}
                onOpenChange={setAddTimeDialog}
                keyIds={selectedKeys}
                onSuccess={fetchData}
            />

            <AssignKeyDialog
                open={assignDialog}
                onOpenChange={setAssignDialog}
                keyIds={selectedKeys}
                onSuccess={fetchData}
            />

            <BulkStatusDialog 
                open={statusDialog}
                onOpenChange={setStatusDialog}
                keyIds={selectedKeys}
                onSuccess={fetchData}
            />

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {deleteConfirmData.type === 'bulk' 
                                ? `Are you sure you want to delete ${deleteConfirmData.count} selected keys? This action cannot be undone.`
                                : "Are you sure you want to delete this key? This action cannot be undone."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={executeDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LicenseKeysManager;
