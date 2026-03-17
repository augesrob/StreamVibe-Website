import { supabase } from '@/lib/customSupabaseClient';

/**
 * Checks if a user has a specific forum permission.
 * 
 * @param {string} userId - The user's UUID.
 * @param {string} permissionCode - The permission code to check (e.g., 'forum_create_thread').
 * @param {string} [categoryId] - Optional category ID for granular permissions (e.g., 'forum_view_category_[id]').
 * @returns {Promise<boolean>} - True if the user has permission.
 */
export async function hasForumPermission(userId, permissionCode, categoryId = null) {
  if (!userId) return false;

  try {
    // 1. Get user's role
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Permission check failed: User not found', userError);
      return false;
    }

    const roleName = userData.role;

    // Admin always has permission
    if (roleName === 'admin') return true;

    // 2. Get role ID
    const { data: roleData, error: roleError } = await supabase
      .from('rbac_roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError || !roleData) {
        // Fallback: if role not in RBAC table but string matches 'moderator', grant basic mod perms?
        // Ideally we stick to RBAC table. If role doesn't exist in RBAC, deny.
        return false;
    }

    // 3. Check for permission
    // We need to check exact permission code OR wildcard if we implemented that (not doing wildcards yet)
    // If categoryId is provided, we check for specific category permission OR global permission if applicable
    
    let codesToCheck = [permissionCode];
    if (categoryId) {
        codesToCheck.push(`${permissionCode}_${categoryId}`);
    }

    const { count, error: permError } = await supabase
        .from('rbac_role_permissions')
        .select('role_id', { count: 'exact', head: true })
        .eq('role_id', roleData.id)
        .in('permission.code', codesToCheck); // This requires a join if using PostgREST standard, but standard select with nested filter is tricky.
        
    // Standard Supabase/PostgREST join filter approach:
    // select count of rows where role_id = X AND permission_id -> code IN Y
    
    // Easier approach: Get all permission codes for this role and check in JS (caching usually handles this in real apps)
    // For this implementation, we will fetch permissions for the role and cache them in memory for the session if we could, 
    // but simplified per-request for now.
    
    const { data: perms } = await supabase
        .from('rbac_role_permissions')
        .select(`
            permission_id,
            rbac_permissions!inner (
                code
            )
        `)
        .eq('role_id', roleData.id);

    if (!perms) return false;

    const userPermCodes = perms.map(p => p.rbac_permissions.code);
    
    // Check if user has the requested permission
    const hasPerm = userPermCodes.includes(permissionCode) || (categoryId && userPermCodes.includes(`${permissionCode}_${categoryId}`));
    
    return hasPerm;

  } catch (err) {
    console.error('Permission check error:', err);
    return false;
  }
}

/**
 * Batch check multiple permissions or get all permissions for a user.
 * Useful for initializing the UI state.
 */
export async function getUserForumPermissions(userId) {
    if (!userId) return [];
    
    const { data: userData } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (!userData) return [];
    
    if (userData.role === 'admin') return ['*']; // Frontend needs to handle '*'

    const { data: roleData } = await supabase.from('rbac_roles').select('id').eq('name', userData.role).single();
    if (!roleData) return [];

    const { data: perms } = await supabase
        .from('rbac_role_permissions')
        .select(`rbac_permissions!inner(code)`)
        .eq('role_id', roleData.id);
        
    return perms ? perms.map(p => p.rbac_permissions.code) : [];
}