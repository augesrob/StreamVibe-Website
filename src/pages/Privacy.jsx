import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, Server, UserCheck } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] text-gray-300">
      <Helmet>
        <title>Privacy Policy - StreamVibe</title>
        <meta name="description" content="Privacy Policy for StreamVibe application." />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-cyan-500/10 mb-4">
             <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-lg text-gray-400">Last updated: January 1, 2026</p>
        </div>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Eye className="w-5 h-5 text-cyan-500"/> 1. Data Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>At StreamVibe, we collect specific information to provide our streaming tools:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Email address, encrypted password, and username.</li>
              <li><strong>TikTok Data:</strong> When you link your TikTok account, we access your public profile info (username, avatar) and live stream statistics (viewer count, comments, gifts) solely to power the overlay features.</li>
              <li><strong>Usage Metrics:</strong> We collect anonymous data on feature usage to improve application performance.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Server className="w-5 h-5 text-cyan-500"/> 2. Data Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Your data is used strictly for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authentication and verifying your license status.</li>
              <li>Triggering automated events during your livestreams (e.g., sound alerts on gifts).</li>
              <li>Communication regarding your subscription, updates, and support inquiries.</li>
              <li>We <strong>never</strong> sell your personal data to third parties.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Lock className="w-5 h-5 text-cyan-500"/> 3. Data Protection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We implement industry-standard security measures including SSL encryption for data in transit and robust hashing for passwords. Access to personal data is restricted to authorized personnel only. API keys and tokens are stored securely and encrypted where possible.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><UserCheck className="w-5 h-5 text-cyan-500"/> 4. User Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You maintain full control over your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> You can request a copy of all personal data we hold about you.</li>
              <li><strong>Correction:</strong> You can update your profile information at any time via the dashboard.</li>
              <li><strong>Deletion:</strong> You may request the complete deletion of your account and associated data.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">5. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our application uses the TikTok API services. By using StreamVibe, you are also bound by TikTok's Privacy Policy. We do not control and are not responsible for the privacy practices of TikTok.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">6. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              For any privacy concerns or data requests, please contact our Data Protection Officer at: <a href="mailto:privacy@streamvibe.nl" className="text-cyan-400 hover:underline">privacy@streamvibe.nl</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;