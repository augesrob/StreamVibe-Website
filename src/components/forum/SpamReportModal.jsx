import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';

const SpamReportModal = ({ isOpen, onClose, targetId, targetType }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
     if (!user) return;
     setLoading(true);
     
     const { error } = await supabase.from('spam_reports').insert({
        reporter_id: user.id,
        target_id: targetId,
        target_type: targetType,
        reason,
        description,
     });

     setLoading(false);
     
     if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to submit report." });
     } else {
        toast({ title: "Report Submitted", description: "Thank you for helping keep the community safe." });
        onClose();
        setDescription('');
     }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
          <DialogHeader>
             <DialogTitle>Report Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
             <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                   <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue />
                   </SelectTrigger>
                   <SelectContent className="bg-gray-900 border-gray-700 text-white">
                      <SelectItem value="spam">Spam or Advertisement</SelectItem>
                      <SelectItem value="harassment">Harassment or Hate Speech</SelectItem>
                      <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                      <SelectItem value="off_topic">Off-Topic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                   </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Additional Details (Optional)</Label>
                <Textarea 
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   className="bg-gray-900 border-gray-700 min-h-[100px]"
                   placeholder="Please provide context..."
                />
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <Button onClick={handleSubmit} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                Submit Report
             </Button>
          </DialogFooter>
       </DialogContent>
    </Dialog>
  );
};

export default SpamReportModal;