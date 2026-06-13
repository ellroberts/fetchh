'use client'

import { AuthCard } from 'threadcub-design-system'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <AuthCard maxWidth="100%" padding="lg" shadow="md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 mb-4">
              We collect information you provide directly to us, such as when you create an account, 
              use our services, or contact us for support. This may include:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>Email address and account credentials</li>
              <li>Profile information you choose to provide</li>
              <li>Communications and interactions within our platform</li>
              <li>Usage data and analytics to improve our services</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Communicate about new features and updates</li>
              <li>Monitor and analyze trends and usage</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Information Sharing</h2>
            <p className="text-gray-700 mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              without your consent, except as described in this policy. We may share information in 
              the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>With service providers who assist in our operations</li>
              <li>To comply with legal obligations or protect our rights</li>
              <li>In connection with a business transfer or acquisition</li>
              <li>With your explicit consent</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
            <p className="text-gray-700 mb-6">
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction. However, no method of 
              transmission over the internet is 100% secure.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
            <p className="text-gray-700 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Third-Party Services</h2>
            <p className="text-gray-700 mb-6">
              Our service may contain links to third-party websites or integrate with third-party 
              services (such as Google or GitHub for authentication). We are not responsible for 
              the privacy practices of these third parties.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Changes to This Policy</h2>
            <p className="text-gray-700 mb-6">
              We may update this privacy policy from time to time. We will notify you of any 
              significant changes by posting the new policy on this page and updating the 
              "Last updated" date.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Contact Us</h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about this privacy policy or our data practices, 
              please contact us at:
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Email:</strong> privacy@threadcub.com
            </p>
            <p className="text-gray-700 mb-6">
              <strong>Address:</strong> [Your Business Address]
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <a 
              href="/" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to ThreadCub
            </a>
          </div>
        </AuthCard>
      </div>
    </div>
  )
}