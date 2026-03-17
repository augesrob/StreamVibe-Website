import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, RefreshCcw, Home, Terminal, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { linkTikTokAccount } from '@/lib/tiktok-auth';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { log } from '@/lib/debug-logger';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, checkTikTokLinked } = useAuth();
  const [status, setStatus] = useState('loading'); // loading, exchanging, success, error
  const [errorDetails, setErrorDetails] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const processedRef = useRef(false);

  // Helper to safely navigate
  const handleNavigate = (path, state = {}) => {
      log('Navigating', { path, state });
      navigate(path, { state });
  };

  useEffect(() => {
    // (a) Log mount
    log('AuthCallback Mounted', { 
        url: window.location.href,
        hasUser: !!user,
        userId: user?.id 
    });

    if (processedRef.current) {
        log('Skipping processing', 'Already processed ref is true');
        return;
    }
    
    if (!user) {
        log('Waiting for user session', 'User object is null');
        const authTimeout = setTimeout(() => {
           if (!user) {
               const msg = "Authentication session missing. Please log in again.";
               log('Auth Timeout', msg);
               setStatus('error');
               setErrorDetails({
                   title: "Session Missing",
                   message: msg,
                   details: "The application could not detect your user session. This can happen if cookies are blocked or the session expired."
               });
           }
        }, 5000);
        return () => clearTimeout(authTimeout);
    }

    processedRef.current = true;

    const processLink = async () => {
      try {
          // (b) Log extraction
          const code = searchParams.get('code');
          const state = searchParams.get('state');
          const error = searchParams.get('error');
          const errorDesc = searchParams.get('error_description');

          log('Extracting URL Parameters', { code: code ? '***REDACTED***' : null, state, error, errorDesc });

          if (error) {
              throw new Error(`TikTok Error: ${errorDesc || error}`);
          }

          if (!code) {
             throw new Error("No authorization code received from TikTok.");
          }

          const storedState = localStorage.getItem('tiktok_auth_state');
          if (state !== storedState) {
            log('State Mismatch Warning', { received: state, stored: storedState });
          }

          setStatus('exchanging');
          
          // (c) Log before calling
          log('Calling linkTikTokAccount', { userId: user.id });

          // Timeout handler for 30 seconds
          const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Linking process timed out (30s).')), 30000);
          });
          
          const response = await Promise.race([
                linkTikTokAccount(user.id, code),
                timeoutPromise
          ]);
          
          // (d) Log success
          log('Response Received', response);

          if (response?.success) {
            await checkTikTokLinked(user.id);
            setProfileData(response.data?.profile); // Save profile data for display
            setStatus('success');
            log('Link Success', 'Updating context and showing success state');
            
            toast({
                title: "Account Linked!",
                description: "Your TikTok account has been successfully connected.",
            });
            
            // Auto-redirect removed to let user verify data
            // But we can add a delayed redirect or just let them click

          } else {
            throw new Error(response?.error || "Unknown API error during account linking");
          }

      } catch (err) {
        // (e) Log error
        log('Linking Process Error', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        
        setStatus('error');
        setErrorDetails({
            title: "Connection Failed",
            message: err.message || "An unexpected error occurred.",
            details: err.stack || JSON.stringify(err, null, 2),
            timestamp: new Date().toISOString()
        });
      } finally {
        localStorage.removeItem('tiktok_auth_state');
      }
    };
    
    processLink();
    
  }, [searchParams, navigate, user, checkTikTokLinked]);

  // Open Debug Modal directly
  const openDebugModal = () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, shiftKey: true }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <Card className={`w-full max-w-lg bg-[#12121a] border-cyan-500/20 text-gray-100 shadow-2xl transition-all ${status === 'error' ? 'border-red-900/50' : ''}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="animate-spin" />}
            {status === 'exchanging' && <Loader2 className="animate-spin" />}
            {status === 'success' && <CheckCircle className="text-green-500" />}
            {status === 'error' && <AlertCircle className="text-red-500" />}
            
            {status === 'error' ? 'Connection Failed' : status === 'success' ? 'Linked Successfully' : 'Connecting Account'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verifying authentication session...'}
            {status === 'exchanging' && 'Exchanging code for TikTok access tokens...'}
            {status === 'success' && 'Your TikTok profile has been connected.'}
            {status === 'error' && 'We encountered an issue linking your account.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center gap-6">
          {status === 'success' && profileData && (
             <div className="w-full bg-[#0d0d12] rounded-xl p-6 border border-gray-800 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Avatar className="w-24 h-24 border-4 border-[#1a1a24] shadow-xl mb-4">
                   <AvatarImage src={profileData.avatar_large} />
                   <AvatarFallback className="bg-cyan-900 text-cyan-100 text-xl">{profileData.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                
                <h3 className="text-xl font-bold text-white mb-1">@{profileData.display_name}</h3>
                <p className="text-gray-400 text-sm text-center mb-6 max-w-xs line-clamp-2">
                   {profileData.bio_description || "No bio available"}
                </p>
                
                <div className="grid grid-cols-3 gap-4 w-full text-center">
                    <div className="bg-[#1a1a24] p-2 rounded-lg">
                       <p className="text-xs text-gray-500 uppercase">Followers</p>
                       <p className="font-bold text-white">{profileData.follower_count?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-[#1a1a24] p-2 rounded-lg">
                       <p className="text-xs text-gray-500 uppercase">Following</p>
                       <p className="font-bold text-white">{profileData.following_count?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-[#1a1a24] p-2 rounded-lg">
                       <p className="text-xs text-gray-500 uppercase">Videos</p>
                       <p className="font-bold text-white">{profileData.video_count?.toLocaleString() || 0}</p>
                    </div>
                </div>
             </div>
          )}

          {status === 'error' && errorDetails && (
            <div className="w-full space-y-4">
                 <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-4 text-center">
                    <p className="text-red-300 font-semibold text-lg">{errorDetails.message}</p>
                    <p className="text-red-400/60 text-xs mt-1">Timestamp: {new Date(errorDetails.timestamp).toLocaleString()}</p>
                 </div>

                 <div className="w-full">
                    <p className="text-xs text-gray-500 mb-1 ml-1">Technical Details:</p>
                    <ScrollArea className="h-32 w-full rounded-md border border-gray-800 bg-black/50 p-2">
                        <code className="text-xs text-gray-400 font-mono break-all whitespace-pre-wrap">
                            {errorDetails.details}
                        </code>
                    </ScrollArea>
                 </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center w-full">
             {status === 'success' && (
                <Button 
                   onClick={() => handleNavigate('/tiktok-linking', { success: true })} 
                   className="w-full bg-cyan-600 hover:bg-cyan-700 h-11 text-lg"
                >
                   Continue to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
             )}

             {status === 'error' && (
                <>
                <Button 
                   onClick={() => handleNavigate('/tiktok-linking')} 
                   className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700"
                >
                   <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
                </Button>
                
                <Button 
                   variant="outline"
                   onClick={openDebugModal} 
                   className="w-full sm:w-auto border-gray-700 hover:bg-gray-800"
                >
                   <Terminal className="w-4 h-4 mr-2" /> View Debug Logs
                </Button>

                 <Button 
                   variant="ghost"
                   onClick={() => handleNavigate('/dashboard')} 
                   className="w-full sm:w-auto text-gray-400 hover:text-white"
                >
                   <Home className="w-4 h-4 mr-2" /> Go Home
                </Button>
                </>
             )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthCallback;