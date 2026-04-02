'use client'

import { useState } from 'react'

interface StepAnnotation {
  type: string
  x1: number; y1: number; x2: number; y2: number
  color: string
}

interface GuideStep {
  stepNumber: number
  instruction: string
  note?: string
  elementName?: string
  windowTitle?: string
  isRedacted?: boolean
  screenshot?: string | null  // base64
  annotations?: StepAnnotation[]
}

interface GuideData {
  steps: GuideStep[]
  createdAt: string
  updatedAt: string
}

interface PulseGuide {
  id: string
  title: string
  description?: string
  share_token: string
  data: GuideData
  created_at: string
}

export default function PulseViewer({ guide, token }: { guide: PulseGuide; token: string }) {
  const [copied, setCopied] = useState(false)
  const [activeStep, setActiveStep] = useState<number | null>(null)

  const steps: GuideStep[] = guide.data?.steps ?? []
  const shareUrl = `https://streamvibe.nl/pulse/view/${token}`

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyEmbed() {
    const embed = `<iframe src="${shareUrl}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`
    navigator.clipboard.writeText(embed)
  }

  return (
    <div className="min-h-screen bg-[#0A0A14] text-white font-['Segoe_UI',sans-serif]">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#08081A] border-b border-[#1E1E35]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
              ⏺
            </div>
            <span className="text-sm font-semibold text-[#F1F1F5]">StreamVibe Pulse</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A5A80]">{steps.length} steps</span>
            <div className="w-px h-4 bg-[#2A2A45] mx-1"/>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16162A] border border-[#2A2A45]
                         text-xs text-[#A0A0C0] hover:bg-[#1E1E38] hover:border-[#4A4A80] transition-all"
            >
              {copied ? '✓ Copied!' : '🔗 Copy link'}
            </button>
            <button
              onClick={copyEmbed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16162A] border border-[#2A2A45]
                         text-xs text-[#A0A0C0] hover:bg-[#1E1E38] hover:border-[#4A4A80] transition-all"
            >
              {'</> Embed'}
            </button>
          </div>
        </div>
      </div>

      {/* Guide header */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-8 border-b border-[#1E1E35]">
        <div className="flex items-start gap-4">
          <div className="w-1 self-stretch bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full flex-shrink-0"/>
          <div>
            <h1 className="text-3xl font-light text-white mb-2">{guide.title}</h1>
            {guide.description && (
              <p className="text-[#5A5A80] text-base">{guide.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-xs text-[#3A3A60]">
                {steps.length} steps
              </span>
              <span className="text-xs text-[#3A3A60]">
                Created with StreamVibe Pulse
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {activeStep !== null && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[#5A5A80]">Progress</span>
            <span className="text-xs text-indigo-400">{activeStep + 1} / {steps.length}</span>
          </div>
          <div className="h-1 bg-[#16162A] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {steps.map((step, idx) => (
          <StepCard
            key={idx}
            step={step}
            isActive={activeStep === idx}
            onClick={() => setActiveStep(activeStep === idx ? null : idx)}
            total={steps.length}
          />
        ))}

        {steps.length === 0 && (
          <div className="text-center py-20 text-[#3A3A60]">
            <p className="text-lg">This guide has no steps yet.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1E1E35] mt-8">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-xs text-[#3A3A60]">Made with StreamVibe Pulse</span>
          <a href="https://streamvibe.nl" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            streamvibe.nl →
          </a>
        </div>
      </div>
    </div>
  )
}

function StepCard({ step, isActive, onClick, total }: {
  step: GuideStep
  isActive: boolean
  onClick: () => void
  total: number
}) {
  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer
        ${isActive
          ? 'border-indigo-500/50 bg-[#16162A] shadow-lg shadow-indigo-500/10'
          : 'border-[#2A2A45] bg-[#16162A] hover:border-[#4A4A80] hover:bg-[#1E1E38]'
        }`}
      onClick={onClick}
    >
      {/* Step header */}
      <div className="flex items-start gap-4 p-5">
        {/* Step number badge */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-semibold text-white">{step.stepNumber}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[#E0E0F0] text-sm leading-relaxed">{step.instruction}</p>
          {step.windowTitle && (
            <p className="text-xs text-[#3A3A60] mt-1">in {step.windowTitle}</p>
          )}
        </div>

        {/* Expand indicator */}
        <div className={`text-[#3A3A60] text-xs transition-transform duration-200 flex-shrink-0 mt-1 ${isActive ? 'rotate-180' : ''}`}>
          ▾
        </div>
      </div>

      {/* Expanded content */}
      {isActive && (
        <div className="border-t border-[#2A2A45]">
          {/* Screenshot */}
          {step.screenshot && !step.isRedacted && (
            <div className="p-4 pb-0">
              <img
                src={`data:image/png;base64,${step.screenshot}`}
                alt={`Step ${step.stepNumber} screenshot`}
                className="w-full rounded-lg border border-[#2A2A45] object-contain max-h-96"
              />
            </div>
          )}
          {step.isRedacted && (
            <div className="mx-4 mt-4 rounded-lg bg-[#1A1A2E] border border-[#2A2A45] p-6 text-center">
              <span className="text-[#3A3A60] text-sm">🔒 Screenshot redacted</span>
            </div>
          )}
          {/* Note */}
          {step.note && (
            <div className="mx-4 mt-4 mb-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3">
              <p className="text-xs text-indigo-300">💡 {step.note}</p>
            </div>
          )}
          {/* Navigation buttons */}
          <div className="flex justify-end gap-2 px-4 pb-4 pt-3">
            <span className="text-xs text-[#3A3A60] self-center mr-auto">
              Step {step.stepNumber} of {total}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
