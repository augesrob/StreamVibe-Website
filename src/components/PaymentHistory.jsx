import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt } from 'lucide-react';

const PaymentHistory = ({ user }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchPayments = async () => {
        try {
          const { data, error } = await supabase
            .from('payments')
            .select(`
                *,
                billing_plans (name),
                license_keys (key_code)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setPayments(data || []);
        } catch (err) {
          console.error("Error fetching payments:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchPayments();
    }
  }, [user]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white flex items-center gap-2">
         <Receipt className="w-5 h-5 text-gray-400" /> Transaction History
      </h3>
      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-[#12121a]">
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Description</TableHead>
              <TableHead className="text-gray-400">Amount</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">License Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No payment history found.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id} className="border-gray-800 hover:bg-[#1a1a24]">
                  <TableCell className="text-gray-300">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {payment.billing_plans?.name || 'Subscription'}
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {payment.amount} {payment.currency}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} 
                           className={payment.status === 'completed' ? 'bg-green-900 text-green-300 hover:bg-green-900' : ''}>
                       {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">
                     {payment.license_keys?.key_code || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PaymentHistory;