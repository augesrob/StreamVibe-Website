
import React, { useState, useEffect } from 'react';
import { checkSupabaseHealth } from '@/lib/auth-health-check';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react';

const SupabaseStatus = () => {
  const [status, setStatus] = useState('checking'); // checking, online, offline
  const [detail, setDetail] = useState('');

  const check = async () => {
    try {
      const result = await checkSupabaseHealth();
      setStatus(result.status);
      setDetail(result.message || '');
    } catch (error) {
      console.error("Health check failed critically:", error);
      setStatus('offline');
      setDetail('System Critical Failure');
    }
  };

  useEffect(() => {
    // Initial check
    check();

    // Periodic check every 30s
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') {
      return null; 
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center cursor-help">
            {status === 'online' ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-950/40 border border-green-900/50">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider hidden sm:inline-block">System Online</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-950/40 border border-red-900/50">
                    <WifiOff className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider hidden sm:inline-block">Offline</span>
                </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#1a1a24] border-gray-800 text-xs">
          <p className="font-semibold mb-1">System Status: {status === 'online' ? 'Operational' : 'Degraded'}</p>
          <p className="text-gray-400">{status === 'online' ? 'Supabase connection active' : detail || 'Connection to backend lost'}</p>
          <p className="text-[10px] text-gray-500 mt-1">Updates every 30s</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SupabaseStatus;
