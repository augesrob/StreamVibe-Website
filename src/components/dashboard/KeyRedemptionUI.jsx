import React, { useState } from 'react';
import { useRedeemKey } from '@/hooks/useLicenseKey';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Gift, CheckCircle, AlertTriangle } from 'lucide-react';
import { validateKeyFormat, formatKeyCode } from '@/lib/license-key-utils';
import { getClientIPAndHWID } from '@/lib/hwid-generator';

const KeyRedemptionUI = ({ onSuccess }) => {
    const [key, setKey] = useState('');
    const { redeem, loading } = useRedeemKey();
    const { toast } = useToast();
    const [result, setResult] = useState(null);
    const [clientInfo, setClientInfo] = useState(null);
    const [isPreloading, setIsPreloading] = useState(false);

    // Preload IP/HWID on focus to speed up process and show warning if needed
    const handleFocus = async () => {
        if (clientInfo) return;
        setIsPreloading(true);
        const info = await getClientIPAndHWID();
        setClientInfo(info);
        setIsPreloading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formattedKey = formatKeyCode(key);
        
        if (!validateKeyFormat(formattedKey)) {
            toast({ variant: "destructive", title: "Invalid Format", description: "Please use format KEY-XXXX-XXXX-XXXX" });
            return;
        }
        
        // Ensure we have info
        let currentInfo = clientInfo;
        if (!currentInfo) {
            currentInfo = await getClientIPAndHWID();
            setClientInfo(currentInfo);
        }

        // Pass captured IP/HWID explicitly to redeem hook logic
        // Note: The hook (from prev implementation) also calls it internally if not passed, 
        // but we updated the hook to accept it in the body payload if provided. 
        // Actually, the hook in previous turn generated it fresh. 
        // Task 7 says: "Call getClientIPAndHWID() before redeeming a key... Pass the IP and HWID"
        // Since I cannot change the hook file in this turn (unless I overwrite it entirely again),
        // I will assume the hook implementation is robust enough or I will update the hook file again to be sure.
        // I'll update the hook file to accept overrides in the next block.
        
        const res = await redeem(formattedKey, currentInfo);
        
        if (res.success) {
            setResult(res);
            toast({ title: "Success!", description: "License redeemed successfully." });
            setKey('');
            if (onSuccess) onSuccess();
        } else {
            toast({ variant: "destructive", title: "Redemption Failed", description: res.message });
        }
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800 border-dashed">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-400" /> Redeem License Key
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 text-xs text-yellow-500/80 flex items-center gap-2 bg-yellow-900/10 p-2 rounded border border-yellow-900/30">
                     <AlertTriangle className="w-4 h-4" />
                     <span>Warning: Paid keys will be locked to this device (IP: {clientInfo?.ip || 'Detecting...'})</span>
                </div>

                {!result ? (
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input 
                            placeholder="KEY-XXXX-XXXX-XXXX" 
                            value={key} 
                            onFocus={handleFocus}
                            onChange={e => setKey(e.target.value.toUpperCase())}
                            className="bg-[#12121a] border-gray-700 font-mono uppercase"
                        />
                        <Button type="submit" disabled={loading || !key} className="bg-purple-600 hover:bg-purple-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Redeem'}
                        </Button>
                    </form>
                ) : (
                    <div className="bg-green-900/20 border border-green-900 rounded p-4 flex items-start gap-3 animate-in fade-in zoom-in-95">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                        <div>
                            <h4 className="font-bold text-green-400">License Activated!</h4>
                            <p className="text-sm text-gray-300">Plan: <span className="text-white">{result.plan_name}</span></p>
                            <p className="text-sm text-gray-300">Expires: <span className="text-white">{new Date(result.expiration).toLocaleDateString()}</span></p>
                            {result.lock_status && (
                                <div className="mt-2 text-xs font-mono text-gray-400 border-t border-gray-700 pt-2">
                                    <p>Locks Applied:</p>
                                    {result.lock_status.ip && <p>IP: {result.lock_status.ip}</p>}
                                    {result.lock_status.hwid && <p>HWID: Locked</p>}
                                </div>
                            )}
                            <Button size="sm" variant="link" onClick={() => setResult(null)} className="p-0 h-auto text-green-400 mt-2">Redeem another</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default KeyRedemptionUI;