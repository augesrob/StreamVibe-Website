export default function PulseNotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⏺</span>
        </div>
        <h1 className="text-2xl font-light text-white mb-3">Guide not found</h1>
        <p className="text-[#5A5A80] text-sm mb-8">
          This guide may have been deleted or the link is invalid.
        </p>
        <a
          href="https://streamvibe.nl"
          className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
        >
          ← Back to StreamVibe
        </a>
      </div>
    </div>
  )
}
