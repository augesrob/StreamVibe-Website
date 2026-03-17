import { supabase } from '@/lib/customSupabaseClient';

// CRITICAL: This URI must match EXACTLY with the one in your TikTok Developer Portal
export const REDIRECT_URI = 'https://www.streamvibe.nl/auth/callback';

const LIVE_CLIENT_KEY = 'awze97d0odmk449u';

export const getTikTokClientKey = async () => {
  // Client-side only: try fetching from system_settings or use default
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'tiktok_client_key')
      .single();
    
    if (data?.value) return data.value;
    return LIVE_CLIENT_KEY;
  } catch (err) {
    console.warn('Error fetching TikTok Client Key, using default:', err);
    return LIVE_CLIENT_KEY;
  }
};

export const initiateTikTokLogin = async () => {
  try {
    const clientKey = await getTikTokClientKey();
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('tiktok_auth_state', state);

    // Using v2 auth endpoint
    const authBaseUrl = 'https://www.tiktok.com/v2/auth/authorize/';
    
    // Scopes updated: Only asking for user info needed for profile
    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      scope: 'user.info.basic,user.info.stats', 
      redirect_uri: REDIRECT_URI,
      state: state,
    });

    console.log('[TikTok Auth] Initiating login with params:', Object.fromEntries(params));
    window.location.href = `${authBaseUrl}?${params.toString()}`;
  } catch (error) {
    console.error('Failed to initiate login:', error);
    alert('Failed to initialize TikTok login. Please try again.');
  }
};

export const linkTikTokAccount = async (userId, code) => {
  try {
    const payload = { 
      action: 'link_account', 
      payload: { 
        code, 
        redirect_uri: REDIRECT_URI,
        user_id: userId
      } 
    };

    console.log('[TikTok Auth] linkTikTokAccount called. Payload:', payload);
    
    // 1. Exchange Code for Tokens via Edge Function
    const { data: proxyData, error: proxyError } = await supabase.functions.invoke('tiktok-proxy', {
      body: payload
    });

    if (proxyError) {
        console.error('[TikTok Auth] Edge Function Network Error:', proxyError);
        throw new Error(`Network Error: ${proxyError.message}`);
    }

    if (proxyData && !proxyData.success) {
        console.error('[TikTok Auth] API Error:', proxyData.error);
        throw new Error(proxyData.error || "Linking failed");
    }

    // 2. Retrieve Access Token from DB (safer than relying on proxy return)
    const { data: accountData, error: accountError } = await supabase
        .from('tiktok_accounts')
        .select('access_token, open_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (accountError || !accountData?.access_token) {
        console.warn('[TikTok Auth] Could not retrieve access token for profile fetch:', accountError);
        return { success: true, data: proxyData.data };
    }

    // 3. Fetch Detailed Profile Info from TikTok API
    console.log('[TikTok Auth] Fetching user info from TikTok API...');
    
    const fields = 'open_id,display_name,avatar_large_url,bio_description,follower_count,following_count,video_count';
    const userInfoUrl = `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`;

    let profileData = null;

    try {
        const userRes = await fetch(userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${accountData.access_token}`
            }
        });

        if (userRes.ok) {
            const userData = await userRes.json();
            if (userData?.data?.user) {
                const user = userData.data.user;
                
                profileData = {
                    display_name: user.display_name,
                    avatar_large: user.avatar_large_url,
                    bio_description: user.bio_description,
                    follower_count: user.follower_count,
                    following_count: user.following_count,
                    video_count: user.video_count,
                    updated_at: new Date().toISOString()
                };

                // 4. Update Database with Profile Info
                const { error: updateError } = await supabase
                    .from('tiktok_accounts')
                    .update(profileData)
                    .eq('user_id', userId)
                    .eq('open_id', accountData.open_id);

                if (updateError) {
                    console.error('[TikTok Auth] Failed to save profile data:', updateError);
                } else {
                    console.log('[TikTok Auth] Profile data saved successfully.');
                }
            }
        } else {
            console.warn('[TikTok Auth] Failed to fetch TikTok user info:', await userRes.text());
        }
    } catch (fetchErr) {
        console.error('[TikTok Auth] Error fetching TikTok profile:', fetchErr);
    }

    return { 
        success: true, 
        data: {
            ...proxyData.data,
            profile: profileData 
        }
    };
  } catch (error) {
    console.error('[TikTok Auth] Linking failed:', error);
    throw error;
  }
};

export const syncTikTokProfile = async (userId) => {
    const logPrefix = `[TikTok Auth] [syncTikTokProfile] [User: ${userId}]`;
    console.log(`${logPrefix} Initiating profile sync...`);
    
    try {
        console.log(`${logPrefix} Sending request to Edge Function 'tiktok-profile-sync'...`);
        
        const { data, error } = await supabase.functions.invoke('tiktok-profile-sync', {
            body: { user_id: userId }
        });

        // Detailed error logging
        if (error) {
            console.error(`${logPrefix} Edge Function Invocation Error:`, error);
            console.error(`${logPrefix} Error Message:`, error.message);
            console.error(`${logPrefix} Full Error Object:`, JSON.stringify(error, null, 2));
            throw new Error(`Edge Function Error: ${error.message}`);
        }

        console.log(`${logPrefix} Raw Edge Function Response:`, data);

        if (!data || !data.success) {
            console.error(`${logPrefix} API returned logical failure. Error:`, data?.error);
            throw new Error(data?.error || 'Unknown profile sync error');
        }

        console.log(`${logPrefix} Profile sync successful. Response Data:`, data);
        return data;
    } catch (error) {
        console.error(`${logPrefix} CRITICAL FAILURE:`, error);
        throw error;
    }
};

export const syncTikTokVideos = async (userId) => {
    const logPrefix = `[TikTok Auth] [syncTikTokVideos] [User: ${userId}]`;
    console.log(`${logPrefix} Initiating video sync...`);
    
    try {
        console.log(`${logPrefix} Sending request to Edge Function 'sync-tiktok-videos'...`);
        
        const { data, error } = await supabase.functions.invoke('sync-tiktok-videos', {
            body: { user_id: userId }
        });

        if (error) {
            console.error(`${logPrefix} Edge Function Invocation Error:`, error);
            throw new Error(`Edge Function Error: ${error.message}`);
        }

        if (!data || !data.success) {
            console.error(`${logPrefix} API returned logical failure. Error:`, data?.error);
            throw new Error(data?.error || 'Unknown video sync error');
        }

        console.log(`${logPrefix} Video sync successful. Response Data:`, data);
        return data;
    } catch (error) {
        console.error(`${logPrefix} CRITICAL FAILURE:`, error);
        throw error;
    }
};