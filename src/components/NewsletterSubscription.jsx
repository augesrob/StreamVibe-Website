import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Download, Mail, Plus, Loader2, Trash2, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const NewsletterSubscription = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [newEmail, setNewEmail] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const fetchSubscribers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .select('*')
            .order('subscribed_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching subscribers:', error);
            // Don't show toast on initial load error if table doesn't exist yet (graceful fail)
        } else {
            setSubscribers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const handleAddSubscriber = async () => {
        if (!newEmail) return;
        
        try {
            const { error } = await supabase
                .from('newsletter_subscribers')
                .insert([{ email: newEmail, status: 'active' }]);

            if (error) throw error;
            
            toast({ title: "Success", description: "Subscriber added successfully" });
            setNewEmail('');
            setIsAddDialogOpen(false);
            fetchSubscribers();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleRemoveSubscriber = async (id) => {
        const { error } = await supabase
            .from('newsletter_subscribers')
            .delete()
            .eq('id', id);
        
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Deleted", description: "Subscriber removed" });
            setSubscribers(subscribers.filter(s => s.id !== id));
        }
    };

    const exportToCSV = () => {
        const headers = ["ID", "Email", "Status", "Subscribed At"];
        const rows = subscribers.map(s => [s.id, s.email, s.status, s.subscribed_at]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "streamvibe_subscribers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sendTestEmail = async () => {
        setIsSending(true);
        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSending(false);
        toast({ title: "Simulated", description: "Test email blast simulation complete (No real emails sent in demo)" });
    };

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Newsletter Subscribers</CardTitle>
                    <CardDescription>Manage your email list for marketing updates.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportToCSV} disabled={subscribers.length === 0}>
                        <Download className="w-4 h-4 mr-2"/> Export CSV
                    </Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-cyan-600 hover:bg-cyan-700">
                                <Plus className="w-4 h-4 mr-2"/> Add Subscriber
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                            <DialogHeader>
                                <DialogTitle>Add New Subscriber</DialogTitle>
                                <DialogDescription>Manually add an email to the list.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label>Email Address</Label>
                                <Input 
                                    value={newEmail} 
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="bg-[#12121a] border-gray-700 text-white"
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddSubscriber}>Add Subscriber</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4 p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg flex items-center justify-between">
                    <div className="text-sm text-blue-200">
                        <span className="font-bold">{subscribers.length}</span> Total Subscribers
                    </div>
                    <Button size="sm" variant="secondary" onClick={sendTestEmail} disabled={isSending}>
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                        Send Test Blast
                    </Button>
                </div>

                {loading ? (
                    <div className="py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-500"/></div>
                ) : (
                    <div className="rounded-md border border-gray-800 max-h-[500px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Subscribed At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscribers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                            No subscribers yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    subscribers.map(sub => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium">{sub.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className={sub.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                                                    {sub.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {new Date(sub.subscribed_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveSubscriber(sub.id)} className="text-red-400 hover:bg-red-900/20">
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default NewsletterSubscription;