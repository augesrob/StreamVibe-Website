"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Plan {
  id: string; name: string; price: number; duration_days: number; features: string[];
}

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('plans').select('*').order('price', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError("Could not load pricing plans.")
        else setPlans(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <section id="pricing" className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Choose the plan that fits your streaming needs. Upgrade or cancel anytime.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-cyan-500 animate-spin" /></div>
        ) : error ? (
          <div className="flex justify-center py-20 text-red-400 items-center gap-2"><AlertCircle className="w-6 h-6" /><span>{error}</span></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card key={plan.id} className={cn(
                "bg-[#1a1a24] border-slate-800 text-white flex flex-col hover:border-cyan-500/50 transition-colors",
                (plan.name === 'Premium' || plan.name === 'Pro') && "border-cyan-500 shadow-lg shadow-cyan-900/20 scale-105 z-10"
              )}>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-400">{plan.duration_days} days access</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-slate-400 ml-2">/ {plan.duration_days} days</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {Array.isArray(plan.features) && plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300">
                        <Check className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className={cn(
                    "w-full font-bold",
                    plan.price > 0
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  )}>
                    <Link href="/billing">{plan.price > 0 ? "Subscribe Now" : "Get Started"}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <p className="text-slate-400 mb-4">Already have a license key?</p>
          <Link href="/billing">
            <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300">
              Activate License Key
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
