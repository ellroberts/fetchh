'use client'

import { ResetPasswordCard } from 'threadcub-design-system'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <ResetPasswordCard
        onSubmit={(email) => {
          console.log('Email submitted:', email)
          return Promise.resolve()
        }}
        onBackToSignIn={() => {
          console.log('Back to sign in clicked')
          router.push('/auth')  // ← Add this navigation
        }}
      />
    </div>
  )
}