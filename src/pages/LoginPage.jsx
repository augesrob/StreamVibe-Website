
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { checkSupabaseHealth } from '@/lib/auth-health-check';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Health Check States
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const [healthStatus, setHealthStatus] = useState('unknown'); // unknown, online, offline
  const [healthError, setHealthError] = useState('');

  const { signInWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
       const from = location.state?.from?.pathname || '/dashboard';
       navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  // Task 4: Check health on mount
  useEffect(() => {
    performHealthCheck();
  }, []);

  const performHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthError('');
    try {
      const result = await checkSupabaseHealth();
      setHealthStatus(result.status);
      if (result.status !== 'online') {
        setHealthError(result.message || 'Service Unavailable');
      }
    } catch (err) {
      setHealthStatus('offline');
      setHealthError('Failed to connect to authentication service.');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (healthStatus === 'offline') {
      performHealthCheck(); // Try again before failing
      return;
    }

    setIsLoading(true);
    await signInWithEmail(email, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
      <Helmet>
        <title>Login - StreamVibe</title>
      </Helmet>

      <Card className="w-full max-w-md bg-[#1a1a24] border-gray-800 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-gray-400">Sign in to your StreamVibe account</CardDescription>
        </CardHeader>
        <CardContent>
              {healthStatus === 'offline' && (
                <Alert variant="destructive" className="mb-4 bg-red-950/30 border-red-900">
                  <WifiOff className="h-4 w-4" />
                  <AlertTitle>Connection Issue</AlertTitle>
                  <AlertDescription>
                     {healthError || "Supabase authentication service is currently unavailable. Please try again later."}
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="mt-2 w-full border-red-800 text-red-200 hover:bg-red-900/50"
                       onClick={performHealthCheck}
                       disabled={isCheckingHealth}
                     >
                       {isCheckingHealth ? <Loader2 className="w-3 h-3 animate-spin mr-2"/> : <RefreshCw className="w-3 h-3 mr-2"/>}
                       Retry Connection
                     </Button>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    className="bg-[#12121a] border-gray-700 text-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={healthStatus === 'offline' && !isCheckingHealth}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300">Forgot password?</Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    className="bg-[#12121a] border-gray-700 text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={healthStatus === 'offline' && !isCheckingHealth}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-cyan-600 hover:bg-cyan-700" 
                  disabled={isLoading || (healthStatus === 'offline' && !isCheckingHealth)}
                >
                  {isLoading || isCheckingHealth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Sign In
                </Button>
              </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
