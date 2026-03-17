import { supabase } from '@/lib/customSupabaseClient';

/**
 * TikTok Token Validator
 * Checks token existence and age directly against the database.
 * Does NOT make external API calls.
 */
export const validateTikTokToken = async (userId) => {
    console.group(`[TokenValidator] Starting local validation for user ${userId}`);
    const status = {
        isValid: false,
        isExpired: false,
        hasToken: false,
        lastChecked: new Date().toISOString(),
        errorMessage: null,
        tokenAge: null,
        scopes: [],
    };

    try {
        // 1. Fetch Profile to get tokens from the tiktok_accounts table
        // Querying tiktok_accounts instead of tiktok_users as requested
        const { data: account, error: accountError } = await supabase
            .from('tiktok_accounts')
            .select('access_token, refresh_token, updated_at, created_at') 
            .eq('user_id', userId)
            .maybeSingle();

        if (accountError) {
            console.error(`[TokenValidator] DB Error fetching account:`, accountError);
            status.errorMessage = `Database error: ${accountError.message}`;
            console.groupEnd();
            return status;
        }

        if (!account || !account.access_token) {
            status.errorMessage = "No linked TikTok account found.";
            console.warn(`[TokenValidator] ${status.errorMessage}`);
            console.groupEnd();
            return status;
        }

        status.hasToken = true;
        
        // 2. Check Token Age
        const tokenTimeStr = account.updated_at || account.created_at;
        
        if (tokenTimeStr) {
            const tokenDate = new Date(tokenTimeStr);
            const now = new Date();
            const ageInMs = now - tokenDate;
            const ageInHours = ageInMs / (1000 * 60 * 60);
            
            status.tokenAge = `${ageInHours.toFixed(2)} hours`;
            console.log(`[TokenValidator] Token age: ${status.tokenAge}`);

            // 2 hours threshold
            if (ageInHours > 2) {
                status.isExpired = true;
                status.isValid = false; 
                status.errorMessage = "Token is older than 2 hours (potentially expired).";
                console.warn(`[TokenValidator] Token expired based on local timestamp check.`);
            } else {
                status.isValid = true;
                status.isExpired = false;
                // Assuming basic scopes if we have a valid token locally
                status.scopes = ['user.info.basic', 'user.info.stats']; 
                console.log(`[TokenValidator] Token is valid and fresh (local check).`);
            }
        } else {
            status.isValid = false;
            status.errorMessage = "Could not determine token age (missing timestamp).";
        }

    } catch (err) {
        console.error(`[TokenValidator] Exception during validation:`, err);
        status.errorMessage = err.message;
        status.isValid = false;
    }

    console.log(`[TokenValidator] Final Status:`, status);
    console.groupEnd();
    return status;
};