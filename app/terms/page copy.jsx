'use client'

import { AuthCard } from 'threadcub-design-system'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <AuthCard maxWidth="100%" padding="lg" shadow="md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-6">
              By accessing and using ThreadCub ("the Service"), you accept and agree to be bound by 
              the terms and provision of this agreement. If you do not agree to abide by the above, 
              please do not use this service.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-6">
              ThreadCub is a conversation management platform that allows users to organize, track, 
              and manage their communications across various channels. The service is currently in 
              early access and features may change as we develop the platform.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 mb-4">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your password and account</li>
              <li>Promptly update any changes to your account information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Transmit harmful, threatening, or offensive content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service for spam or unsolicited communications</li>
              <li>Interfere with or disrupt the service or servers</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Early Access Program</h2>
            <p className="text-gray-700 mb-6">
              ThreadCub is currently in early access. By participating, you understand that:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 ml-4">
              <li>The service may contain bugs or incomplete features</li>
              <li>Features may change or be removed without notice</li>
              <li>Your feedback helps us improve the platform</li>
              <li>Service availability may be limited or interrupted</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Privacy and Data</h2>
            <p className="text-gray-700 mb-6">
              Your privacy is important to us. Please review our Privacy Policy, which also governs 
              your use of the Service, to understand our practices regarding your personal information.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700 mb-6">
              The Service and its original content, features, and functionality are and will remain 
              the exclusive property of ThreadCub and its licensors. The Service is protected by 
              copyright, trademark, and other laws.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Termination</h2>
            <p className="text-gray-700 mb-6">
              We may terminate or suspend your account and access to the Service immediately, without 
              prior notice or liability, if you breach any terms of this agreement. You may also 
              terminate your account at any time by contacting us.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Disclaimers</h2>
            <p className="text-gray-700 mb-6">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no 
              representations or warranties of any kind, express or implied, regarding the use or 
              results of the Service in terms of correctness, accuracy, reliability, or otherwise.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-700 mb-6">
              In no event shall ThreadCub be liable for any indirect, incidental, special, 
              consequential, or punitive damages, including without limitation, loss of profits, 
              data, use, goodwill, or other intangible losses.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700 mb-6">
              We reserve the right to modify or replace these Terms at any time. If a revision is 
              material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Contact Information</h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Email:</strong> legal@threadcub.com
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