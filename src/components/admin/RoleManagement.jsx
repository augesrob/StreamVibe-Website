import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Shield, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import RoleEditDialog from './RoleEditDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ForumPermissionManager from './ForumPermissionManager'; // This component will be used as the general permission manager
import PermissionsPage from './PermissionsPage'; // Assuming this component exists to list all permissions

const RoleManagement = () => {
    const { toast } = useToast();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editDialog, setEditDialog] = useState({ open: false, role: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState(null);
    const [activeTab, setActiveTab] = useState('roles');

    // Hardcoded system roles for safety, in a real app, this would likely be a database flag
    const SYSTEM_ROLES = ['admin', 'moderator', 'user']; // Lowercased for comparison

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('rbac_roles')
                .select('*, rbac_role_permissions(permission_id)')
                .order('name', { ascending: true });

            if (error) throw error;

            const processedRoles = data.map(role => ({
                ...role,
                permissionsCount: role.rbac_role_permissions ? role.rbac_role_permissions.length : 0
            }));

            // Custom sort to put 'admin' first, then 'moderator', then 'user', then alphabetical
            processedRoles.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();

                if (nameA === 'admin') return -1;
                if (nameB === 'admin') return 1;
                if (nameA === 'moderator' && nameB !== 'admin') return -1;
                if (nameB === 'moderator' && nameA !== 'admin') return 1;
                if (nameA === 'user' && nameB !== 'admin' && nameB !== 'moderator') return -1;
                if (nameB === 'user' && nameA !== 'admin' && nameA !== 'moderator') return 1;
                
                return nameA.localeCompare(nameB);
            });


            setRoles(processedRoles);

            // If a role was selected before refresh, try to re-select it
            if (selectedRoleForPerms) {
                const reSelected = processedRoles.find(r => r.id === selectedRoleForPerms.id);
                setSelectedRoleForPerms(reSelected || null);
            } else if (processedRoles.length > 0) {
                 // Automatically select the first role if none is selected
                 setSelectedRoleForPerms(processedRoles[0]);
            }

        } catch (error) {
            console.error('Error fetching roles:', error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRole = async () => {
        if (!deleteDialog.role) return;
        
        if (SYSTEM_ROLES.includes(deleteDialog.role.name.toLowerCase())) {
             toast({ variant: "destructive", title: "Cannot Delete", description: "This system role cannot be deleted." });
             setDeleteDialog({ open: false, role: null });
             return;
        }

        try {
            // First delete associated role_permissions to avoid foreign key constraints
            const { error: deletePermissionsError } = await supabase.from('rbac_role_permissions').delete().eq('role_id', deleteDialog.role.id);
            if (deletePermissionsError) throw deletePermissionsError;

            // Then delete the role itself
            const { error: deleteRoleError } = await supabase.from('rbac_roles').delete().eq('id', deleteDialog.role.id);
            if (deleteRoleError) throw deleteRoleError;

            toast({ title: "Success", description: "Role deleted successfully" });
            
            // If we deleted the selected role, clear selection
            if (selectedRoleForPerms?.id === deleteDialog.role.id) {
                setSelectedRoleForPerms(null);
            }
            
            fetchRoles();
            setDeleteDialog({ open: false, role: null });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleRoleSelect = (role) => {
        setSelectedRoleForPerms(role);
    };

    const handleEditClick = (e, role) => {
        e.stopPropagation();
        setEditDialog({ open: true, role });
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[#1a1a24] border border-gray-800">
                    <TabsTrigger value="roles" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400">Roles & Permissions</TabsTrigger>
                    <TabsTrigger value="permissions_list" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400">All Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="roles" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Roles List */}
                        <Card className="bg-[#1a1a24] border-gray-800 lg:col-span-1 h-fit">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xl">System Roles</CardTitle>
                                <Button size="sm" onClick={() => setEditDialog({ open: true, role: null })} className="bg-cyan-600 hover:bg-cyan-700 h-8 w-8 p-0">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? <div className="p-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></div> : (
                                    <div className="divide-y divide-gray-800">
                                        {roles.map((role) => {
                                            const isSystem = SYSTEM_ROLES.includes(role.name.toLowerCase());
                                            const isSelected = selectedRoleForPerms?.id === role.id;
                                            return (
                                                <div 
                                                    key={role.id} 
                                                    className={`p-4 flex items-center justify-between cursor-pointer hover:bg-[#252533] transition-colors ${isSelected ? 'bg-[#252533] border-l-2 border-cyan-500' : ''}`}
                                                    onClick={() => handleRoleSelect(role)}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-medium capitalize ${isSelected ? 'text-cyan-400' : 'text-white'}`}>{role.name.replace('_', ' ')}</span>
                                                            {isSystem && <Shield className="w-3 h-3 text-cyan-500" />}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">{role.permissionsCount} permissions</div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-blue-400" onClick={(e) => handleEditClick(e, role)}>
                                                            <Edit className="w-3 h-3" />
                                                        </Button>
                                                        {!isSystem && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, role }); }}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Permissions Editor */}
                        <Card className="bg-[#1a1a24] border-gray-800 lg:col-span-2 min-h-[600px]">
                            <CardHeader>
                                <CardTitle>Role Configuration</CardTitle>
                                <CardDescription>
                                    {selectedRoleForPerms ? `Managing permissions for ${selectedRoleForPerms.name}` : "Select a role from the left to configure its permissions."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {selectedRoleForPerms ? (
                                    <ForumPermissionManager role={selectedRoleForPerms} onUpdate={fetchRoles} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                                        <Users className="w-12 h-12 mb-4 opacity-20" />
                                        <p>Select a role from the list to configure its permissions.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="permissions_list">
                    <PermissionsPage />
                </TabsContent>
            </Tabs>

            <RoleEditDialog 
                open={editDialog.open} 
                onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}
                role={editDialog.role}
                onSuccess={fetchRoles}
            />

            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, role: null })}>
                <AlertDialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Role?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete <span className="font-bold text-white">"{deleteDialog.role?.name}"</span>? 
                            This action cannot be undone and may affect users assigned to this role.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel className="text-black">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRole} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default RoleManagement;