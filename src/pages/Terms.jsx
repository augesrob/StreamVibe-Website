import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Scale } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] text-gray-300">
      <Helmet>
        <title>Terms of Service - StreamVibe</title>
        <meta name="description" content="Terms of Service for StreamVibe application." />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-purple-500/10 mb-4">
             <Scale className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-lg text-gray-400">Last updated: January 1, 2026</p>
        </div>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">1. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              StreamVibe is a comprehensive TikTok content management and livestreaming enhancement platform. Our software provides tools for overlay management, viewer interaction events, sound alerts, and automated stream controls. By using StreamVibe, you acknowledge that our services are designed to augment your TikTok Live experience but are not affiliated with, endorsed by, or directly operated by TikTok.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">2. User Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>As a user of StreamVibe, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service in compliance with all applicable laws and TikTok's Community Guidelines.</li>
              <li>Maintain the security of your account credentials and API keys.</li>
              <li>Not use the platform for any illegal activities, harassment, or distribution of harmful content.</li>
              <li>Accept responsibility for all activity that occurs under your account.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">3. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The StreamVibe software, including its code, design, logos, and features, is the exclusive intellectual property of StreamVibe NL. You are granted a limited, non-exclusive, non-transferable license to use the software for personal or commercial streaming purposes, provided you maintain an active subscription or valid license. You may not reverse engineer, decompile, or distribute our software without explicit written permission.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">4. Third-Party Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              StreamVibe integrates with the TikTok API to provide its core functionality. We are not responsible for changes to the TikTok platform, API availability, or account suspensions imposed by TikTok. Your use of TikTok is governed entirely by TikTok's separate Terms of Service.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">5. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              In no event shall StreamVibe be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-gray-800 text-gray-300">
          <CardHeader>
            <CardTitle className="text-white">6. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;