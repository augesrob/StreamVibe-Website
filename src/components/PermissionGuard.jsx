import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { AlertTriangle } from 'lucide-react';

/**
 * PermissionGuard component
 * @param {Object} props
 * @param {string|string[]} props.permission - Required permission code(s)
 * @param {boolean} [props.requireAll] - If array, require all permissions? (default false -> any)
 * @param {React.ReactNode} [props.fallback] - Component to render if denied
 * @param {React.ReactNode} props.children - Content to render if allowed
 */
const PermissionGuard = ({ 
  permission, 
  requireAll = false, 
  fallback = null, 
  children 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermission();

  if (isLoading) {
    return null; // Or a loading spinner if preferred, but usually silent
  }

  let allowed = false;

  if (Array.isArray(permission)) {
    allowed = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
  } else {
    allowed = hasPermission(permission);
  }

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default Fallback
  return (
    <div className="p-4 border border-red-900/50 bg-red-950/20 rounded-lg flex items-center gap-3 text-red-400">
      <AlertTriangle className="w-5 h-5" />
      <span>Access Denied: Insufficient permissions.</span>
    </div>
  );
};

export default PermissionGuard;