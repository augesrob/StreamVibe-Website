import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { callEdgeFunctionWithTimeout } from '@/lib/edge-functions';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export const useLicenseApi = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Generic fetch wrapper
    const apiCall = useCallback(async (endpointKey, method = 'POST', body = {}) => {
        setLoading(true);
        setError(null);
        try {
            // Mapping endpoint key to function slug for callEdgeFunctionWithTimeout
            // We assume endpointKey matches the variable name in API_ENDPOINTS 
            // but we need the slug (e.g. 'license-api')
            // Let's reverse lookup or just use direct slugs.
            
            // Simpler: Just parse the slug from the full URL in API_ENDPOINTS
            const fullUrl = API_ENDPOINTS[endpointKey];
            if (!fullUrl) throw new Error(`Unknown endpoint: ${endpointKey}`);
            
            const slug = fullUrl.split('/').pop();

            const { data, error: funcError } = await callEdgeFunctionWithTimeout(slug, {
                body: { ...body, method }, // Pass "method" in body for multi-action functions
            });

            if (funcError) throw new Error(funcError.message);
            return data;
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Task 1: Verify License
    const verifyLicense = useCallback((keyCode) => {
        return apiCall('LICENSE_API', 'verify', { key_code: keyCode });
    }, [apiCall]);

    // Task 2: Generate Keys (Admin)
    const generateKeys = useCallback((planId, count, expirationDays) => {
        return apiCall('LICENSE_MANAGEMENT', 'generate', { plan_id: planId, count, expiration_days: expirationDays });
    }, [apiCall]);

    // Task 3: Redeem License
    const redeemLicense = useCallback((keyCode) => {
        return apiCall('LICENSE_REDEMPTION', 'redeem', { key_code: keyCode, user_id: user?.id });
    }, [apiCall, user]);

    // Task 10: Discord Verify (Simulation)
    const discordVerify = useCallback((keyCode, discordUserId) => {
        return apiCall('DISCORD', 'verify', { key_code: keyCode, discord_user_id: discordUserId });
    }, [apiCall]);

    // Task 12: List API Keys (Admin)
    const listApiKeys = useCallback(() => {
        return apiCall('API_KEY_MGMT', 'list', {});
    }, [apiCall]);

    const createApiKey = useCallback((name, permissions) => {
        return apiCall('API_KEY_MGMT', 'create', { name, permissions });
    }, [apiCall]);

    return {
        loading,
        error,
        verifyLicense,
        generateKeys,
        redeemLicense,
        discordVerify,
        listApiKeys,
        createApiKey
    };
};