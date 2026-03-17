import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from 'lucide-react';
import { fetchGroupedPermissions, fetchRolePermissionIds, updateRolePermissions, PERMISSION_CATEGORIES } from '@/lib/permission-helpers';

const RoleEditDialog = ({ open, onOpenChange, role = null, onSuccess }) => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Data state
    const [groupedPermissions, setGroupedPermissions] = useState({});
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        selectedPermissions: [] // Array of permission IDs
    });

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, role]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all available permissions categorized
            const { grouped } = await fetchGroupedPermissions();
            setGroupedPermissions(grouped);

            // 2. Setup form based on role (Edit vs Create)
            if (role) {
                const currentPermIds = await fetchRolePermissionIds(role.id);
                setFormData({
                    name: role.name,
                    description: role.description || '',
                    selectedPermissions: currentPermIds
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    selectedPermissions: []
                });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load role data." });
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionToggle = (permissionId, checked) => {
        setFormData(prev => {
            const current = new Set(prev.selectedPermissions);
            if (checked) {
                current.add(permissionId);
            } else {
                current.delete(permissionId);
            }
            return { ...prev, selectedPermissions: Array.from(current) };
        });
    };

    const handleCategoryToggle = (categoryName, checked) => {
        const categoryPerms = groupedPermissions[categoryName] || [];
        const categoryPermIds = categoryPerms.map(p => p.id);
        
        setFormData(prev => {
            const current = new Set(prev.selectedPermissions);
            if (checked) {
                categoryPermIds.forEach(id => current.add(id));
            } else {
                categoryPermIds.forEach(id => current.delete(id));
            }
            return { ...prev, selectedPermissions: Array.from(current) };
        });
    };

    const isCategoryFullyChecked = (categoryName) => {
        const categoryPerms = groupedPermissions[categoryName] || [];
        if (categoryPerms.length === 0) return false;
        return categoryPerms.every(p => formData.selectedPermissions.includes(p.id));
    };

    const isCategoryPartiallyChecked = (categoryName) => {
        const categoryPerms = groupedPermissions[categoryName] || [];
        if (categoryPerms.length === 0) return false;
        const checkedCount = categoryPerms.filter(p => formData.selectedPermissions.includes(p.id)).length;
        return checkedCount > 0 && checkedCount < categoryPerms.length;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let roleId = role?.id;

            // 1. Upsert Role Info
            if (role) {
                const { error } = await supabase
                    .from('rbac_roles')
                    .update({ name: formData.name, description: formData.description })
                    .eq('id', roleId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('rbac_roles')
                    .insert([{ name: formData.name, description: formData.description }])
                    .select()
                    .single();
                if (error) throw error;
                roleId = data.id;
            }

            // 2. Update Permissions using helper
            await updateRolePermissions(roleId, formData.selectedPermissions);

            toast({ title: "Success", description: `Role ${role ? 'updated' : 'created'} successfully` });
            onOpenChange(false);
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Error saving role:', error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1a1a24] text-white border-gray-800 sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {role ? <><Shield className="w-5 h-5 text-cyan-500" /> Edit Role: {role.name}</> : 'Create New Role'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Define role details and granular access controls.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                        <ScrollArea className="flex-1 px-6">
                            <div className="space-y-6 py-4">
                                {/* Role Details Section */}
                                <div className="grid gap-4 p-4 rounded-lg border border-gray-800 bg-[#12121a]">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-gray-200">Role Name</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="bg-[#1a1a24] border-gray-700 text-white focus:border-cyan-500"
                                                placeholder="e.g. Moderator"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description" className="text-gray-200">Description</Label>
                                            <Input
                                                 id="description"
                                                 value={formData.description}
                                                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                 className="bg-[#1a1a24] border-gray-700 text-white focus:border-cyan-500"
                                                 placeholder="Short description"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Permissions Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-lg font-semibold text-white">Permissions</Label>
                                        <Badge variant="outline" className="bg-cyan-950/30 text-cyan-400 border-cyan-900">
                                            {formData.selectedPermissions.length} selected
                                        </Badge>
                                    </div>

                                    <div className="space-y-6">
                                        {Object.entries(groupedPermissions).map(([category, perms]) => {
                                            if (perms.length === 0) return null;
                                            const isAllChecked = isCategoryFullyChecked(category);
                                            const isIndeterminate = isCategoryPartiallyChecked(category);
                                            
                                            return (
                                                <div key={category} className="space-y-3">
                                                    <div className="flex items-center space-x-2 bg-[#252533] p-2 rounded-md border border-gray-800">
                                                        <Checkbox
                                                            id={`cat-${category}`}
                                                            checked={isAllChecked || (isIndeterminate ? "indeterminate" : false)}
                                                            onCheckedChange={(checked) => handleCategoryToggle(category, checked)}
                                                            className="data-[state=checked]:bg-cyan-600 data-[state=indeterminate]:bg-cyan-600 border-gray-500"
                                                        />
                                                        <Label htmlFor={`cat-${category}`} className="font-semibold text-cyan-100 cursor-pointer select-none flex-1">
                                                            {category}
                                                        </Label>
                                                        <Badge variant="secondary" className="text-[10px] bg-black/40 text-gray-400">
                                                            {perms.length}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4 border-l-2 border-gray-800 ml-2">
                                                        {perms.map(perm => (
                                                            <div key={perm.id} className="flex items-start space-x-2 p-2 rounded hover:bg-[#252533]/50 transition-colors">
                                                                <Checkbox
                                                                    id={`perm-${perm.id}`}
                                                                    checked={formData.selectedPermissions.includes(perm.id)}
                                                                    onCheckedChange={(checked) => handlePermissionToggle(perm.id, checked)}
                                                                    className="mt-0.5 border-gray-600 data-[state=checked]:bg-cyan-600"
                                                                />
                                                                <div className="grid gap-0.5 leading-none">
                                                                    <label
                                                                        htmlFor={`perm-${perm.id}`}
                                                                        className="text-sm font-medium leading-none text-gray-300 cursor-pointer select-none"
                                                                    >
                                                                        {perm.code}
                                                                    </label>
                                                                    <p className="text-[11px] text-gray-500 line-clamp-1" title={perm.description}>
                                                                        {perm.description || "No description"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="p-6 pt-2 border-t border-gray-800 bg-[#1a1a24]">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[140px]">
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {role ? 'Save Changes' : 'Create Role'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default RoleEditDialog;