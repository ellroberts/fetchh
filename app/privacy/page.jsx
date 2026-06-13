'use client'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: 19 February 2026</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 mb-6">
            This Privacy Policy explains how ThreadCub (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, and protects your
            information when you use the ThreadCub Chrome extension and web application. We are based in
            London, United Kingdom and are committed to handling your data in accordance with the UK GDPR
            and the Data Protection Act 2018.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. What Data We Collect</h2>
          <p className="text-gray-700 mb-4">
            ThreadCub is designed to save, organise, and help you continue your AI conversations. Depending
            on how you use the product, we collect the following:
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Account users (signed in)</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
            <li><strong>Email address</strong> — used for authentication via Supabase Auth</li>
            <li><strong>Conversation content</strong> — messages you save via the extension, stored encrypted in our database</li>
            <li><strong>Conversation metadata</strong> — title, platform (e.g. ChatGPT, Claude), message count, timestamps</li>
            <li><strong>Tags and notes</strong> — organisational data you add to conversations</li>
            <li><strong>A per-user encryption key</strong> — used to encrypt your conversation data before it leaves your browser</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Guest users (not signed in)</h3>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li><strong>Conversation content</strong> — saved against an anonymous session ID, not linked to your identity</li>
            <li><strong>Session ID</strong> — a randomly generated identifier stored locally in your browser</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Data</h2>
          <p className="text-gray-700 mb-4">
            We use your data only to provide ThreadCub&apos;s core functionality:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li>Saving and retrieving your AI conversations</li>
            <li>Enabling you to continue conversations across sessions</li>
            <li>Organising conversations with tags, notes, and projects</li>
            <li>Providing AI-powered analysis and insights on your saved conversations</li>
            <li>Allowing you to export or delete your data at any time</li>
          </ul>
          <p className="text-gray-700 mb-6">
            Our lawful basis for processing under UK GDPR is <strong>contract performance</strong> — processing
            is necessary to provide the service you have signed up for — and <strong>legitimate interests</strong>
            for anonymous usage analytics.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Encryption and Data Security</h2>
          <p className="text-gray-700 mb-4">
            We take the security of your conversation data seriously:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li><strong>Encryption at rest:</strong> Conversation content is encrypted with AES before being sent to our servers. Only your personal encryption key can decrypt it.</li>
            <li><strong>Per-user keys:</strong> Each account has a unique encryption key stored securely and never shared.</li>
            <li><strong>Transport security:</strong> All data is transmitted over HTTPS.</li>
            <li><strong>Row-level security:</strong> Our database enforces access controls so users can only access their own data.</li>
            <li><strong>Guest data:</strong> Conversations saved without an account are not encrypted and are linked only to a temporary session ID.</li>
          </ul>
          <p className="text-gray-700 mb-6">
            No online service can guarantee 100% security. We recommend creating an account for full
            encryption protection and regularly exporting backups of important conversations.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Analytics and Usage Data</h2>
          <p className="text-gray-700 mb-4">
            The ThreadCub Chrome extension collects anonymous usage statistics to help us improve the product.
            This data is collected via Google Analytics 4.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What we collect:</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
            <li>Feature usage (saves, exports, tags, conversation continuations)</li>
            <li>Which AI platforms ThreadCub is used with</li>
            <li>Extension version and update events</li>
            <li>Anonymous session data</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What we do not collect:</h3>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li>Conversation content or messages</li>
            <li>Personal or identifiable information</li>
            <li>Browsing history outside of ThreadCub usage</li>
            <li>Any data used for advertising purposes</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Your Rights Under UK GDPR</h2>
          <p className="text-gray-700 mb-4">
            If you have a ThreadCub account, you have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 ml-4">
            <li><strong>Right of access</strong> — you can request a copy of the data we hold about you</li>
            <li><strong>Right to erasure</strong> — you can delete individual conversations directly from your dashboard, or request full account deletion by contacting us</li>
            <li><strong>Right to portability</strong> — you can export your conversations at any time (JSON format available in the dashboard)</li>
            <li><strong>Right to rectification</strong> — you can update or correct your data</li>
            <li><strong>Right to object</strong> — you can object to processing based on legitimate interests</li>
          </ul>
          <p className="text-gray-700 mb-6">
            To exercise any of these rights, please contact us at <strong>privacy@threadcub.com</strong>. We will
            respond within 30 days in accordance with UK GDPR requirements.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li><strong>Account conversations</strong> — retained until you delete them or close your account</li>
            <li><strong>Guest conversations</strong> — may be removed periodically as part of database maintenance</li>
            <li><strong>Analytics data</strong> — retained for 14 months per Google Analytics 4 default policy</li>
            <li><strong>Account data</strong> — retained until account deletion is requested</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Data Sharing</h2>
          <p className="text-gray-700 mb-4">
            We do not sell, trade, or share your data with advertisers or third parties for commercial purposes.
            Data is shared only with the following trusted service providers, strictly to operate ThreadCub:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li><strong>Supabase</strong> — database and authentication (EU data centres)</li>
            <li><strong>Vercel</strong> — web application hosting</li>
            <li><strong>Google Analytics 4</strong> — anonymous usage analytics</li>
            <li><strong>Anthropic</strong> — AI analysis features (conversation content may be sent to the Claude API for analysis only when you explicitly request it)</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Third-Party AI Platforms</h2>
          <p className="text-gray-700 mb-6">
            ThreadCub works alongside third-party AI platforms (such as ChatGPT, Claude, Gemini, and others).
            We do not control the data practices of these platforms. We recommend reviewing their privacy
            policies separately. ThreadCub only accesses conversation content that you explicitly choose to save.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Cookies</h2>
          <p className="text-gray-700 mb-6">
            The ThreadCub web application uses cookies solely for authentication purposes (to keep you signed
            in). We do not use advertising or tracking cookies. The Chrome extension does not use cookies.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Changes to This Policy</h2>
          <p className="text-gray-700 mb-6">
            We may update this Privacy Policy from time to time. The date at the top of this page reflects when
            it was last revised. For significant changes we will notify users via the website or extension update
            notes.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data,
            please contact us:
          </p>
          <p className="text-gray-700 mb-2"><strong>Email:</strong> privacy@threadcub.com</p>
          <p className="text-gray-700 mb-2"><strong>Location:</strong> London, United Kingdom</p>
          <p className="text-gray-700 mb-6">
            You also have the right to lodge a complaint with the UK&apos;s data protection authority, the
            Information Commissioner&apos;s Office (ICO), at <strong>ico.org.uk</strong>.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            &larr; Back to ThreadCub
          </a>
        </div>
      </div>
    </div>
  )
}