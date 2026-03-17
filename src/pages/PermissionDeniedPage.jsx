import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';

const PermissionDeniedPage = () => {
  const navigate = useNavigate();
  const { roles } = usePermission();

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1a24] border border-red-900/30 rounded-lg p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-gray-400">
            You do not have the required permissions to view this page or perform this action.
          </p>
        </div>

        <div className="bg-black/30 p-4 rounded text-left text-sm">
          <p className="text-gray-500 mb-2 uppercase text-xs font-bold">Your Current Roles</p>
          <div className="flex flex-wrap gap-2">
            {roles.length > 0 ? (
              roles.map(r => (
                <span key={r} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs capitalize">
                  {r.replace('_', ' ')}
                </span>
              ))
            ) : (
              <span className="text-gray-600 italic">No roles assigned</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full border-gray-700 hover:bg-gray-800 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
          <Button onClick={() => navigate('/')} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
            <Home className="w-4 h-4 mr-2" /> Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDeniedPage;