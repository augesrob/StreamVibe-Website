import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#0a0a0f] flex items-center justify-center">
      <Helmet>
         <title>Payment Cancelled | StreamVibe</title>
      </Helmet>
      
      <Card className="max-w-md w-full bg-[#1a1a24] border-gray-800">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4 w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-gray-400" />
           </div>
           <CardTitle className="text-2xl font-bold text-white">Payment Cancelled</CardTitle>
           <CardDescription>
              You have cancelled the payment process. No charges were made to your account.
           </CardDescription>
        </CardHeader>
        
        <CardFooter className="flex flex-col gap-3">
           <Button onClick={() => navigate('/billing')} className="w-full bg-white text-black hover:bg-gray-200">
              Return to Billing
           </Button>
           <Button variant="ghost" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentCancel;