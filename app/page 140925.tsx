'use client'

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-6">
          Tame your wild AI chats — one ..... at a time 🐾
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-foreground/80 mb-8">
          Long conversations don’t have to be overwhelming. ThreadCub helps you
          save, tag, and resume AI chats so ideas never get lost in the woods.
        </p>
        <a
          href="/auth?mode=signup"
          className="inline-block bg-purple-600 text-white text-lg font-medium px-8 py-4 rounded-xl shadow-md hover:bg-purple-700 transition"
        >
          Join the Waitlist
        </a>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Save & Export</h3>
            <p className="text-foreground/80">
              Capture chats from ChatGPT, Claude, Copilot and more — keep them safe in one place.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Tag & Highlight</h3>
            <p className="text-foreground/80">
              Mark important moments with tags and notes, so you can find them fast.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Resume Seamlessly</h3>
            <p className="text-foreground/80">
              Pick up exactly where you left off, without losing context.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-6">How it works</h2>
        <p className="max-w-2xl mx-auto text-foreground/80 mb-12">
          Click the Cub, save your chat, carry on. It’s that simple.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="p-6 bg-background rounded-xl shadow">
            <span className="text-3xl">🧩</span>
            <h3 className="text-lg font-semibold mt-4">Install</h3>
            <p className="text-muted-foreground">Add the Chrome Extension.</p>
          </div>
          <div className="p-6 bg-background rounded-xl shadow">
            <span className="text-3xl">🐻</span>
            <h3 className="text-lg font-semibold mt-4">Click Coda</h3>
            <p className="text-muted-foreground">Open the floating Cub button.</p>
          </div>
          <div className="p-6 bg-background rounded-xl shadow">
            <span className="text-3xl">✨</span>
            <h3 className="text-lg font-semibold mt-4">Save → Tag → Resume</h3>
            <p className="text-muted-foreground">Organize your chats with ease.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-purple-600 text-white">
        <h2 className="text-3xl font-bold mb-6">Ready to stay organized?</h2>
        <a
          href="/auth?mode=signup"
          className="inline-block bg-background text-purple-700 text-lg font-medium px-8 py-4 rounded-xl shadow-md hover:bg-muted transition"
        >
          Join the Waitlist
        </a>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <div className="space-x-4">
          <a href="/privacy" className="hover:text-foreground/80">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-foreground/80">
            Terms of Use
          </a>
        </div>
        <p className="mt-4">Built with ❤️ (and a little honey) by ThreadCub.</p>
      </footer>
    </div>
  )
}
