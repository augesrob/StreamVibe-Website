import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Mail, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

const EmailVerificationPage = () => {
  const location = useLocation();
  const email = location.state?.email;
  const { resendVerificationEmail } = useAuth();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if(!email) return;
    setResending(true);
    await resendVerificationEmail(email);
    setResending(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] flex items-center justify-center">
      <Helmet>
        <title>Verify Email - StreamVibe</title>
      </Helmet>

      <Card className="w-full max-w-md bg-[#1a1a24] border-gray-800 text-white text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="text-gray-400 text-base">
             We've sent a verification link to <span className="text-white font-medium">{email || 'your email address'}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Click the link in the email to verify your account. If you don't see it, check your spam folder.
          </p>
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-200">
                  Once verified, the page will automatically refresh or you can proceed to login.
              </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700">
             <Link to="/login">
                Proceed to Login <ArrowRight className="ml-2 w-4 h-4" />
             </Link>
          </Button>
          
          <Button variant="ghost" onClick={handleResend} disabled={resending || !email} className="text-sm text-gray-400 hover:text-white">
             {resending ? <RefreshCw className="mr-2 h-3 w-3 animate-spin"/> : null}
             Resend verification email
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailVerificationPage;