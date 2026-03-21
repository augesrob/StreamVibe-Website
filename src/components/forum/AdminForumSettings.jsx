/**
 * AdminForumSettings — Full forum admin panel
 * Tabs: Dashboard | Structure | Spam Reports | Mod Logs
 * Used inside ForumLayout's admin tab (for forum-context admins)
 * Also wired into AdminPanel.jsx's Forum tab
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, FolderTree, AlertTriangle, Shield } from 'lucide-react';
import ForumAdminDashboard  from '@/components/admin/ForumAdminDashboard';
import ForumAdministration  from '@/components/admin/ForumAdministration';
import SpamReportsAdmin     from '@/components/admin/SpamReportsAdmin';
import ModeratorPanel       from '@/components/forum/ModeratorPanel';

const AdminForumSettings = () => {
  const [tab, setTab] = useState('dashboard');
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="bg-[#12121e] border border-slate-800 p-1 h-auto gap-1">
        <TabsTrigger value="dashboard"  className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300 gap-2">
          <LayoutDashboard className="w-4 h-4" />Overview
        </TabsTrigger>
        <TabsTrigger value="structure"  className="data-[state=active]:bg-blue-900/50 data-[state=active]:text-blue-300 gap-2">
          <FolderTree className="w-4 h-4" />Structure
        </TabsTrigger>
        <TabsTrigger value="spam"       className="data-[state=active]:bg-red-900/50 data-[state=active]:text-red-300 gap-2">
          <AlertTriangle className="w-4 h-4" />Spam Reports
        </TabsTrigger>
        <TabsTrigger value="modlogs"    className="data-[state=active]:bg-orange-900/50 data-[state=active]:text-orange-300 gap-2">
          <Shield className="w-4 h-4" />Mod Logs
        </TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard"><ForumAdminDashboard /></TabsContent>
      <TabsContent value="structure"><ForumAdministration /></TabsContent>
      <TabsContent value="spam"><SpamReportsAdmin /></TabsContent>
      <TabsContent value="modlogs"><ModeratorPanel /></TabsContent>
    </Tabs>
  );
};

export default AdminForumSettings;
