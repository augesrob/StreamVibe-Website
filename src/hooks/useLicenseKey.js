import { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { callEdgeFunctionWithTimeout } from '@/lib/edge-functions';
import { generateHWID, getClientIPAndHWID } from '@/lib/hwid-generator';

// Fallback IP fetcher if not passed
const fetchPublicIP = async () => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        console.error("Failed to fetch public IP", e);
        return null; 
    }
};

export const useRedeemKey = () => {
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    // Updated to accept optional overrideInfo
    const redeem = async (keyCode, overrideInfo = null) => {
        if (!user) return { success: false, message: "User not authenticated" };
        setLoading(true);
        try {
            let ip, hwid;

            if (overrideInfo) {
                ip = overrideInfo.ip;
                hwid = overrideInfo.hwid;
            } else {
                // 1. Generate HWID and fetch IP if not provided
                hwid = await generateHWID();
                ip = await fetchPublicIP();
            }

            // 2. Call Edge Function with locking info
            const { data, error } = await callEdgeFunctionWithTimeout('redeem-license-key', {
                body: { 
                    key_code: keyCode,
                    current_ip: ip,
                    current_hwid: hwid,
                    // The backend SQL function now respects key metadata for locking logic
                    // We pass these as false default, letting the SQL function decide based on key type/metadata
                    lock_to_ip: false, 
                    lock_to_hwid: false 
                }
            });
            
            if (error) throw new Error(error.message);
            
            return data;
        } catch (err) {
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    return { redeem, loading };
};

export const useVerifyKey = () => {
    const [loading, setLoading] = useState(false);

    const verify = async (keyCode) => {
        setLoading(true);
        try {
            // 1. Generate HWID and fetch IP
            const { ip, hwid } = await getClientIPAndHWID();

            // 2. Call Edge Function
            const { data, error } = await callEdgeFunctionWithTimeout('verify-license-key', {
                body: { 
                    key_code: keyCode,
                    current_ip: ip,
                    current_hwid: hwid
                }
            });
            
            if (error) throw new Error(error.message);
            return data;
        } catch (err) {
            return { valid: false, message: err.message, status: "ERROR" };
        } finally {
            setLoading(false);
        }
    };
    return { verify, loading };
};

export const useCheckLicenseStatus = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const checkStatus = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await callEdgeFunctionWithTimeout('check-license-status');
            if (error) throw new Error(error.message);
            setStatus(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return { status, loading, checkStatus };
};