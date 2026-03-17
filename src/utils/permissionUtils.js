import { supabase } from '@/lib/customSupabaseClient';

/**
 * Validates if the current user has the required permission
 * Intended for use in non-React contexts or checks before actions
 */
export const checkPermission = async (userId, permissionCode) => {
    if (!userId) return false;
    
    // Admin override check (client side optimization)
    // We should strictly use RPC for security, but this helps reduce calls if we have profile loaded
    // However, best to rely on DB truth.
    
    try {
        const { data, error } = await supabase.rpc('check_permission', {
            p_user_id: userId,
            p_permission_code: permissionCode
        });
        
        if (error) {
            console.error('Permission check failed:', error);
            return false;
        }
        
        return !!data;
    } catch (e) {
        return false;
    }
};

/**
 * Creates a validator function for a specific permission
 */
export const createPermissionValidator = (permissionCode) => {
    return async (userId) => {
        return await checkPermission(userId, permissionCode);
    };
};