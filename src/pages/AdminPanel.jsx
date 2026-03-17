
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CreditCard, Key, Users, Settings, Activity, LayoutGrid, MessageSquare, AlertTriangle, ShieldCheck, Mail, Book } from 'lucide-react';

// Components
import LicensePlansManager from '@/components/admin/LicensePlansManager';
import BillingPlansManager from '@/components/admin/BillingPlansManager';
import TrialKeysManager from '@/components/admin/TrialKeysManager';
import UserManagement from '@/components/admin/UserManagement';
import RoleManagement from '@/components/admin/RoleManagement';
import ApiKeyManager from '@/components/admin/ApiKeyManager';
import SystemSettingsManager from '@/components/admin/SystemSettingsManager';
import NewsletterSubscription from '@/components/NewsletterSubscription';
import TikTokManager from '@/components/admin/TikTokManager';
import TikTokDiagnostics from '@/components/admin/TikTokDiagnostics';
import ApiDocumentation from '@/components/admin/ApiDocumentation';
import ApiLicenseDocumentation from '@/components/admin/ApiLicenseDocumentation';
import ForumAdminDashboard from '@/components/admin/ForumAdminDashboard';
import ForumAdministration from '@/components/admin/ForumAdministration';
import ModerationQueue from '@/components/admin/ModerationQueue';
import SpamReportsAdmin from '@/components/admin/SpamReportsAdmin';
import LicenseKeysManager from '@/components/admin/LicenseKeysManager';

const AdminPanel = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('licenses_keys');

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/dashboard');
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) return <div className="min-h-screen pt-24 text-center text-white">Verifying Admin Access...</div>;

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#0a0a0f] text-white pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
           <Shield className="w-8 h-8 text-cyan-500" />
           <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" orientation="vertical">
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
               <div className="space-y-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">License & Billing</div>
                  <TabsList className="flex flex-col h-auto bg-transparent items-stretch gap-1 p-0">
                      <TabsTrigger value="licenses_keys" className="justify-start data-[state=active]:bg-cyan-900/50"><Key className="w-4 h-4 mr-2"/> License Keys</TabsTrigger>
                      <TabsTrigger value="plans" className="justify-start data-[state=active]:bg-cyan-900/50"><CreditCard className="w-4 h-4 mr-2"/> Plans</TabsTrigger>
                      <TabsTrigger value="generation" className="justify-start data-[state=active]:bg-cyan-900/50"><Key className="w-4 h-4 mr-2"/> Generation</TabsTrigger>
                      <TabsTrigger value="trials" className="justify-start data-[state=active]:bg-cyan-900/50"><Activity className="w-4 h-4 mr-2"/> Trial Keys</TabsTrigger>
                      <TabsTrigger value="newsletter" className="justify-start data-[state=active]:bg-cyan-900/50"><Mail className="w-4 h-4 mr-2"/> Newsletter</TabsTrigger>
                  </TabsList>

                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mt-4">User Management</div>
                  <TabsList className="flex flex-col h-auto bg-transparent items-stretch gap-1 p-0">
                      <TabsTrigger value="users" className="justify-start data-[state=active]:bg-blue-900/50"><Users className="w-4 h-4 mr-2"/> Users</TabsTrigger>
                      <TabsTrigger value="roles" className="justify-start data-[state=active]:bg-blue-900/50"><ShieldCheck className="w-4 h-4 mr-2"/> Roles</TabsTrigger>
                  </TabsList>

                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mt-4">Forum</div>
                  <TabsList className="flex flex-col h-auto bg-transparent items-stretch gap-1 p-0">
                      <TabsTrigger value="forum_dash" className="justify-start data-[state=active]:bg-purple-900/50"><Activity className="w-4 h-4 mr-2"/> Dashboard</TabsTrigger>
                      <TabsTrigger value="forum_struct" className="justify-start data-[state=active]:bg-purple-900/50"><LayoutGrid className="w-4 h-4 mr-2"/> Structure</TabsTrigger>
                      <TabsTrigger value="mod_queue" className="justify-start data-[state=active]:bg-purple-900/50"><MessageSquare className="w-4 h-4 mr-2"/> Mod Queue</TabsTrigger>
                      <TabsTrigger value="spam" className="justify-start data-[state=active]:bg-purple-900/50"><AlertTriangle className="w-4 h-4 mr-2"/> Spam Reports</TabsTrigger>
                  </TabsList>

                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mt-4">System</div>
                  <TabsList className="flex flex-col h-auto bg-transparent items-stretch gap-1 p-0">
                      <TabsTrigger value="settings" className="justify-start data-[state=active]:bg-gray-800"><Settings className="w-4 h-4 mr-2"/> Settings</TabsTrigger>
                      <TabsTrigger value="tiktok" className="justify-start data-[state=active]:bg-gray-800"><Activity className="w-4 h-4 mr-2"/> TikTok</TabsTrigger>
                      <TabsTrigger value="api_keys" className="justify-start data-[state=active]:bg-gray-800"><Key className="w-4 h-4 mr-2"/> Admin API Keys</TabsTrigger>
                      <TabsTrigger value="docs" className="justify-start data-[state=active]:bg-gray-800"><Book className="w-4 h-4 mr-2"/> API Docs</TabsTrigger>
                  </TabsList>
               </div>

               <div className="overflow-hidden">
                   <TabsContent value="licenses_keys"><LicenseKeysManager /></TabsContent>
                   <TabsContent value="plans"><BillingPlansManager /></TabsContent>
                   <TabsContent value="generation"><LicensePlansManager /></TabsContent>
                   <TabsContent value="trials"><TrialKeysManager /></TabsContent>
                   <TabsContent value="newsletter"><NewsletterSubscription /></TabsContent>
                   
                   <TabsContent value="users"><UserManagement /></TabsContent>
                   <TabsContent value="roles"><RoleManagement /></TabsContent>
                   
                   <TabsContent value="forum_dash"><ForumAdminDashboard /></TabsContent>
                   <TabsContent value="forum_struct"><ForumAdministration /></TabsContent>
                   <TabsContent value="mod_queue"><ModerationQueue /></TabsContent>
                   <TabsContent value="spam"><SpamReportsAdmin /></TabsContent>

                   <TabsContent value="settings"><SystemSettingsManager /></TabsContent>
                   <TabsContent value="tiktok">
                        <div className="space-y-6">
                            <TikTokManager />
                            <TikTokDiagnostics />
                        </div>
                   </TabsContent>
                   <TabsContent value="api_keys"><ApiKeyManager /></TabsContent>
                   <TabsContent value="docs">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="general">General API</TabsTrigger>
                                <TabsTrigger value="licenses">License API</TabsTrigger>
                            </TabsList>
                            <TabsContent value="general"><ApiDocumentation /></TabsContent>
                            <TabsContent value="licenses"><ApiLicenseDocumentation /></TabsContent>
                        </Tabs>
                   </TabsContent>
               </div>
            </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
