
import React from 'react';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from 'lucide-react';

const PermissionButton = ({ 
  permission, 
  requireAll = false, 
  children, 
  disabled, 
  ...props 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermission();

  let allowed = false;
  if (!isLoading) {
    if (Array.isArray(permission)) {
      allowed = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
    } else {
      allowed = hasPermission(permission);
    }
  }

  if (isLoading) {
    return <Button disabled {...props} className="opacity-70 cursor-wait">{children}</Button>;
  }

  if (!allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-block cursor-not-allowed">
              <Button disabled className="opacity-50 gap-2" {...props}>
                <Lock className="w-3 h-3" />
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="bg-red-900 border-red-800 text-white">
            <p>You do not have permission to perform this action.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Button disabled={disabled} {...props}>{children}</Button>;
};

export default PermissionButton;
