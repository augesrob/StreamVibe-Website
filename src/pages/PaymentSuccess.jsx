
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Copy } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshPlans } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [details, setDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const token = searchParams.get('token'); // PayPal sends orderId as 'token'

  useEffect(() => {
    if (!token) {
        setStatus('error');
        setErrorMsg('No payment token found.');
        return;
    }

    if (!user) return; // Wait for auth

    const processPayment = async () => {
      try {
        // 1. Capture Order
        const { data: captureData, error } = await supabase.functions.invoke('paypal-capture-order', {
           body: { order_id: token }
        });

        if (error) throw new Error(error.message);
        if (!captureData.success) throw new Error(captureData.error || "Payment capture failed");

        setDetails(captureData);
        
        // 2. Extract Plan ID from response
        const planId = captureData.details?.purchase_units?.[0]?.reference_id;
        const amount = captureData.details?.purchase_units?.[0]?.amount?.value;
        
        if (!planId) {
             console.warn("No plan ID found in payment reference.");
        } else {
             // 3. Insert into transactions
             // Ensure we respect the actual schema: id, user_id, plan_id, amount, status, payment_method, created_at, paypal_order_id
             await supabase.from('transactions').insert({
                 user_id: user.id,
                 plan_id: parseInt(planId), // ensure integer
                 amount: amount ? parseFloat(amount) : 0,
                 status: 'completed',
                 payment_method: 'paypal',
                 paypal_order_id: token
             });

             // 4. Insert into user_plans
             // Fetch plan to get duration
             const { data: planData } = await supabase.from('plans').select('duration_days, name').eq('id', planId).single();
             
             if (planData) {
                 const now = new Date();
                 const expiresAt = new Date();
                 // Default to 30 days if null
                 expiresAt.setDate(now.getDate() + (planData.duration_days || 30));

                 await supabase.from('user_plans').insert({
                    user_id: user.id,
                    plan_id: parseInt(planId),
                    purchased_at: now.toISOString(), // Schema uses purchased_at, NOT activated_at
                    expires_at: expiresAt.toISOString(),
                    status: 'active'
                 });

                 await refreshPlans();
                 
                 toast({
                    title: "Plan Activated",
                    description: `You now have access to ${planData.name}`,
                    className: "bg-green-600 text-white"
                 });
             }
        }

        setStatus('success');
      } catch (err) {
        console.error(err);
        setStatus('error');
        setErrorMsg(err.message || "Payment capture failed.");
      }
    };

    processPayment();
  }, [token, user, refreshPlans, toast]);

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#0a0a0f] flex items-center justify-center">
      <Helmet>
         <title>Payment Success | StreamVibe</title>
      </Helmet>
      
      <Card className="max-w-md w-full bg-[#1a1a24] border-gray-800 shadow-2xl">
        <CardHeader className="text-center">
           {status === 'processing' && (
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center">
                 <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
           )}
           {status === 'success' && (
              <div className="mx-auto mb-4 w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center">
                 <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
           )}
           {status === 'error' && (
              <div className="mx-auto mb-4 w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center">
                 <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
           )}
           
           <CardTitle className="text-2xl font-bold text-white">
              {status === 'processing' ? 'Finalizing Payment...' : 
               status === 'success' ? 'Payment Successful!' : 
               'Payment Failed'}
           </CardTitle>
           <CardDescription>
              {status === 'processing' && 'Please wait while we confirm your transaction and generate your license.'}
              {status === 'success' && 'Thank you for your purchase. Your plan has been added to your account.'}
              {status === 'error' && 'We encountered an issue processing your payment.'}
           </CardDescription>
        </CardHeader>
        
        <CardContent>
           {status === 'success' && details && (
              <div className="space-y-6">
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                       <span className="text-gray-400">Status</span>
                       <span className="text-green-400 font-medium">Active</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-gray-400">Order ID</span>
                       <span className="text-gray-500 font-mono text-xs">{token}</span>
                    </div>
                 </div>
              </div>
           )}

           {status === 'error' && (
              <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-lg text-red-200 text-sm text-center">
                 {errorMsg}
              </div>
           )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
           <Button onClick={() => navigate('/billing')} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
              Go to Billing
           </Button>
           <Link to="/dashboard" className="text-sm text-gray-500 hover:text-white flex items-center gap-1">
              Return to Dashboard <ArrowRight className="w-3 h-3" />
           </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
