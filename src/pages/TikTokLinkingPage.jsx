import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { initiateTikTokLogin } from '@/lib/tiktok-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Video, CheckCircle, ArrowRight, AlertCircle, RefreshCcw, Home, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TikTokLinkingPage = () => {
  const { user, loading: authLoading, tiktokLinked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [isUserTimeout, setIsUserTimeout] = useState(false);

  // --- Extensive Debug Logging ---
  useEffect(() => {
    console.log('[TikTokLinkingPage] Mounted.');
  }, []);

  useEffect(() => {
    console.log('[TikTokLinkingPage] Auth State Update:', {
      authLoading,
      userExists: !!user,
      userId: user?.id || 'null',
      tiktokLinked
    });
  }, [authLoading, user, tiktokLinked]);

  // --- Defensive: Timeout Safety for User Loading ---
  useEffect(() => {
    let timeoutId;
    if (authLoading) {
        console.log('[TikTokLinkingPage] Starting loading timeout timer (5s)...');
        timeoutId = setTimeout(() => {
            if (authLoading) {
                console.warn('[TikTokLinkingPage] User load timeout exceeded (5s). Force showing timeout state.');
                setIsUserTimeout(true);
            }
        }, 5000); 
    }
    return () => clearTimeout(timeoutId);
  }, [authLoading]);

  // --- State Management for Redirects ---
  useEffect(() => {
    // 1. Check for success state passed from AuthCallback first
    if (location.state?.success && location.state?.profile) {
        console.log('[TikTokLinkingPage] Success state detected from navigation state.');
        setSuccessData(location.state.profile);
        return;
    } 
    
    // 2. Only redirect if already linked AND we are not showing the success confirmation
    // And ensure user is actually loaded before making this decision to prevent premature redirect
    if (!authLoading && user && tiktokLinked && !location.state?.success) {
      console.log('[TikTokLinkingPage] User already linked and loaded. Redirecting to dashboard.');
      navigate('/dashboard', { replace: true });
    }
  }, [tiktokLinked, navigate, location.state, authLoading, user]);

  useEffect(() => {
    // Check for errors passed from callback redirect
    if (location.state?.error) {
      console.error('[TikTokLinkingPage] Error state detected from navigation:', location.state.error);
      setError(location.state.error);
      // Clean up state so refresh doesn't show error again
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleLink = () => {
    // Extra defensive check inside handler
    if (!user || !user.id) {
        console.error('[TikTokLinkingPage] Attempted to link but user is null/undefined.');
        setError("User session lost. Please log in again.");
        return;
    }
    
    console.log('[TikTokLinkingPage] Initiating link for user:', user.id);
    setError(null);
    setIsLinking(true);
    
    try {
        initiateTikTokLogin();
    } catch (err) {
        console.error('[TikTokLinkingPage] Link initiation failed:', err);
        setError("Failed to start linking process. Check console.");
        setIsLinking(false);
    }
  };

  const handleGoBack = () => navigate('/dashboard');
  const handleContinue = () => navigate('/dashboard');
  const handleRetryUserLoad = () => window.location.reload();

  // --- Scenario 1: Still Loading (and not timed out) ---
  if (authLoading && !isUserTimeout) {
      return (
        <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
                <p className="text-gray-400 font-medium">Initializing secure connection...</p>
                <p className="text-xs text-gray-600">Please wait while we verify your session.</p>
            </div>
        </div>
      );
  }

  // --- Scenario 2: Loading Finished but No User (Not Logged In) ---
  if (!authLoading && !user) {
       console.warn('[TikTokLinkingPage] Loading finished but no user found.');
       return (
        <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
            <Card className="w-full max-w-md bg-[#1a1a24] border-red-900/50 text-white shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                         <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <CardTitle className="text-xl">Authentication Required</CardTitle>
                    <CardDescription className="text-gray-400">
                        You must be logged in to connect a TikTok account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Button onClick={() => navigate('/login')} className="w-full bg-cyan-600 hover:bg-cyan-700 h-11">
                        <LogIn className="mr-2 h-4 w-4" /> Log In Now
                     </Button>
                     <Button variant="ghost" onClick={() => navigate('/')} className="w-full text-gray-400 hover:text-white">
                        Return Home
                     </Button>
                </CardContent>
            </Card>
        </div>
       );
  }
  
  // --- Scenario 3: Loading Timed Out ---
  if (isUserTimeout && !user) {
      return (
        <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
            <Card className="w-full max-w-md bg-[#1a1a24] border-orange-900/50 text-white">
                <CardHeader className="text-center">
                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                    <CardTitle>Connection Timeout</CardTitle>
                    <CardDescription>We couldn't load your profile details in time.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <p className="text-xs text-center text-gray-500">This might be due to a slow network connection.</p>
                     <Button onClick={handleRetryUserLoad} variant="outline" className="w-full border-gray-700 hover:bg-gray-800">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                     </Button>
                     <Button onClick={() => navigate('/login')} className="w-full bg-orange-600 hover:bg-orange-700">
                        Back to Login
                     </Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  // --- Scenario 4: Linking Success (Callback Returned) ---
  if (successData) {
      return (
        <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
            <Helmet>
                <title>Account Connected! - StreamVibe</title>
            </Helmet>
            <Card className="w-full max-w-lg bg-[#1a1a24] border-green-900/50 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
                <CardHeader className="text-center pb-2 pt-8">
                    <div className="mx-auto w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-white">Success!</CardTitle>
                    <CardDescription className="text-gray-400 text-lg">
                        Your TikTok account has been connected.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-4">
                    <div className="bg-[#12121a] rounded-xl p-6 border border-gray-800 flex flex-col items-center gap-4">
                        <Avatar className="w-24 h-24 border-4 border-[#1a1a24] shadow-lg">
                            <AvatarImage src={successData.avatar_large} />
                            <AvatarFallback className="bg-cyan-900 text-xl">{successData.display_name?.[0]}</AvatarFallback>
                        </Avatar>
                        
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold text-white">@{successData.display_name}</h3>
                            <p className="text-sm text-gray-500 max-w-[250px] mx-auto line-clamp-2">
                                {successData.bio_description || "No bio available"}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 w-full gap-2 pt-2 border-t border-gray-800 mt-2">
                             <div className="text-center">
                                 <p className="text-xs text-gray-500 uppercase tracking-wider">Followers</p>
                                 <p className="text-lg font-bold text-white">{successData.follower_count?.toLocaleString() || 0}</p>
                             </div>
                             <div className="text-center border-l border-gray-800">
                                 <p className="text-xs text-gray-500 uppercase tracking-wider">Following</p>
                                 <p className="text-lg font-bold text-white">{successData.following_count?.toLocaleString() || 0}</p>
                             </div>
                             <div className="text-center border-l border-gray-800">
                                 <p className="text-xs text-gray-500 uppercase tracking-wider">Videos</p>
                                 <p className="text-lg font-bold text-white">{successData.video_count?.toLocaleString() || 0}</p>
                             </div>
                        </div>
                    </div>

                    <Button 
                        onClick={handleContinue} 
                        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                        Continue to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  // --- Scenario 5: Ready to Link (User is Loaded & Valid) ---
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
      <Helmet>
        <title>Link TikTok Account - StreamVibe</title>
      </Helmet>

      <Card className="w-full max-w-lg bg-[#1a1a24] border-gray-800 text-white shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4 border border-gray-700">
             {error ? (
                <AlertCircle className="w-8 h-8 text-red-500" />
             ) : (
                <Video className="w-8 h-8 text-cyan-500" />
             )}
          </div>
          <CardTitle className="text-2xl font-bold">
             {error ? 'Connection Failed' : 'One Last Step!'}
          </CardTitle>
          <CardDescription className="text-gray-400 text-base mt-2">
             {error ? 'There was a problem linking your TikTok account.' : "To use StreamVibe's features, you need to connect your TikTok account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
           {error && (
             <Alert variant="destructive" className="bg-red-950/30 border-red-900 text-red-200">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Error</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
           )}

           {!error && (
               <div className="bg-[#12121a] p-4 rounded-lg border border-gray-800 space-y-3">
                  <div className="flex items-start gap-3">
                     <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                     <div>
                        <h4 className="font-semibold text-sm text-gray-200">Sync your LIVE videos</h4>
                        <p className="text-xs text-gray-500">Automatically import your stream history</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-3">
                     <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                     <div>
                        <h4 className="font-semibold text-sm text-gray-200">Track Analytics</h4>
                        <p className="text-xs text-gray-500">Get insights into your performance</p>
                     </div>
                  </div>
               </div>
           )}

           <div className="flex flex-col gap-3">
             <Button 
               onClick={handleLink} 
               className="w-full h-12 text-lg bg-[#fe2c55] hover:bg-[#e0264a] text-white font-bold transition-all"
               disabled={isLinking}
             >
                {isLinking ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    {error ? <><RefreshCcw className="mr-2 h-5 w-5"/> Retry Connection</> : <><span className="mr-2">Connect TikTok Account</span> <ArrowRight className="h-5 w-5" /></>}
                  </>
                )}
             </Button>

             {error && (
               <Button
                  variant="outline"
                  onClick={handleGoBack}
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
               >
                  <Home className="mr-2 h-4 w-4" />
                  Go Back
               </Button>
             )}
           </div>
           
           {!error && (
               <p className="text-xs text-center text-gray-500">
                 By connecting, you agree to our Terms of Service and Privacy Policy.
               </p>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TikTokLinkingPage;