'use client'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-6">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground mb-6">
          Coming Soon
        </h1>
        <p className="text-xl sm:text-2xl text-foreground/80">
          Something exciting is on its way. Stay tuned!
        </p>
      </div>
    </div>
  )
}