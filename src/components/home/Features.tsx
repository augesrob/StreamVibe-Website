import { Zap, Bell, Video, Users, MessageSquare, Key } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  { icon: Zap, title: "Custom Actions", description: "Create powerful custom actions that respond to viewer interactions in real-time.", color: "bg-blue-500" },
  { icon: Bell, title: "Sound Alerts", description: "Trigger custom sound alerts and notifications when viewers interact with your stream.", color: "bg-pink-500" },
  { icon: Video, title: "Stream Overlays", description: "Professional overlays that enhance your stream's visual appeal and engagement.", color: "bg-cyan-500" },
  { icon: Users, title: "Social Feed", description: "Connect with other streamers through a social feed with posts, likes, and comments.", color: "bg-red-500" },
  { icon: MessageSquare, title: "Friend System", description: "Build your streaming network by adding and finding friends within StreamVibe.", color: "bg-purple-500" },
  { icon: Key, title: "Premium Features", description: "Unlock advanced features with license keys and premium subscriptions.", color: "bg-indigo-500" },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
            Powerful Features
          </h2>
          <p className="text-slate-400 text-lg">Everything you need to take your TikTok LIVE streams to the next level</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all duration-300">
              <CardContent className="p-8">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-6 text-white shadow-lg`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
