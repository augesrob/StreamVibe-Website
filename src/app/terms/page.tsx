import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale } from 'lucide-react'

export const metadata = { title: 'Terms of Service - StreamVibe' }

export default function TermsPage() {
  const sections = [
    { title: "1. Service Description", content: "StreamVibe is a comprehensive TikTok content management and livestreaming enhancement platform. Our software provides tools for overlay management, viewer interaction events, sound alerts, and automated stream controls. By using StreamVibe, you acknowledge that our services are designed to augment your TikTok Live experience but are not affiliated with, endorsed by, or directly operated by TikTok." },
    { title: "2. User Responsibilities", content: "As a user of StreamVibe, you agree to use the service in compliance with all applicable laws and TikTok's Community Guidelines, maintain the security of your account credentials and API keys, not use the platform for any illegal activities or distribution of harmful content, and accept responsibility for all activity that occurs under your account." },
    { title: "3. Intellectual Property", content: "The StreamVibe software, including its code, design, logos, and features, is the exclusive intellectual property of StreamVibe. You are granted a limited, non-exclusive, non-transferable license to use the software for personal or commercial streaming purposes, provided you maintain an active subscription or valid license." },
    { title: "4. Third-Party Integrations", content: "StreamVibe integrates with the TikTok API to provide its core functionality. We are not responsible for changes to the TikTok platform, API availability, or account suspensions imposed by TikTok. Your use of TikTok is governed entirely by TikTok's separate Terms of Service." },
    { title: "5. Limitation of Liability", content: "In no event shall StreamVibe be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of the service." },
    { title: "6. Termination", content: "We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease." },
  ]

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] text-gray-300">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-purple-500/10 mb-4">
            <Scale className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-lg text-gray-400">Last updated: January 1, 2026</p>
        </div>
        {sections.map((s, i) => (
          <Card key={i} className="bg-[#12121a] border-gray-800 text-gray-300">
            <CardHeader><CardTitle className="text-white">{s.title}</CardTitle></CardHeader>
            <CardContent><p>{s.content}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
