'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '../../lib/supabase'
import Image from 'next/image'

export default function WaitlistPendingPage() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      if (data?.user?.email) setEmail(data.user.email)
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm-50 text-warm-900 text-center px-4">
      <Image
        src="/threadcub.svg"
        alt="ThreadCub"
        width={96}
        height={96}
        className="mb-8"
      />
      <h1 className="text-4xl font-bold mb-4">You're on the waitlist!</h1>
      <p className="text-lg">We'll be in touch as soon as your spot opens up.</p>
    </div>
  )
}
