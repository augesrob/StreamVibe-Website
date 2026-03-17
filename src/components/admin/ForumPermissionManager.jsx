import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchGroupedPermissions, fetchRolePermissionIds, updateRolePermissions } from '@/lib/permission-helpers';

const ForumPermissionManager = ({ role, onUpdate }) => {
    const { toast } = useToast();
    const [groupedPermissions, setGroupedPermissions] = useState({});
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (role) loadData();
    }, [role]);

    const loadData = async () => {
        setLoading(true);
        try {
            const { grouped } = await fetchGroupedPermissions();
            setGroupedPermissions(grouped);

            const rolePermIds = await fetchRolePermissionIds(role.id);
            setSelectedPermissions(rolePermIds);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load permissions" });
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (permissionId, checked) => {
        if (checked) {
            setSelectedPermissions(prev => [...prev, permissionId]);
        } else {
            setSelectedPermissions(prev => prev.filter(id => id !== permissionId));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateRolePermissions(role.id, selectedPermissions);
            toast({ title: "Saved", description: "Permissions updated successfully" });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center items-center"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;
    if (!role) return <div className="p-8 text-center text-gray-500">Select a role to manage permissions.</div>;


    return (
        <div className="flex flex-col h-full space-y-4">
             <div className="bg-blue-950/20 border border-blue-900/30 rounded p-3 mb-2 flex gap-3 items-start">
                 <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0"/>
                 <p className="text-sm text-blue-200/80">
                     Permissions control what users in this role can access. Changes take effect immediately.
                 </p>
             </div>

            <ScrollArea className="h-[400px] pr-4 border rounded-md border-gray-800 p-2 bg-[#12121a]">
                <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([category, perms]) => {
                        if (perms.length === 0) return null;
                        
                        return (
                            <div key={category} className="space-y-3">
                                <h3 className="font-semibold text-cyan-400 border-b border-gray-800 pb-2 flex items-center justify-between">
                                    {category}
                                    <span className="text-xs text-gray-500 font-normal">{perms.length} permissions</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                                    {perms.map(perm => (
                                        <div key={perm.id} className="flex items-start space-x-2 p-1.5 hover:bg-[#252533] rounded transition-colors">
                                            <Checkbox 
                                                id={`fp-${perm.id}`} 
                                                checked={selectedPermissions.includes(perm.id)}
                                                onCheckedChange={(checked) => togglePermission(perm.id, checked)}
                                                className="mt-0.5 border-gray-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                                            />
                                            <div className="grid gap-0.5">
                                                <Label htmlFor={`fp-${perm.id}`} className="text-gray-300 cursor-pointer font-medium leading-none">
                                                    {perm.code}
                                                </Label>
                                                <p className="text-xs text-gray-500 leading-tight">
                                                    {perm.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
            
            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 w-full md:w-auto">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Permissions
                </Button>
            </div>
        </div>
    );
};

export default ForumPermissionManager;