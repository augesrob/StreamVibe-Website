import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield } from 'lucide-react';

const PermissionsPage = () => {
    const { toast } = useToast();
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            // Updated query: id, code, description, created_at
            const { data, error } = await supabase
                .from('rbac_permissions')
                .select('id, code, description, created_at')
                .order('code', { ascending: true });

            if (error) throw error;
            setPermissions(data);
        } catch (error) {
            console.error('Error fetching permissions:', error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredPermissions = permissions.filter(p => {
        const matchesSearch = p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">System Permissions</h2>
                    <p className="text-gray-400">View all registered system permissions.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                        placeholder="Search permissions..." 
                        className="pl-8 bg-[#1a1a24] border-gray-800"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPermissions.map(perm => (
                    <Card key={perm.id} className="bg-[#1a1a24] border-gray-800 hover:border-gray-700 transition-colors">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="border-cyan-900 text-cyan-400 bg-cyan-950/20 font-mono text-xs truncate max-w-[200px]" title={perm.code}>
                                    {perm.code}
                                </Badge>
                                <span className="text-[10px] text-gray-600">
                                    {new Date(perm.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-400">{perm.description || "No description provided."}</p>
                        </CardContent>
                    </Card>
                ))}
                
                {filteredPermissions.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No permissions found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PermissionsPage;