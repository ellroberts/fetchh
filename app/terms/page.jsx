'use client'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Use</h1>
          <p className="text-gray-600">Last updated: 19 February 2026</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 mb-6">
            These Terms of Use govern your access to and use of ThreadCub, including the Chrome extension
            and web application (&ldquo;the Service&rdquo;). By using ThreadCub you agree to these terms. If you do
            not agree, please do not use the Service. ThreadCub is operated from London, United Kingdom.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-6">
            By installing the ThreadCub Chrome extension or creating an account on threadcub.com, you confirm
            that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. The Service</h2>
          <p className="text-gray-700 mb-4">
            ThreadCub is a tool that allows you to:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li>Save AI conversations from supported platforms to your account</li>
            <li>Organise saved conversations with tags, notes, and projects</li>
            <li>Continue conversations using saved context</li>
            <li>Analyse conversations using AI-powered insights</li>
            <li>Export your saved conversations in supported formats</li>
          </ul>
          <p className="text-gray-700 mb-6">
            ThreadCub is currently in early access. Features and availability may change as the product develops.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Accounts</h2>
          <p className="text-gray-700 mb-6">
            You may use some features of ThreadCub without an account (as a guest). To access the full feature
            set, you must create an account using a valid email address. You are responsible for maintaining the
            security of your account credentials. You must notify us immediately at support@threadcub.com if
            you believe your account has been compromised.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Your Content</h2>
          <p className="text-gray-700 mb-6">
            You retain ownership of the conversation content you save through ThreadCub. By saving content to
            our Service, you grant ThreadCub a limited licence to store, process, and display that content solely
            for the purpose of providing the Service to you. We do not use your conversation content to train AI
            models or for any commercial purpose beyond providing the Service.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Acceptable Use</h2>
          <p className="text-gray-700 mb-4">
            You agree to use ThreadCub only for lawful purposes. You must not:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
            <li>Use the Service for unlawful, harmful, or fraudulent activity</li>
            <li>Attempt to gain unauthorised access to our systems or other users&apos; data</li>
            <li>Reverse-engineer, decompile, or modify the extension or application</li>
            <li>Use the Service to store or distribute illegal, abusive, or infringing content</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Attempt to circumvent any security or access controls</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Third-Party Platforms</h2>
          <p className="text-gray-700 mb-6">
            ThreadCub works alongside third-party AI platforms (such as ChatGPT, Claude, and Gemini). Your
            use of those platforms is governed by their own terms of service. We are not affiliated with, endorsed
            by, or responsible for any third-party platform. You are responsible for ensuring your use of
            ThreadCub complies with the terms of any platform you use it with.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
          <p className="text-gray-700 mb-6">
            The ThreadCub name, logo, design, and software are the property of ThreadCub. We grant you a
            personal, non-exclusive, non-transferable licence to use the Service for your own purposes. You may
            not reproduce, distribute, sublicence, or resell any part of the Service without our written consent.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Data and Privacy</h2>
          <p className="text-gray-700 mb-6">
            Our collection and use of your personal data is governed by our{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>, which forms
            part of these Terms. By using the Service you consent to the processing of your data as described
            in the Privacy Policy.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Availability and Changes</h2>
          <p className="text-gray-700 mb-6">
            We aim to keep ThreadCub available and up to date, but we do not guarantee uninterrupted access.
            We may update, modify, suspend, or discontinue any part of the Service at any time, including during
            this early access period. Where possible we will give reasonable notice of significant changes.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Disclaimer of Warranties</h2>
          <p className="text-gray-700 mb-6">
            ThreadCub is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind,
            express or implied, including but not limited to fitness for a particular purpose or merchantability.
            We do not warrant that the Service will be error-free, secure, or available at all times.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Limitation of Liability</h2>
          <p className="text-gray-700 mb-6">
            To the fullest extent permitted by applicable law, ThreadCub shall not be liable for any indirect,
            incidental, or consequential damages arising out of or related to your use of the Service, including
            but not limited to loss of data or service interruptions. Nothing in these Terms limits liability for
            death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded
            under English law.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Governing Law</h2>
          <p className="text-gray-700 mb-6">
            These Terms are governed by and construed in accordance with the laws of England and Wales. Any
            disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction
            of the courts of England and Wales.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">13. Changes to These Terms</h2>
          <p className="text-gray-700 mb-6">
            We may update these Terms of Use from time to time. The date at the top of this page reflects when
            they were last revised. Continued use of ThreadCub after changes are posted constitutes your
            acceptance of the revised Terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">14. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions about these Terms, please contact us:
          </p>
          <p className="text-gray-700 mb-2"><strong>Email:</strong> support@threadcub.com</p>
          <p className="text-gray-700 mb-6"><strong>Location:</strong> London, United Kingdom</p>
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