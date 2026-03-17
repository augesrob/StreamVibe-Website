
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Clock, Calendar, Loader2, Edit2, Check, X, Upload } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { formatExpirationDisplay } from '@/lib/license-key-utils';
import KeyRedemptionUI from './KeyRedemptionUI';

const ProfileTab = () => {
  const { user, loading: authLoading } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const fileInputRef = useRef(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setDataLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setProfileData(profile);
        setEditUsername(profile.username || '');
        setEditAvatarPreview(profile.avatar_url);
      }

      // Fetch active license key with joined plan info
      // Changed billing_plans to plans
      const { data: sub } = await supabase
        .from('license_keys')
        .select('*, plans(name)')
        .eq('user_id', user.id)
        .in('status', ['redeemed', 'active'])
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription(sub);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && user?.id) {
        fetchData();
    }
  }, [user?.id, authLoading, fetchData]);

  const handleSaveProfile = async () => {
      setSaveLoading(true);
      try {
          let newAvatarUrl = profileData.avatar_url;

          if (editAvatarFile) {
              const fileExt = editAvatarFile.name.split('.').pop();
              const fileName = `${user.id}/${Date.now()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                  .from('profiles')
                  .upload(fileName, editAvatarFile);
              
              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                  .from('profiles')
                  .getPublicUrl(fileName);
              
              newAvatarUrl = publicUrl;
          }

          const { error: updateError } = await supabase
              .from('profiles')
              .update({ username: editUsername, avatar_url: newAvatarUrl })
              .eq('id', user.id);

          if (updateError) throw updateError;

          toast({ title: "Profile Updated", description: "Your changes have been saved." });
          setIsEditing(false);
          fetchData();

      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Save Failed", description: error.message || "Could not update profile" });
      } finally {
          setSaveLoading(false);
      }
  };

  const handleAvatarChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          setEditAvatarFile(file);
          setEditAvatarPreview(URL.createObjectURL(file));
      }
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const diff = new Date(expiryDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (authLoading || dataLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
             <Loader2 className="w-10 h-10 animate-spin mb-4 text-cyan-500" />
             <p>Loading profile...</p>
          </div>
      );
  }

  // Display logic
  const displayAvatar = isEditing ? editAvatarPreview : (profileData?.avatar_url);
  const displayUsername = profileData?.username || 'User';
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Profile Card */}
      <Card className="bg-[#1a1a24] border-gray-800 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-cyan-900/20 to-purple-900/20" />
        <CardHeader className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-2 relative z-10 pt-8">
          
          <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-[#1a1a24] shadow-xl">
                <AvatarImage src={displayAvatar} className="object-cover" />
                <AvatarFallback className="bg-cyan-900 text-cyan-100 text-xl">{displayUsername?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {isEditing && (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Upload className="w-6 h-6 text-white" />
                </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} accept="image/*" />
          </div>

          <div className="flex-1 mt-2 text-center sm:text-left w-full">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 sm:gap-3 justify-center sm:justify-start">
               {isEditing ? (
                   <div className="w-full max-w-xs">
                       <Label className="text-xs text-gray-500 ml-1">Username</Label>
                       <Input 
                          value={editUsername} 
                          onChange={(e) => setEditUsername(e.target.value)} 
                          className="bg-[#12121a] border-gray-700 h-9" 
                       />
                   </div>
               ) : (
                   <CardTitle className="text-3xl font-bold">@{displayUsername}</CardTitle>
               )}
               
               {!isEditing && (
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white" onClick={() => setIsEditing(true)}>
                       <Edit2 className="w-3 h-3" />
                   </Button>
               )}
            </div>
            
            <div className="flex gap-2 mt-2 justify-center sm:justify-start">
                {profileData?.plan_tier && profileData.plan_tier !== 'free' && (
                    <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/10">
                        <Crown className="w-3 h-3 mr-1 fill-current" /> {profileData.plan_tier}
                    </Badge>
                )}
            </div>

            {isEditing && (
                <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                    <Button size="sm" onClick={handleSaveProfile} disabled={saveLoading} className="bg-green-600 hover:bg-green-700 h-8">
                        {saveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditAvatarPreview(profileData?.avatar_url); }} className="h-8 border-gray-700">
                        <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Subscription Status Card */}
      <Card className="bg-[#1a1a24] border-gray-800 text-white">
        <CardHeader>
           <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-xl">License & Subscription</CardTitle>
           </div>
        </CardHeader>
        <CardContent className="space-y-6">
           <KeyRedemptionUI onSuccess={fetchData} />

           {subscription ? (
             <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-[#12121a] border border-amber-900/30">
                   <div>
                      <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                      <h3 className="text-2xl font-bold text-amber-400">{subscription.plans?.name || 'Premium'}</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                         <Calendar className="w-4 h-4" />
                         <span>{formatExpirationDisplay(subscription.expires_at)}</span>
                      </div>
                   </div>
                   <div className="text-left md:text-right">
                      <p className="text-sm text-gray-400 mb-1">Time Remaining</p>
                      <h3 className="text-2xl font-bold text-white">{getDaysRemaining(subscription.expires_at)} Days</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-green-400 justify-start md:justify-end">
                         <Clock className="w-4 h-4" />
                         <span>{subscription.type === 'trial' ? 'Trial Active' : 'Active'}</span>
                      </div>
                   </div>
                </div>
                
                <div className="space-y-2 mt-4">
                   <div className="flex justify-between text-xs text-gray-500">
                      <span>Activation: {new Date(subscription.created_at).toLocaleDateString()}</span>
                      <span>Expiry: {new Date(subscription.expires_at).toLocaleDateString()}</span>
                   </div>
                   <Progress value={Math.min(100, (getDaysRemaining(subscription.expires_at) / 30) * 100)} className="h-2 bg-gray-800" indicatorClassName="bg-amber-500" />
                </div>
             </div>
           ) : (
             <div className="text-center py-4 text-gray-500">
                <p>No active subscription found. Redeem a key above or visit the billing page.</p>
                <Button variant="link" onClick={() => navigate('/billing')} className="text-cyan-400">Go to Billing</Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileTab;
