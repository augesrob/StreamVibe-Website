
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getClientIPAndHWID } from '@/lib/hwid-generator';
import { checkSupabaseHealth } from '@/lib/auth-health-check';

const PayPalCheckoutOfficial = ({ plan_id, amount, currency = 'USD', className, planName, planInterval }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paypalRef = useRef(null);
  const { toast } = useToast();
  const initialized = useRef(false);
  const { user, refreshPlans } = useAuth();
  const [isSystemHealthy, setIsSystemHealthy] = useState(true);

  // Task 7: Pre-check system health before loading payments
  useEffect(() => {
    const verifyHealth = async () => {
      const { status } = await checkSupabaseHealth();
      if (status !== 'online') {
        setIsSystemHealthy(false);
        setError("Payment system unavailable due to connection issues.");
        setLoading(false);
      }
    };
    verifyHealth();
  }, []);

  useEffect(() => {
    if (initialized.current || !isSystemHealthy) return;
    
    const loadPayPalScript = async () => {
      try {
        if (window.paypal) {
          setLoading(false);
          return;
        }

        if (document.getElementById('paypal-sdk-script')) {
          const interval = setInterval(() => {
            if (window.paypal) {
              clearInterval(interval);
              setLoading(false);
            }
          }, 200);
          return;
        }

        const clientId = "AV8qvzwJqzNtLeUOinF-W9RrFvda30wwXf9lWCQMNu49RzzKzG9vGNEzWamYMrxCbMFZvgPWfU_ewiGx";
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&components=buttons&intent=capture`;
        script.id = 'paypal-sdk-script';
        script.async = true;
        
        script.onload = () => setLoading(false);
        script.onerror = (err) => {
          console.error("PayPal SDK failed to load:", err);
          setError("Failed to load payment system");
          setLoading(false);
        };

        document.body.appendChild(script);
      } catch (err) {
        setError("Error initializing payment");
        setLoading(false);
      }
    };

    loadPayPalScript();
    initialized.current = true;
  }, [currency, isSystemHealthy]);

  useEffect(() => {
    if (!loading && window.paypal && paypalRef.current && isSystemHealthy) {
      paypalRef.current.innerHTML = "";

      try {
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color:  'gold',
            shape:  'rect',
            label:  'paypal'
          },
          
          createOrder: async (data, actions) => {
            try {
              // Task 7: Retry health check before creating order to avoid stranded payments
              const { status } = await checkSupabaseHealth();
              if (status !== 'online') {
                 throw new Error("System is offline. Please try again later.");
              }

              const { data: responseData, error: responseError } = await supabase.functions.invoke('paypal-create-order', {
                body: { 
                  plan_id: plan_id,
                  amount: amount,
                  currency: currency,
                }
              });

              if (responseError) {
                 // Enhanced error handling
                 if (responseError.message?.includes('521') || responseError.message?.includes('fetch')) {
                    throw new Error("Server unavailable. Please try again later.");
                 }
                 console.warn("Edge function failed, falling back to client-side order create (DEMO MODE)");
                 return actions.order.create({
                    purchase_units: [{
                        amount: { value: amount.toString() },
                        description: `Plan: ${planName}` 
                    }]
                 });
              }

              return responseData.order_id;
            } catch (err) {
              console.error("CREATE ORDER ERROR:", err);
              toast({
                variant: "destructive",
                title: "Order Failed",
                description: err.message
              });
              throw err; 
            }
          },

          onApprove: async (data, actions) => {
            toast({ title: "Processing Payment", description: "Verifying transaction and generating license..." });

            try {
              const { ip, hwid } = await getClientIPAndHWID();

              const { data: captureData, error: captureError } = await supabase.functions.invoke('paypal-capture-order', {
                body: { 
                  order_id: data.orderID,
                  plan_id: plan_id,
                  current_ip: ip,
                  current_hwid: hwid
                }
              });

              if (captureError) {
                 if (captureError.message?.includes('521') || captureError.message?.includes('fetch')) {
                    throw new Error("Payment captured but server unreachable. Please contact support with Order ID: " + data.orderID);
                 }
                 throw captureError;
              }
              
              if (!captureData?.success) throw new Error(captureData?.error || "Capture failed");

              await refreshPlans();

              toast({
                title: "Plan Activated!",
                description: `Success! License key generated and locked to this device.`,
                className: "bg-green-600 text-white border-none"
              });

              setTimeout(() => window.location.reload(), 1500);

            } catch (err) {
              console.error("CAPTURE ERROR:", err);
              toast({
                variant: "destructive",
                title: "Verification Failed",
                description: err.message
              });
            }
          },

          onError: (err) => {
            toast({
              variant: "destructive",
              title: "Payment Error",
              description: "An unexpected error occurred with PayPal."
            });
          }

        }).render("#paypal-button-container");
        
      } catch (err) {
        setError("Could not load payment buttons");
      }
    }
  }, [loading, amount, currency, plan_id, toast, planName, user, refreshPlans, isSystemHealthy]);

  if (loading) return <div className={`w-full h-12 flex items-center justify-center bg-gray-800 rounded-md ${className}`}><Loader2 className="animate-spin text-cyan-400 mr-2"/> Loading PayPal...</div>;
  if (error) return <div className={`w-full p-4 flex items-center justify-center bg-red-950/20 text-red-400 ${className}`}><AlertCircle className="mr-2"/> {error}</div>;

  return <div className={`w-full ${className}`}><div id="paypal-button-container" ref={paypalRef} className="z-0 w-full min-h-[150px]"/></div>;
};

export default PayPalCheckoutOfficial;
