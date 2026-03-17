import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Save } from 'lucide-react';

const SettingsTab = ({ user }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    is_unlisted: false,
    shop_active: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_unlisted, shop_active')
        .eq('id', user.id)
        .single();
      if (data) setFormData(data);
    };
    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast({
        title: "Settings saved",
        description: "Your profile preferences have been updated.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-[#1a1a24] border-gray-800 text-white">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription className="text-gray-400">Manage your StreamVibe visibility and integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
               <Label htmlFor="unlisted-mode" className="text-base font-medium text-white">Unlisted Profile</Label>
               <p className="text-sm text-gray-400">
                 Hide your videos and profile from the Community Feed.
               </p>
            </div>
            <Switch 
              id="unlisted-mode"
              checked={formData.is_unlisted}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_unlisted: checked }))}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
               <Label htmlFor="shop-mode" className="text-base font-medium text-white">TikTok Shop Integration</Label>
               <p className="text-sm text-gray-400">
                 Enable advanced shop analytics on your dashboard.
               </p>
            </div>
            <Switch 
              id="shop-mode"
              checked={formData.shop_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, shop_active: checked }))}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t border-gray-800 pt-6">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SettingsTab;