import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export const metadata = { title: 'Privacy Policy - StreamVibe' }

export default function PrivacyPage() {
  const sections = [
    { title: "1. Information We Collect", content: "We collect information you provide directly to us, such as when you create an account (email address, username), use our services, or contact us for support. We also collect usage data, device information, and TikTok integration tokens with your consent." },
    { title: "2. How We Use Your Information", content: "We use the information we collect to provide, maintain, and improve our services, process transactions, send technical notices and support messages, respond to your comments and questions, and send you information about products, services, and events." },
    { title: "3. Information Sharing", content: "We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. We may share aggregated, non-personally identifiable information publicly and with partners. We may disclose information when required by law or to protect rights and safety." },
    { title: "4. Data Security", content: "We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. However, no internet transmission is completely secure." },
    { title: "5. Your Rights", content: "You have the right to access, correct, or delete your personal information. You may also request that we restrict the processing of your data or object to our processing. To exercise these rights, please contact us." },
    { title: "6. Contact Us", content: "If you have any questions about this Privacy Policy, please contact us at support@streamvibe.app." },
  ]

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0a0a0f] text-gray-300">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-cyan-500/10 mb-4">
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
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
