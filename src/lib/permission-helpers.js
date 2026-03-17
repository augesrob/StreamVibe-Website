import { supabase } from '@/lib/customSupabaseClient';

export const PERMISSION_CATEGORIES = {
  ADMIN_PANEL: "Admin Panel",
  USER_MANAGEMENT: "User Management",
  FORUM_MANAGEMENT: "Forum Management",
  CONTENT_MANAGEMENT: "Content Management",
  FEATURE_ACCESS: "Feature Access",
  LICENSE_SYSTEM: "License System",
  OTHER: "Other Permissions"
};

// Helper to categorize a single permission code
const getCategoryForCode = (code, dbCategory) => {
  const c = code.toLowerCase();
  
  // Priority 1: Explicit Code Patterns
  if (c.startsWith('admin.users') || c === 'manage_users' || c.startsWith('admin.roles')) return PERMISSION_CATEGORIES.USER_MANAGEMENT;
  if (c.startsWith('admin.licenses') || c === 'manage_licenses' || c === 'manage_billing') return PERMISSION_CATEGORIES.LICENSE_SYSTEM;
  if (c === 'view_admin_panel' || c === 'manage_settings' || c === 'view_analytics' || c.startsWith('admin.settings') || c.startsWith('admin.logs') || c === 'admin.access' || c.startsWith('admin.newsletter')) return PERMISSION_CATEGORIES.ADMIN_PANEL;
  if (c.startsWith('forum.')) return PERMISSION_CATEGORIES.FORUM_MANAGEMENT;
  if (c.startsWith('content.')) return PERMISSION_CATEGORIES.CONTENT_MANAGEMENT;
  if (c.startsWith('feature.') || c === 'api.access') return PERMISSION_CATEGORIES.FEATURE_ACCESS;

  // Priority 2: DB Category Fallback
  if (dbCategory) {
      if (dbCategory.toLowerCase() === 'forum') return PERMISSION_CATEGORIES.FORUM_MANAGEMENT;
      if (dbCategory.toLowerCase() === 'content') return PERMISSION_CATEGORIES.CONTENT_MANAGEMENT;
      if (dbCategory.toLowerCase() === 'license' || dbCategory.toLowerCase() === 'licensing') return PERMISSION_CATEGORIES.LICENSE_SYSTEM;
      if (dbCategory.toLowerCase() === 'admin') return PERMISSION_CATEGORIES.ADMIN_PANEL;
      if (dbCategory.toLowerCase() === 'feature') return PERMISSION_CATEGORIES.FEATURE_ACCESS;
      if (dbCategory.toLowerCase() === 'api') return PERMISSION_CATEGORIES.FEATURE_ACCESS; // API access can be considered a feature
  }
  
  return PERMISSION_CATEGORIES.OTHER;
};

/**
 * Fetches all permissions from rbac_permissions and groups them by category.
 * Returns { grouped: { [CategoryName]: [Permissions] }, all: [Permissions] }
 */
export const fetchGroupedPermissions = async () => {
  try {
    const { data, error } = await supabase
      .from('rbac_permissions')
      .select('*')
      .order('code');

    if (error) throw error;

    const grouped = {
      [PERMISSION_CATEGORIES.ADMIN_PANEL]: [],
      [PERMISSION_CATEGORIES.USER_MANAGEMENT]: [],
      [PERMISSION_CATEGORIES.FORUM_MANAGEMENT]: [],
      [PERMISSION_CATEGORIES.CONTENT_MANAGEMENT]: [],
      [PERMISSION_CATEGORIES.FEATURE_ACCESS]: [],
      [PERMISSION_CATEGORIES.LICENSE_SYSTEM]: [],
      [PERMISSION_CATEGORIES.OTHER]: []
    };

    data.forEach(perm => {
      const category = getCategoryForCode(perm.code, perm.category);
      if (grouped[category]) {
        grouped[category].push(perm);
      } else {
        grouped[PERMISSION_CATEGORIES.OTHER].push(perm);
      }
    });

    // Ensure consistent order of categories
    const orderedGrouped = {};
    Object.values(PERMISSION_CATEGORIES).forEach(cat => {
        if (grouped[cat]) {
            orderedGrouped[cat] = grouped[cat];
        }
    });
    // Add any remaining 'OTHER' category permissions if they weren't explicitly handled
    if (grouped[PERMISSION_CATEGORIES.OTHER] && grouped[PERMISSION_CATEGORIES.OTHER].length > 0) {
        orderedGrouped[PERMISSION_CATEGORIES.OTHER] = grouped[PERMISSION_CATEGORIES.OTHER];
    }


    return { grouped: orderedGrouped, all: data };
  } catch (error) {
    console.error('Error fetching permissions:', error);
    throw error;
  }
};

/**
 * Updates the permissions for a specific role.
 * Replaces all existing permissions with the new list of permission IDs.
 */
export const updateRolePermissions = async (roleId, permissionIds) => {
  if (!roleId) throw new Error("Role ID is required");

  // 1. Delete existing permissions
  const { error: deleteError } = await supabase
    .from('rbac_role_permissions')
    .delete()
    .eq('role_id', roleId);

  if (deleteError) throw deleteError;

  // 2. Insert new permissions
  if (permissionIds && permissionIds.length > 0) {
    const inserts = permissionIds.map(pid => ({
      role_id: roleId,
      permission_id: pid
    }));

    const { error: insertError } = await supabase
      .from('rbac_role_permissions')
      .insert(inserts);

    if (insertError) throw insertError;
  }

  return true;
};

/**
 * Fetches current permission IDs for a role
 */
export const fetchRolePermissionIds = async (roleId) => {
    const { data, error } = await supabase
        .from('rbac_role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);
    
    if (error) throw error;
    return data.map(p => p.permission_id);
};