import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

export const usePermission = () => {
  const { user, session } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch Roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id, rbac_roles(name, code:name)') // Assuming name is the code for roles
        .eq('user_id', user.id);

      if (roleError) throw roleError;
      
      const userRoleNames = roleData.map(r => r.rbac_roles?.name);
      setRoles(userRoleNames);

      // Fetch Permissions via RPC for efficiency
      const { data: permData, error: permError } = await supabase
        .rpc('get_user_permissions', { p_user_id: user.id });

      if (permError) throw permError;
      setPermissions(permData || []);

    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();

    // Subscribe to changes if user exists
    let subscription;
    if (user) {
      subscription = supabase
        .channel('public:user_roles')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchPermissions();
        })
        .subscribe();
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [fetchPermissions, user]);

  const hasPermission = useCallback((permissionCode) => {
    if (!permissionCode) return true;
    // Super admins (admin role) usually have all access, but let's stick to explicit perms 
    // OR check if they have 'super_admin' role
    if (roles.includes('super_admin') || roles.includes('admin')) return true; 
    return permissions.includes(permissionCode);
  }, [permissions, roles]);

  const hasAnyPermission = useCallback((permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (roles.includes('super_admin') || roles.includes('admin')) return true;
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions, roles]);

  const hasAllPermissions = useCallback((permissionCodes) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (roles.includes('super_admin') || roles.includes('admin')) return true;
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions, roles]);

  return {
    permissions,
    roles,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions: fetchPermissions
  };
};

export default usePermission;